import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sequelize } from '../src/database/index.js';
import { createSellableProduct, createStore, setupApi, signedInUser } from './helpers.js';

const api = setupApi();

const placeOrder = (
  storeId: string,
  lines: { variantId: string; quantity: number }[],
  extra = {},
) =>
  api(`/api/v1/stores/${storeId}/orders`, {
    method: 'POST',
    body: { customer: { name: 'Anna', phone: '+380501234567' }, lines, ...extra },
  });

const stockOf = async (storeId: string, productId: string) => {
  const res = await api(`/api/v1/stores/${storeId}/products/${productId}`);
  return res.body.data.variants[0].stockOnHand as number;
};

const changeStatus = (storeId: string, orderId: string, body: unknown, cookie?: string) =>
  api(`/api/v1/stores/${storeId}/orders/${orderId}/status`, {
    method: 'POST',
    body,
    ...(cookie !== undefined && { cookie }),
  });

describe('creating an order', () => {
  it('takes stock, snapshots prices and numbers orders per store', async () => {
    const storeId = await createStore(api, 'my-shop');
    const { productId, variantId } = await createSellableProduct(api, storeId, {
      sku: 'TEE-M',
      priceMinor: 1500,
      stock: 5,
    });

    const first = await placeOrder(storeId, [{ variantId, quantity: 2 }], { discountMinor: 500 });
    const second = await placeOrder(storeId, [{ variantId, quantity: 1 }]);

    assert.equal(first.status, 201, JSON.stringify(first.body));
    assert.equal(first.body.data.number, 1);
    assert.equal(second.body.data.number, 2);
    assert.equal(first.body.data.subtotalMinor, 3000);
    assert.equal(first.body.data.totalMinor, 2500);
    assert.equal(first.body.data.lines[0].unitPriceMinor, 1500);
    assert.equal(await stockOf(storeId, productId), 2);

    // A later price change does not touch an order already made.
    await api(`/api/v1/stores/${storeId}/products/${productId}/variants/${variantId}`, {
      method: 'PATCH',
      body: { priceMinor: 9999 },
    });
    const again = await api(`/api/v1/stores/${storeId}/orders/${first.body.data.id}`);

    assert.equal(again.body.data.lines[0].unitPriceMinor, 1500);
  });

  it('numbers orders independently in each store', async () => {
    const first = await createStore(api, 'first-shop');
    const second = await createStore(api, 'second-shop');
    const a = await createSellableProduct(api, first, { sku: 'A' });
    const b = await createSellableProduct(api, second, { sku: 'A' });

    await placeOrder(first, [{ variantId: a.variantId, quantity: 1 }]);
    const inSecond = await placeOrder(second, [{ variantId: b.variantId, quantity: 1 }]);

    assert.equal(inSecond.body.data.number, 1);
  });

  it('reuses the customer found by phone', async () => {
    const storeId = await createStore(api, 'my-shop');
    const { variantId } = await createSellableProduct(api, storeId, { sku: 'TEE-M', stock: 5 });

    await placeOrder(storeId, [{ variantId, quantity: 1 }]);
    await placeOrder(storeId, [{ variantId, quantity: 1 }]);
    const customers = await api(`/api/v1/stores/${storeId}/customers`);

    assert.equal(customers.body.meta.total, 1);
  });

  it('refuses more than is in stock and leaves nothing behind', async () => {
    const storeId = await createStore(api, 'my-shop');
    const stocked = await createSellableProduct(api, storeId, { sku: 'A', stock: 5 });
    const scarce = await createSellableProduct(api, storeId, { sku: 'B', stock: 1 });

    const res = await placeOrder(storeId, [
      { variantId: stocked.variantId, quantity: 2 },
      { variantId: scarce.variantId, quantity: 2 },
    ]);

    assert.equal(res.status, 409);
    // The whole order rolled back: the first line's stock is still on the shelf.
    assert.equal(await stockOf(storeId, stocked.productId), 5);
    assert.equal((await api(`/api/v1/stores/${storeId}/orders`)).body.meta.total, 0);
    assert.equal((await api(`/api/v1/stores/${storeId}/customers`)).body.meta.total, 0);
  });

  it('lets a backorder variant go below zero', async () => {
    const storeId = await createStore(api, 'my-shop');
    const { productId, variantId } = await createSellableProduct(api, storeId, {
      sku: 'TEE-M',
      stock: 1,
      backorder: true,
    });

    const res = await placeOrder(storeId, [{ variantId, quantity: 3 }]);

    assert.equal(res.status, 201);
    assert.equal(await stockOf(storeId, productId), -2);
  });

  it('never oversells the last unit under parallel orders', async () => {
    const storeId = await createStore(api, 'my-shop');
    const { productId, variantId } = await createSellableProduct(api, storeId, {
      sku: 'TEE-M',
      stock: 3,
    });

    const results = await Promise.all(
      Array.from({ length: 8 }, () => placeOrder(storeId, [{ variantId, quantity: 1 }])),
    );
    const accepted = results.filter(({ status }) => status === 201).length;

    assert.equal(accepted, 3);
    assert.ok(results.every(({ status }) => [201, 409].includes(status)));
    assert.equal(await stockOf(storeId, productId), 0);
  });

  it('does not deadlock when orders take the same products in opposite orders', async () => {
    const storeId = await createStore(api, 'my-shop');
    const a = await createSellableProduct(api, storeId, { sku: 'A', stock: 50 });
    const b = await createSellableProduct(api, storeId, { sku: 'B', stock: 50 });

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        placeOrder(
          storeId,
          index % 2 === 0
            ? [
                { variantId: a.variantId, quantity: 1 },
                { variantId: b.variantId, quantity: 1 },
              ]
            : [
                { variantId: b.variantId, quantity: 1 },
                { variantId: a.variantId, quantity: 1 },
              ],
        ),
      ),
    );

    assert.ok(
      results.every(({ status }) => status === 201),
      JSON.stringify(results.map((r) => r.body)),
    );
    assert.equal(await stockOf(storeId, a.productId), 40);
  });

  it('refuses a draft product, a repeated variant and an oversized discount', async () => {
    const storeId = await createStore(api, 'my-shop');
    const { variantId } = await createSellableProduct(api, storeId, { sku: 'TEE-M' });
    const draft = await api(`/api/v1/stores/${storeId}/products`, {
      method: 'POST',
      body: { title: 'Draft' },
    });
    const draftVariant = await api(
      `/api/v1/stores/${storeId}/products/${draft.body.data.id}/variants`,
      { method: 'POST', body: { sku: 'DRAFT', title: 'M', priceMinor: 100, initialStock: 5 } },
    );

    assert.equal(
      (await placeOrder(storeId, [{ variantId: draftVariant.body.data.id, quantity: 1 }])).status,
      409,
    );
    assert.equal(
      (
        await placeOrder(storeId, [
          { variantId, quantity: 1 },
          { variantId, quantity: 1 },
        ])
      ).status,
      400,
    );
    assert.equal(
      (await placeOrder(storeId, [{ variantId, quantity: 1 }], { discountMinor: 5000 })).status,
      400,
    );
  });

  it('refuses orders in an inactive store', async () => {
    const storeId = await createStore(api, 'my-shop');
    const { variantId } = await createSellableProduct(api, storeId, { sku: 'TEE-M' });
    await api(`/api/v1/stores/${storeId}`, { method: 'PATCH', body: { isActive: false } });

    assert.equal((await placeOrder(storeId, [{ variantId, quantity: 1 }])).status, 409);
  });
});

describe('order status', () => {
  const orderIn = async () => {
    const storeId = await createStore(api, 'my-shop');
    const product = await createSellableProduct(api, storeId, { sku: 'TEE-M', stock: 5 });
    const order = await placeOrder(storeId, [{ variantId: product.variantId, quantity: 2 }]);

    return { storeId, ...product, orderId: order.body.data.id as string };
  };

  it('walks new → confirmed → shipped → completed and records every step', async () => {
    const { storeId, orderId } = await orderIn();

    for (const status of ['confirmed', 'shipped', 'completed']) {
      assert.equal((await changeStatus(storeId, orderId, { status })).status, 200, status);
    }

    const order = await api(`/api/v1/stores/${storeId}/orders/${orderId}`);

    assert.equal(order.body.data.status, 'completed');
    assert.deepEqual(
      order.body.data.events.map(
        (event: { type: string; toStatus: string | null }) => event.toStatus,
      ),
      [null, 'confirmed', 'shipped', 'completed'],
    );
  });

  it('refuses a jump that the status flow does not allow', async () => {
    const { storeId, orderId } = await orderIn();

    const res = await changeStatus(storeId, orderId, { status: 'completed' });

    assert.equal(res.status, 409);
    assert.match(res.body.error.details[0].message, /confirmed, cancelled/);
  });

  it('returns the goods to the shelf on cancel, once', async () => {
    const { storeId, productId, orderId } = await orderIn();

    assert.equal(await stockOf(storeId, productId), 3);
    assert.equal((await changeStatus(storeId, orderId, { status: 'cancelled' })).status, 400);

    const cancelled = await changeStatus(storeId, orderId, {
      status: 'cancelled',
      reason: 'Customer changed their mind',
    });

    assert.equal(cancelled.status, 200);
    assert.equal(await stockOf(storeId, productId), 5);

    // A second cancel is refused, so the stock cannot be returned twice.
    const again = await changeStatus(storeId, orderId, { status: 'cancelled', reason: 'Again' });

    assert.equal(again.status, 409);
    assert.equal(await stockOf(storeId, productId), 5);
  });

  it('cannot cancel an order that has been shipped', async () => {
    const { storeId, orderId } = await orderIn();
    await changeStatus(storeId, orderId, { status: 'confirmed' });
    await changeStatus(storeId, orderId, { status: 'shipped' });

    const res = await changeStatus(storeId, orderId, { status: 'cancelled', reason: 'Too late' });

    assert.equal(res.status, 409);
  });

  it('survives two people cancelling the same order at once', async () => {
    const { storeId, productId, orderId } = await orderIn();

    const results = await Promise.all([
      changeStatus(storeId, orderId, { status: 'cancelled', reason: 'First' }),
      changeStatus(storeId, orderId, { status: 'cancelled', reason: 'Second' }),
    ]);

    assert.deepEqual(results.map(({ status }) => status).sort(), [200, 409]);
    assert.equal(await stockOf(storeId, productId), 5);
  });
});

describe('order privacy and isolation', () => {
  it('hides purchase prices of order lines from staff', async () => {
    const storeId = await createStore(api, 'my-shop');
    const { variantId } = await createSellableProduct(api, storeId, { sku: 'TEE-M' });
    const staff = await signedInUser('staff@example.com');
    await api(`/api/v1/stores/${storeId}/members`, {
      method: 'POST',
      body: { email: 'staff@example.com' },
    });
    const order = await placeOrder(storeId, [{ variantId, quantity: 1 }]);

    const owner = await api(`/api/v1/stores/${storeId}/orders/${order.body.data.id}`);
    const seen = await api(`/api/v1/stores/${storeId}/orders/${order.body.data.id}`, {
      cookie: staff.cookie,
    });

    assert.equal(owner.body.data.lines[0].unitCostMinor, 400);
    assert.equal('unitCostMinor' in seen.body.data.lines[0], false);
  });

  it('lets staff take and handle orders', async () => {
    const storeId = await createStore(api, 'my-shop');
    const { variantId } = await createSellableProduct(api, storeId, { sku: 'TEE-M' });
    const staff = await signedInUser('staff@example.com');
    await api(`/api/v1/stores/${storeId}/members`, {
      method: 'POST',
      body: { email: 'staff@example.com' },
    });

    const order = await api(`/api/v1/stores/${storeId}/orders`, {
      method: 'POST',
      cookie: staff.cookie,
      body: { customer: { name: 'Walk-in' }, lines: [{ variantId, quantity: 1 }] },
    });

    assert.equal(order.status, 201);
    assert.equal(
      (await changeStatus(storeId, order.body.data.id, { status: 'confirmed' }, staff.cookie))
        .status,
      200,
    );
  });

  it('cannot see, change or sell from another store', async () => {
    const mine = await createStore(api, 'my-shop');
    const { variantId } = await createSellableProduct(api, mine, { sku: 'TEE-M' });
    const order = await placeOrder(mine, [{ variantId, quantity: 1 }]);
    const other = await signedInUser('other@example.com');
    const theirs = await createStore(api, 'their-shop', other.cookie);

    const read = await api(`/api/v1/stores/${theirs}/orders/${order.body.data.id}`, {
      cookie: other.cookie,
    });
    const change = await changeStatus(
      theirs,
      order.body.data.id,
      { status: 'confirmed' },
      other.cookie,
    );
    // Selling my variant through their store.
    const steal = await api(`/api/v1/stores/${theirs}/orders`, {
      method: 'POST',
      cookie: other.cookie,
      body: { customer: { name: 'Thief' }, lines: [{ variantId, quantity: 1 }] },
    });
    const list = await api(`/api/v1/stores/${theirs}/orders`, { cookie: other.cookie });

    assert.equal(read.status, 404);
    assert.equal(change.status, 404);
    assert.equal(steal.status, 400);
    assert.equal(list.body.meta.total, 0);
  });

  it('keeps every foreign key composite so the database itself refuses cross-store rows', async () => {
    const mine = await createStore(api, 'my-shop');
    const { variantId } = await createSellableProduct(api, mine, { sku: 'TEE-M' });
    const other = await signedInUser('other@example.com');
    const theirs = await createStore(api, 'their-shop', other.cookie);

    await assert.rejects(
      sequelize.query(
        `INSERT INTO stock_movements (store_id, variant_id, reason, delta, quantity_after)
         VALUES (:theirs, :variantId, 'restock', 1, 1)`,
        { replacements: { theirs, variantId } },
      ),
      /stock_movements_store_id_variant_id_fkey/,
    );
  });

  it('searches orders by number and by customer name', async () => {
    const storeId = await createStore(api, 'my-shop');
    const { variantId } = await createSellableProduct(api, storeId, { sku: 'TEE-M', stock: 5 });
    await placeOrder(storeId, [{ variantId, quantity: 1 }]);
    await api(`/api/v1/stores/${storeId}/orders`, {
      method: 'POST',
      body: { customer: { name: 'Borys' }, lines: [{ variantId, quantity: 1 }] },
    });

    const byNumber = await api(`/api/v1/stores/${storeId}/orders?search=%232`);
    const byName = await api(`/api/v1/stores/${storeId}/orders?search=anna`);

    assert.equal(byNumber.body.data[0].customerName, 'Borys');
    assert.equal(byName.body.data[0].customerName, 'Anna');
  });
});
