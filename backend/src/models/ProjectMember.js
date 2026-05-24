const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProjectMember = sequelize.define('ProjectMember', {
  id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false },
  userId:    { type: DataTypes.UUID, allowNull: false },
  role:      { type: DataTypes.ENUM('owner', 'admin', 'member', 'viewer'), defaultValue: 'member' },
}, {
  tableName: 'project_members',
  indexes: [
    { unique: true, fields: ['project_id', 'user_id'] },
  ],
});

module.exports = ProjectMember;
