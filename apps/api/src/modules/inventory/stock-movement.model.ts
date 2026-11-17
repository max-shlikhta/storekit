import {
  type CreationOptional,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../database/sequelize.js';
import type { StockMovementReason } from './stock-movement.types.js';

// Append-only journal: stock on hand is the sum of it.
export class StockMovement extends Model<
  InferAttributes<StockMovement>,
  InferCreationAttributes<StockMovement>
> {
  declare id: CreationOptional<string>;
  declare storeId: string;
  declare variantId: string;
  declare reason: StockMovementReason;
  declare delta: number;
  declare quantityAfter: number;
  declare note: CreationOptional<string | null>;
  declare orderId: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
}

StockMovement.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storeId: { type: DataTypes.UUID, allowNull: false },
    variantId: { type: DataTypes.UUID, allowNull: false },
    reason: { type: DataTypes.STRING(32), allowNull: false },
    delta: { type: DataTypes.INTEGER, allowNull: false },
    quantityAfter: { type: DataTypes.INTEGER, allowNull: false },
    note: { type: DataTypes.STRING(500), allowNull: true },
    orderId: { type: DataTypes.UUID, allowNull: true },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'StockMovement',
    tableName: 'stock_movements',
    updatedAt: false,
  },
);
