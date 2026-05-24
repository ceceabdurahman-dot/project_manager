const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Task = sequelize.define('Task', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false },
  sprintId: { type: DataTypes.UUID, allowNull: true },
  parentTaskId: { type: DataTypes.UUID, allowNull: true },
  title: { type: DataTypes.STRING(250), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM('backlog', 'todo', 'in_progress', 'review', 'done'),
    defaultValue: 'backlog',
  },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), defaultValue: 'medium' },
  assigneeId: { type: DataTypes.UUID, allowNull: true },
  reporterId: { type: DataTypes.UUID, allowNull: false },
  dueDate: { type: DataTypes.DATEONLY, allowNull: true },
  startDate: { type: DataTypes.DATEONLY, allowNull: true },
  storyPoints: { type: DataTypes.INTEGER, allowNull: true },
  position: { type: DataTypes.FLOAT, defaultValue: 0 },
  labels: { type: DataTypes.JSON, defaultValue: [] },
}, { tableName: 'tasks' });

module.exports = Task;
