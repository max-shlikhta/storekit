import {
  type CreationOptional,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../database/sequelize.js';
import type { OrderStatus } from './order.types.js';

export class Order extends Model<InferAttributes<Order>, InferCreationAttributes<Order>> {
  declare id: CreationOptional<string>;
  declare storeId: string;
  declare number: number;
  declare status: CreationOptional<OrderStatus>;
  declare customerId: CreationOptional<string | null>;
  // Snapshots: the order keeps who it was for even if the customer card changes later.
  declare customerName: string;
  declare customerPhone: CreationOptional<string | null>;
  declare currency: string;
  declare subtotalMinor: number;
  declare discountMinor: CreationOptional<number>;
  declare totalMinor: number;
  declare note: CreationOptional<string | null>;
  declare cancelReason: CreationOptional<string | null>;
  declare confirmedAt: CreationOptional<Date | null>;
  declare shippedAt: CreationOptional<Date | null>;
  declare completedAt: CreationOptional<Date | null>;
  declare cancelledAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Order.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storeId: { type: DataTypes.UUID, allowNull: false },
    number: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'new' },
    customerId: { type: DataTypes.UUID, allowNull: true },
    customerName: { type: DataTypes.STRING(255), allowNull: false },
    customerPhone: { type: DataTypes.STRING(16), allowNull: true },
    currency: { type: DataTypes.CHAR(3), allowNull: false },
    subtotalMinor: { type: DataTypes.INTEGER, allowNull: false },
    discountMinor: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    totalMinor: { type: DataTypes.INTEGER, allowNull: false },
    note: { type: DataTypes.STRING(1000), allowNull: true },
    cancelReason: { type: DataTypes.STRING(500), allowNull: true },
    confirmedAt: { type: DataTypes.DATE, allowNull: true },
    shippedAt: { type: DataTypes.DATE, allowNull: true },
    completedAt: { type: DataTypes.DATE, allowNull: true },
    cancelledAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
  },
);
