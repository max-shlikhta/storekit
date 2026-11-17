import type { Request, Response } from 'express';
import { parseBody, parseId, parseInput } from '../../shared/http/request.js';
import { getUser } from '../auth/auth.middleware.js';
import { canSeeCosts, getStore } from '../store/store.context.js';
import type { OrderEvent } from './order-event.model.js';
import type { OrderLine } from './order-line.model.js';
import type { Order } from './order.model.js';
import { changeStatusSchema, createOrderSchema, listOrdersSchema } from './order.schema.js';
import { orderService } from './order.service.js';

// The purchase price of a line is hidden from staff.
const toLineDto = (line: OrderLine, showCosts: boolean) => ({
  id: line.id,
  variantId: line.variantId,
  productTitle: line.productTitle,
  variantTitle: line.variantTitle,
  sku: line.sku,
  unitPriceMinor: line.unitPriceMinor,
  ...(showCosts && { unitCostMinor: line.unitCostMinor }),
  quantity: line.quantity,
  lineTotalMinor: line.lineTotalMinor,
});

const toEventDto = (event: OrderEvent) => ({
  id: event.id,
  type: event.type,
  fromStatus: event.fromStatus,
  toStatus: event.toStatus,
  actorUserId: event.actorUserId,
  data: event.data,
  createdAt: event.createdAt,
});

const toOrderDto = (
  order: Order,
  lines: OrderLine[],
  showCosts: boolean,
  events?: OrderEvent[],
) => ({
  id: order.id,
  number: order.number,
  status: order.status,
  customerId: order.customerId,
  customerName: order.customerName,
  customerPhone: order.customerPhone,
  currency: order.currency,
  subtotalMinor: order.subtotalMinor,
  discountMinor: order.discountMinor,
  totalMinor: order.totalMinor,
  note: order.note,
  cancelReason: order.cancelReason,
  confirmedAt: order.confirmedAt,
  shippedAt: order.shippedAt,
  completedAt: order.completedAt,
  cancelledAt: order.cancelledAt,
  lines: lines.map((line) => toLineDto(line, showCosts)),
  ...(events && { events: events.map(toEventDto) }),
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

export const orderController = {
  getOrders: async (req: Request, res: Response) => {
    const { limit, offset, ...filters } = parseInput(listOrdersSchema, req.query);
    const { orders, lines, total } = await orderService.getOrders(getStore(res).id, filters, {
      limit,
      offset,
    });

    res.json({
      data: orders.map((order) =>
        toOrderDto(
          order,
          lines.filter(({ orderId }) => orderId === order.id),
          canSeeCosts(res),
        ),
      ),
      meta: { total, limit, offset },
    });
  },

  getOrder: async (req: Request, res: Response) => {
    const orderId = parseId(req.params.orderId, 'Order');
    const { order, lines, events } = await orderService.getOrder(getStore(res).id, orderId);

    res.json({ data: toOrderDto(order, lines, canSeeCosts(res), events) });
  },

  createOrder: async (req: Request, res: Response) => {
    const input = parseBody(req, createOrderSchema);
    const { order, lines, events } = await orderService.createOrder(
      getStore(res),
      input,
      getUser(res).id,
    );

    res.status(201).json({ data: toOrderDto(order, lines, canSeeCosts(res), events) });
  },

  changeStatus: async (req: Request, res: Response) => {
    const orderId = parseId(req.params.orderId, 'Order');
    const input = parseBody(req, changeStatusSchema);
    const { order, lines, events } = await orderService.changeStatus(
      getStore(res).id,
      orderId,
      input,
      getUser(res).id,
    );

    res.json({ data: toOrderDto(order, lines, canSeeCosts(res), events) });
  },
};
