const { Op } = require('sequelize');
const { Sprint, Task, ProjectMember, User } = require('../models');

// Helper: cek apakah user adalah anggota proyek
const isMember = async (projectId, userId) => {
  const m = await ProjectMember.findOne({ where: { projectId, userId } });
  return m;
};

// GET /projects/:projectId/sprints — List semua sprint di project
exports.getAll = async (req, res, next) => {
  try {
    const membership = await isMember(req.params.projectId, req.user.id);
    if (!membership) return res.status(403).json({ success: false, message: 'Akses ditolak' });

    const sprints = await Sprint.findAll({
      where: { projectId: req.params.projectId },
      order: [['startDate', 'DESC']],
    });

    // Hitung jumlah task & progress per sprint
    const result = await Promise.all(sprints.map(async (sprint) => {
      const tasks = await Task.findAll({ where: { sprintId: sprint.id }, attributes: ['status', 'storyPoints'] });
      const total = tasks.length;
      const done = tasks.filter(t => t.status === 'done').length;
      const totalPoints = tasks.reduce((s, t) => s + (t.storyPoints || 1), 0);
      const donePoints = tasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.storyPoints || 1), 0);
      return {
        ...sprint.toJSON(),
        taskCount: total,
        doneCount: done,
        totalPoints,
        donePoints,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    }));

    res.json({ success: true, sprints: result });
  } catch (err) { next(err); }
};

// POST /projects/:projectId/sprints — Buat sprint baru
exports.create = async (req, res, next) => {
  try {
    const membership = await isMember(req.params.projectId, req.user.id);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ success: false, message: 'Hanya owner/admin yang bisa membuat sprint' });
    }

    const { name, goal, startDate, endDate } = req.body;
    const sprint = await Sprint.create({
      projectId: req.params.projectId,
      name, goal, startDate, endDate,
      status: 'planning',
    });
    res.status(201).json({ success: true, sprint });
  } catch (err) { next(err); }
};

// GET /sprints/:id — Detail sprint
exports.getOne = async (req, res, next) => {
  try {
    const sprint = await Sprint.findByPk(req.params.id);
    if (!sprint) return res.status(404).json({ success: false, message: 'Sprint tidak ditemukan' });

    const membership = await isMember(sprint.projectId, req.user.id);
    if (!membership) return res.status(403).json({ success: false, message: 'Akses ditolak' });

    const tasks = await Task.findAll({
      where: { sprintId: sprint.id },
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'avatar'] },
        { model: User, as: 'reporter', attributes: ['id', 'name', 'avatar'] },
      ],
      order: [['status', 'ASC'], ['position', 'ASC']],
    });

    res.json({ success: true, sprint, tasks });
  } catch (err) { next(err); }
};

// PUT /sprints/:id — Update sprint
exports.update = async (req, res, next) => {
  try {
    const sprint = await Sprint.findByPk(req.params.id);
    if (!sprint) return res.status(404).json({ success: false, message: 'Sprint tidak ditemukan' });

    const membership = await isMember(sprint.projectId, req.user.id);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    const { name, goal, startDate, endDate } = req.body;
    await sprint.update({ name, goal, startDate, endDate });
    res.json({ success: true, sprint });
  } catch (err) { next(err); }
};

// DELETE /sprints/:id — Hapus sprint (task pindah ke backlog)
exports.remove = async (req, res, next) => {
  try {
    const sprint = await Sprint.findByPk(req.params.id);
    if (!sprint) return res.status(404).json({ success: false, message: 'Sprint tidak ditemukan' });

    const membership = await isMember(sprint.projectId, req.user.id);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    // Pindahkan semua task ke backlog (sprintId = null)
    await Task.update({ sprintId: null }, { where: { sprintId: sprint.id } });
    await sprint.destroy();
    res.json({ success: true, message: 'Sprint dihapus, task dipindahkan ke backlog' });
  } catch (err) { next(err); }
};

// PATCH /sprints/:id/start — Mulai sprint
exports.start = async (req, res, next) => {
  try {
    const sprint = await Sprint.findByPk(req.params.id);
    if (!sprint) return res.status(404).json({ success: false, message: 'Sprint tidak ditemukan' });

    const membership = await isMember(sprint.projectId, req.user.id);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    if (sprint.status !== 'planning') {
      return res.status(400).json({ success: false, message: 'Hanya sprint dengan status planning yang bisa dimulai' });
    }

    // Cek apakah ada sprint lain yang aktif di project ini
    const activeSprint = await Sprint.findOne({
      where: { projectId: sprint.projectId, status: 'active' },
    });
    if (activeSprint) {
      return res.status(400).json({
        success: false,
        message: `Sprint "${activeSprint.name}" masih aktif. Selesaikan dulu sebelum memulai sprint baru.`,
      });
    }

    await sprint.update({ status: 'active' });
    res.json({ success: true, sprint, message: 'Sprint dimulai' });
  } catch (err) { next(err); }
};

// PATCH /sprints/:id/complete — Selesaikan sprint
exports.complete = async (req, res, next) => {
  try {
    const sprint = await Sprint.findByPk(req.params.id);
    if (!sprint) return res.status(404).json({ success: false, message: 'Sprint tidak ditemukan' });

    const membership = await isMember(sprint.projectId, req.user.id);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    if (sprint.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Hanya sprint aktif yang bisa diselesaikan' });
    }

    // Task yang belum selesai → pindahkan ke backlog (unassign dari sprint)
    const incompleteTasks = await Task.findAll({
      where: { sprintId: sprint.id, status: { [Op.ne]: 'done' } },
    });
    if (incompleteTasks.length > 0) {
      await Task.update({ sprintId: null }, {
        where: { sprintId: sprint.id, status: { [Op.ne]: 'done' } },
      });
    }

    await sprint.update({ status: 'completed' });
    res.json({
      success: true,
      sprint,
      message: `Sprint selesai. ${incompleteTasks.length} task belum selesai dipindahkan ke backlog.`,
      movedTasks: incompleteTasks.length,
    });
  } catch (err) { next(err); }
};
