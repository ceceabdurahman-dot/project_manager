const errorHandler = (err, req, res, next) => {
  // Log lengkap hanya di server — jangan kirim ke client
  console.error('❌ Error:', err.message);
  if (process.env.NODE_ENV === 'development') console.error(err.stack);

  // Sequelize: duplikat data
  if (err.name === 'SequelizeUniqueConstraintError')
    return res.status(409).json({ success: false, message: 'Data sudah ada (duplikat)' });
    // Catatan: field dihilangkan agar tidak bocor info skema DB ke client

  // Sequelize: validasi model gagal
  if (err.name === 'SequelizeValidationError')
    return res.status(400).json({ success: false, message: err.errors.map(e => e.message).join(', ') });

  // Multer: file terlalu besar
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ success: false, message: 'Ukuran file terlalu besar (maks 10 MB)' });

  // Error dengan status HTTP eksplisit (4xx) — aman dikirim ke client
  const status = err.status || err.statusCode || 500;
  if (status < 500) {
    return res.status(status).json({ success: false, message: err.message || 'Bad Request' });
  }

  // Error 500: jangan bocorkan detail internal ke client di produksi
  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({
    success: false,
    message: isProd ? 'Terjadi kesalahan di server. Silakan coba lagi nanti.' : err.message,
  });
};

module.exports = errorHandler;
