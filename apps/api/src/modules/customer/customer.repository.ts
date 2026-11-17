import { Op, type Transaction } from 'sequelize';
import { Customer } from '../../database/index.js';
import { rethrowConstraintViolation } from '../../shared/database-errors.js';
import type { Pagination } from '../../shared/http/pagination.js';
import type { CreateCustomerInput, UpdateCustomerInput } from './customer.schema.js';

const CONSTRAINTS = {
  customers_store_id_phone_key: {
    path: 'phone',
    message: 'Another customer of this store has this phone',
  },
};

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

export const customerRepository = {
  findAll: (storeId: string, { limit, offset }: Pagination, search?: string) =>
    Customer.findAndCountAll({
      where: {
        storeId,
        ...(search && {
          [Op.or]: [
            { name: { [Op.iLike]: `%${escapeLike(search)}%` } },
            { phone: { [Op.like]: `%${escapeLike(search)}%` } },
          ],
        }),
      },
      limit,
      offset,
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
    }),

  findById: (storeId: string, id: string, transaction?: Transaction) =>
    Customer.findOne({ where: { storeId, id }, transaction }),

  findByPhone: (storeId: string, phone: string, transaction?: Transaction) =>
    Customer.findOne({ where: { storeId, phone }, transaction }),

  create: async (storeId: string, data: CreateCustomerInput, transaction?: Transaction) => {
    try {
      return await Customer.create({ ...data, storeId }, { transaction });
    } catch (error) {
      return rethrowConstraintViolation(error, CONSTRAINTS);
    }
  },

  update: async (customer: Customer, data: UpdateCustomerInput) => {
    try {
      return await customer.update(data);
    } catch (error) {
      return rethrowConstraintViolation(error, CONSTRAINTS);
    }
  },
};
