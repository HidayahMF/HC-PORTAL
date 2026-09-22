const { createApp } = require('./app');
const { env } = require('./config/env');
const { validateAuthConfig: validateNomor } = require('./modules/legacy-nomor/config/auth');
const { validateAuthConfig: validateKontrak } = require('./modules/legacy-kontrak/config/auth');
const { getPool, closePool } = require('./config/database');
const wagRuntime = require(require('node:path').resolve(__dirname, 'modules/wag/runtime/server.js'));

const app = createApp();
const server = app.listen(env.port, async () => {
  try {
    validateNomor();
    validateKontrak();
    await getPool();
    app.locals.readiness.database = true;
    console.log(`HC Portal backend listening on ${env.port}`);
    await wagRuntime.initializeBackgroundServices();
    app.locals.readiness.background = true;
  } catch (error) {
    app.locals.readiness.error = error.message;
    console.error('HC Portal readiness failed:', error.message);
  }
});

async function shutdown(signal) {
  console.log(`HC Portal shutdown: ${signal}`);
  try {
    await wagRuntime.shutdownBackgroundServices?.();
    await closePool();
  } finally {
    server.close(() => process.exit(0));
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
