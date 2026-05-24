const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Project = sequelize.define('Project', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('active', 'completed', 'archived'), defaultValue: 'active' },
  color: { type: DataTypes.STRING(7), defaultValue: '#2E6DA4' },
  startDate: { type: DataTypes.DATEONLY, allowNull: true },
  endDate: { type: DataTypes.DATEONLY, allowNull: true },
  ownerId: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'projects' });

module.exports = Project;
