const router = require('express').Router();
const c = require('../controllers/sprints.controller');
const { authenticate } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map(function(e) { return e.msg; }).join(', '),
    });
  }
  next();
};

const sprintValidation = [
  body('name').trim().notEmpty().withMessage('Nama sprint tidak boleh kosong')
    .isLength({ max: 100 }).withMessage('Nama sprint maksimal 100 karakter'),
  body('startDate').notEmpty().withMessage('Tanggal mulai wajib diisi').isDate().withMessage('Format tanggal mulai tidak valid'),
  body('endDate').notEmpty().withMessage('Tanggal selesai wajib diisi').isDate().withMessage('Format tanggal selesai tidak valid'),
  validateRequest,
];

router.use(authenticate);

// Sprint CRUD per project
router.get('/projects/:projectId/sprints',    c.getAll);
router.post('/projects/:projectId/sprints',   ...sprintValidation, c.create);

// Individual sprint
router.get('/sprints/:id',                    c.getOne);
router.put('/sprints/:id',                    ...sprintValidation, c.update);
router.delete('/sprints/:id',                 c.remove);

// Sprint lifecycle
router.patch('/sprints/:id/start',            c.start);
router.patch('/sprints/:id/complete',         c.complete);

module.exports = router;
