import {
  type CreationOptional,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../database/sequelize.js';

// A line is a snapshot: titles and prices as they were when the order was made.
export class OrderLine extends Model<
  InferAttributes<OrderLine>,
  InferCreationAttributes<OrderLine>
> {
  declare id: CreationOptional<string>;
  declare storeId: string;
  declare orderId: string;
  declare variantId: string;
  declare productTitle: string;
  declare variantTitle: string;
  declare sku: string;
  declare unitPriceMinor: number;
  // The owner's purchase price at the time; staff never see it.
  declare unitCostMinor: CreationOptional<number | null>;
  declare quantity: number;
  declare lineTotalMinor: number;
  declare position: number;
  declare createdAt: CreationOptional<Date>;
}

OrderLine.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storeId: { type: DataTypes.UUID, allowNull: false },
    orderId: { type: DataTypes.UUID, allowNull: false },
    variantId: { type: DataTypes.UUID, allowNull: false },
    productTitle: { type: DataTypes.STRING(255), allowNull: false },
    variantTitle: { type: DataTypes.STRING(100), allowNull: false },
    sku: { type: DataTypes.STRING(64), allowNull: false },
    unitPriceMinor: { type: DataTypes.INTEGER, allowNull: false },
    unitCostMinor: { type: DataTypes.INTEGER, allowNull: true },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    lineTotalMinor: { type: DataTypes.INTEGER, allowNull: false },
    position: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'OrderLine',
    tableName: 'order_lines',
    updatedAt: false,
  },
);
