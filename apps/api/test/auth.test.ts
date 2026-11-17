import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sequelize } from '../src/database/index.js';
import { currentStep, totpCode } from '../src/shared/security/totp.js';
import { cookieFrom, createUser, setupApi, TEST_PASSWORD } from './helpers.js';

const api = setupApi();

const login = (email: string, password = TEST_PASSWORD) =>
  api('/api/v1/auth/login', { method: 'POST', cookie: null, body: { email, password } });

describe('sign in', () => {
  it('signs in with a password and reads the profile', async () => {
    await createUser({ email: 'anna@example.com', name: 'Anna' });

    const res = await login('anna@example.com');
    const cookie = cookieFrom(res.headers);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.session.status, 'active');
    assert.ok(cookie);

    const me = await api('/api/v1/auth/me', { cookie });

    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.email, 'anna@example.com');
    assert.equal(me.body.data.user.passwordHash, undefined);
    assert.equal(me.body.data.user.twoFactorSecret, undefined);
  });

  it('answers the same for a wrong password and an unknown email', async () => {
    await createUser({ email: 'anna@example.com' });

    const wrongPassword = await login('anna@example.com', 'not the password');
    const unknownEmail = await login('nobody@example.com');

    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.deepEqual(wrongPassword.body, unknownEmail.body);
  });

  it('blocks an account after repeated wrong passwords', async () => {
    await createUser({ email: 'anna@example.com' });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.equal((await login('anna@example.com', 'wrong password')).status, 401);
    }

    // Even the right password is refused while the account is locked.
    assert.equal((await login('anna@example.com')).status, 429);
  });

  it('refuses a deactivated account', async () => {
    await createUser({ email: 'anna@example.com', isActive: false });

    assert.equal((await login('anna@example.com')).status, 401);
  });

  it('refuses requests without a session', async () => {
    const res = await api('/api/v1/stores/00000000-0000-4000-8000-000000000000', { cookie: null });

    assert.equal(res.status, 401);
  });

  it('ends the session on logout', async () => {
    await createUser({ email: 'anna@example.com' });
    const cookie = cookieFrom((await login('anna@example.com')).headers) ?? '';

    await api('/api/v1/auth/logout', { method: 'POST', cookie });

    assert.equal((await api('/api/v1/auth/me', { cookie })).status, 401);
  });

  it('stores sessions only as hashes', async () => {
    await createUser({ email: 'anna@example.com' });
    const cookie = cookieFrom((await login('anna@example.com')).headers) ?? '';
    const token = cookie.split('=')[1] ?? '';
    const [rows] = await sequelize.query('SELECT token_hash FROM sessions');

    assert.ok(token.length > 0);
    assert.ok(
      (rows as { token_hash: string }[]).every(({ token_hash }) => !token_hash.includes(token)),
    );
  });
});

describe('two-factor authentication', () => {
  it('asks for a code after the password once 2FA is on, and accepts a valid one', async () => {
    await createUser({ email: 'anna@example.com' });
    const first = cookieFrom((await login('anna@example.com')).headers) ?? '';

    const setup = await api('/api/v1/auth/two-factor/setup', { method: 'POST', cookie: first });
    const secret = setup.body.data.secret as string;

    const enable = await api('/api/v1/auth/two-factor/enable', {
      method: 'POST',
      cookie: first,
      body: { code: totpCode(secret, currentStep()) },
    });

    assert.equal(enable.status, 200);
    assert.equal(enable.body.data.recoveryCodes.length, 10);

    // A new sign-in is only half-open until the code is given.
    const second = await login('anna@example.com');
    const pending = cookieFrom(second.headers) ?? '';

    assert.equal(second.body.data.session.status, 'two_factor_pending');
    assert.equal(
      (await api('/api/v1/stores', { method: 'POST', cookie: pending, body: {} })).status,
      403,
    );

    // The step of the code used to enable 2FA cannot be replayed; the next one is accepted.
    const verify = await api('/api/v1/auth/two-factor/verify', {
      method: 'POST',
      cookie: pending,
      body: { code: totpCode(secret, currentStep() + 1) },
    });

    assert.equal(verify.status, 200);
    assert.equal(verify.body.data.session.status, 'active');
  });

  it('accepts a recovery code once', async () => {
    await createUser({ email: 'anna@example.com' });
    const first = cookieFrom((await login('anna@example.com')).headers) ?? '';
    const secret = (await api('/api/v1/auth/two-factor/setup', { method: 'POST', cookie: first }))
      .body.data.secret as string;
    const { body } = await api('/api/v1/auth/two-factor/enable', {
      method: 'POST',
      cookie: first,
      body: { code: totpCode(secret, currentStep()) },
    });
    const recoveryCode = body.data.recoveryCodes[0] as string;

    const attempt = async () => {
      const pending = cookieFrom((await login('anna@example.com')).headers) ?? '';
      return api('/api/v1/auth/two-factor/verify', {
        method: 'POST',
        cookie: pending,
        body: { code: recoveryCode },
      });
    };

    assert.equal((await attempt()).status, 200);
    assert.equal((await attempt()).status, 400);
  });
});

describe('passwords', () => {
  it('changes the password, ends other sessions and keeps the current one', async () => {
    await createUser({ email: 'anna@example.com' });
    const current = cookieFrom((await login('anna@example.com')).headers) ?? '';
    const other = cookieFrom((await login('anna@example.com')).headers) ?? '';

    const res = await api('/api/v1/auth/password', {
      method: 'POST',
      cookie: current,
      body: { currentPassword: TEST_PASSWORD, newPassword: 'a brand new long password' },
    });

    assert.equal(res.status, 204);
    assert.equal((await api('/api/v1/auth/me', { cookie: current })).status, 200);
    assert.equal((await api('/api/v1/auth/me', { cookie: other })).status, 401);
    assert.equal((await login('anna@example.com', 'a brand new long password')).status, 200);
  });

  it('needs the current password to change it', async () => {
    await createUser({ email: 'anna@example.com' });
    const cookie = cookieFrom((await login('anna@example.com')).headers) ?? '';

    const res = await api('/api/v1/auth/password', {
      method: 'POST',
      cookie,
      body: { currentPassword: 'not the password', newPassword: 'a brand new long password' },
    });

    assert.equal(res.status, 400);
  });
});
