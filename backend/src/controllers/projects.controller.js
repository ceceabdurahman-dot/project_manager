const { Project, ProjectMember, User, Task, ActivityLog } = require('../models');
const { Op } = require('sequelize');

const getMembership = (projectId, userId) =>
  ProjectMember.findOne({ where: { projectId, userId } });

exports.getAll = async (req, res, next) => {
  try {
    const memberships = await ProjectMember.findAll({ where: { userId: req.user.id } });
    const projectIds  = memberships.map(m => m.projectId);
    const projects = await Project.findAll({
      where: { id: { [Op.in]: projectIds } },
      include: [{ model: User, as: 'owner', attributes: ['id','name','avatar'] }],
      order: [['updatedAt', 'DESC']],
    });
    res.json({ success: true, projects });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description, color, startDate, endDate } = req.body;
    const project = await Project.create({ name, description, color, startDate, endDate, ownerId: req.user.id });
    await ProjectMember.create({ projectId: project.id, userId: req.user.id, role: 'owner' });
    await ActivityLog.create({
      projectId: project.id, userId: req.user.id,
      action: 'project_created', metadata: { name: project.name },
    });
    res.status(201).json({ success: true, project });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const membership = await getMembership(req.params.id, req.user.id);
    if (!membership) return res.status(403).json({ success: false, message: 'Akses ditolak' });

    const project = await Project.findByPk(req.params.id, {
      include: [
        { model: User, as: 'owner', attributes: ['id','name','avatar'] },
        { model: User, as: 'members', attributes: ['id','name','email','avatar'], through: { attributes: ['role'] } },
      ],
    });
    if (!project) return res.status(404).json({ success: false, message: 'Proyek tidak ditemukan' });
    res.json({ success: true, project });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const membership = await getMembership(req.params.id, req.user.id);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Proyek tidak ditemukan' });

    const { name, description, color, status, startDate, endDate } = req.body;
    const oldName   = project.name;
    const oldStatus = project.status;
    await project.update({ name, description, color, status, startDate, endDate });

    // Log: catat field apa yang berubah
    await ActivityLog.create({
      projectId: project.id, userId: req.user.id,
      action: 'project_updated',
      metadata: {
        ...(name   !== oldName   && { oldName,   newName: project.name }),
        ...(status !== oldStatus && { oldStatus, newStatus: project.status }),
      },
    });
    res.json({ success: true, project });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const membership = await getMembership(req.params.id, req.user.id);
    if (!membership || membership.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Hanya owner yang dapat menghapus proyek' });
    }
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Proyek tidak ditemukan' });

    // Log SEBELUM destroy — setelah destroy, projectId sudah tidak bisa di-FK
    // (ActivityLog.projectId onDelete: CASCADE, jadi log pun ikut terhapus — ini expected)
    await ActivityLog.create({
      projectId: project.id, userId: req.user.id,
      action: 'project_deleted', metadata: { name: project.name },
    });
    await project.destroy();
    res.json({ success: true, message: 'Proyek dihapus' });
  } catch (err) { next(err); }
};

exports.getMembers = async (req, res, next) => {
  try {
    const membership = await getMembership(req.params.id, req.user.id);
    if (!membership) return res.status(403).json({ success: false, message: 'Akses ditolak' });

    const members = await ProjectMember.findAll({
      where: { projectId: req.params.id },
      include: [{ model: User, attributes: ['id','name','email','avatar'] }],
    });
    res.json({ success: true, members });
  } catch (err) { next(err); }
};

exports.addMember = async (req, res, next) => {
  try {
    const membership = await getMembership(req.params.id, req.user.id);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    const { userId, role = 'member' } = req.body;

    // Cegah role escalation: role 'owner' tidak boleh di-assign via endpoint ini
    const allowedRoles = ['member', 'viewer'];
    if (membership.role === 'owner') allowedRoles.push('admin'); // Hanya owner boleh assign admin
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: `Tidak bisa memberikan role "${role}"` });
    }

    const targetUser = await User.findByPk(userId);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    const [member, created] = await ProjectMember.findOrCreate({
      where: { projectId: req.params.id, userId },
      defaults: { role },
    });
    if (!created) return res.status(409).json({ success: false, message: 'User sudah menjadi anggota' });

    // Refetch dengan include user data
    const full = await ProjectMember.findByPk(member.id, {
      include: [{ model: User, attributes: ['id', 'name', 'email', 'avatar'] }],
    });

    await ActivityLog.create({
      projectId: req.params.id, userId: req.user.id,
      action: 'member_added',
      metadata: { targetUserId: userId, targetName: targetUser.name, role },
    });
    res.status(201).json({ success: true, member: full });
  } catch (err) { next(err); }
};

exports.updateMemberRole = async (req, res, next) => {
  try {
    const membership = await getMembership(req.params.id, req.user.id);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    const { role } = req.body;

    // Cegah assign role 'owner'
    if (role === 'owner') {
      return res.status(400).json({ success: false, message: 'Role owner tidak dapat diberikan via endpoint ini' });
    }

    // Hanya owner yang bisa promote ke admin
    if (role === 'admin' && membership.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Hanya owner yang bisa memberikan role admin' });
    }

    // Tidak bisa ubah role sendiri
    if (req.params.userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Tidak bisa mengubah role sendiri' });
    }

    const targetMembership = await getMembership(req.params.id, req.params.userId);
    if (!targetMembership) {
      return res.status(404).json({ success: false, message: 'User bukan anggota proyek ini' });
    }

    // Tidak bisa ubah role owner
    if (targetMembership.role === 'owner') {
      return res.status(400).json({ success: false, message: 'Role owner tidak dapat diubah' });
    }

    // Admin tidak bisa demote admin lain (hanya owner)
    if (targetMembership.role === 'admin' && membership.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Hanya owner yang bisa mengubah role admin' });
    }

    await targetMembership.update({ role });

    const full = await ProjectMember.findByPk(targetMembership.id, {
      include: [{ model: User, attributes: ['id', 'name', 'email', 'avatar'] }],
    });

    res.json({ success: true, member: full });
  } catch (err) { next(err); }
};

exports.removeMember = async (req, res, next) => {
  try {
    const membership = await getMembership(req.params.id, req.user.id);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    const targetMembership = await getMembership(req.params.id, req.params.userId);
    if (!targetMembership) {
      return res.status(404).json({ success: false, message: 'User bukan anggota proyek ini' });
    }
    if (targetMembership.role === 'owner') {
      return res.status(400).json({ success: false, message: 'Owner tidak dapat dikeluarkan dari proyek' });
    }
    // Admin tidak bisa keluarkan admin lain (hanya owner)
    if (targetMembership.role === 'admin' && membership.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Hanya owner yang bisa mengeluarkan admin' });
    }

    const targetUser = await User.findByPk(req.params.userId, { attributes: ['name'] });
    await ProjectMember.destroy({ where: { projectId: req.params.id, userId: req.params.userId } });

    await ActivityLog.create({
      projectId: req.params.id, userId: req.user.id,
      action: 'member_removed',
      metadata: { targetUserId: req.params.userId, targetName: targetUser?.name ?? 'Unknown' },
    });
    res.json({ success: true, message: 'Anggota dikeluarkan' });
  } catch (err) { next(err); }
};

exports.getStats = async (req, res, next) => {
  try {
    const membership = await getMembership(req.params.id, req.user.id);
    if (!membership) return res.status(403).json({ success: false, message: 'Akses ditolak' });

    const projectId = req.params.id;
    const [total, done, inProgress, overdue] = await Promise.all([
      Task.count({ where: { projectId } }),
      Task.count({ where: { projectId, status: 'done' } }),
      Task.count({ where: { projectId, status: 'in_progress' } }),
      Task.count({ where: { projectId, status: { [Op.ne]: 'done' }, dueDate: { [Op.lt]: new Date() } } }),
    ]);
    res.json({
      success: true,
      stats: { total, done, inProgress, overdue, progress: total ? Math.round((done / total) * 100) : 0 },
    });
  } catch (err) { next(err); }
};
