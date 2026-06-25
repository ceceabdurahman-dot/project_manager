const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { connectDB } = require('./config/database');
require('./models'); // Load all associations
const initSocket = require('./socket/socketServer');
const { startBackupJob } = require('./jobs/backupJob');
const config = require('./config/config');

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: config.corsOrigins, credentials: true },
  transports: ['websocket', 'polling'],
});

app.set('io', io);
initSocket(io);

const start = async () => {
  await connectDB();
  startBackupJob();
  server.listen(config.port, config.host, () => {
    console.log('');
    console.log('🚀 Project Manager Server running!');
    console.log(`   Local:    http://localhost:${config.port}`);
    if (config.host === '0.0.0.0') {
      console.log(`   Network:  http://<YOUR-IP>:${config.port}`);
    } else {
      console.log(`   Host:     ${config.host}`);
    }
    console.log('');
  });
};

start().catch(err => { console.error('❌ Startup failed:', err); process.exit(1); });
