const { Sequelize } = require('sequelize');
const path = require('path');
const config = require('./config');

const dbPath = path.resolve(__dirname, '../../', config.dbPath);

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: config.nodeEnv === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected:', dbPath);
    await sequelize.sync({ alter: config.nodeEnv === 'development' });
    console.log('✅ Database synced');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
