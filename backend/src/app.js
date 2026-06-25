require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');
const path    = require('path');
const fs      = require('fs');
const config  = require('./config/config');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const toWsOrigin = (origin) => origin.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');

const buildCsp = () => {
  const isProd = config.nodeEnv === 'production';
  const httpOrigins = new Set(['http://localhost:3005', 'http://localhost:5175', ...config.corsOrigins]);
  const wsOrigins = new Set([...httpOrigins].map(toWsOrigin));

  const directives = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'script-src': isProd ? ["'self'"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", ...httpOrigins, ...wsOrigins],
    'media-src': ["'self'", 'blob:'],
    'worker-src': ["'self'", 'blob:'],
    'form-action': ["'self'"],
  };

  if (isProd) directives['upgrade-insecure-requests'] = [];

  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(' '))
    .join('; ');
};

// ── Security Headers ──────────────────────────────────────────────────
// Catatan: pasang 'helmet' npm package untuk konfigurasi yang lebih lengkap
// (npm install helmet di folder backend, lalu: const helmet = require('helmet'); app.use(helmet()))
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');        // Cegah MIME sniffing
  res.setHeader('X-Frame-Options', 'DENY');                  // Cegah clickjacking
  res.setHeader('X-XSS-Protection', '1; mode=block');       // XSS filter browser lama
  res.setHeader('Referrer-Policy', 'no-referrer');           // Jangan kirim Referer header
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  // Report-only dulu agar bisa memantau pelanggaran tanpa memblokir fitur.
  res.setHeader('Content-Security-Policy-Report-Only', buildCsp());
  next();
});

// ── Middleware ────────────────────────────────────────────────────────
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

const limiter = rateLimit({
  windowMs: 60000, max: 150,
  message: { success: false, message: 'Terlalu banyak request, coba lagi nanti' },
});
app.use('/api/', limiter);

// ── Static: frontend build ────────────────────────────────────────────
const distPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(distPath));

// ── Uploads ───────────────────────────────────────────────────────────
// File attachment harus diakses lewat endpoint terautentikasi, bukan static URL.
const uploadDir = config.uploadDir;
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', (req, res) => {
  res.status(404).json({ success: false, message: 'Gunakan endpoint attachment terautentikasi' });
});

// Inject io ke req (di-set dari server.js)
app.use((req, res, next) => { req.io = app.get('io'); next(); });

// ── API Routes ────────────────────────────────────────────────────────
app.use('/api/v1/auth',     require('./routes/auth.routes'));
app.use('/api/v1/projects', require('./routes/projects.routes'));
app.use('/api/v1',          require('./routes/tasks.routes'));
app.use('/api/v1',          require('./routes/sprints.routes'));
app.use('/api/v1',          require('./routes/reports.routes'));

// ── Fallback: SPA ─────────────────────────────────────────────────────
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: 'Project Manager API running. Build frontend first: cd frontend && npm run build' });
  }
});

// ── Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
