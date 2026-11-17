import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setupApi } from './helpers.js';

const api = setupApi();

describe('health and basics', () => {
  it('answers the health check without a session', async () => {
    const res = await api('/health', { cookie: null });

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  it('answers 404 in the common error format for an unknown path', async () => {
    const res = await api('/api/v1/nothing-here');

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('refuses state changes from a foreign origin', async () => {
    const res = await api('/api/v1/stores', {
      method: 'POST',
      body: { slug: 'shop', name: 'Shop' },
      headers: { origin: 'https://evil.example' },
    });

    assert.equal(res.status, 403);
  });

  it('puts a request id on every response', async () => {
    const res = await api('/health', { cookie: null });

    assert.ok(res.headers.get('x-request-id'));
  });
});
