const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const projectRoot = path.resolve(__dirname, '../../..');
const uploadPath = process.env.UPLOAD_PATH || 'uploads';

module.exports = {
  port: parseInt(process.env.PORT) || 3000,
  host: process.env.SERVER_HOST || '127.0.0.1',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  authCookieName: process.env.AUTH_COOKIE_NAME || 'pm_auth',
  authCookieSecure: process.env.AUTH_COOKIE_SECURE === 'true',
  dbPath: process.env.DB_PATH || '../data/projectdb.sqlite',
  uploadPath,
  uploadDir: path.resolve(projectRoot, uploadPath),
  backupPath: process.env.BACKUP_PATH || '../backups',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
  backupRetainDays: parseInt(process.env.BACKUP_RETAIN_DAYS) || 30,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(','),
};
