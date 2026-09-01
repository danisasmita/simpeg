# Prabogo Project Instructions for AI Assistants

## Project Identity
- **Project Name**: SIMPEG Go (Backend)
- **Framework**: Prabogo (Hexagonal Architecture)
- **HTTP Framework**: Gin (github.com/gin-gonic/gin)
- **ORM/DB**: GORM (gorm.io/gorm) + gorm.io/driver/postgres (PostgreSQL 16)
- **Cache**: Redis 7
- **Auth**: JWT (golang-jwt/jwt/v5), compatible with Laravel bcrypt ($2y$) hashes
- **Go Version**: >= 1.26.0

## Architecture (Prabogo Hexagonal)
```
cmd/main.go                    ← Entry point
internal/
  config/                      ← Configuration loader
  domain/                      ← Entities & port interfaces
  adapters/
    postgres/                  ← Database implementations + embedded migrations
    redis/                     ← Cache implementations
  inbound/
    http/                      ← Gin HTTP handlers, middleware & router
  outbound/                    ← External service adapters
tests/                         ← Tests (unit + integration)
utils/                         ← Shared utilities
```

## Conventions
- DB access via GORM (`gorm.DB` injected ke semua repo constructor). Strategi hybrid:
  - Fluent chain (`db.Table(...).Select(...).Where(...).Scan(...)`, `Create`, `Updates(map)`, `Update("deleted_at", gorm.Expr("NOW()"))`) untuk CRUD single-table.
  - `db.Raw(...).Scan(...)` untuk query join kompleks (pegawai FindAll, cuti list, laporan, dashboard, CheckIn upsert RETURNING). Scan hasil Raw ke struct flat (DTO); kolom nullable yang di-scan ke `string` wajib pakai `COALESCE(...,'')`.
- Setelah `Scan`, cek `if X.ID == 0 { return ... "not found" }` untuk menggantikan semantik ErrNoRows.
- Domain struct diberi tag GORM (`gorm:"column:..."`); field relasi diberi `gorm:"-"` agar GORM tidak menulis asosiasi.
- Migrations are EMBEDDED via go:embed (`migrations/*.sql`) — no separate file needed at runtime
- Migration runner (`RunMigrations` in `adapters/postgres/migrate.go`) splits SQL on semicolons (handles quoted strings) and tolerates "already exists" (idempotent), eksekusi via `db.Exec`
- Handler Gin: `ShouldBindJSON` untuk body, `c.Param("id")`, `c.GetInt64("user_id")` (nilai di-set AuthMiddleware), `c.FileAttachment` untuk download, `c.JSON(code, gin.H{...})`.
- Route param sub-route pegawai pakai `:id` (bukan `:pegawaiId`): `/pegawai/:id/dokumen`, `/pegawai/:id/riwayat-*`. Pengecualian `/absensi/:pegawaiId/history` (tidak konflik dengan param lain, dipertahankan).
- Auth via JWT Bearer token
- Roles: admin, operator, pimpinan, pegawai
- Error responses: `{"error": "message"}`
- Success responses: `{"data": ...}` or direct JSON
- Port interfaces in `domain/`, implementations in `adapters/`

## Security (OWASP hardening)
- Rate limiting via Redis fixed-window (Lua atomic, `internal/adapters/redis/ratelimit.go`): `/auth/login` 15/mnt, register/forgot-password/reset-password/verify-email/google 10/mnt, per-IP (X-Real-IP/X-Forwarded-For fallback). Nonaktif jika `RateLimiter == nil`. Response 429 `{"error": ...}` + header `X-RateLimit-*`.
- IP asal diambil `clientIP(c)` (X-Real-IP dulu) — utk request lewat nginx.
- CORS dibatasi ke daftar origin `cfg.AllowedOrigins` (echo + `Vary: Origin`); daftar = `APP_URL` + ref. `APP_ALLOWED_ORIGINS` (comma-separated, untuk dev vite :5173). Origin asing tidak dapat ACAO header.
- Security headers global: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `Referrer-Policy: no-referrer`, `Permissions-Policy`.
- Upload dokumen: maks 10 MB (`maxDokumenSize`), whitelist ekstensi pdf/jpg/jpeg/png/doc/docx/xls/xlsx → 400.
- Foto pegawai: update di `PegawaiHandler` menerima JSON ATAU multipart (`foto` file, JPG/PNG max 2MB; field `data` berisi JSON pegawai bila multipart). Foto disimpan `uploads/pegawai/foto/<ts>_<sufix>_<sanitized>`; di-respons sebagai `foto` (path relatif) + `foto_url` (`/uploads/<foto>`, helper `domain.FotoPathURL`, di-set repo & handler). Route statis `app.Static("/uploads/pegawai/foto", ...)`; nginx `location ^~ /uploads/` → Go. Jangan serve seluruh `uploads/` (dokumen sensitif).
- pprof (:6060) & GORM log query (Warn→Error) hanya aktif jika `APP_ENV != production`.
- nginx: `server_tokens off` + `client_max_body_size 15m` (nginx/dev.conf).
- JWT: golang-jwt v5 sudah menolak `alg:none`/RS256-confusion; sign/validate selalu HS256 via `crypto.SignMethodHS256`.

## API Endpoints
```
Public:
  POST /api/v1/auth/login          {email, password}
  POST /api/v1/auth/register       {name, email, password, role}

Protected (Bearer token):
  GET  /api/v1/auth/profile
  # Master Data
  GET/POST/PUT/DELETE /api/v1/golongan[/:id]
  GET/POST/PUT/DELETE /api/v1/unit-kerja[/:id]  (?tree=1 for hierarchy)
  GET/POST/PUT/DELETE /api/v1/jabatan[/:id]
  GET/POST/PUT/DELETE /api/v1/status-kepegawaian[/:id]
  # Pegawai
  GET/POST/PUT/DELETE /api/v1/pegawai[/:id]     (?page&limit&search)
  # Riwayat (per pegawai)
  GET/POST /api/v1/pegawai/:id/riwayat-jabatan
  GET/POST /api/v1/pegawai/:id/riwayat-golongan
  GET/POST /api/v1/pegawai/:id/riwayat-pendidikan
  GET/POST /api/v1/pegawai/:id/riwayat-pelatihan
  PUT/DELETE /api/v1/riwayat-{jabatan,golongan,pendidikan,pelatihan}/:id
  # Absensi
  POST /api/v1/absensi/check-in | check-out
  GET  /api/v1/absensi/:pegawaiId/history
  # Cuti (self-service: admin/operator/operator_bsdm boleh pilih pegawai_id siapa pun;
  #   pegawai/dosen/pimpinan DIPAKSA atas nama sendiri dari users.pegawai_id —
  #   belum terhubung → 422, ngirim pegawai_id orang lain → 403 anti-tamper;
  #   jenis wajib di whitelist tahunan/sakit/melahirkan/besar/alasan_penting,
  #   tanggal_selesai >= tanggal_mulai)
  GET/POST /api/v1/cuti
  PATCH /api/v1/cuti/:id        {status: disetujui|ditolak}
  # Dokumen pegawai
  GET/POST /api/v1/pegawai/:id/dokumen
  GET/PUT/DELETE /api/v1/dokumen-pegawai/:id
  GET  /api/v1/dokumen-pegawai/:id/download
  # Laporan
  GET /api/v1/laporan/pegawai            (?status_aktif&unit_kerja_id)
  GET /api/v1/laporan/pegawai/export     (CSV)
  # Roles & Permissions
  GET/POST /api/v1/roles
  GET/PUT/DELETE /api/v1/roles/:name
  GET /api/v1/roles/permissions
  # Dashboard
  GET /api/v1/dashboard/stats
  # Geocode (public juga di /api/geocode/reverse)
  GET /api/v1/geocode/reverse            (?lat&lon)
```

## Seeded Data (on first run)
- 17 Golongan (PNS ranking system)
- 7 Status Kepegawaian
- 13 Unit Kerja (UML + 6 fakultas + 6 biro/lembaga)
- 16 Jabatan (12 struktural + 4 akademik)
- Admin user: `admin@simpeg-uml.test` / password (Laravel-compatible hash)

## Docker
- Dockerfile: multi-stage build (golang:1.26-alpine → alpine:3.19); SPA `frontend/dist` di-bake ke image (`COPY frontend/dist ./frontend/dist`)
- Final image: ~30MB
- Migrations embedded in binary — no volume needed; volume persist hanya untuk `uploads/` (dokumen & foto)
- **Satu compose** (`docker-compose.dev.yml` di root): app (Go) + db + redis + nginx + node + mailhog, project `simpeg`.

## Dev Orchestration (SPA React di-serve oleh Go — LARAVEL SUDAH DIHAPUS)
- **Frontend React + backend Go satu repo**: source di `simpeg-go/frontend/` (package.json, vite.config.ts TANPA laravel-vite-plugin, index.html, `resources/js` + `resources/css`). Vite standalone: `npm install --legacy-peer-deps && npm run build` → `frontend/dist`.
- **Go serve SPA via `SPANoRoute` di router.go** (NoRoute): menyajikan file nyata di `WebRoot` (env `WEB_ROOT`, default `frontend/dist`) dan fallback `index.html` untuk client-side routing. Path `/api/` & `/uploads/` TIDAK ditelan (tetap JSON 404). Env `WEB_ROOT` ditambahkan di `internal/config/config.go`.
- **`docker-compose.dev.yml`** (root): satu project, 6 service — app, db (:5433), redis (:6380), nginx (:8000), node/vite (:5173), mailhog (:8025/:1025). Service DB/Redis bernama `db` & `redis`. SMTP dev `SMTP_HOST=mailhog`.
- Start: `./scripts/dev-start.sh` atau manual `docker compose -f docker-compose.dev.yml up -d --no-build`. Reload nginx: `docker exec simpeg-nginx nginx -t && nginx -s reload`.
- **Dev frontend (HMR)**: buka `http://localhost:5173` — vite proxy `/api` & `/uploads` → `http://simpeg-app:8080`. Build produksi: `npm run build` lalu rebuild image.
- Rebuild image: `docker compose -f docker-compose.dev.yml up -d --build --remove-orphans` atau manual `docker build -q -t simpeg-app:latest ./simpeg-go`.
- Verifikasi: `curl http://localhost:8000/api/v1/auth/login` → JSON; `curl http://localhost:8000/` → HTML SPA (index.html); `curl http://localhost:8000/assets/...` → aset.
- Port: nginx 8000 (host), Go app 8080 (container), db 5433, redis 6380, vite 5173, mailhog UI 8025 / SMTP 1025.
## API Documentation (Swagger/OpenAPI via swaggo)
- Dokumen API dihasilkan dari **annotasi godoc** di handler (runtime identik; tipe request anonim TIDAK dijadikan schema — gunakan tipe exported di `internal/inbound/http/swagger_docs.go` atau `domain.*`).
- General info (title/host/BasePath/`@securitydefinitions.apikey BearerAuth`) ada di atas `func main` (cmd/main.go).
- Regenerasi: `$(go env GOPATH)/bin/swag init -g cmd/main.go -o docs` (CLI **v1.16.4**, library runtime **v1.16.6** — versi harus sejajar; jangan downgrade library ke <v1.16 tanpa cek field `Spec.LeftDelim/RightDelim` di docs/docs.go).
- Route UI: `/swagger/*any` (gin-swagger) hanya ter-register jika `cfg.Env != "production"`. Akses via nginx dev: http://localhost:8000/swagger/index.html (perlu `location ^~ /swagger/` → Go di nginx/dev.conf, sebelum `location /`).
- Endpoint baru WAJIB ditambahkan annotasi `@Summary @Tags @Security BearerAuth @Param @Success @Router` agar muncul di docs. Body request yang anonim di handler harus dipindah/di-tracking ke tipe exported (cth `PegawaiStoreRequest`) supaya schema terbentuk.
- Multipart: `@Accept multipart/form-data` + `@Param file formData file true ...`.
- Setelah edit handler: jalankan `swag init`, `go vet ./...`, build linux, deploy image, reload nginx, verifikasi `curl localhost:8000/swagger/doc.json | python3 -m json.tool`.

## Observability (Sentry + Audit Trail + Access Log)
- **3 lapis, Track terpisah**: error/panic → Sentry; request log → `log/slog` JSON stdout; jejak transaksi bisnis → DB `audit_logs` (+ halaman React `/audit-logs`). SEMUA event privasi diskrub di server; jangan kirim token/password ke cloud.
- **Config** (`internal/config/config.go` → `SentryConfig`): env `SENTRY_DSN` (kosong = nonaktif), `SENTRY_ENV` (default `APP_ENV`→`local`), `SENTRY_TRACES_SAMPLE_RATE` (default 0.1, clamp 0..1). Container membaca via `env_file: .env` (docker-compose).
- **Sentry** (`cmd/main.go`): `sentry.Init` dijamin nonaktif jika DSN kosong; `BeforeSend` → `scrubSentryRequest` menghapus `authorization/cookie/x-csrf` + query/body ber-substring `token`/`password`; `defer sentry.Flush(2s)`. `app.Use(sentrygin.New(...))` hanya terpasang jika `cfg.Sentry.Enabled()`. Relay panic: `reportSentry(err, c)` di `RecoveryMiddleware` (scope berisi method/path/ip/user_id/user_email). Kuota free hub SENTRY: 5K event/bulan → sample rate konservatif.
- **Access log**: `RequestLoggerMiddleware` (sebelum CORS) → `slog.Info` JSON: method, path, route, status, duration_ms, ip, user_id. `slog.SetDefault(slog.NewJSONHandler(os.Stdout))` di main.
- **Manual tracing (performa checkpoint)**: helper `startSpan(c, name, op)` di `observability.go` (mengembalikan `nil`/no-op jika SDK Sentry nonaktif → tanpa overhead). Pola: `span := startSpan(c, "service.X", "business_logic"); defer span.Finish()` lalu child span `db.query_*` (`op=query_database`), `logic.*` (`op=hit_password_hash`/`file_io`/`hit_generate_file`), `http.parse_*` (`op=request_parse`). Sudah dipasang di: `Auth.Login` (bcrypt), `Laporan.Pegawai*` (query+CSV), `Cuti.Approve`, `Pegawai.Store/Update` (multipart+foto+insert), `Absensi.CheckIn/CheckOut`. Endpoint berat baru wajib diberi span serupa.
- **Audit trail** (`domain/audit.go` + `postgres/audit_repo.go` + `migrations/003_audit_logs.sql`):
  - Kolom: `user_id` BIGINT (FK users, ON DELETE SET NULL) + `actor VARCHAR` (email/NIP utk keterbacaan), `module`, `action`, `resource_id`, `old_values`/`new_values` JSONB, `ip_address`, `created_at`. Tipe `domain.AuditJSON` memakai `driver.Valuer`/`Scanner`(jsonb) + `MarshalJSON` (swag TIDAK bisa parse `json.RawMessage` — jangan pakai).
  - `AuditMiddleware(repo)` dipasang di group `auth` SETELAH `AuthMiddleware`; mencatat otomatis method POST/PUT/PATCH/DELETE saja. `module` = segment pertama path di-uppercase; `action` = `{MODULE}_{CREATE|UPDATE|DELETE}` (khusus `/cuti/:id` PATCH → `CUTI_APPROVE`); `resource_id`: `c.Param("id"/"pegawaiId")`, utk POST diambil `id` dari response body (writer di-wrap `bodyCapturer`).
  - Body di-redact `redactJSON`: buang field ber-substring password/token/authorization/secret/cookie; non-JSON/multipart & >64KB → kosong (untuk multipart foto, `new_values` tetap kosong).
  - Event PUBLIC di luar group auth dicatat eksplisit di handler: `AUTH_LOGIN`, `AUTH_LOGIN_FAILED`, `AUTH_REGISTER` (AuthHandler.auditAuth).
  - Endpoint: `GET /api/v1/audit-logs` (annotasi swag di `audit_handler.go`), permission `audit.view` (di-seed utk admin+operator), filter query `page/limit/module/action/user_id/from/to`, respons `{data,total,page,limit}`.
- **Frontend**: `frontend/resources/js/Pages/Audit/Index.tsx` (rute `/audit-logs`, nav di AppLayout "Pengaturan → Audit Log", permission `audit.view`), tabel shadcn + filter modul/aksi/rentang tanggal + pagination. Verifikasi cepat: login lalu `curl localhost:8000/api/v1/audit-logs` dan `docker exec simpeg-go-db psql -U simpeg -d simpeg -c "SELECT * FROM audit_logs ORDER BY id DESC LIMIT 5"`.
