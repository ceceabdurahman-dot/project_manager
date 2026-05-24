const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

const runBackup = () => {
  try {
    const dbPath = path.resolve(__dirname, '../../', config.dbPath);
    const backupDir = path.resolve(__dirname, '../../', config.backupPath);

    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    if (!fs.existsSync(dbPath)) { console.log('⚠️  DB belum ada, skip backup'); return; }

    const date = new Date().toISOString().split('T')[0];
    const dest = path.join(backupDir, `db-${date}.sqlite`);
    fs.copyFileSync(dbPath, dest);
    console.log(`✅ Backup DB berhasil: ${dest}`);

    // Hapus backup lama
    const cutoff = Date.now() - config.backupRetainDays * 86400000;
    fs.readdirSync(backupDir).forEach(f => {
      const fp = path.join(backupDir, f);
      if (fs.statSync(fp).mtimeMs < cutoff) { fs.unlinkSync(fp); console.log(`🗑️  Backup lama dihapus: ${f}`); }
    });
  } catch (err) {
    console.error('❌ Backup gagal:', err.message);
  }
};

const startBackupJob = () => {
  cron.schedule('0 2 * * *', runBackup); // Setiap hari pukul 02.00
  console.log('⏰ Backup job aktif (setiap hari 02:00)');
};

module.exports = { startBackupJob, runBackup };
