const router = require('express').Router();
const c      = require('../controllers/projects.controller');
const { authenticate } = require('../middleware/auth');
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

const projectValidation = [
  body('name').trim().notEmpty().withMessage('Nama proyek wajib diisi')
    .isLength({ max: 150 }).withMessage('Nama proyek maksimal 150 karakter'),
  body('description').optional()
    .isLength({ max: 1000 }).withMessage('Deskripsi maksimal 1000 karakter'),
  body('color').optional()
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Warna harus format hex valid (contoh: #FF5733)'),
  body('startDate').optional({ nullable: true })
    .isISO8601().withMessage('Format tanggal mulai tidak valid'),
  body('endDate').optional({ nullable: true })
    .isISO8601().withMessage('Format tanggal selesai tidak valid'),
  validateRequest,
];

const memberValidation = [
  body('userId').notEmpty().isUUID().withMessage('userId tidak valid'),
  body('role').optional()
    .isIn(['admin', 'member', 'viewer']).withMessage('Role harus admin, member, atau viewer'),
  validateRequest,
];

const updateRoleValidation = [
  body('role').isIn(['admin', 'member', 'viewer']).withMessage('Role harus admin, member, atau viewer'),
  validateRequest,
];

router.use(authenticate);

router.get('/',               c.getAll);
router.post('/',              ...projectValidation, c.create);
router.get('/:id/available-users', c.getAvailableUsers);
router.get('/:id',            c.getOne);
router.put('/:id',            ...projectValidation, c.update);
router.delete('/:id',         c.remove);
router.get('/:id/members',    c.getMembers);
router.post('/:id/members',   ...memberValidation,  c.addMember);
router.put('/:id/members/:userId', ...updateRoleValidation, c.updateMemberRole);
router.delete('/:id/members/:userId', c.removeMember);
router.get('/:id/stats',      c.getStats);

module.exports = router;
