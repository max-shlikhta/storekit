import {
  type CreationOptional,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../database/sequelize.js';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare email: string;
  declare name: CreationOptional<string | null>;
  declare passwordHash: string;
  declare isActive: CreationOptional<boolean>;
  declare twoFactorSecret: CreationOptional<string | null>;
  declare twoFactorEnabledAt: CreationOptional<Date | null>;
  declare twoFactorLastStep: CreationOptional<string | null>;
  declare twoFactorRequired: CreationOptional<boolean>;
  declare lastLoginAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING(254), allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    twoFactorSecret: { type: DataTypes.STRING(255), allowNull: true },
    twoFactorEnabledAt: { type: DataTypes.DATE, allowNull: true },
    twoFactorLastStep: { type: DataTypes.BIGINT, allowNull: true },
    twoFactorRequired: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
  },
);
