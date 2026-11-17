const path = require('node:path');
const { parse } = require('pg-connection-string');

try {
  process.loadEnvFile(path.resolve(__dirname, '../../.env'));
} catch (error) {
  if (error.code !== 'ENOENT') {
    throw error;
  }
}

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error('DATABASE_URL is not set (apps/api/.env or environment)');
}

const config = {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  dialectOptions: parse(url),
};

module.exports = {
  development: config,
  test: config,
  production: config,
};
