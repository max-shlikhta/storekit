import { Sequelize } from 'sequelize';
import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres',
  logging: env.DB_LOGGING
    ? (sql) => {
        logger.debug(sql);
      }
    : false,
  define: { underscored: true },
  pool: { max: 10, min: 0, idle: 10_000, acquire: 10_000 },
  dialectOptions: {
    application_name: 'storekit-api',
    connectionTimeoutMillis: 5_000,
    statement_timeout: 15_000,
    idle_in_transaction_session_timeout: 30_000,
  },
});
