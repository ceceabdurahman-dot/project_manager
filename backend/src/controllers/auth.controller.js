const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/config');

const signToken = (id) =>
  jwt.sign({ id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

// Hanya kirim field yang dibutuhkan frontend — password TIDAK disertakan
const safeUserData = (user) => {
  const data = user.toJSON ? user.toJSON() : user;
  return { id: data.id, name: data.name, email: data.email, role: data.role, avatar: data.avatar || null };
};

// ── Auth ──────────────────────────────────────────────────────────────

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email, isActive: true } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }
    const token = signToken(user.id);
    res.json({ success: true, token, user: safeUserData(user) });
  } catch (err) { next(err); }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, user: safeUserData(req.user) });
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, currentPassword, newPassword } = req.body;

    // Update nama
    if (name !== undefined) {
      const trimmed = (name || '').trim();
      if (!trimmed) return res.status(400).json({ success: false, message: 'Nama tidak boleh kosong' });
      req.user.name = trimmed;
    }

    // Ganti password — wajib verifikasi password lama terlebih dahulu
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Password lama wajib diisi untuk mengganti password' });
      }
      const isValid = await req.user.comparePassword(currentPassword);
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Password lama salah' });
      }
      req.user.password = newPassword; // bcrypt hash dihandle oleh User model hook
    }

    await req.user.save();
    res.json({ success: true, user: safeUserData(req.user) });
  } catch (err) { next(err); }
};

// ── Admin: User Management ─────────────────────────────────────────────

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const user = await User.create({ name, email, password, role });
    res.status(201).json({ success: true, user: safeUserData(user) });
  } catch (err) { next(err); }
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'isActive', 'avatar', 'createdAt'],
      order: [['createdAt', 'ASC']],
    });
    res.json({ success: true, users });
  } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

    const { password } = req.body;
    user.password = password; // bcrypt hash dihandle oleh User model hook
    await user.save();
    res.json({ success: true, message: 'Password berhasil direset' });
  } catch (err) { next(err); }
};

exports.toggleActive = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    // Cegah admin menonaktifkan diri sendiri
    if (user.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Tidak bisa menonaktifkan akun sendiri' });
    }
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, user: safeUserData(user), isActive: user.isActive });
  } catch (err) { next(err); }
};
