import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const TEMPLATE = `'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // await queryInterface.createTable('table_name', { ... }, { transaction });
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // await queryInterface.dropTable('table_name', { transaction });
    });
  },
};
`;

const name = process.argv[2];

if (!name || !NAME_PATTERN.test(name)) {
  console.error('Usage: npm run db:migration:new -- <kebab-case-name>, e.g. create-products');
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const file = fileURLToPath(
  new URL(`../src/database/migrations/${timestamp}-${name}.js`, import.meta.url),
);

if (existsSync(file)) {
  console.error(`Migration already exists: ${file}`);
  process.exit(1);
}

writeFileSync(file, TEMPLATE);
console.log(`Created ${file}`);
