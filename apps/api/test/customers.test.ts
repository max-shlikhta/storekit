import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createStore, setupApi, signedInUser } from './helpers.js';

const api = setupApi();

describe('customers', () => {
  it('creates, finds and updates a customer', async () => {
    const storeId = await createStore(api, 'my-shop');
    const created = await api(`/api/v1/stores/${storeId}/customers`, {
      method: 'POST',
      body: { name: 'Anna', phone: '+380 50 123 45 67' },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data.phone, '+380501234567');

    const found = await api(`/api/v1/stores/${storeId}/customers?search=ann`);
    const updated = await api(`/api/v1/stores/${storeId}/customers/${created.body.data.id}`, {
      method: 'PATCH',
      body: { note: 'Prefers evening calls' },
    });

    assert.equal(found.body.meta.total, 1);
    assert.equal(updated.body.data.note, 'Prefers evening calls');
  });

  it('keeps a phone unique within a store but not across stores', async () => {
    const first = await createStore(api, 'first-shop');
    const second = await createStore(api, 'second-shop');
    const body = { name: 'Anna', phone: '+380501234567' };
    await api(`/api/v1/stores/${first}/customers`, { method: 'POST', body });

    const duplicate = await api(`/api/v1/stores/${first}/customers`, { method: 'POST', body });
    const elsewhere = await api(`/api/v1/stores/${second}/customers`, { method: 'POST', body });

    assert.equal(duplicate.status, 409);
    assert.equal(elsewhere.status, 201);
  });

  it('rejects a phone that is not in international format', async () => {
    const storeId = await createStore(api, 'my-shop');
    const res = await api(`/api/v1/stores/${storeId}/customers`, {
      method: 'POST',
      body: { name: 'Anna', phone: '0501234567' },
    });

    assert.equal(res.status, 400);
  });

  it('cannot be seen or changed from another store', async () => {
    const mine = await createStore(api, 'my-shop');
    const customer = await api(`/api/v1/stores/${mine}/customers`, {
      method: 'POST',
      body: { name: 'Anna' },
    });
    const other = await signedInUser('other@example.com');
    const theirs = await createStore(api, 'their-shop', other.cookie);

    const read = await api(`/api/v1/stores/${theirs}/customers/${customer.body.data.id}`, {
      cookie: other.cookie,
    });
    const change = await api(`/api/v1/stores/${theirs}/customers/${customer.body.data.id}`, {
      method: 'PATCH',
      cookie: other.cookie,
      body: { name: 'Hijacked' },
    });
    const list = await api(`/api/v1/stores/${theirs}/customers`, { cookie: other.cookie });

    assert.equal(read.status, 404);
    assert.equal(change.status, 404);
    assert.equal(list.body.meta.total, 0);
  });
});
