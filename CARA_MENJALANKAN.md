# 🚀 Cara Menjalankan Project Manager

## Prasyarat
- Node.js v20+ sudah terinstall (https://nodejs.org)
- Buka terminal / command prompt

---

## Setup Pertama Kali (Lakukan Sekali)

```bash
# 1. Masuk ke folder project
cd project-manager

# 2. Install semua dependency
cd backend && npm install
cd ../frontend && npm install

# 3. Buat file konfigurasi
cp .env.example .env
# Edit .env jika perlu (opsional)

# 4. Buat folder data
mkdir -p data uploads backups logs

# 5. Jalankan database migration + seed (data awal)
cd backend
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
cd ..
```

---

## Menjalankan untuk Development (Hot Reload)

Buka **2 terminal terpisah**:

**Terminal 1 — Backend:**
```bash
cd project-manager/backend
npm run dev
# Server berjalan di http://localhost:3000
```

**Terminal 2 — Frontend:**
```bash
cd project-manager/frontend
npm run dev
# Vite dev server di http://localhost:5173
```

Buka browser: **http://localhost:5173**

---

## Menjalankan untuk Production (Tim)

```bash
# Build frontend sekali
cd project-manager/frontend
npm run build
cd ..

# Jalankan backend (serve frontend + API sekaligus)
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # agar auto-start saat PC nyala
```

Akses dari jaringan LAN: **http://<IP-komputer-host>:3000**

Cari IP komputer host:
- Windows: `ipconfig` → lihat IPv4 Address
- macOS/Linux: `ifconfig` atau `ip addr`

---

## Akun Default (Setelah Seed)

| Email             | Password   | Role   |
|-------------------|------------|--------|
| admin@local.dev   | admin123   | Admin  |
| cece@local.dev    | member123  | Member |

> ⚠️ **Ganti password segera setelah pertama login!**

---

## Perintah Berguna

```bash
pm2 status          # cek status server
pm2 logs            # lihat log real-time
pm2 restart all     # restart server
pm2 stop all        # stop server
```
