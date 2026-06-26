/**
 * Auto-seed produksi (idempotent).
 *
 * Dijalankan otomatis saat container start (lihat docker-compose.yml), sebelum
 * `npm start`. Memastikan akun penting selalu ada di database produksi, sehingga
 * tim bisa login walaupun database dibuat ulang di server.
 *
 * Menggunakan konfigurasi & model aplikasi, jadi lokasi database mengikuti
 * variabel DB_PATH yang sama dengan aplikasi (tidak akan salah file).
 *
 * Perilaku:
 *  - User belum ada  -> dibuat (password di-hash via hook model User).
 *  - User sudah ada  -> dilewati (password milik user TIDAK ditimpa),
 *                       kecuali SEED_RESET_PASSWORDS=true.
 *
 * Password diambil dari env (SEED_*_PASSWORD); default hanya fallback.
 */

const { sequelize } = require('../src/config/database');
const { User } = require('../src/models');

const RESET = String(process.env.SEED_RESET_PASSWORDS || '').toLowerCase() === 'true';

const seedUsers = [
  { name: 'Admin',           email: 'admin@local.dev',          role: 'admin',  password: process.env.SEED_ADMIN_PASSWORD || 'admin123' },
  { name: 'Cece Abdurahman', email: 'cece@local.dev',           role: 'member', password: process.env.SEED_CECE_PASSWORD  || 'member123' },
  { name: 'Asep Aripin',     email: 'aseparipin1174@gmail.com', role: 'member', password: process.env.SEED_ASEP_PASSWORD  || 'password1234' },
];

(async () => {
  try {
    await sequelize.authenticate();
    // Pastikan tabel ada sebelum insert (aman: tanpa alter).
    await sequelize.sync();

    let created = 0, reset = 0, skipped = 0;
    for (const u of seedUsers) {
      const existing = await User.findOne({ where: { email: u.email } });
      if (!existing) {
        await User.create({
          name: u.name, email: u.email, role: u.role,
          password: u.password, isActive: true,
        });
        created++;
        console.log(`  [+] dibuat   : ${u.email} (${u.role})`);
      } else if (RESET) {
        existing.password = u.password; // hook bcrypt menghash otomatis
        existing.isActive = true;
        await existing.save();
        reset++;
        console.log(`  [~] reset pw : ${u.email}`);
      } else {
        skipped++;
        console.log(`  [=] ada      : ${u.email} (dilewati)`);
      }
    }

    console.log(`Seed produksi selesai. dibuat=${created} reset=${reset} dilewati=${skipped}`);
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Seed produksi GAGAL:', err.message);
    process.exit(1);
  }
})();
