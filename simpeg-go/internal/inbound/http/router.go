package http

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"simpeg-go/internal/adapters/redis"
	"simpeg-go/internal/config"
	"simpeg-go/internal/domain"

	"github.com/getsentry/sentry-go/gin"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

type Dependency struct {
	AuthHandler              *AuthHandler
	PegawaiHandler           *PegawaiHandler
	GolonganHandler          *GolonganHandler
	UnitKerjaHandler         *UnitKerjaHandler
	JabatanHandler           *JabatanHandler
	StatusKepegawaianHandler *StatusKepegawaianHandler
	AbsensiHandler           *AbsensiHandler
	CutiHandler              *CutiHandler
	RiwayatHandler           *RiwayatHandler
	RolesHandler             *RolesHandler
	DashboardHandler         *DashboardHandler
	DokumenPegawaiHandler    *DokumenPegawaiHandler
	LaporanHandler           *LaporanHandler
	GeocodeHandler           *GeocodeHandler
	GoogleAuthHandler        *GoogleAuthHandler
	AuditLogHandler          *AuditLogHandler
	AuditRepo                domain.AuditRepository
	RoleRepo                 domain.RoleRepository
	RateLimiter              *redis.RateLimiter
}

func SetupRouter(dep *Dependency, cfg *config.Config) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)

	app := gin.New()
	app.Use(RecoveryMiddleware())
	if cfg.Sentry.Enabled() {
		app.Use(sentrygin.New(sentrygin.Options{}))
	}
	app.Use(RequestLoggerMiddleware())
	app.Use(CORSMiddleware(cfg.AllowedOrigins))
	app.Use(func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		c.Header("Referrer-Policy", "no-referrer")
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Next()
	})

	can := func(permissions ...string) gin.HandlerFunc {
		return PermissionMiddleware(dep.RoleRepo, permissions...)
	}

	app.GET("/health", HealthCheck(cfg))
	if cfg.Env != "production" {
		app.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}
	app.GET("/api/geocode/reverse", dep.GeocodeHandler.Reverse)
	app.Static("/uploads/pegawai/foto", "uploads/pegawai/foto")

	api := app.Group("/api/v1")
	api.GET("/geocode/reverse", dep.GeocodeHandler.Reverse)

	// Public routes (rate-limited)
	rateLimit := func(limit int64, prefix string) gin.HandlerFunc {
		if dep.RateLimiter == nil {
			return func(c *gin.Context) { c.Next() }
		}
		return RateLimitMiddleware(dep.RateLimiter, limit, time.Minute, prefix)
	}
	api.POST("/auth/login", rateLimit(15, "login"), dep.AuthHandler.Login)
	api.POST("/auth/register", rateLimit(10, "register"), dep.AuthHandler.Register)
	api.POST("/auth/forgot-password", rateLimit(10, "forgot_password"), dep.AuthHandler.ForgotPassword)
	api.POST("/auth/reset-password", rateLimit(10, "reset_password"), dep.AuthHandler.ResetPassword)
	api.POST("/auth/email/verify", rateLimit(10, "verify_email"), dep.AuthHandler.VerifyEmail)
	api.GET("/auth/google", rateLimit(10, "google_auth"), dep.GoogleAuthHandler.Redirect)
	api.GET("/auth/google/callback", rateLimit(10, "google_auth"), dep.GoogleAuthHandler.Callback)

	// Protected routes
	auth := api.Group("", AuthMiddleware(cfg.JWT.Secret))
	if dep.AuditRepo != nil {
		auth.Use(AuditMiddleware(dep.AuditRepo))
	}
	auth.GET("/auth/profile", dep.AuthHandler.Profile)
	auth.PUT("/auth/profile", dep.AuthHandler.UpdateProfile)
	auth.DELETE("/auth/profile", dep.AuthHandler.DeleteAccount)
	auth.PUT("/auth/password", dep.AuthHandler.UpdatePassword)
	auth.POST("/auth/confirm-password", dep.AuthHandler.ConfirmPassword)
	auth.POST("/auth/email/verification-notification", dep.AuthHandler.VerifyNotification)
	auth.GET("/dashboard/stats", dep.DashboardHandler.Stats)

	// Laporan
	auth.GET("/laporan/pegawai", can("laporan.view"), dep.LaporanHandler.PegawaiIndex)
	auth.GET("/laporan/pegawai/export", can("laporan.export"), dep.LaporanHandler.PegawaiExport)

	// Roles & Permissions
	auth.GET("/roles", can("settings.view"), dep.RolesHandler.Index)
	auth.GET("/roles/permissions", can("settings.view"), dep.RolesHandler.Permissions)
	auth.GET("/roles/:name", can("settings.view"), dep.RolesHandler.Show)
	auth.POST("/roles", can("settings.update"), dep.RolesHandler.Store)
	auth.PUT("/roles/:name", can("settings.update"), dep.RolesHandler.Update)
	auth.DELETE("/roles/:name", can("settings.update"), dep.RolesHandler.Delete)

	// Audit Log (jejak transaksi bisnis)
	auth.GET("/audit-logs", can("audit.view"), dep.AuditLogHandler.Index)

	// Master Data
	auth.GET("/golongan", can("master.view"), dep.GolonganHandler.Index)
	auth.GET("/golongan/:id", can("master.view"), dep.GolonganHandler.Show)
	auth.POST("/golongan", can("master.create"), dep.GolonganHandler.Store)
	auth.PUT("/golongan/:id", can("master.update"), dep.GolonganHandler.Update)
	auth.DELETE("/golongan/:id", can("master.delete"), dep.GolonganHandler.Delete)

	auth.GET("/unit-kerja", can("master.view"), dep.UnitKerjaHandler.Index)
	auth.GET("/unit-kerja/:id", can("master.view"), dep.UnitKerjaHandler.Show)
	auth.POST("/unit-kerja", can("master.create"), dep.UnitKerjaHandler.Store)
	auth.PUT("/unit-kerja/:id", can("master.update"), dep.UnitKerjaHandler.Update)
	auth.DELETE("/unit-kerja/:id", can("master.delete"), dep.UnitKerjaHandler.Delete)

	auth.GET("/jabatan", can("master.view"), dep.JabatanHandler.Index)
	auth.GET("/jabatan/:id", can("master.view"), dep.JabatanHandler.Show)
	auth.POST("/jabatan", can("master.create"), dep.JabatanHandler.Store)
	auth.PUT("/jabatan/:id", can("master.update"), dep.JabatanHandler.Update)
	auth.DELETE("/jabatan/:id", can("master.delete"), dep.JabatanHandler.Delete)

	auth.GET("/status-kepegawaian", can("master.view"), dep.StatusKepegawaianHandler.Index)
	auth.GET("/status-kepegawaian/:id", can("master.view"), dep.StatusKepegawaianHandler.Show)
	auth.POST("/status-kepegawaian", can("master.create"), dep.StatusKepegawaianHandler.Store)
	auth.PUT("/status-kepegawaian/:id", can("master.update"), dep.StatusKepegawaianHandler.Update)
	auth.DELETE("/status-kepegawaian/:id", can("master.delete"), dep.StatusKepegawaianHandler.Delete)

	// Pegawai
	auth.GET("/pegawai", can("pegawai.view"), dep.PegawaiHandler.Index)
	auth.GET("/pegawai/:id", can("pegawai.view"), dep.PegawaiHandler.Show)
	auth.POST("/pegawai", can("pegawai.create"), dep.PegawaiHandler.Store)
	auth.PUT("/pegawai/:id", can("pegawai.update"), dep.PegawaiHandler.Update)
	auth.DELETE("/pegawai/:id", can("pegawai.delete"), dep.PegawaiHandler.Delete)
	auth.GET("/pegawai/:id/dokumen", can("pegawai.view"), dep.DokumenPegawaiHandler.Index)
	auth.POST("/pegawai/:id/dokumen", can("pegawai.update"), dep.DokumenPegawaiHandler.Store)
	auth.GET("/dokumen-pegawai/:id", can("pegawai.view"), dep.DokumenPegawaiHandler.Show)
	auth.PUT("/dokumen-pegawai/:id", can("pegawai.update"), dep.DokumenPegawaiHandler.Update)
	auth.DELETE("/dokumen-pegawai/:id", can("pegawai.update"), dep.DokumenPegawaiHandler.Delete)
	auth.GET("/dokumen-pegawai/:id/download", can("pegawai.view"), dep.DokumenPegawaiHandler.Download)

	// Absensi
	auth.POST("/absensi/check-in", can("absensi.create"), dep.AbsensiHandler.CheckIn)
	auth.POST("/absensi/check-out", can("absensi.create"), dep.AbsensiHandler.CheckOut)
	auth.GET("/absensi/:pegawaiId/history", can("absensi.view"), dep.AbsensiHandler.History)

	// Cuti
	auth.GET("/cuti", can("cuti.view"), dep.CutiHandler.Index)
	auth.POST("/cuti", can("cuti.create"), dep.CutiHandler.Store)
	auth.PATCH("/cuti/:id", can("cuti.approve"), dep.CutiHandler.Approve)

	// Riwayat
	auth.GET("/pegawai/:id/riwayat-jabatan", can("pegawai.view"), dep.RiwayatHandler.JabatanIndex)
	auth.POST("/pegawai/:id/riwayat-jabatan", can("pegawai.update"), dep.RiwayatHandler.JabatanStore)
	auth.PUT("/riwayat-jabatan/:id", can("pegawai.update"), dep.RiwayatHandler.JabatanUpdate)
	auth.DELETE("/riwayat-jabatan/:id", can("pegawai.update"), dep.RiwayatHandler.JabatanDelete)

	auth.GET("/pegawai/:id/riwayat-golongan", can("pegawai.view"), dep.RiwayatHandler.GolonganIndex)
	auth.POST("/pegawai/:id/riwayat-golongan", can("pegawai.update"), dep.RiwayatHandler.GolonganStore)
	auth.PUT("/riwayat-golongan/:id", can("pegawai.update"), dep.RiwayatHandler.GolonganUpdate)
	auth.DELETE("/riwayat-golongan/:id", can("pegawai.update"), dep.RiwayatHandler.GolonganDelete)

	auth.GET("/pegawai/:id/riwayat-pendidikan", can("pegawai.view"), dep.RiwayatHandler.PendidikanIndex)
	auth.POST("/pegawai/:id/riwayat-pendidikan", can("pegawai.update"), dep.RiwayatHandler.PendidikanStore)
	auth.PUT("/riwayat-pendidikan/:id", can("pegawai.update"), dep.RiwayatHandler.PendidikanUpdate)
	auth.DELETE("/riwayat-pendidikan/:id", can("pegawai.update"), dep.RiwayatHandler.PendidikanDelete)

	auth.GET("/pegawai/:id/riwayat-pelatihan", can("pegawai.view"), dep.RiwayatHandler.PelatihanIndex)
	auth.POST("/pegawai/:id/riwayat-pelatihan", can("pegawai.update"), dep.RiwayatHandler.PelatihanStore)
	auth.PUT("/riwayat-pelatihan/:id", can("pegawai.update"), dep.RiwayatHandler.PelatihanUpdate)
	auth.DELETE("/riwayat-pelatihan/:id", can("pegawai.update"), dep.RiwayatHandler.PelatihanDelete)

	app.NoRoute(SPANoRoute(cfg.WebRoot))
	return app
}

// skipPrefixes berisi path yang tetap ditangani sebagai API/serve aset backend,
// sehingga NoRoute SPA tidak menelannya (respons tetap JSON 404).
var spaSkipPrefixes = []string{"/api/", "/uploads/"}

// SPANoRoute menyajikan build SPA statis (frontend/dist) dengan fallback
// ke index.html untuk client-side routing. Path di luar /api, /uploads,
// /swagger, dan /health yang bukan file nyata → index.html SPA.
func SPANoRoute(root string) gin.HandlerFunc {
	fs := http.Dir(root)
	fileServer := http.StripPrefix("/", http.FileServer(fs))

	return func(c *gin.Context) {
		p := c.Request.URL.Path

		for _, prefix := range spaSkipPrefixes {
			if strings.HasPrefix(p, prefix) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Route tidak ditemukan"})
				return
			}
		}

		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
			c.JSON(http.StatusNotFound, gin.H{"error": "Route tidak ditemukan"})
			return
		}

		rel := strings.TrimPrefix(p, "/")
		if rel != "" {
			if f, err := fs.Open(rel); err == nil {
				info, statErr := f.Stat()
				_ = f.Close()
				if statErr == nil && !info.IsDir() {
					fileServer.ServeHTTP(c.Writer, c.Request)
					return
				}
			}
		}

		if _, err := os.Stat(filepath.Join(root, "index.html")); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Route tidak ditemukan"})
			return
		}
		c.File(filepath.Join(root, "index.html"))
	}
}
