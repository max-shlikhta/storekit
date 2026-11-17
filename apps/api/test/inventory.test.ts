import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sequelize } from '../src/database/index.js';
import { createSellableProduct, createStore, setupApi } from './helpers.js';

const api = setupApi();

const adjust = (storeId: string, productId: string, variantId: string, body: unknown) =>
  api(`/api/v1/stores/${storeId}/products/${productId}/variants/${variantId}/stock-adjustments`, {
    method: 'POST',
    body,
  });

describe('inventory', () => {
  it('writes the initial stock as a movement', async () => {
    const storeId = await createStore(api, 'my-shop');
    const { productId, variantId } = await createSellableProduct(api, storeId, {
      sku: 'TEE-M',
      stock: 7,
    });

    const res = await api(
      `/api/v1/stores/${storeId}/products/${productId}/variants/${variantId}/stock-movements`,
    );

    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].reason, 'initial');
    assert.equal(res.body.data[0].quantityAfter, 7);
  });

  it('changes stock by a delta and by a stocktake, each with a movement', async () => {
    const storeId = await createStore(api, 'my-shop');
    const { productId, variantId } = await createSellableProduct(api, storeId, {
      sku: 'TEE-M',
      stock: 5,
    });

    const restock = await adjust(storeId, productId, variantId, {
      mode: 'delta',
      delta: 10,
      reason: 'restock',
    });
    const stocktake = await adjust(storeId, productId, variantId, { mode: 'set', quantity: 12 });

    assert.equal(restock.body.data.stockOnHand, 15);
    assert.equal(stocktake.body.data.stockOnHand, 12);
    assert.equal(stocktake.body.data.movement.delta, -3);
    assert.equal(stocktake.body.data.movement.reason, 'stocktake');
  });

  it('refuses to go below zero and a reason that contradicts the direction', async () => {
    const storeId = await createStore(api, 'my-shop');
    const { productId, variantId } = await createSellableProduct(api, storeId, {
      sku: 'TEE-M',
      stock: 2,
    });

    const below = await adjust(storeId, productId, variantId, {
      mode: 'delta',
      delta: -3,
      reason: 'write_off',
    });
    const contradiction = await adjust(storeId, productId, variantId, {
      mode: 'delta',
      delta: -1,
      reason: 'restock',
    });

    assert.equal(below.status, 409);
    assert.equal(contradiction.status, 400);
  });

  it('keeps the shelf equal to the sum of the journal', async () => {
    const storeId = await createStore(api, 'my-shop');
    const { productId, variantId } = await createSellableProduct(api, storeId, {
      sku: 'TEE-M',
      stock: 5,
    });
    await adjust(storeId, productId, variantId, { mode: 'delta', delta: 4, reason: 'restock' });
    await adjust(storeId, productId, variantId, { mode: 'delta', delta: -2, reason: 'write_off' });

    const [rows] = await sequelize.query(
      `SELECT v.stock_on_hand AS shelf, COALESCE(SUM(m.delta), 0)::int AS journal
         FROM product_variants v
         LEFT JOIN stock_movements m ON m.variant_id = v.id
        WHERE v.id = :variantId
        GROUP BY v.stock_on_hand`,
      { replacements: { variantId } },
    );

    assert.deepEqual(rows, [{ shelf: 7, journal: 7 }]);
  });
});
