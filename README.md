# SIMPEG — Sistem Informasi Manajemen Kepegawaian

Sistem informasi kepegawaian Universitas Muhammadiyah Lampung (UML). Backend ditulis dengan **Go** (arsitektur hexagonal) dan men-serve **React SPA** (Vite) dalam satu binary — tanpa Laravel, tanpa server PHP.

![Go](https://img.shields.io/badge/Go-1.26-00ADD8?logo=go&logoColor=white)
![Gin](https://img.shields.io/badge/Framework-Gin-00ADD8)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)

---

## Fitur

- **Manajemen pegawai** — data master (golongan, unit kerja, jabatan, status kepegawaian), riwayat jabatan/golongan/pendidikan/pelatihan, dokumen & foto, soft-delete.
- **Absensi** — check-in/check-out (GPS), riwayat per pegawai; admin/operator bisa check-in atas nama siapa pun.
- **Cuti** — self-service (pegawai/dosen otomatis atas nama sendiri, anti-tamper 403), HRD/operator bisa ajukan atas nama pegawai lain, alur persetujuan pimpinan.
- **Laporan** — rekap pegawai + ekspor CSV.
- **RBAC** — role `admin`, `operator`, `operator_bsdm`, `pimpinan`, `pegawai`, `dosen` + katalog permission.
- **Audit trail** — jejak setiap aksi tulis (siapa, kapan, ubah apa) yang dapat difilter & tampil di UI.
- **Keamanan (OWASP hardening)** — rate limiting via Redis, CORS daftar putih, security headers, JWT HS256, redaksi kredensial di audit/Sentry, rate limit login.
- **Observability 3 lapis** — Sentry (error/panic), access log JSON, audit trail DB.

## Arsitektur

Satu binary Go menyajikan REST API **dan** SPA statis (hasil build `frontend/dist`) dengan fallback client-side routing;

```
Browser → nginx (:8000) → simpeg-app (:8080, Go)
              └─ /api/v1/*     → Go handler (JWT)
              └─ /swagger/*    → Swagger UI (dev)
              └─ /uploads/*    → file dokumen/foto
              └─ /*            → SPA statis + fallback index.html
                           └─ simpeg-redis (:6380)
                           └─ simpeg-db (:5433, PostgreSQL 16)
```

Backend mengikuti **hexagonal architecture** (`simpeg-go`):

```
cmd/main.go                  ← entry point (seed, migrasi, router)
internal/
  config/                    ← loader konfigurasi (env)
  domain/                    ← entity + interface (port)
  adapters/postgres/         ← implementasi DB + migrasi embedded (go:embed)
  adapters/redis/            ← cache & rate limiter
  inbound/http/              ← handler Gin, middleware, router, swagger
  outbound/                  ← adapter eksternal (mailer, dll)
  tests/                     ← unit & integration
```

Migrasi SQL **embedded** di binary (`go:embed`), berjalan otomatis saat start — tanpa perlu menjalankan file terpisah.

## Repo layout

```
simpeg-go/                ← Backend Go + frontend React (Vite)
  frontend/               ← source SPA (React, shadcn/ui)
  internal/               ← kode Go
nginx/                    ← config nginx (dev.conf, prod.conf)
scripts/                  ← dev-start.sh, dev-stop.sh, prod-deploy.sh, seed-test-data.sql
docker-compose.dev.yml    ← environment development (satu project)
docker-compose.yml        ← production (VPS)
```

## Quick Start (Development)

Prasyarat: **Docker + Docker Compose** (tidak perlu Go/Node lokal).

```bash
git clone https://github.com/danisasmita/simpeg.git
cd simpeg

# 1. Siapkan env (salin contoh)
cp simpeg-go/.env.example simpeg-go/.env
#   - DB_HOST=db, REDIS_HOST=redis (di dalam Docker)
#   - Sudah default di .env.example; sesuaikan bila perlu

# 2. Jalankan (semua service = 1 project "simpeg")
./scripts/dev-start.sh
# atau: docker compose -f docker-compose.dev.yml up -d --no-build
```

### Akses

| Service | URL |
|---|---|
| Aplikasi (SPA via nginx) | http://localhost:8000 |
| Vite HMR (dev, hot reload) | http://localhost:5173 |
| API (`/api/v1`) | http://localhost:8000/api/v1 |
| Swagger UI | http://localhost:8000/swagger/index.html |
| MailHog (email testing) | http://localhost:8025 |
| PostgreSQL | localhost:5433 (user/pass/db: `simpeg`) |
| Redis | localhost:6380 |

### Akun login

Data di-seed otomatis saat pertama kali DB diinisialisasi **hanya** admin:

| Email | Password | Role |
|---|---|---|
| `admin@simpeg-uml.test` | `password` | admin |

Untuk menguji seluruh alur (presensi, cuti HRD, approve pimpinan, audit), jalankan seed data tes (idempotent):

```bash
docker exec -i simpeg-db psql -U simpeg -d simpeg < scripts/seed-test-data.sql
```

Lalu tersedia user uji — semua password `password`:

| Email | Role | Terhubung ke pegawai |
|---|---|---|
| `operator@simpeg-uml.test` | operator | Asep Operator |
| `bsdm@simpeg-uml.test` | operator_bsdm | Budi Hartono |
| `pimpinan@simpeg-uml.test` | pimpinan | Dr. Prasetiyo |
| `staff@simpeg-uml.test` | pegawai | Siti Rahayu |
| `dosen@simpeg-uml.test` | dosen | Dewi Anggraini |
| `cuti.test@simpeg-uml.test` | pegawai | Cuti Test |

### Rebuild image (setelah ubah kode Go/frontend)

```bash
docker compose -f docker-compose.dev.yml up -d --build --remove-orphans
```

## Pengembangan Frontend

Source SPA di `simpeg-go/frontend/` (Vite **standalone**, tanpa laravel-vite-plugin).

- **HMR dev**: buka http://localhost:5173 — Vite mem-proxy `/api` & `/uploads` ke Go (`simpeg-app:8080`). Ubah source → langsung tampil.
- **Build produksi** (di-bake ke image Go):

```bash
cd simpeg-go/frontend
npm install --legacy-peer-deps
npm run build        # → frontend/dist, di-copy ke image saat rebuild
```

Catatan: SPA statis juga di-serve oleh Go sehingga halaman refresh langsung di `/dashboard`, `/pegawai`, dll. (fallback `index.html`), kecuali path `/api/*` & `/uploads/*` yang tetap ditangani API.

## Konfigurasi (env)

Variabel utama (`simpeg-go/.env.example`, semua opsional kecuali DB/Redis/JWT):

| Variabel | Deskripsi | Default |
|---|---|---|
| `APP_PORT` | Port HTTP Go (container) | `8080` |
| `APP_URL` | URL publik aplikasi | `http://localhost:8000` |
| `WEB_ROOT` | Lokasi build SPA yang di-serve Go | `frontend/dist` |
| `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` | Koneksi PostgreSQL | `db/5432/simpeg` |
| `REDIS_HOST/REDIS_PORT` | Koneksi Redis | `redis/6379` |
| `JWT_SECRET` | Secret token JWT (wajib diganti di produksi) | — |
| `JWT_EXPIRY` | Masa berlaku token | `120m` |
| `SMTP_*` | SMTP untuk email (opsional; tanpa SMTP token dikembalikan di respons) | kosong |
| `SENTRY_DSN` | Error tracking Sentry (kosong = nonaktif) | kosong |
| `APP_ALLOWED_ORIGINS` | Origin CORS tambahan (mis. `http://localhost:5173`) | kosong |

## Production (VPS)

`docker-compose.yml` (project `simpeg-prod`) = app (binary Go + SPA) + PostgreSQL + Redis + nginx (SSL via certbot).

```bash
# di VPS
cp simpeg-go/.env.example .env      # lalu isi JWT_SECRET, DB_PASSWORD, APP_URL, SMTP, SENTRY
./scripts/prod-deploy.sh            # build frontend → compose build app → recreate
```

Volume persisten: `simpeg-uploads` & `simpeg-dokumen` (dokumen & foto) + volume DB. Migrasi otomatis saat app start.

Deployment CI/CD terdapat di `.github/workflows/` (deploy-dev & deploy-prod) — memakai GitHub Secrets.

## Referensi

- `simpeg-go/AGENTS.md` — engineering handbook (arsitektur, konvensi, keamanan, observability).

## Lisensi

Proyek internal Universitas Muhammadiyah Lampung. Seluruh kode milik UML.