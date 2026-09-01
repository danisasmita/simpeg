package http

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"simpeg-go/internal/adapters/redis"
	"simpeg-go/internal/config"
	"simpeg-go/internal/domain"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Token tidak ditemukan",
			})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Format token tidak valid",
			})
			c.Abort()
			return
		}

		claims, err := ValidateToken(parts[1], jwtSecret)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Token tidak valid atau expired",
			})
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)

		c.Next()
	}
}

func RoleMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.GetString("user_role")

		for _, allowed := range allowedRoles {
			if role == allowed {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"error": "Tidak memiliki akses",
		})
		c.Abort()
	}
}

func PermissionMiddleware(repo domain.RoleRepository, required ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.GetString("user_role")
		if role == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Token tidak valid atau expired",
			})
			c.Abort()
			return
		}

		perms, err := repo.FindPermissionsByRole(role)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Gagal memuat permission",
			})
			c.Abort()
			return
		}

		has := make(map[string]struct{}, len(perms))
		for _, p := range perms {
			has[p.Name] = struct{}{}
		}

		for _, r := range required {
			if _, ok := has[r]; ok {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"error": "Tidak memiliki akses",
		})
		c.Abort()
	}
}

func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin,Content-Type,Accept,Authorization")
		c.Header("Access-Control-Max-Age", "86400")

		if origin := c.GetHeader("Origin"); origin != "" {
			for _, allowed := range allowedOrigins {
				if origin == allowed {
					c.Header("Access-Control-Allow-Origin", origin)
					c.Header("Vary", "Origin")
					break
				}
			}
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func RateLimitMiddleware(limiter *redis.RateLimiter, limit int64, window time.Duration, prefix string) gin.HandlerFunc {
	return func(c *gin.Context) {
		result, err := limiter.Allow(c.Request.Context(), prefix+":"+clientIP(c), limit, window)
		if err != nil {
			c.Next()
			return
		}

		c.Header("X-RateLimit-Limit", strconv.FormatInt(limit, 10))
		c.Header("X-RateLimit-Remaining", strconv.FormatInt(result.Remaining, 10))

		if !result.Allowed {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Terlalu banyak percobaan, coba lagi nanti",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

func clientIP(c *gin.Context) string {
	if ip := c.GetHeader("X-Real-IP"); ip != "" {
		return ip
	}
	if ip := c.GetHeader("X-Forwarded-For"); ip != "" {
		if first := strings.SplitN(ip, ",", 2)[0]; first != "" {
			return strings.TrimSpace(first)
		}
	}
	return c.ClientIP()
}

func RecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				err, ok := r.(error)
				if !ok {
					err = fmt.Errorf("%v", r)
				}
				reportSentry(err, c)
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": fmt.Sprintf("%v", r),
				})
				c.Abort()
			}
		}()
		c.Next()
	}
}

// HealthCheck godoc
// @Summary Health check
// @Description Mengecek ketersediaan layanan backend.
// @Tags Health
// @Produce json
// @Success 200 {object} string "status ok"
// @Router /health [get]
func HealthCheck(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"port":   cfg.Port,
		})
	}
}
