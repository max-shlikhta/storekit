import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadTestDatabaseUrl } from '../test/test-database.js';

const apiRoot = fileURLToPath(new URL('..', import.meta.url));
const sequelizeCli = createRequire(import.meta.url).resolve('sequelize-cli/lib/sequelize');

const { url, databaseName } = loadTestDatabaseUrl();

const recreateDatabase = async () => {
  const maintenanceUrl = new URL(url);
  maintenanceUrl.pathname = '/postgres';

  const client = new pg.Client({ connectionString: maintenanceUrl.toString() });
  await client.connect();

  try {
    await client.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await client.query(`CREATE DATABASE "${databaseName}"`);
  } finally {
    await client.end();
  }
};

const runCli = (command: string) => {
  const result = spawnSync(process.execPath, [sequelizeCli, command], {
    cwd: apiRoot,
    env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: url },
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  if (result.status !== 0) {
    throw new Error(`sequelize-cli ${command} failed with exit code ${String(result.status)}`);
  }
};

await recreateDatabase();
runCli('db:migrate');
runCli('db:migrate:undo:all');
runCli('db:migrate');

console.log(`Test database "${databaseName}" is ready`);
