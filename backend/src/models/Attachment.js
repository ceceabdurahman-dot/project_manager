const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Attachment = sequelize.define('Attachment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  taskId: { type: DataTypes.UUID, allowNull: false },
  uploadedBy: { type: DataTypes.UUID, allowNull: false },
  filename: { type: DataTypes.STRING, allowNull: false },
  originalName: { type: DataTypes.STRING, allowNull: false },
  mimeType: { type: DataTypes.STRING(100), allowNull: false },
  size: { type: DataTypes.INTEGER, allowNull: false },
  path: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'attachments' });

module.exports = Attachment;
