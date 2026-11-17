import {
  type CreationOptional,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../database/sequelize.js';

export class RecoveryCode extends Model<
  InferAttributes<RecoveryCode>,
  InferCreationAttributes<RecoveryCode>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare codeHash: string;
  declare usedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
}

RecoveryCode.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    codeHash: { type: DataTypes.CHAR(64), allowNull: false },
    usedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'RecoveryCode',
    tableName: 'user_recovery_codes',
    updatedAt: false,
  },
);
