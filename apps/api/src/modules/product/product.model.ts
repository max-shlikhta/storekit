import {
  type CreationOptional,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../database/sequelize.js';
import type { ProductStatus } from './product.types.js';

export class Product extends Model<InferAttributes<Product>, InferCreationAttributes<Product>> {
  declare id: CreationOptional<string>;
  declare storeId: string;
  declare categoryId: CreationOptional<string | null>;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare status: CreationOptional<ProductStatus>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Product.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storeId: { type: DataTypes.UUID, allowNull: false },
    categoryId: { type: DataTypes.UUID, allowNull: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'draft' },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Product',
    tableName: 'products',
  },
);
