const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const { config } = require('./config/index.js');
const { requireAuth } = require('./middleware/auth.js');
const { notFound, errorHandler } = require('./middleware/error.js');
const { router } = require('./routes.js');

const uploadDir = path.resolve(config.uploadDir);
fs.mkdirSync(uploadDir, { recursive: true });

/** Sub-app HRIS, di-mount di /api/hris oleh backend HC-PORTAL. */
function createHrisApp() {
  const app = express();

  app.use('/uploads', express.static(uploadDir));

  // Auth publik (login), sisanya wajib token.
  app.use('/', router());

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createHrisApp, uploadDir, requireAuth };
