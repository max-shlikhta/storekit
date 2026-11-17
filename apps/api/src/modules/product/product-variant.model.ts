import {
  type CreationOptional,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../database/sequelize.js';

// Price, stock and order lines belong to the variant, not the product.
export class ProductVariant extends Model<
  InferAttributes<ProductVariant>,
  InferCreationAttributes<ProductVariant>
> {
  declare id: CreationOptional<string>;
  declare storeId: string;
  declare productId: string;
  declare sku: string;
  declare title: string;
  declare priceMinor: number;
  // The owner's purchase price; staff never see it.
  declare costPriceMinor: CreationOptional<number | null>;
  // Changed only through applyStockChange, which also writes the stock movement.
  declare stockOnHand: CreationOptional<number>;
  declare allowBackorder: CreationOptional<boolean>;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ProductVariant.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storeId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: false },
    sku: { type: DataTypes.STRING(64), allowNull: false },
    title: { type: DataTypes.STRING(100), allowNull: false },
    priceMinor: { type: DataTypes.INTEGER, allowNull: false },
    costPriceMinor: { type: DataTypes.INTEGER, allowNull: true },
    stockOnHand: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    allowBackorder: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'ProductVariant',
    tableName: 'product_variants',
  },
);
