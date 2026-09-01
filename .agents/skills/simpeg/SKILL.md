---
name: simpeg-uml
description: >
  Konteks lengkap proyek SIMPEG (Sistem Informasi Manajemen Kepegawaian)
  Universitas Muhammadiyah Lampung. Aktifkan skill ini setiap kali mengerjakan
  fitur, debugging, atau diskusi arsitektur untuk proyek SIMPEG UML.
  Trigger kata kunci: simpeg, simpeg-uml, kepegawaian, UML, pegawai sistem.
---

# SIMPEG UML — Skill Context

## Identitas Proyek

- **Nama sistem**: SIMPEG UML (Sistem Informasi Manajemen Kepegawaian Universitas Muhammadiyah Lampung)
- **Klien**: Universitas Muhammadiyah Lampung (UML)
- **Tim**: 2 orang (1 lead developer + 1 helper)
- **Status**: Development aktif
- **Repo path**: `/Users/daniwirasasmita/Documents/simpeg`

## Tech Stack (FINAL — jangan ubah tanpa diskusi)

| Layer | Technology | Catatan |
|---|---|---|
| Backend | **Go (Gin + GORM)** di `simpeg-go/` | Prabogo hexagonal; Laravel SUDAH DIHAPUS |
| Frontend | **React + TypeScript (SPA, react-router-dom)** | REST ke backend Go; BUKAN Inertia |
| UI Components | **shadcn/ui** | Sudah diputuskan, jangan ganti |
| CSS | **Tailwind CSS v4** | - |
| Database | **PostgreSQL 16** | Go: `simpeg-go` compose (godb, port 5433) |
| Cache | **Redis 7** | Go: `goredis`, port 6380; rate limiter |
| SPA Serving | **Backend Go sendiri** | `frontend/` di-build Vite → `dist` di-bake ke image; fallback index.html di router |
| Auth | **JWT (HS256)** | Kompatibel hash bcrypt Laravel ($2y$) untuk user lama |
| Runtime | **Docker Compose** | 2 compose: simpeg-go + support dev (nginx/node/mailhog) |

## Keputusan Teknis yang Sudah Fixed

| # | Keputusan | Pilihan |
|---|---|---|
| D1 | Stack utama | Go backend + React SPA (Laravel dihapus) |
| D2 | Frontend approach | REST API ke Go (bukan Inertia) |
| D3 | Database | PostgreSQL, 1 instance di Go (godb) |
| D4 | Cache/Queue | Redis (rate limit; queue tak lagi dipakai) |
| D5 | Deployment | Docker Compose di VPS tunggal |
| D7 | Replikasi DB | ❌ Tidak pakai master-slave |
| D8 | Presensi | Masuk SIMPEG fase 1.5 |
| D9 | Budget VPS | Seminimal mungkin |
| SSO | Auth | Google SSO atau email institusi UML |
| UI | Components | shadcn/ui (bukan template berbayar) |

## Security (OWASP Hardening) — Backend Go (simpeg-go)

Backend di `/Users/daniwirasasmita/Documents/simpeg/simpeg-go` (Gin + GORM + Redis). Detail pemeliharaan di `simpeg-go/AGENTS.md`.

- **Rate limiting Redis** — fixed-window, Lua atomik (`internal/adapters/redis/ratelimit.go`):
  - `/auth/login` → **15/menit** per-IP
  - `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/email/verify`, `/auth/google*` → **10/menit** per-IP
  - Key: `ratelimit:{prefix}:{ip}`; IP diambil dari `X-Real-IP` → `X-Forwarded-For` → `ClientIP` (helper `clientIP(c)`).
  - Respon saat limit: **429** `{"error":"Terlalu banyak percobaan, coba lagi nanti"}` + header `X-RateLimit-Limit` / `X-RateLimit-Remaining`.
  - Fail-open jika Redis error (jangan matikan app gara-gara Redis down).
  - Flush saat tes sendiri kena 429: `docker exec simpeg-go-redis redis-cli --scan --pattern 'ratelimit:*' | xargs -r docker exec simpeg-go-redis redis-cli del`.
- **CORS** — exact-match ke `cfg.AppURL` (echo + `Vary: Origin`). Origin asing TIDAK mendapat `Access-Control-Allow-Origin`.
- **Security headers** (global middleware): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `Referrer-Policy: no-referrer`, `Permissions-Policy` (matikan camera/microphone/geolocation).
- **Upload dokumen** — maks **10 MB** + whitelist ekstensi `pdf/jpg/jpeg/png/doc/docx/xls/xlsx` → 400. Path disk selalu `uploads/dokumen/{pegawai_id}/<timestamp>_<sanitized>` (sanitizeFilename, traversal–aman). nginx `client_max_body_size 15m`.
- **Foto pegawai** — backend Go menerima multipart (`foto` file, JPG/PNG ≤ 2MB, + field `data` berisi JSON pegawai) atau JSON polos. Disimpan `uploads/pegawai/foto/<ts>_<suffix>_<name>`; respons `foto` (path) + `foto_url` (`/uploads/...`). Disajikan via `location ^~ /uploads/` nginx → Go (`app.Static` hanya folder foto, bukan seluruh uploads). Frontend `FormPegawai.tsx` kirim FormData saat foto dipilih.
- **JWT** — golang-jwt v5, HS256; `ValidateToken` memaksa `SigningMethodHMAC` (tolak `alg:none`, RS256 confusion) → 401. Token ringkas: `user_id`, `email`, `role`, `exp`, `iat`.
- **pprof & GORM logging** — hanya aktif/query-log saat `APP_ENV != "production"` (pprof :6060 container-only; GORM logger Warn→Error di prod).
- **nginx** — `server_tokens off` + `client_max_body_size 15m` di `nginx/dev.conf`.
- **Hasil audit** (dev): SQLi 100% parameterized, JWT masquerade ditolak, akses per-permission benar (pimpinan 403 di write), password/hash tidak pernah di respons JSON.

## Infrastruktur Docker

### File Docker Compose
| File | Environment |
|---|---|
| `docker-compose.dev.yml` | Local development — 6 service: app, db, redis, nginx, node, mailhog |
| `docker-compose.yml` | Production VPS (Go app + nginx + certbot + db + redis) |
| `docker-compose.monitoring.yml` | Monitoring stack (opsional, tidak aktif) |

### Services
- **app** — Backend Go + SPA statis (`/` fallback index.html). Container `simpeg-app`.
- **db** — PostgreSQL 16 (:5433 host, :5432 container)
- **redis** — Redis 7 (:6380 host, :6379 container)
- **nginx** — Reverse proxy :8000 → semua ke Go
- **node** — Vite dev server (local only, HMR :5173)
- **mailhog** — Email testing (:8025 UI, :1025 SMTP)
- **Laravel/PHP-FPM/queue/scheduler TIDAK ADA lagi** — sudah dihapus.

### URL Environments
| Env | URL |
|---|---|
| Local dev | `http://localhost:8000` |
| Dev/Testing VPS | `https://dev.simpeg.uml.ac.id` |
| Production | `https://simpeg.uml.ac.id` |
| Monitoring | `https://monitor.simpeg.uml.ac.id` |
| Uptime | `https://uptime.simpeg.uml.ac.id` |

## CI/CD Workflow

```
feature/* branch → PR ke develop → merge → auto deploy dev.simpeg.uml.ac.id
develop branch → PR ke main → merge → auto deploy simpeg.uml.ac.id
```

GitHub Actions CI:
1. `go vet ./...` + `go build ./...` + `go test ./...` (simpeg-go)
2. `npm ci` + `npm run build` (simpeg-go/frontend)
3. SSH deploy + build image + rolling restart + health check `/health`

## Roadmap & Modul

### Fase MVP (Prioritas Sekarang)
Modul inti SIMPEG:
1. **Autentikasi & Manajemen User** — login, role (Admin, Operator, Pimpinan)
2. **Master Data** — Golongan, Jabatan, Unit Kerja, Status Kepegawaian
3. **Data Pegawai** — profil lengkap, data keluarga, kontak
4. **Riwayat Kepegawaian** — riwayat jabatan, pangkat/golongan
5. **Riwayat Pendidikan** — formal & informal
6. **Dokumen Pegawai** — upload SK, ijazah, sertifikat
7. **Laporan** — export PDF/Excel per modul

### Fase 1.5
- Presensi multi-pola (tendik jam tetap, dosen fleksibel, satpam shift)
- Integrasi Neo Feeder/SISTER (sinkron data ke PDDIKTI/LLDIKTI)

### Fase 2
- Sistem Akademik

### Fase 3
- Sistem Keuangan

### Konteks Regulasi
Kemdikti mewajibkan BKD & kenaikan jabatan akademik lewat **SISTER** (migrasi Sept 2026). Sistem lokal harus **melengkapi + sinkronisasi**, bukan menduplikasi fungsi SISTER.

## Struktur Direktori Proyek

```
simpeg/
├── .agents/skills/simpeg/SKILL.md    ← file ini
├── .github/workflows/
│   ├── deploy-dev.yml
│   └── deploy-prod.yml
├── simpeg-go/                        ← Backend Go + Frontend SPA
│   ├── cmd/main.go
│   ├── internal/
│   │   ├── config/                   ← loader config (incl. WEB_ROOT)
│   │   ├── domain/                   ← entity & port interface
│   │   ├── adapters/postgres/        ← repo + embedded migrations
│   │   ├── adapters/redis/           ← cache + rate limiter
│   │   └── inbound/http/             ← handler, middleware, router (SPANoRoute)
│   ├── docs/                         ← Swagger (swag go:generate)
│   ├── frontend/                     ← React SPA (source)
│   │   ├── index.html
│   │   ├── vite.config.ts            ← vite standalone (tanpa laravel-vite-plugin)
│   │   ├── package.json
│   │   ├── resources/js/             ← React source (Pages/, Components/, ...)
│   │   └── dist/                     ← hasil build (di-bake ke image Go)
│   └── Dockerfile
├── docker-compose.dev.yml            ← 1 project: app + db + redis + nginx + node + mailhog
├── docker-compose.yml                ← Production VPS
├── nginx/
│   ├── dev.conf                      ← SEMUA → proxy ke simpeg-app:8080
│   └── prod.conf
├── monitoring/
├── scripts/
│   ├── dev-start.sh
│   ├── dev-stop.sh
│   └── prod-deploy.sh
└── simpeg-go/.env                    ← konfigurasi Go (DB_HOST=db, REDIS_HOST=redis)
```

## Konvensi Koding

### Backend (Go) — selengkapnya di `simpeg-go/AGENTS.md`
- Hexagonal: handler (inbound) + domain (port) + adapter postgres/redis.
- Handler Gin: `ShouldBindJSON`, `c.Param("id")`, `c.GetInt64("user_id")`, `c.JSON(code, gin.H{...})`.
- Migrasi SQL di-embed (`migrations/*.sql`) — idempotent, jalan otomatis saat start.
- Auth JWT HS256; roles: admin, operator, pimpinan, pegawai (+operator_bsdm utk cuti).

### Frontend (React + TypeScript)
- Seluruh komponen TypeScript (`.tsx`), alias `@/*` → `resources/js/*`
- UI components shadcn/ui di `resources/js/Components/ui/`
- Pages di `resources/js/Pages/`, shared di `resources/js/Components/`, layout di `resources/js/Layouts/`, types di `resources/js/types/`
- Data via Axios `lib/api.ts` (baseURL `/api/v1`, token di localStorage `simpeg_token`)
- Build: `cd simpeg-go/frontend && npm run build` (tsc + vite) → `dist/`

### Database
- Naming tabel: snake_case plural (`pegawais`, `unit_kerjas`, `riwayat_jabatans`)
- Foreign key: `{tabel_singular}_id` (misal: `pegawai_id`)
- Soft deletes: digunakan di semua tabel utama
- Timestamps: selalu pakai `created_at`, `updated_at`

## In-App Documentation (User Help)

Strategi dokumentasi untuk staf non-teknis:
- **Onboarding wizard** (Shepherd.js/driver.js) saat login pertama
- **Tooltip kontekstual** (icon `?` di form)
- **Help panel** slide-out per halaman
- Konten help di-manage via admin dashboard (fase lanjut)
- **Tidak ada** portal dokumentasi eksternal

## Hal yang Perlu Diingat

1. Tim kecil → kode harus mudah diserahkan ke junior developer
2. VPS budget hemat → hindari service yang berat (Laravel+PHP Framework sudah diganti Go single-binary)
3. Tidak perlu master-slave DB → cukup backup offsite ke Google Drive
4. REST API backend Go sudah jadi sumber data utama frontend React SPA
5. SSO bisa Google atau email institusi UML — belum final, tapi arahkan ke salah satu
6. WhatsApp gateway → fase lanjut, jangan implement sekarang

## API Documentation (Swagger/OpenAPI) — Backend Go
- Dokumen API endpoint di-backend Go (`simpeg-go`) menggunakan **swaggo/gin-swagger**, diakses: `http://localhost:8000/swagger/index.html` (dev; diblokir saat `APP_ENV=production`).
- Annotasi godoc di tiap handler; regenerate: `swag init -g cmd/main.go -o docs`. CLI v1.16.4 ↔ library v1.16.6 (harus sejajar).
- nginx dev.conf membutuhkan `location ^~ /swagger/ → simpeg-go-app:8080` (sebelum `location /`).
- Detail konvensi & daftar verifikasi lengkap ada di `simpeg-go/AGENTS.md` (section "API Documentation").
