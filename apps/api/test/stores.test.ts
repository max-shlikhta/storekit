import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';
import { createStore, setupApi, signedInUser } from './helpers.js';

const api = setupApi();

describe('stores', () => {
  it('makes the creator the owner', async () => {
    const storeId = await createStore(api, 'my-shop');
    const me = await api('/api/v1/auth/me');

    assert.deepEqual(
      me.body.data.stores.map(({ id, role }: { id: string; role: string }) => ({ id, role })),
      [{ id: storeId, role: 'owner' }],
    );
  });

  it('rejects a slug that is taken, reserved or badly formed', async () => {
    await createStore(api, 'my-shop');

    for (const slug of ['my-shop', 'login', 'Bad Slug', 'x']) {
      const res = await api('/api/v1/stores', { method: 'POST', body: { slug, name: 'Shop' } });

      assert.ok([400, 409].includes(res.status), `${slug}: ${String(res.status)}`);
    }
  });

  it('does not show a store to someone outside it, and answers 404 rather than 403', async () => {
    const storeId = await createStore(api, 'my-shop');
    const stranger = await signedInUser('stranger@example.com');

    const res = await api(`/api/v1/stores/${storeId}`, { cookie: stranger.cookie });
    const missing = await api(`/api/v1/stores/${randomUUID()}`, { cookie: stranger.cookie });

    assert.equal(res.status, 404);
    // A store that exists and one that does not look the same from outside.
    assert.deepEqual(res.body.error.message, missing.body.error.message);
  });

  it('lets only the owner rename the store', async () => {
    const storeId = await createStore(api, 'my-shop');
    const staff = await signedInUser('staff@example.com');
    await api(`/api/v1/stores/${storeId}/members`, {
      method: 'POST',
      body: { email: 'staff@example.com' },
    });

    const denied = await api(`/api/v1/stores/${storeId}`, {
      method: 'PATCH',
      cookie: staff.cookie,
      body: { name: 'Renamed' },
    });
    const allowed = await api(`/api/v1/stores/${storeId}`, {
      method: 'PATCH',
      body: { name: 'Renamed' },
    });

    assert.equal(denied.status, 403);
    assert.equal(allowed.status, 200);
    assert.equal(allowed.body.data.name, 'Renamed');
  });
});

describe('team', () => {
  it('adds an existing account as staff and removes them again', async () => {
    const storeId = await createStore(api, 'my-shop');
    const staff = await signedInUser('staff@example.com');

    const added = await api(`/api/v1/stores/${storeId}/members`, {
      method: 'POST',
      body: { email: 'staff@example.com' },
    });

    assert.equal(added.status, 200);
    assert.equal((await api(`/api/v1/stores/${storeId}`, { cookie: staff.cookie })).status, 200);

    await api(`/api/v1/stores/${storeId}/members/${staff.user.id}`, { method: 'DELETE' });

    assert.equal((await api(`/api/v1/stores/${storeId}`, { cookie: staff.cookie })).status, 404);
  });

  it('refuses unknown emails and duplicates, and never removes an owner', async () => {
    const storeId = await createStore(api, 'my-shop');
    const me = await api('/api/v1/auth/me');
    await signedInUser('staff@example.com');
    const add = () =>
      api(`/api/v1/stores/${storeId}/members`, {
        method: 'POST',
        body: { email: 'staff@example.com' },
      });

    assert.equal(
      (
        await api(`/api/v1/stores/${storeId}/members`, {
          method: 'POST',
          body: { email: 'nobody@example.com' },
        })
      ).status,
      404,
    );
    assert.equal((await add()).status, 200);
    assert.equal((await add()).status, 409);
    assert.equal(
      (await api(`/api/v1/stores/${storeId}/members/${me.body.data.user.id}`, { method: 'DELETE' }))
        .status,
      403,
    );
  });

  it('keeps the team list from staff', async () => {
    const storeId = await createStore(api, 'my-shop');
    const staff = await signedInUser('staff@example.com');
    await api(`/api/v1/stores/${storeId}/members`, {
      method: 'POST',
      body: { email: 'staff@example.com' },
    });

    assert.equal(
      (await api(`/api/v1/stores/${storeId}/members`, { cookie: staff.cookie })).status,
      403,
    );
  });
});
