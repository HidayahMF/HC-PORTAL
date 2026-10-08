require('dotenv/config');

const config = {
  env: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expires: process.env.JWT_EXPIRES || '12h',
  },
  wa: {
    baseUrl: process.env.WA_BASE_URL || process.env.WA_API || '',
    token: process.env.WA_TOKEN || '',
  },
  uploadDir: process.env.UPLOAD_DIR || './uploads',
};

module.exports = { config };
