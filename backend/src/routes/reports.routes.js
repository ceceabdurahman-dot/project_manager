const router = require('express').Router();
const c = require('../controllers/reports.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/reports/dashboard',                       c.getDashboard);
router.get('/reports/sprints/:sprintId/burndown',      c.getBurndown);
router.get('/reports/projects/:projectId/workload',    c.getWorkload);
router.get('/reports/projects/:projectId/activity',    c.getProjectActivity);

router.get('/dashboard/summary',                      c.getDashboard);
router.get('/reports/burndown/:sprintId',             c.getBurndown);
router.get('/reports/workload/:projectId',            c.getWorkload);
router.get('/projects/:projectId/activity',           c.getProjectActivity);

module.exports = router;
