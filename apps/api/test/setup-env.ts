import { loadTestDatabaseUrl } from './test-database.js';

const { url } = loadTestDatabaseUrl();

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = url;
process.env.LOG_LEVEL ??= 'silent';
// Fixed here so tests do not depend on the developer's .env.
process.env.ADMIN_URL = 'http://localhost:38490';
process.env.HOST = '127.0.0.1';
process.env.PORT = '38491';
process.env.AUTH_SECRET ??= 'test-secret-that-is-long-enough-for-hmac-keys';
