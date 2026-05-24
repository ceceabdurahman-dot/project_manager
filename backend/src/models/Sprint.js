const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sprint = sequelize.define('Sprint', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  goal: { type: DataTypes.TEXT, allowNull: true },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('planning', 'active', 'completed'), defaultValue: 'planning' },
}, { tableName: 'sprints' });

module.exports = Sprint;
