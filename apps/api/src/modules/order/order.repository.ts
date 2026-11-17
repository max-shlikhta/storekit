import {
  type CreationAttributes,
  Op,
  QueryTypes,
  type Transaction,
  type WhereOptions,
} from 'sequelize';
import { Order, OrderEvent, OrderLine, sequelize } from '../../database/index.js';
import type { LockOptions } from '../../shared/database.js';
import type { Pagination } from '../../shared/http/pagination.js';
import type { OrderEventType, OrderListFilters, OrderStatus } from './order.types.js';

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

// "#12" or "12" finds the order by its number; anything else searches the customer's name.
const searchFilter = (search: string): WhereOptions<Order> => {
  const byName = { customerName: { [Op.iLike]: `%${escapeLike(search)}%` } };

  if (/^#?\d{1,9}$/.test(search)) {
    return { [Op.or]: [{ number: Number(search.replace('#', '')) }, byName] };
  }

  return byName;
};

export const orderRepository = {
  findAll: (storeId: string, filters: OrderListFilters, { limit, offset }: Pagination) =>
    Order.findAndCountAll({
      where: {
        storeId,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { [Op.and]: [searchFilter(filters.search)] }),
      },
      limit,
      offset,
      order: [
        ['number', 'DESC'],
        ['id', 'DESC'],
      ],
    }),

  findById: (storeId: string, id: string, options?: LockOptions) =>
    Order.findOne({ where: { storeId, id }, ...options }),

  // The store's counter is bumped under the store row's lock, so numbers never repeat or skip.
  allocateNumber: async (storeId: string, transaction: Transaction) => {
    const [row] = await sequelize.query<{ last_order_number: number }>(
      `UPDATE stores SET last_order_number = last_order_number + 1
        WHERE id = :storeId RETURNING last_order_number`,
      { replacements: { storeId }, type: QueryTypes.SELECT, transaction },
    );

    if (!row) {
      throw new Error('Store not found while allocating an order number');
    }

    return row.last_order_number;
  },

  create: (data: CreationAttributes<Order>, transaction: Transaction) =>
    Order.create(data, { transaction }),

  update: (
    order: Order,
    data: Partial<{
      status: OrderStatus;
      confirmedAt: Date;
      shippedAt: Date;
      completedAt: Date;
      cancelledAt: Date;
      cancelReason: string;
    }>,
    transaction: Transaction,
  ) => order.update(data, { transaction }),

  createLines: (rows: CreationAttributes<OrderLine>[], transaction: Transaction) =>
    OrderLine.bulkCreate(rows, { transaction }),

  findLines: (storeId: string, orderIds: string[], transaction?: Transaction) =>
    orderIds.length === 0
      ? Promise.resolve([])
      : OrderLine.findAll({
          where: { storeId, orderId: { [Op.in]: orderIds } },
          order: [['position', 'ASC']],
          transaction,
        }),

  recordEvent: (
    data: {
      storeId: string;
      orderId: string;
      type: OrderEventType;
      actorUserId?: string | null;
      fromStatus?: OrderStatus;
      toStatus?: OrderStatus;
      data?: Record<string, unknown>;
    },
    transaction: Transaction,
  ) => OrderEvent.create(data, { transaction }),

  findEvents: (storeId: string, orderId: string) =>
    OrderEvent.findAll({
      where: { storeId, orderId },
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
    }),
};
