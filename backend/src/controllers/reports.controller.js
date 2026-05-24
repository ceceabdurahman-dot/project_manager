const { Task, ActivityLog, User, Sprint, ProjectMember } = require('../models');
const { Op } = require('sequelize');

exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today  = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

    const [totalActive, completedThisWeek, overdueCount, assignedToMe] = await Promise.all([
      Task.count({ where: { assigneeId: userId, status: { [Op.ne]: 'done' } } }),
      Task.count({ where: { assigneeId: userId, status: 'done', updatedAt: { [Op.gte]: weekAgo } } }),
      Task.count({ where: { assigneeId: userId, status: { [Op.ne]: 'done' }, dueDate: { [Op.lt]: today } } }),
      Task.count({ where: { assigneeId: userId } }),
    ]);

    const memberships = await ProjectMember.findAll({ where: { userId } });
    const projectIds  = memberships.map(m => m.projectId);

    // Bug fix: user baru tanpa proyek → projectIds = [] → "WHERE IN ()" crash di SQLite
    // Jika tidak ada proyek, langsung kembalikan array kosong
    const recentActivity = projectIds.length === 0 ? [] : await ActivityLog.findAll({
      where: { projectId: { [Op.in]: projectIds } },
      include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'avatar'] }],
      order: [['createdAt', 'DESC']],
      limit: 20,
    });

    res.json({ success: true, dashboard: { totalActive, completedThisWeek, overdueCount, assignedToMe, recentActivity } });
  } catch (err) { next(err); }
};

exports.getBurndown = async (req, res, next) => {
  try {
    const sprint = await Sprint.findByPk(req.params.sprintId);
    if (!sprint) return res.status(404).json({ success: false, message: 'Sprint tidak ditemukan' });

    const membership = await ProjectMember.findOne({ where: { projectId: sprint.projectId, userId: req.user.id } });
    if (!membership) return res.status(403).json({ success: false, message: 'Akses ditolak' });

    const tasks = await Task.findAll({ where: { sprintId: sprint.id } });
    const totalPoints = tasks.reduce((s, t) => s + (t.storyPoints || 1), 0);

    const start = new Date(sprint.startDate);
    const end   = new Date(sprint.endDate);
    const days  = Math.ceil((end - start) / 86400000) + 1;

    const idealPerDay = days > 1 ? totalPoints / (days - 1) : 0;

    const doneByDay = {};
    tasks
      .filter(t => t.status === 'done')
      .forEach(t => {
        const day = new Date(t.updatedAt).toISOString().split('T')[0];
        doneByDay[day] = (doneByDay[day] || 0) + (t.storyPoints || 1);
      });

    let cumulativeDone = 0;
    const data = Array.from({ length: days }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      cumulativeDone += doneByDay[dateStr] || 0;
      return {
        date:   dateStr,
        ideal:  Math.round(Math.max(0, totalPoints - idealPerDay * i)),
        actual: Math.max(0, totalPoints - cumulativeDone),
      };
    });

    res.json({ success: true, burndown: { sprint, totalPoints, data } });
  } catch (err) { next(err); }
};

exports.getWorkload = async (req, res, next) => {
  try {
    const membership = await ProjectMember.findOne({ where: { projectId: req.params.projectId, userId: req.user.id } });
    if (!membership) return res.status(403).json({ success: false, message: 'Akses ditolak' });

    const tasks = await Task.findAll({
      where: { projectId: req.params.projectId, status: { [Op.ne]: 'done' } },
      include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] }],
    });

    const workload = {};
    tasks.forEach(t => {
      if (!t.assignee) return;
      const key = t.assignee.id;
      if (!workload[key]) workload[key] = { user: t.assignee, tasks: 0, byPriority: { low: 0, medium: 0, high: 0, urgent: 0 } };
      workload[key].tasks++;
      workload[key].byPriority[t.priority]++;
    });

    res.json({ success: true, workload: Object.values(workload) });
  } catch (err) { next(err); }
};

// Aktivitas per-proyek — dipakai di halaman detail proyek
exports.getProjectActivity = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Hanya anggota proyek yang boleh melihat log aktivitasnya
    const membership = await ProjectMember.findOne({ where: { projectId, userId: req.user.id } });
    if (!membership) return res.status(403).json({ success: false, message: 'Akses ditolak' });

    const limit  = Math.min(parseInt(req.query.limit)  || 50, 100); // maks 100 per request
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const { count, rows: activities } = await ActivityLog.findAndCountAll({
      where: { projectId },
      include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'avatar'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({ success: true, activities, total: count, limit, offset });
  } catch (err) { next(err); }
};
