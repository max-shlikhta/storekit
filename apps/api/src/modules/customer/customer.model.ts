import {
  type CreationOptional,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../database/sequelize.js';

export class Customer extends Model<InferAttributes<Customer>, InferCreationAttributes<Customer>> {
  declare id: CreationOptional<string>;
  declare storeId: string;
  declare name: string;
  // E.164; unique per store when present.
  declare phone: CreationOptional<string | null>;
  declare note: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Customer.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storeId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(16), allowNull: true },
    note: { type: DataTypes.STRING(1000), allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Customer',
    tableName: 'customers',
  },
);
