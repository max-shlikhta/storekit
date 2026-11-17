import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createStore, setupApi, signedInUser } from './helpers.js';

const api = setupApi();

const createCategory = async (storeId: string, body: Record<string, unknown>) => {
  const res = await api(`/api/v1/stores/${storeId}/categories`, { method: 'POST', body });

  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
};

describe('categories', () => {
  it('lists categories ordered by position then name', async () => {
    const storeId = await createStore(api, 'my-shop');
    await createCategory(storeId, { name: 'Dresses', position: 2 });
    await createCategory(storeId, { name: 'Suits', position: 1 });
    await createCategory(storeId, { name: 'Accessories', position: 2 });

    const res = await api(`/api/v1/stores/${storeId}/categories`);

    assert.deepEqual(
      res.body.data.map((category: { name: string }) => category.name),
      ['Suits', 'Accessories', 'Dresses'],
    );
  });

  it('keeps names unique within a store regardless of case, but not across stores', async () => {
    const first = await createStore(api, 'first-shop');
    const second = await createStore(api, 'second-shop');
    await createCategory(first, { name: 'Dresses' });

    const duplicate = await api(`/api/v1/stores/${first}/categories`, {
      method: 'POST',
      body: { name: 'dresses' },
    });

    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.details[0].path, 'name');
    await createCategory(second, { name: 'Dresses' });
  });

  it('does not delete a category that has products', async () => {
    const storeId = await createStore(api, 'my-shop');
    const category = await createCategory(storeId, { name: 'Dresses' });
    await api(`/api/v1/stores/${storeId}/products`, {
      method: 'POST',
      body: { title: 'Red dress', categoryId: category.id },
    });

    const res = await api(`/api/v1/stores/${storeId}/categories/${category.id}`, {
      method: 'DELETE',
    });

    assert.equal(res.status, 409);
  });

  it('is visible to staff but changed by the owner only', async () => {
    const storeId = await createStore(api, 'my-shop');
    const staff = await signedInUser('staff@example.com');
    await api(`/api/v1/stores/${storeId}/members`, {
      method: 'POST',
      body: { email: 'staff@example.com' },
    });

    assert.equal(
      (await api(`/api/v1/stores/${storeId}/categories`, { cookie: staff.cookie })).status,
      200,
    );
    assert.equal(
      (
        await api(`/api/v1/stores/${storeId}/categories`, {
          method: 'POST',
          cookie: staff.cookie,
          body: { name: 'Hats' },
        })
      ).status,
      403,
    );
  });

  it('cannot be seen or changed from another store', async () => {
    const mine = await createStore(api, 'my-shop');
    const category = await createCategory(mine, { name: 'Dresses' });
    const other = await signedInUser('other@example.com');
    const theirs = await createStore(api, 'their-shop', other.cookie);

    // Through their own store's path, with my category's id.
    const read = await api(`/api/v1/stores/${theirs}/categories/${category.id}`, {
      cookie: other.cookie,
    });
    const change = await api(`/api/v1/stores/${theirs}/categories/${category.id}`, {
      method: 'PATCH',
      cookie: other.cookie,
      body: { name: 'Hijacked' },
    });
    // And straight at my store's path.
    const direct = await api(`/api/v1/stores/${mine}/categories`, { cookie: other.cookie });

    assert.equal(read.status, 404);
    assert.equal(change.status, 404);
    assert.equal(direct.status, 404);
    assert.equal(
      (await api(`/api/v1/stores/${mine}/categories/${category.id}`)).body.data.name,
      'Dresses',
    );
  });
});
