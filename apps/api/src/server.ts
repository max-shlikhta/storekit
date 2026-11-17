import { createApp } from './app.js';
import { env } from './config/env.js';
import { sequelize } from './database/index.js';
import { sessionService } from './modules/auth/session.service.js';
import { logger, serializeError } from './shared/logger.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;
const SESSION_PURGE_INTERVAL_MS = 60 * 60 * 1000;

const reportFailure = (message: string, error: unknown) => {
  logger.error(message, { error: serializeError(error) });
  process.exitCode = 1;
};

const purgeExpiredSessions = () => {
  sessionService.purgeExpired().catch((error: unknown) => {
    logger.error('Failed to delete expired sessions', { error: serializeError(error) });
  });
};

const start = async () => {
  await sequelize.authenticate();
  logger.info('Database connected');

  purgeExpiredSessions();
  const purgeTimer = setInterval(purgeExpiredSessions, SESSION_PURGE_INTERVAL_MS);
  purgeTimer.unref();

  const server = createApp().listen(env.PORT, env.HOST, (error) => {
    if (error) {
      reportFailure('HTTP server failed to start', error);
      void sequelize.close();
      return;
    }

    logger.info(`Storekit API listening on http://${env.HOST}:${env.PORT}`);
  });

  const shutdown = (signal: NodeJS.Signals) => {
    logger.info(`${signal} received, shutting down`);
    clearInterval(purgeTimer);

    const forceClose = setTimeout(() => {
      server.closeAllConnections();
    }, SHUTDOWN_TIMEOUT_MS);
    forceClose.unref();

    server.close(() => {
      clearTimeout(forceClose);
      sequelize.close().catch((error: unknown) => {
        reportFailure('Failed to close database connections', error);
      });
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
};

start().catch((error: unknown) => {
  reportFailure('Failed to start Storekit API', error);
  void sequelize.close();
});
