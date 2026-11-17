import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSellableProduct, createStore, setupApi, signedInUser } from './helpers.js';

const api = setupApi();

const addStaff = async (storeId: string, email = 'staff@example.com') => {
  const staff = await signedInUser(email);
  await api(`/api/v1/stores/${storeId}/members`, { method: 'POST', body: { email } });
  return staff;
};

describe('products', () => {
  it('starts as a draft and needs an active variant to go on sale', async () => {
    const storeId = await createStore(api, 'my-shop');
    const created = await api(`/api/v1/stores/${storeId}/products`, {
      method: 'POST',
      body: { title: 'T-shirt' },
    });

    assert.equal(created.body.data.status, 'draft');

    const early = await api(`/api/v1/stores/${storeId}/products/${created.body.data.id}`, {
      method: 'PATCH',
      body: { status: 'active' },
    });

    assert.equal(early.status, 409);

    await api(`/api/v1/stores/${storeId}/products/${created.body.data.id}/variants`, {
      method: 'POST',
      body: { sku: 'TEE-M', title: 'M', priceMinor: 1500 },
    });
    const live = await api(`/api/v1/stores/${storeId}/products/${created.body.data.id}`, {
      method: 'PATCH',
      body: { status: 'active' },
    });

    assert.equal(live.status, 200);
    assert.equal(live.body.data.status, 'active');
  });

  it('keeps SKUs unique within a store but lets another store reuse them', async () => {
    const first = await createStore(api, 'first-shop');
    const second = await createStore(api, 'second-shop');
    await createSellableProduct(api, first, { sku: 'TEE-M' });

    const product = await api(`/api/v1/stores/${first}/products`, {
      method: 'POST',
      body: { title: 'Another' },
    });
    const duplicate = await api(
      `/api/v1/stores/${first}/products/${product.body.data.id}/variants`,
      {
        method: 'POST',
        body: { sku: 'tee-m', title: 'L', priceMinor: 100 },
      },
    );

    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.details[0].path, 'sku');
    await createSellableProduct(api, second, { sku: 'TEE-M' });
  });

  it('deletes a draft but archives anything with stock history', async () => {
    const storeId = await createStore(api, 'my-shop');
    const draft = await api(`/api/v1/stores/${storeId}/products`, {
      method: 'POST',
      body: { title: 'Draft' },
    });

    assert.equal(
      (await api(`/api/v1/stores/${storeId}/products/${draft.body.data.id}`, { method: 'DELETE' }))
        .status,
      204,
    );

    const { productId } = await createSellableProduct(api, storeId, { sku: 'TEE-M' });

    assert.equal(
      (await api(`/api/v1/stores/${storeId}/products/${productId}`, { method: 'DELETE' })).status,
      409,
    );
  });

  it('will not switch off the last active variant of a product on sale', async () => {
    const storeId = await createStore(api, 'my-shop');
    const { productId, variantId } = await createSellableProduct(api, storeId, { sku: 'TEE-M' });

    const res = await api(`/api/v1/stores/${storeId}/products/${productId}/variants/${variantId}`, {
      method: 'PATCH',
      body: { isActive: false },
    });

    assert.equal(res.status, 409);
  });

  it('filters by status and searches the title', async () => {
    const storeId = await createStore(api, 'my-shop');
    await createSellableProduct(api, storeId, { title: 'Red dress', sku: 'RED-1' });
    await api(`/api/v1/stores/${storeId}/products`, {
      method: 'POST',
      body: { title: 'Blue coat' },
    });

    const live = await api(`/api/v1/stores/${storeId}/products?status=active`);
    const search = await api(`/api/v1/stores/${storeId}/products?search=coat`);

    assert.deepEqual(
      live.body.data.map((product: { title: string }) => product.title),
      ['Red dress'],
    );
    assert.deepEqual(
      search.body.data.map((product: { title: string }) => product.title),
      ['Blue coat'],
    );
  });

  it('rejects a category from another store', async () => {
    const mine = await createStore(api, 'my-shop');
    const other = await signedInUser('other@example.com');
    const theirs = await createStore(api, 'their-shop', other.cookie);
    const category = await api(`/api/v1/stores/${theirs}/categories`, {
      method: 'POST',
      cookie: other.cookie,
      body: { name: 'Secret' },
    });

    const res = await api(`/api/v1/stores/${mine}/products`, {
      method: 'POST',
      body: { title: 'Sneaky', categoryId: category.body.data.id },
    });

    assert.equal(res.status, 400);
  });

  it('hides the purchase price from staff and rejects it in their input', async () => {
    const storeId = await createStore(api, 'my-shop');
    const staff = await addStaff(storeId);
    const { productId } = await createSellableProduct(api, storeId, { sku: 'TEE-M' });

    const owner = await api(`/api/v1/stores/${storeId}/products/${productId}`);
    const seen = await api(`/api/v1/stores/${storeId}/products/${productId}`, {
      cookie: staff.cookie,
    });

    assert.equal(owner.body.data.variants[0].costPriceMinor, 400);
    assert.equal('costPriceMinor' in seen.body.data.variants[0], false);

    // Staff cannot change the catalog at all, so the price is refused before it matters.
    const write = await api(`/api/v1/stores/${storeId}/products/${productId}/variants`, {
      method: 'POST',
      cookie: staff.cookie,
      body: { sku: 'X', title: 'X', priceMinor: 100, costPriceMinor: 1 },
    });

    assert.equal(write.status, 403);
  });

  it('cannot be read through another store', async () => {
    const mine = await createStore(api, 'my-shop');
    const { productId } = await createSellableProduct(api, mine, { sku: 'TEE-M' });
    const other = await signedInUser('other@example.com');
    const theirs = await createStore(api, 'their-shop', other.cookie);

    const viaTheirStore = await api(`/api/v1/stores/${theirs}/products/${productId}`, {
      cookie: other.cookie,
    });
    const direct = await api(`/api/v1/stores/${mine}/products/${productId}`, {
      cookie: other.cookie,
    });
    const change = await api(`/api/v1/stores/${theirs}/products/${productId}`, {
      method: 'PATCH',
      cookie: other.cookie,
      body: { title: 'Hijacked' },
    });

    assert.equal(viaTheirStore.status, 404);
    assert.equal(direct.status, 404);
    assert.equal(change.status, 404);
  });
});
