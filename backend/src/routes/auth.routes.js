const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const { login, logout, getMe, updateProfile, createUser, getUsers, resetPassword, toggleActive } = require('../controllers/auth.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Rate limiter khusus login: maks 5 percobaan per menit per IP
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, max: 5,
  message: { success: false, message: 'Terlalu banyak percobaan login. Coba lagi dalam 1 menit.' },
  standardHeaders: true, legacyHeaders: false,
});

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map(e => e.msg).join(', '),
    });
  }
  next();
};

// ── Auth ──────────────────────────────────────────────────────────────
router.post('/login',
  loginLimiter,
  body('email').isEmail().normalizeEmail().withMessage('Format email tidak valid'),
  body('password').notEmpty().withMessage('Password tidak boleh kosong'),
  validateRequest,
  login,
);

router.get('/me', authenticate, getMe);
router.post('/logout', logout);

router.put('/profile',
  authenticate,
  body('name').optional()
    .trim().notEmpty().withMessage('Nama tidak boleh kosong jika diisi')
    .isLength({ max: 100 }).withMessage('Nama maksimal 100 karakter'),
  body('newPassword').optional()
    .isLength({ min: 8 }).withMessage('Password baru minimal 8 karakter')
    .isLength({ max: 128 }).withMessage('Password terlalu panjang'),
  body('currentPassword').if(body('newPassword').exists())
    .notEmpty().withMessage('Password lama wajib diisi saat ganti password'),
  validateRequest,
  updateProfile,
);

// ── Admin: User Management ─────────────────────────────────────────────
router.post('/users',
  authenticate, requireAdmin,
  body('name').trim().notEmpty().withMessage('Nama wajib diisi')
    .isLength({ max: 100 }).withMessage('Nama maksimal 100 karakter'),
  body('email').isEmail().normalizeEmail().withMessage('Format email tidak valid'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password minimal 8 karakter')
    .isLength({ max: 128 }).withMessage('Password terlalu panjang'),
  body('role').optional()
    .isIn(['admin', 'member']).withMessage('Role harus admin atau member'),
  validateRequest,
  createUser,
);

router.get('/users',
  authenticate, requireAdmin,
  getUsers,
);

router.post('/users/:id/reset-password',
  authenticate, requireAdmin,
  body('password')
    .isLength({ min: 8 }).withMessage('Password baru minimal 8 karakter')
    .isLength({ max: 128 }).withMessage('Password terlalu panjang'),
  validateRequest,
  resetPassword,
);

router.patch('/users/:id/toggle-active',
  authenticate, requireAdmin,
  toggleActive,
);

module.exports = router;
