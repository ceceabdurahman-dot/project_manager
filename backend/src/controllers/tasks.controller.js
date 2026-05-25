const fs = require('fs');
const { Task, User, Comment, Attachment, ActivityLog, ProjectMember } = require('../models');
const { Op } = require('sequelize');

const taskIncludes = () => [
  { model: User, as: 'assignee', attributes: ['id','name','avatar'] },
  { model: User, as: 'reporter', attributes: ['id','name','avatar'] },
];

const isMember = async (projectId, userId) => {
  const m = await ProjectMember.findOne({ where: { projectId, userId } });
  return !!m;
};

const VALID_STATUSES   = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

exports.getAll = async (req, res, next) => {
  try {
    if (!(await isMember(req.params.id, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    const { status, assigneeId, priority, sprintId } = req.query;
    const where = { projectId: req.params.id, parentTaskId: null };
    if (status) {
      if (!VALID_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Status tidak valid' });
      where.status = status;
    }
    if (priority) {
      if (!VALID_PRIORITIES.includes(priority)) return res.status(400).json({ success: false, message: 'Prioritas tidak valid' });
      where.priority = priority;
    }
    if (assigneeId) where.assigneeId = assigneeId;
    if (sprintId)   where.sprintId   = sprintId;
    const tasks = await Task.findAll({
      where,
      include: [...taskIncludes(), { model: Task, as: 'subtasks', include: taskIncludes() }],
      order: [['status','ASC'], ['position','ASC']],
    });
    res.json({ success: true, tasks });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    if (!(await isMember(req.params.id, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    const { title, description, status, priority, assigneeId, dueDate, startDate, storyPoints, position, labels, sprintId, parentTaskId } = req.body;
    const task = await Task.create({
      title, description, status, priority, assigneeId, dueDate, startDate,
      storyPoints, position, labels, sprintId, parentTaskId,
      projectId: req.params.id, reporterId: req.user.id,
    });
    const full = await Task.findByPk(task.id, { include: taskIncludes() });
    await ActivityLog.create({ projectId: task.projectId, taskId: task.id, userId: req.user.id, action: 'task_created', metadata: { title: task.title } });
    req.io?.to(`project:${task.projectId}`).emit('task:created', full);
    res.status(201).json({ success: true, task: full });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        ...taskIncludes(),
        { model: Comment, include: [{ model: User, as: 'author', attributes: ['id','name','avatar'] }] },
        { model: Attachment, include: [{ model: User, as: 'uploader', attributes: ['id','name'] }] },
        { model: Task, as: 'subtasks', include: taskIncludes() },
      ],
    });
    if (!task) return res.status(404).json({ success: false, message: 'Task tidak ditemukan' });
    if (!(await isMember(task.projectId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    res.json({ success: true, task });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task tidak ditemukan' });
    if (!(await isMember(task.projectId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    const oldStatus = task.status;
    const { title, description, status, priority, assigneeId, dueDate, startDate, storyPoints, position, labels, sprintId, parentTaskId } = req.body;
    await task.update({ title, description, status, priority, assigneeId, dueDate, startDate, storyPoints, position, labels, sprintId, parentTaskId });
    const full = await Task.findByPk(task.id, { include: taskIncludes() });
    await ActivityLog.create({ projectId: task.projectId, taskId: task.id, userId: req.user.id, action: 'task_updated', metadata: { oldStatus, newStatus: task.status } });
    req.io?.to(`project:${task.projectId}`).emit('task:updated', full);
    res.json({ success: true, task: full });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id, { include: [{ model: Attachment }] });
    if (!task) return res.status(404).json({ success: false, message: 'Task tidak ditemukan' });
    if (!(await isMember(task.projectId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    if (task.Attachments && task.Attachments.length > 0) {
      task.Attachments.forEach(att => fs.unlink(att.path, (e) => { if (e) console.error('Gagal hapus attachment:', e.message); }));
    }
    const projectId = task.projectId;
    const taskTitle = task.title;
    await task.destroy();
    await ActivityLog.create({ projectId, userId: req.user.id, action: 'task_deleted', metadata: { title: taskTitle } });
    req.io?.to(`project:${projectId}`).emit('task:deleted', { id: req.params.id });
    res.json({ success: true, message: 'Task dihapus' });
  } catch (err) { next(err); }
};

exports.move = async (req, res, next) => {
  try {
    const { status, position } = req.body;
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task tidak ditemukan' });
    if (!(await isMember(task.projectId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    const oldStatus = task.status;
    await task.update({ status, position });
    const full = await Task.findByPk(task.id, { include: taskIncludes() });
    await ActivityLog.create({ projectId: task.projectId, taskId: task.id, userId: req.user.id, action: 'task_moved', metadata: { from: oldStatus, to: status } });
    req.io?.to(`project:${task.projectId}`).emit('task:moved', full);
    res.json({ success: true, task: full });
  } catch (err) { next(err); }
};

// ── Comments ──────────────────────────────────────────────────────────

exports.addComment = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task tidak ditemukan' });
    if (!(await isMember(task.projectId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    const comment = await Comment.create({ taskId: task.id, userId: req.user.id, content: req.body.content });
    const full = await Comment.findByPk(comment.id, { include: [{ model: User, as: 'author', attributes: ['id','name','avatar'] }] });
    req.io?.to(`project:${task.projectId}`).emit('comment:added', { taskId: task.id, comment: full });
    res.status(201).json({ success: true, comment: full });
  } catch (err) { next(err); }
};

exports.updateComment = async (req, res, next) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Komentar tidak ditemukan' });
    if (comment.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Hanya penulis yang bisa mengedit komentar ini' });
    }
    const task = await Task.findByPk(comment.taskId);
    if (!task || !(await isMember(task.projectId, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    await comment.update({ content: req.body.content });
    const full = await Comment.findByPk(comment.id, { include: [{ model: User, as: 'author', attributes: ['id','name','avatar'] }] });
    req.io?.to(`project:${task.projectId}`).emit('comment:updated', { taskId: task.id, comment: full });
    res.json({ success: true, comment: full });
  } catch (err) { next(err); }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Komentar tidak ditemukan' });
    const task = await Task.findByPk(comment.taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task tidak ditemukan' });
    const membership = await ProjectMember.findOne({ where: { projectId: task.projectId, userId: req.user.id } });
    if (!membership) return res.status(403).json({ success: false, message: 'Akses ditolak' });
    if (comment.userId !== req.user.id && membership.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya penulis atau owner yang bisa menghapus komentar' });
    }
    const taskId = comment.taskId;
    const commentId = comment.id;
    await comment.destroy();
    req.io?.to(`project:${task.projectId}`).emit('comment:deleted', { taskId, commentId });
    res.json({ success: true, message: 'Komentar dihapus' });
  } catch (err) { next(err); }
};

// ── Attachments ───────────────────────────────────────────────────────

exports.uploadAttachment = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ success: false, message: 'Task tidak ditemukan' });
    }
    if (!(await isMember(task.projectId, req.user.id))) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File tidak ditemukan dalam request' });
    }
    const attachment = await Attachment.create({
      taskId: task.id, uploadedBy: req.user.id,
      filename: req.file.filename, originalName: req.file.originalname,
      mimeType: req.file.mimetype, size: req.file.size, path: req.file.path,
    });
    const full = await Attachment.findByPk(attachment.id, { include: [{ model: User, as: 'uploader', attributes: ['id','name'] }] });
    req.io?.to(`project:${task.projectId}`).emit('attachment:added', { taskId: task.id, attachment: full });
    res.status(201).json({ success: true, attachment: full });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
};

exports.deleteAttachment = async (req, res, next) => {
  try {
    const attachment = await Attachment.findByPk(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ success: false, message: 'Lampiran tidak ditemukan' });
    const task = await Task.findByPk(attachment.taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task tidak ditemukan' });
    const membership = await ProjectMember.findOne({ where: { projectId: task.projectId, userId: req.user.id } });
    if (!membership) return res.status(403).json({ success: false, message: 'Akses ditolak' });
    if (attachment.uploadedBy !== req.user.id && membership.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya pengunggah atau owner yang bisa menghapus lampiran' });
    }
    const filePath     = attachment.path;
    const taskId       = attachment.taskId;
    const attachmentId = attachment.id;
    await attachment.destroy();
    fs.unlink(filePath, (err) => { if (err) console.error('Gagal menghapus file dari disk:', filePath, err.message); });
    req.io?.to(`project:${task.projectId}`).emit('attachment:deleted', { taskId, attachmentId });
    res.json({ success: true, message: 'Lampiran dihapus' });
  } catch (err) { next(err); }
};
