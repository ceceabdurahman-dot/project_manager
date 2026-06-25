const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/config');

const parseCookies = (cookieHeader = '') =>
  cookieHeader.split(';').reduce((cookies, part) => {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (!rawName) return cookies;
    cookies[rawName] = decodeURIComponent(rawValue.join('='));
    return cookies;
  }, {});

const getRequestToken = (req) => {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[config.authCookieName]) return cookies[config.authCookieName];

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.split(' ')[1];
  return null;
};

const authenticate = async (req, res, next) => {
  try {
    const token = getRequestToken(req);
    if (!token)
      return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive)
      return res.status(401).json({ success: false, message: 'Akun tidak valid atau tidak aktif' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token tidak valid atau sudah expired' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Hanya admin yang dapat mengakses ini' });
  next();
};

module.exports = { authenticate, requireAdmin, parseCookies };
