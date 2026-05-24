const router = require('express').Router();
const c = require('../controllers/reports.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/dashboard/summary',                      c.getDashboard);
router.get('/reports/burndown/:sprintId',             c.getBurndown);
router.get('/reports/workload/:projectId',            c.getWorkload);
router.get('/projects/:projectId/activity',           c.getProjectActivity);

module.exports = router;
