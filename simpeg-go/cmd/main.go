package main

import (
	"encoding/json"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	_ "net/http/pprof"
	"net/url"
	"os"
	"strings"
	"time"

	_ "simpeg-go/docs"
	"simpeg-go/internal/adapters/postgres"
	"simpeg-go/internal/adapters/redis"
	"simpeg-go/internal/config"
	httpHandler "simpeg-go/internal/inbound/http"
	"simpeg-go/internal/outbound"

	"github.com/getsentry/sentry-go"
)

// @title SIMPEG UML API
// @version 1.0
// @description Backend API Sistem Informasi Manajemen Kepegawaian Universitas Muhammadiyah Lampung (Gin + GORM).
// @termsOfService http://simpeg.uml.ac.id
// @contact.name SIMPEG UML
// @host localhost:8000
// @BasePath /api/v1
// @securitydefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	if cfg.Sentry.Enabled() {
		if err := sentry.Init(sentry.ClientOptions{
			Dsn:              cfg.Sentry.DSN,
			Environment:      cfg.Sentry.Environment,
			TracesSampleRate: cfg.Sentry.TracesSampleRate,
			BeforeSend: func(event *sentry.Event, _ *sentry.EventHint) *sentry.Event {
				event.Request = scrubSentryRequest(event.Request)
				return event
			},
		}); err != nil {
			slog.Warn("sentry init gagal, berjalan tanpa error tracking", "err", err)
		} else {
			defer sentry.Flush(2 * time.Second)
			slog.Info("sentry error tracking aktif", "env", cfg.Sentry.Environment, "traces_sample_rate", cfg.Sentry.TracesSampleRate)
		}
	}

	db, err := postgres.NewPostgres(cfg.Database, cfg.Env)
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get sql.DB: %v", err)
	}
	defer sqlDB.Close()

	// Run migrations (embedded, baked into binary)
	if err := postgres.RunMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
	log.Println("✓ Migrations applied")

	redisClient, err := redis.NewRedis(cfg.Redis)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer redisClient.Close()

	rateLimiter := redis.NewRateLimiter(redisClient)

	// Repositories
	userRepo := postgres.NewUserRepository(db)
	roleRepo := postgres.NewRoleRepository(db)
	pegawaiRepo := postgres.NewPegawaiRepository(db)
	golonganRepo := postgres.NewGolonganRepository(db)
	unitKerjaRepo := postgres.NewUnitKerjaRepository(db)
	jabatanRepo := postgres.NewJabatanRepository(db)
	statusKepegawaianRepo := postgres.NewStatusKepegawaianRepository(db)
	absensiRepo := postgres.NewAbsensiRepository(db)
	cutiRepo := postgres.NewCutiRepository(db)
	dashboardRepo := postgres.NewDashboardRepository(db)
	dokumenPegawaiRepo := postgres.NewDokumenPegawaiRepository(db)
	laporanRepo := postgres.NewLaporanRepository(db)
	auditRepo := postgres.NewAuditRepository(db)
	riwayatJabatanRepo := postgres.NewRiwayatJabatanRepository(db)
	riwayatGolonganRepo := postgres.NewRiwayatGolonganRepository(db)
	riwayatPendidikanRepo := postgres.NewRiwayatPendidikanRepository(db)
	riwayatPelatihanRepo := postgres.NewRiwayatPelatihanRepository(db)

	// Handlers
	mailer := outbound.NewMailer(cfg.SMTP, cfg.AppURL)
	authHandler := httpHandler.NewAuthHandler(userRepo, roleRepo, cfg.JWT, mailer, auditRepo)
	cachedRoleRepo := httpHandler.NewCachedRoleRepository(roleRepo, 5*time.Minute)
	rolesHandler := httpHandler.NewRolesHandler(cachedRoleRepo)
	pegawaiHandler := httpHandler.NewPegawaiHandler(pegawaiRepo, userRepo, cachedRoleRepo)
	golonganHandler := httpHandler.NewGolonganHandler(golonganRepo)
	unitKerjaHandler := httpHandler.NewUnitKerjaHandler(unitKerjaRepo)
	jabatanHandler := httpHandler.NewJabatanHandler(jabatanRepo)
	statusKepegawaianHandler := httpHandler.NewStatusKepegawaianHandler(statusKepegawaianRepo)
	absensiHandler := httpHandler.NewAbsensiHandler(absensiRepo)
	cutiHandler := httpHandler.NewCutiHandler(cutiRepo, userRepo)
	dashboardHandler := httpHandler.NewDashboardHandler(dashboardRepo)
	dokumenPegawaiHandler := httpHandler.NewDokumenPegawaiHandler(dokumenPegawaiRepo)
	laporanHandler := httpHandler.NewLaporanHandler(laporanRepo)
	geocodeHandler := httpHandler.NewGeocodeHandler()
	auditLogHandler := httpHandler.NewAuditLogHandler(auditRepo)
	googleAuthHandler := httpHandler.NewGoogleAuthHandler(userRepo, cfg, cfg.JWT)
	riwayatHandler := httpHandler.NewRiwayatHandler(
		riwayatJabatanRepo, riwayatGolonganRepo, riwayatPendidikanRepo, riwayatPelatihanRepo,
	)

	app := httpHandler.SetupRouter(&httpHandler.Dependency{
		AuthHandler:              authHandler,
		PegawaiHandler:           pegawaiHandler,
		GolonganHandler:          golonganHandler,
		UnitKerjaHandler:         unitKerjaHandler,
		JabatanHandler:           jabatanHandler,
		StatusKepegawaianHandler: statusKepegawaianHandler,
		AbsensiHandler:           absensiHandler,
		CutiHandler:              cutiHandler,
		RiwayatHandler:           riwayatHandler,
		RolesHandler:             rolesHandler,
		DashboardHandler:         dashboardHandler,
		DokumenPegawaiHandler:    dokumenPegawaiHandler,
		LaporanHandler:           laporanHandler,
		GeocodeHandler:           geocodeHandler,
		GoogleAuthHandler:        googleAuthHandler,
		AuditLogHandler:          auditLogHandler,
		AuditRepo:                auditRepo,
		RoleRepo:                 cachedRoleRepo,
		RateLimiter:              rateLimiter,
	}, cfg)

	// pprof endpoint: only in non-production env (dev profile via :6060)
	if cfg.Env != "production" {
		go func() {
			log.Println("🧵 pprof listening on :6060")
			if err := http.ListenAndServe(":6060", nil); err != nil {
				log.Printf("pprof server stopped: %v", err)
			}
		}()
	}

	log.Printf("🚀 SIMPEG API starting on port %s", cfg.Port)
	if err := app.Run(fmt.Sprintf(":%s", cfg.Port)); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// scrubSentryRequest menghapus header/query/kookie sensitif sebelum event dikirim ke cloud
// (komitmen privasi: tidak ada token, password, atau sesi yang keluar server).
func scrubSentryRequest(r *sentry.Request) *sentry.Request {
	if r == nil {
		return nil
	}
	sensitive := []string{"authorization", "cookie", "x-csrf"}
	for _, name := range sensitive {
		delete(r.Headers, name)
	}
	if r.QueryString != "" {
		q, err := url.ParseQuery(r.QueryString)
		if err == nil {
			for k := range q {
				lower := strings.ToLower(k)
				if strings.Contains(lower, "token") || strings.Contains(lower, "password") {
					delete(q, k)
				}
			}
			r.QueryString = q.Encode()
		}
	}
	if r.Data != "" {
		var m map[string]any
		if err := json.Unmarshal([]byte(r.Data), &m); err == nil {
			for k := range m {
				lower := strings.ToLower(k)
				if strings.Contains(lower, "token") || strings.Contains(lower, "password") {
					delete(m, k)
				}
			}
			if out, err := json.Marshal(m); err == nil {
				r.Data = string(out)
			}
		}
	}
	return r
}
