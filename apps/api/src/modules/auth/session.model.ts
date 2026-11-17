import {
  type CreationOptional,
  DataTypes,
  type InferAttributes,
  type InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../database/sequelize.js';

export const SESSION_STATUSES = [
  'active',
  'two_factor_pending',
  'two_factor_setup_required',
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export class Session extends Model<InferAttributes<Session>, InferCreationAttributes<Session>> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare tokenHash: string;
  declare status: CreationOptional<SessionStatus>;
  declare userAgent: CreationOptional<string | null>;
  declare ip: CreationOptional<string | null>;
  declare expiresAt: Date;
  declare lastUsedAt: CreationOptional<Date>;
  declare createdAt: CreationOptional<Date>;
}

Session.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    tokenHash: { type: DataTypes.CHAR(64), allowNull: false },
    status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'active' },
    userAgent: { type: DataTypes.STRING(255), allowNull: true },
    ip: { type: DataTypes.STRING(64), allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    lastUsedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Session',
    tableName: 'sessions',
    updatedAt: false,
  },
);
