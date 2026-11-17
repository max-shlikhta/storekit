import { Router } from 'express';
import { orderController } from './order.controller.js';

export const orderRouter = Router();

orderRouter.get('/', orderController.getOrders);
orderRouter.post('/', orderController.createOrder);
orderRouter.get('/:orderId', orderController.getOrder);
orderRouter.post('/:orderId/status', orderController.changeStatus);
