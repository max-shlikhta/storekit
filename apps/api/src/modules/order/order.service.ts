import type { Transaction } from 'sequelize';
import { sequelize } from '../../database/index.js';
import { AppError } from '../../shared/app-error.js';
import type { Pagination } from '../../shared/http/pagination.js';
import { customerRepository } from '../customer/customer.repository.js';
import { applyStockChange } from '../inventory/inventory.service.js';
import { productVariantRepository } from '../product/product-variant.repository.js';
import { productRepository } from '../product/product.repository.js';
import type { Store } from '../store/store.model.js';
import type { Order } from './order.model.js';
import { orderRepository } from './order.repository.js';
import type { ChangeStatusInput, CreateOrderInput } from './order.schema.js';
import {
  ALLOWED_TRANSITIONS,
  MAX_ORDER_TOTAL_MINOR,
  type OrderLineDraft,
  type OrderListFilters,
  type OrderStatus,
} from './order.types.js';

const byVariantId = <T extends { variantId: string }>(left: T, right: T) =>
  left.variantId.localeCompare(right.variantId);

// The order's own customer: a chosen card, one found by phone, or a new one.
const resolveCustomer = async (
  storeId: string,
  input: CreateOrderInput,
  transaction: Transaction,
) => {
  if (input.customerId) {
    const customer = await customerRepository.findById(storeId, input.customerId, transaction);

    if (!customer) {
      throw new AppError('VALIDATION_ERROR', 'Customer not found', [
        { path: 'customerId', message: 'Customer not found in this store' },
      ]);
    }

    return customer;
  }

  const draft = input.customer;

  if (!draft) {
    throw new AppError('VALIDATION_ERROR', 'Pass either customerId or customer');
  }

  const known = draft.phone
    ? await customerRepository.findByPhone(storeId, draft.phone, transaction)
    : null;

  return known ?? customerRepository.create(storeId, draft, transaction);
};

// Every line must be a variant of this store that can be sold right now.
const loadSellable = async (storeId: string, lines: OrderLineDraft[], transaction: Transaction) => {
  const variants = await productVariantRepository.lockByIds(
    storeId,
    lines.map(({ variantId }) => variantId),
    transaction,
  );
  const products = await productRepository.findByIds(
    storeId,
    [...new Set(variants.map(({ productId }) => productId))],
    transaction,
  );

  return lines.map((line) => {
    const variant = variants.find(({ id }) => id === line.variantId);
    const product = products.find(({ id }) => id === variant?.productId);
    const path = `lines.${line.index}.variantId`;

    if (!variant || !product) {
      throw new AppError('VALIDATION_ERROR', 'Variant not found', [
        { path, message: 'Variant not found' },
      ]);
    }

    if (product.status !== 'active' || !variant.isActive) {
      throw new AppError('CONFLICT', 'Variant is not available for sale', [
        { path, message: 'The product must be active and the variant enabled' },
      ]);
    }

    return { line, variant, product };
  });
};

const getOrderWithDetails = async (storeId: string, orderId: string) => {
  const order = await orderRepository.findById(storeId, orderId);

  if (!order) {
    throw new AppError('NOT_FOUND', 'Order not found');
  }

  return {
    order,
    lines: await orderRepository.findLines(storeId, [order.id]),
    events: await orderRepository.findEvents(storeId, order.id),
  };
};

export const orderService = {
  getOrders: async (storeId: string, filters: OrderListFilters, pagination: Pagination) => {
    const { rows, count } = await orderRepository.findAll(storeId, filters, pagination);

    return {
      orders: rows,
      lines: await orderRepository.findLines(
        storeId,
        rows.map(({ id }) => id),
      ),
      total: count,
    };
  },

  getOrder: getOrderWithDetails,

  // Everything happens in one transaction: the number, the customer, the stock taken for every
  // line and the order itself. Any failure (say, one line out of stock) leaves nothing behind.
  createOrder: async (store: Store, input: CreateOrderInput, actorUserId: string) => {
    if (!store.isActive) {
      throw new AppError('CONFLICT', 'Store is inactive and cannot take orders');
    }

    const orderId = await sequelize.transaction(async (transaction) => {
      const drafts = input.lines.map((line, index) => ({ ...line, index }));
      const sellable = await loadSellable(store.id, drafts, transaction);
      const lines = sellable.map(({ line, variant, product }) => ({
        ...line,
        productTitle: product.title,
        variantTitle: variant.title,
        sku: variant.sku,
        unitPriceMinor: variant.priceMinor,
        unitCostMinor: variant.costPriceMinor,
      }));

      const subtotalMinor = lines.reduce(
        (sum, line) => sum + line.unitPriceMinor * line.quantity,
        0,
      );
      const discountMinor = input.discountMinor ?? 0;

      if (discountMinor > subtotalMinor) {
        throw new AppError('VALIDATION_ERROR', 'Discount cannot exceed the order subtotal', [
          { path: 'discountMinor', message: `Subtotal is ${subtotalMinor}` },
        ]);
      }

      if (subtotalMinor > MAX_ORDER_TOTAL_MINOR) {
        throw new AppError('VALIDATION_ERROR', 'Order total is too large', [
          { path: 'lines', message: 'Order total is too large' },
        ]);
      }

      const customer = await resolveCustomer(store.id, input, transaction);
      const order = await orderRepository.create(
        {
          storeId: store.id,
          number: await orderRepository.allocateNumber(store.id, transaction),
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          currency: store.currency,
          subtotalMinor,
          discountMinor,
          totalMinor: subtotalMinor - discountMinor,
          note: input.note ?? null,
        },
        transaction,
      );

      // Variants are always touched in ascending id order (the same order they were locked in),
      // so two orders with the same products can never deadlock.
      for (const line of [...lines].sort(byVariantId)) {
        await applyStockChange(
          {
            storeId: store.id,
            variantId: line.variantId,
            delta: -line.quantity,
            reason: 'order',
            orderId: order.id,
            note: `Order #${order.number}`,
            errorPath: `lines.${line.index}.quantity`,
          },
          transaction,
        );
      }

      await orderRepository.createLines(
        lines.map((line) => ({
          storeId: store.id,
          orderId: order.id,
          variantId: line.variantId,
          productTitle: line.productTitle,
          variantTitle: line.variantTitle,
          sku: line.sku,
          unitPriceMinor: line.unitPriceMinor,
          unitCostMinor: line.unitCostMinor,
          quantity: line.quantity,
          lineTotalMinor: line.unitPriceMinor * line.quantity,
          position: line.index,
        })),
        transaction,
      );
      await orderRepository.recordEvent(
        {
          storeId: store.id,
          orderId: order.id,
          type: 'created',
          actorUserId,
          data: { lines: lines.length },
        },
        transaction,
      );

      return order.id;
    });

    return getOrderWithDetails(store.id, orderId);
  },

  changeStatus: async (
    storeId: string,
    orderId: string,
    input: ChangeStatusInput,
    actorUserId: string,
  ) => {
    await sequelize.transaction(async (transaction) => {
      // The order row is locked first: two people changing the same order are taken in turn.
      const order = await orderRepository.findById(storeId, orderId, {
        transaction,
        lock: true,
      });

      if (!order) {
        throw new AppError('NOT_FOUND', 'Order not found');
      }

      const fromStatus: OrderStatus = order.status;
      const allowed = ALLOWED_TRANSITIONS[fromStatus];

      if (!allowed.includes(input.status)) {
        throw new AppError('CONFLICT', `Order cannot move from ${fromStatus} to ${input.status}`, [
          { path: 'status', message: `Allowed next statuses: ${allowed.join(', ') || 'none'}` },
        ]);
      }

      const now = new Date();

      switch (input.status) {
        case 'confirmed':
          await orderRepository.update(
            order,
            { status: 'confirmed', confirmedAt: now },
            transaction,
          );
          break;

        case 'shipped':
          await orderRepository.update(order, { status: 'shipped', shippedAt: now }, transaction);
          break;

        case 'completed':
          await orderRepository.update(
            order,
            { status: 'completed', completedAt: now },
            transaction,
          );
          break;

        // Cancelling gives the goods back to the shelf, in the same transaction.
        case 'cancelled': {
          await returnStockOf(order, transaction);
          await orderRepository.update(
            order,
            { status: 'cancelled', cancelledAt: now, cancelReason: input.reason ?? '' },
            transaction,
          );
          break;
        }

        case 'new':
          break;
      }

      await orderRepository.recordEvent(
        {
          storeId,
          orderId,
          type: 'status_changed',
          actorUserId,
          fromStatus,
          toStatus: input.status,
          data: { reason: input.reason ?? null },
        },
        transaction,
      );
    });

    return getOrderWithDetails(storeId, orderId);
  },
};

const returnStockOf = async (order: Order, transaction: Transaction) => {
  const lines = await orderRepository.findLines(order.storeId, [order.id], transaction);

  for (const line of [...lines].sort(byVariantId)) {
    await applyStockChange(
      {
        storeId: order.storeId,
        variantId: line.variantId,
        delta: line.quantity,
        reason: 'order_cancel',
        orderId: order.id,
        note: `Order #${order.number}`,
      },
      transaction,
    );
  }
};
