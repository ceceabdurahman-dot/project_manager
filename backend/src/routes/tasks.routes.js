const router = require('express').Router();
const c      = require('../controllers/tasks.controller');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { body, validationResult } = require('express-validator');

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

const commentValidation = [
  body('content').trim().notEmpty().withMessage('Komentar tidak boleh kosong')
    .isLength({ max: 5000 }).withMessage('Komentar maksimal 5000 karakter'),
  validateRequest,
];

const taskFieldsValidation = [
  body('status').optional()
    .isIn(['backlog', 'todo', 'in_progress', 'review', 'done']).withMessage('Status tidak valid'),
  body('priority').optional()
    .isIn(['low', 'medium', 'high', 'urgent']).withMessage('Prioritas tidak valid'),
  body('storyPoints').optional({ nullable: true })
    .isInt({ min: 0, max: 999 }).withMessage('Story points harus berupa angka 0-999'),
  body('position').optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Posisi harus berupa angka 0 atau lebih'),
];

const createTaskValidation = [
  body('title').trim().notEmpty().withMessage('Judul task wajib diisi')
    .isLength({ max: 250 }).withMessage('Judul task maksimal 250 karakter'),
  ...taskFieldsValidation,
  validateRequest,
];

const updateTaskValidation = [
  body('title').optional().trim().notEmpty().withMessage('Judul task tidak boleh kosong')
    .isLength({ max: 250 }).withMessage('Judul task maksimal 250 karakter'),
  ...taskFieldsValidation,
  validateRequest,
];

const moveTaskValidation = [
  body('status').notEmpty().withMessage('Status wajib diisi')
    .isIn(['backlog', 'todo', 'in_progress', 'review', 'done']).withMessage('Status tidak valid'),
  body('position').notEmpty().withMessage('Posisi wajib diisi')
    .isFloat({ min: 0 }).withMessage('Posisi harus berupa angka 0 atau lebih'),
  validateRequest,
];

// Tangani error multer (tipe file / ukuran) agar tidak jadi 500
const handleUploadError = (err, req, res, next) => {
  if (err && err.message) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
};

// ── Tasks ─────────────────────────────────────────────────────────────
router.get('/projects/:id/tasks',         authenticate, c.getAll);
router.post('/projects/:id/tasks',        authenticate, ...createTaskValidation, c.create);
router.get('/tasks/:id',                  authenticate, c.getOne);
router.put('/tasks/:id',                  authenticate, ...updateTaskValidation, c.update);
router.delete('/tasks/:id',              authenticate, c.remove);
router.patch('/tasks/:id/move',           authenticate, ...moveTaskValidation, c.move);

// ── Comments ──────────────────────────────────────────────────────────
router.post('/tasks/:id/comments',                    authenticate, ...commentValidation, c.addComment);
router.put('/tasks/:id/comments/:commentId',          authenticate, ...commentValidation, c.updateComment);
router.delete('/tasks/:id/comments/:commentId',      authenticate, c.deleteComment);

// ── Attachments ───────────────────────────────────────────────────────
// upload.single('file') dijalankan SETELAH authenticate — jangan swap urutan
router.post(
  '/tasks/:id/attachments',
  authenticate,
  (req, res, next) => upload.single('file')(req, res, (err) => {
    if (err) return handleUploadError(err, req, res, next);
    next();
  }),
  c.uploadAttachment,
);
router.get('/tasks/:id/attachments/:attachmentId/download', authenticate, c.downloadAttachment);
router.delete('/tasks/:id/attachments/:attachmentId', authenticate, c.deleteAttachment);

module.exports = router;
