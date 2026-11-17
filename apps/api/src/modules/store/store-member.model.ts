import {
  type CreationOptional,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../database/sequelize.js';
import type { StoreRole } from './store.types.js';

export class StoreMember extends Model<
  InferAttributes<StoreMember>,
  InferCreationAttributes<StoreMember>
> {
  declare storeId: string;
  declare userId: string;
  declare role: StoreRole;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

StoreMember.init(
  {
    storeId: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
    role: { type: DataTypes.STRING(16), allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'StoreMember',
    tableName: 'store_members',
  },
);
