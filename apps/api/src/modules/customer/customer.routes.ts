import { Router } from 'express';
import { customerController } from './customer.controller.js';

export const customerRouter = Router();

customerRouter.get('/', customerController.getCustomers);
customerRouter.post('/', customerController.createCustomer);
customerRouter.get('/:customerId', customerController.getCustomer);
customerRouter.patch('/:customerId', customerController.updateCustomer);
