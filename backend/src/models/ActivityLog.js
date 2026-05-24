const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ActivityLog = sequelize.define('ActivityLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: true },
  taskId: { type: DataTypes.UUID, allowNull: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  action: { type: DataTypes.STRING(100), allowNull: false },
  metadata: { type: DataTypes.JSON, defaultValue: {} },
}, { tableName: 'activity_logs', updatedAt: false });

module.exports = ActivityLog;
