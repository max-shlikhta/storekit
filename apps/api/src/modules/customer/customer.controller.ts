import type { Request, Response } from 'express';
import { parseBody, parseId, parseInput } from '../../shared/http/request.js';
import { getStore } from '../store/store.context.js';
import type { Customer } from './customer.model.js';
import {
  createCustomerSchema,
  listCustomersSchema,
  updateCustomerSchema,
} from './customer.schema.js';
import { customerService } from './customer.service.js';

export const toCustomerDto = (customer: Customer) => ({
  id: customer.id,
  name: customer.name,
  phone: customer.phone,
  note: customer.note,
  createdAt: customer.createdAt,
  updatedAt: customer.updatedAt,
});

export const customerController = {
  getCustomers: async (req: Request, res: Response) => {
    const { search, ...pagination } = parseInput(listCustomersSchema, req.query);
    const { rows, count } = await customerService.getCustomers(
      getStore(res).id,
      pagination,
      search,
    );

    res.json({ data: rows.map(toCustomerDto), meta: { total: count, ...pagination } });
  },

  getCustomer: async (req: Request, res: Response) => {
    const customerId = parseId(req.params.customerId, 'Customer');

    res.json({
      data: toCustomerDto(await customerService.getCustomer(getStore(res).id, customerId)),
    });
  },

  createCustomer: async (req: Request, res: Response) => {
    const input = parseBody(req, createCustomerSchema);
    const customer = await customerService.createCustomer(getStore(res).id, input);

    res.status(201).json({ data: toCustomerDto(customer) });
  },

  updateCustomer: async (req: Request, res: Response) => {
    const customerId = parseId(req.params.customerId, 'Customer');
    const input = parseBody(req, updateCustomerSchema);
    const customer = await customerService.updateCustomer(getStore(res).id, customerId, input);

    res.json({ data: toCustomerDto(customer) });
  },
};
