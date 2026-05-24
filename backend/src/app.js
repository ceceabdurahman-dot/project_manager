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

// ── Security Headers ──────────────────────────────────────────────────
// Catatan: pasang 'helmet' npm package untuk konfigurasi yang lebih lengkap
// (npm install helmet di folder backend, lalu: const helmet = require('helmet'); app.use(helmet()))
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');        // Cegah MIME sniffing
  res.setHeader('X-Frame-Options', 'DENY');                  // Cegah clickjacking
  res.setHeader('X-XSS-Protection', '1; mode=block');       // XSS filter browser lama
  res.setHeader('Referrer-Policy', 'no-referrer');           // Jangan kirim Referer header
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  // Hanya izinkan konten dari origin sendiri (aman untuk SPA + API di server yang sama)
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;");
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

// ── Static: uploads ───────────────────────────────────────────────────
// UUID filename = capability URL (hard to guess). Tidak diproteksi JWT agar
// <a href> dan <img src> bisa berjalan langsung di browser.
const uploadDir = path.resolve(__dirname, '../../', config.uploadPath);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

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
