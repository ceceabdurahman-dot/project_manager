const User          = require('./User');
const Project       = require('./Project');
const ProjectMember = require('./ProjectMember');
const Sprint        = require('./Sprint');
const Task          = require('./Task');
const Comment       = require('./Comment');
const ActivityLog   = require('./ActivityLog');
const Attachment    = require('./Attachment');

// ── User ↔ Project ────────────────────────────────────────────────────
Project.belongsTo(User, { as: 'owner', foreignKey: 'ownerId', onDelete: 'CASCADE' });
User.hasMany(Project, { foreignKey: 'ownerId', onDelete: 'CASCADE' });

// ── Project ↔ Members (M:N via ProjectMember) ─────────────────────────
Project.belongsToMany(User, { through: ProjectMember, foreignKey: 'projectId', as: 'members' });
User.belongsToMany(Project, { through: ProjectMember, foreignKey: 'userId', as: 'projects' });
Project.hasMany(ProjectMember, { foreignKey: 'projectId', onDelete: 'CASCADE' });
ProjectMember.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
ProjectMember.belongsTo(Project, { foreignKey: 'projectId', onDelete: 'CASCADE' });

// ── Project ↔ Sprint ──────────────────────────────────────────────────
Project.hasMany(Sprint, { foreignKey: 'projectId', onDelete: 'CASCADE' });
Sprint.belongsTo(Project, { foreignKey: 'projectId' });

// ── Project ↔ Task ────────────────────────────────────────────────────
Project.hasMany(Task, { foreignKey: 'projectId', onDelete: 'CASCADE' });
Task.belongsTo(Project, { foreignKey: 'projectId' });

// ── Sprint ↔ Task (hapus sprint → task tetap ada, sprint_id jadi null) ─
Sprint.hasMany(Task, { foreignKey: 'sprintId', onDelete: 'SET NULL' });
Task.belongsTo(Sprint, { foreignKey: 'sprintId' });

// ── Task self-reference (hapus parent → subtask jadi standalone) ──────
Task.hasMany(Task, { foreignKey: 'parentTaskId', as: 'subtasks', onDelete: 'SET NULL' });
Task.belongsTo(Task, { foreignKey: 'parentTaskId', as: 'parentTask' });

// ── Task ↔ Assignee (hapus user → task tetap ada, assignee jadi null) ─
User.hasMany(Task, { foreignKey: 'assigneeId', as: 'assignedTasks', onDelete: 'SET NULL' });
Task.belongsTo(User, { foreignKey: 'assigneeId', as: 'assignee' });

// ── Task ↔ Reporter (tidak boleh hapus user yang punya reported tasks) ─
User.hasMany(Task, { foreignKey: 'reporterId', as: 'reportedTasks', onDelete: 'RESTRICT' });
Task.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });

// ── Task ↔ Comment (hapus task → hapus semua comment) ────────────────
Task.hasMany(Comment, { foreignKey: 'taskId', onDelete: 'CASCADE' });
Comment.belongsTo(Task, { foreignKey: 'taskId' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'author', onDelete: 'CASCADE' });

// ── Task ↔ Attachment (hapus task → hapus semua attachment dari DB) ───
// Catatan: file fisik di disk dihapus manual di controller (fs.unlink)
Task.hasMany(Attachment, { foreignKey: 'taskId', onDelete: 'CASCADE' });
Attachment.belongsTo(Task, { foreignKey: 'taskId' });
Attachment.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader', onDelete: 'CASCADE' });

// ── Project ↔ ActivityLog ─────────────────────────────────────────────
Project.hasMany(ActivityLog, { foreignKey: 'projectId', onDelete: 'CASCADE' });
ActivityLog.belongsTo(Project, { foreignKey: 'projectId' });
Task.hasMany(ActivityLog, { foreignKey: 'taskId', onDelete: 'CASCADE' });
ActivityLog.belongsTo(Task, { foreignKey: 'taskId' });
User.hasMany(ActivityLog, { foreignKey: 'userId', onDelete: 'CASCADE' });
ActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'actor' });

module.exports = { User, Project, ProjectMember, Sprint, Task, Comment, ActivityLog, Attachment };
