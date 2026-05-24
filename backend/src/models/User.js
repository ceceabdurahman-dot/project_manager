const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'member'), defaultValue: 'member' },
  avatar: { type: DataTypes.STRING, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => { user.password = await bcrypt.hash(user.password, 12); },
    beforeUpdate: async (user) => { if (user.changed('password')) user.password = await bcrypt.hash(user.password, 12); },
  },
});

User.prototype.comparePassword = async function(plain) {
  return bcrypt.compare(plain, this.password);
};

User.prototype.toJSON = function() {
  const v = { ...this.get() };
  delete v.password;
  return v;
};

module.exports = User;
