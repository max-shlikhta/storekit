import {
  type CreationOptional,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../database/sequelize.js';
import type { OrderEventType, OrderStatus } from './order.types.js';

// Append-only history of an order: who did what, and when.
export class OrderEvent extends Model<
  InferAttributes<OrderEvent>,
  InferCreationAttributes<OrderEvent>
> {
  declare id: CreationOptional<string>;
  declare storeId: string;
  declare orderId: string;
  declare type: OrderEventType;
  declare fromStatus: CreationOptional<OrderStatus | null>;
  declare toStatus: CreationOptional<OrderStatus | null>;
  declare actorUserId: CreationOptional<string | null>;
  declare data: CreationOptional<Record<string, unknown>>;
  declare createdAt: CreationOptional<Date>;
}

OrderEvent.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storeId: { type: DataTypes.UUID, allowNull: false },
    orderId: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.STRING(32), allowNull: false },
    fromStatus: { type: DataTypes.STRING(16), allowNull: true },
    toStatus: { type: DataTypes.STRING(16), allowNull: true },
    actorUserId: { type: DataTypes.UUID, allowNull: true },
    data: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'OrderEvent',
    tableName: 'order_events',
    updatedAt: false,
  },
);
