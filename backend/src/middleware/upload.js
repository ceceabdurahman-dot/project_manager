const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

// Whitelist ekstensi yang diizinkan
const ALLOWED_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.gif',
  '.pdf', '.doc', '.docx',
  '.xls', '.xlsx',
  '.txt', '.zip',
]);

// Whitelist MIME type — dicocokkan dengan ekstensi (double-check)
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Validasi ganda: MIME type DAN ekstensi harus keduanya diizinkan
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error('Tipe MIME tidak diizinkan: ' + file.mimetype), false);
  }
  if (!ALLOWED_EXT.has(ext)) {
    return cb(new Error('Ekstensi file tidak diizinkan: ' + ext), false);
  }
  cb(null, true);
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: config.maxFileSize } });
