import {
  type CreationOptional,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../database/sequelize.js';

export class Store extends Model<InferAttributes<Store>, InferCreationAttributes<Store>> {
  declare id: CreationOptional<string>;
  declare slug: string;
  declare name: string;
  declare isActive: CreationOptional<boolean>;
  // ISO 4217 code; prices are integers in this currency's minor units.
  declare currency: CreationOptional<string>;
  // Order numbers count up per store; allocated under the store row's lock.
  declare lastOrderNumber: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Store.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    slug: { type: DataTypes.STRING(63), allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    currency: { type: DataTypes.CHAR(3), allowNull: false, defaultValue: 'USD' },
    lastOrderNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Store',
    tableName: 'stores',
  },
);
