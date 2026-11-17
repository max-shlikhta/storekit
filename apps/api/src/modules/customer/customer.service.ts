import { AppError } from '../../shared/app-error.js';
import type { Pagination } from '../../shared/http/pagination.js';
import { customerRepository } from './customer.repository.js';
import type { CreateCustomerInput, UpdateCustomerInput } from './customer.schema.js';

const getCustomer = async (storeId: string, customerId: string) => {
  const customer = await customerRepository.findById(storeId, customerId);

  if (!customer) {
    throw new AppError('NOT_FOUND', 'Customer not found');
  }

  return customer;
};

export const customerService = {
  getCustomers: (storeId: string, pagination: Pagination, search?: string) =>
    customerRepository.findAll(storeId, pagination, search),

  getCustomer,

  createCustomer: (storeId: string, input: CreateCustomerInput) =>
    customerRepository.create(storeId, input),

  updateCustomer: async (storeId: string, customerId: string, input: UpdateCustomerInput) =>
    customerRepository.update(await getCustomer(storeId, customerId), input),
};
