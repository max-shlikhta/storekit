const TEST_DATABASE_NAME = /^[a-z0-9_]+_test$/;

export const loadTestDatabaseUrl = () => {
  try {
    process.loadEnvFile(new URL('../.env', import.meta.url));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const url = process.env.TEST_DATABASE_URL;

  if (!url) {
    throw new Error('TEST_DATABASE_URL is not set (see apps/api/.env.example)');
  }

  const databaseName = decodeURIComponent(new URL(url).pathname.slice(1));

  if (!TEST_DATABASE_NAME.test(databaseName)) {
    throw new Error(
      `Refusing to use "${databaseName}" for tests: the database name must end with _test`,
    );
  }

  return { url, databaseName };
};
