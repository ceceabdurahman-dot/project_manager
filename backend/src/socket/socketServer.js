const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { ProjectMember, User } = require('../models');

const initSocket = (io) => {
  // ── Autentikasi WebSocket ─────────────────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Autentikasi diperlukan'));
    try {
      const decoded = jwt.verify(token, config.jwtSecret);

      // Bug fix: cek isActive di DB — token valid tapi user sudah dinonaktifkan harus ditolak
      // (konsisten dengan authenticate HTTP middleware)
      const user = await User.findByPk(decoded.id, { attributes: ['id', 'isActive'] });
      if (!user || !user.isActive) return next(new Error('Akun tidak aktif'));

      socket.user = decoded; // simpan payload JWT (berisi { id })
      next();
    } catch {
      next(new Error('Token tidak valid'));
    }
  });

  // Track online users per project
  const onlineUsers = new Map(); // projectId -> Set<{ userId, socketId }>

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.user.id}`);

    socket.on('join_project', async ({ projectId }) => {
      // Cek membership sebelum masuk room — cegah subscribe event proyek orang lain
      const membership = await ProjectMember.findOne({
        where: { projectId, userId: socket.user.id },
      }).catch(() => null);

      if (!membership) {
        console.warn(`⛔ User ${socket.user.id} ditolak join project:${projectId} (bukan anggota)`);
        return;
      }

      socket.join(`project:${projectId}`);
      if (!onlineUsers.has(projectId)) onlineUsers.set(projectId, new Set());
      onlineUsers.get(projectId).add({ userId: socket.user.id, socketId: socket.id });

      io.to(`project:${projectId}`).emit('user:online', {
        projectId,
        users: [...onlineUsers.get(projectId)].map(u => ({ userId: u.userId })),
      });
      console.log(`📂 User ${socket.user.id} joined project:${projectId}`);
    });

    socket.on('leave_project', ({ projectId }) => {
      socket.leave(`project:${projectId}`);
      const users = onlineUsers.get(projectId);
      if (users) {
        users.forEach(u => { if (u.socketId === socket.id) users.delete(u); });
        io.to(`project:${projectId}`).emit('user:online', {
          projectId,
          users: [...users].map(u => ({ userId: u.userId })),
        });
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.forEach((users, projectId) => {
        users.forEach(u => { if (u.socketId === socket.id) users.delete(u); });
        if (users.size > 0) {
          io.to(`project:${projectId}`).emit('user:online', {
            projectId, users: [...users].map(u => ({ userId: u.userId })),
          });
        }
      });
      console.log(`🔌 Socket disconnected: ${socket.user.id}`);
    });
  });

  return io;
};

module.exports = initSocket;
