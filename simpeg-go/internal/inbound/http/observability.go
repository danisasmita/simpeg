package http

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"simpeg-go/internal/domain"

	"github.com/getsentry/sentry-go"
	"github.com/gin-gonic/gin"
)

// RequestLoggerMiddleware mencatat seluruh request dalam bentuk JSON (log/slog)
// ke stdout — konsumsi kuota Sentry = 0, siap diserap Grafana/Loki di produksi.
func RequestLoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		c.Next()

		userID := c.GetInt64("user_id")
		slog.Info("request",
			"method", c.Request.Method,
			"path", path,
			"route", c.FullPath(),
			"status", c.Writer.Status(),
			"duration_ms", time.Since(start).Milliseconds(),
			"ip", clientIP(c),
			"user_id", nullableInt(userID),
		)
	}
}

// AuditMiddleware mencatat jejak transaksi bisnis (request TULIS ber-auth) ke audit_logs.
// Registri di dalam group `auth` sehingga actor (user_id) selalu tersedia.
func AuditMiddleware(repo domain.AuditRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		switch c.Request.Method {
		case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		default:
			c.Next()
			return
		}

		body := readBody(c)
		rec := &bodyCapturer{ResponseWriter: c.Writer, body: &bytes.Buffer{}}
		c.Writer = rec
		c.Next()

		entry := &domain.AuditLog{
			UserID:     authUserID(c),
			Actor:      c.GetString("user_email"),
			Module:     auditModule(c.FullPath()),
			Action:     auditAction(c.Request.Method, c.FullPath()),
			ResourceID: auditResourceID(c, rec.body.Bytes()),
			NewValues:  redactJSON(body),
			IPAddress:  clientIP(c),
		}
		if err := repo.Create(entry); err != nil {
			slog.Warn("audit log gagal disimpan", "err", err, "action", entry.Action)
		}
	}
}

// bodyCapturer menyalin respon tanpa mengubah perilaku writer asli (buffer status/bytes).
type bodyCapturer struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (b *bodyCapturer) Write(p []byte) (int, error) {
	b.body.Write(p)
	return b.ResponseWriter.Write(p)
}

func (b *bodyCapturer) WriteString(s string) (int, error) {
	b.body.WriteString(s)
	return b.ResponseWriter.WriteString(s)
}

func readBody(c *gin.Context) []byte {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return nil
	}
	c.Request.Body = io.NopCloser(bytes.NewReader(body))
	return body
}

var sensitiveKeys = []string{"password", "token", "authorization", "secret", "cookie"}

// redactJSON menghapus field sensitif dari body JSON agar tidak tersimpan/dikirim ke luar.
// Limit 64KB; body non-JSON (mis. multipart) dikosongkan.
func redactJSON(body []byte) domain.AuditJSON {
	if len(body) == 0 || len(body) > 64*1024 {
		return nil
	}
	if !json.Valid(body) {
		return nil
	}

	var m map[string]any
	if err := json.Unmarshal(body, &m); err != nil || len(m) == 0 {
		return nil
	}
	for k := range m {
		for _, s := range sensitiveKeys {
			if strings.Contains(strings.ToLower(k), s) {
				delete(m, k)
				break
			}
		}
	}
	clean, err := json.Marshal(m)
	if err != nil {
		return nil
	}
	return domain.AuditJSON(clean)
}

func auditModule(path string) string {
	trim := strings.TrimPrefix(path, "/api/v1/")
	seg := strings.SplitN(trim, "/", 2)[0]
	return strings.ToUpper(strings.ReplaceAll(seg, "-", "_"))
}

func auditAction(method, path string) string {
	module := auditModule(path)
	verb := "ACCESS"
	switch method {
	case http.MethodPost:
		verb = "CREATE"
	case http.MethodPut, http.MethodPatch:
		verb = "UPDATE"
	case http.MethodDelete:
		verb = "DELETE"
	}
	if path == "/api/v1/cuti/:id" && method == http.MethodPatch {
		return "CUTI_APPROVE"
	}
	return module + "_" + verb
}

// auditResourceID: utk path ber-param ambil dari c.Param; utk POST (CREATE) ekstrak `id`
// dari body respon agar auditor tahu resource mana yang dibuat.
func auditResourceID(c *gin.Context, respBody []byte) string {
	if id := c.Param("id"); id != "" {
		return id
	}
	if id := c.Param("pegawaiId"); id != "" {
		return id
	}
	if c.Request.Method != http.MethodPost || !json.Valid(respBody) {
		return ""
	}
	var m struct {
		Data map[string]any `json:"data"`
		ID   any            `json:"id"`
	}
	if err := json.Unmarshal(respBody, &m); err != nil {
		return ""
	}
	var src map[string]any
	if m.Data != nil {
		src = m.Data
	} else if m.ID != nil {
		return fmt.Sprintf("%v", m.ID)
	}
	if v, ok := src["id"]; ok {
		return fmt.Sprintf("%v", v)
	}
	return ""
}

func authUserID(c *gin.Context) *int64 {
	id := c.GetInt64("user_id")
	if id == 0 {
		return nil
	}
	return &id
}

func nullableInt(id int64) string {
	if id == 0 {
		return ""
	}
	return strconv.FormatInt(id, 10)
}

// reportSentry melaporkan error/panic ke Sentry jika SDK terinisialisasi (DSN aktif).
func reportSentry(err error, c *gin.Context) {
	if err == nil {
		return
	}
	sentry.WithScope(func(scope *sentry.Scope) {
		if c != nil {
			scope.SetTags(map[string]string{
				"method": c.Request.Method,
				"path":   c.Request.URL.Path,
				"ip":     clientIP(c),
			})
			if userID := c.GetInt64("user_id"); userID != 0 {
				scope.SetUser(sentry.User{ID: strconv.FormatInt(userID, 10), Email: c.GetString("user_email")})
			}
		}
		sentry.CaptureException(err)
	})
}

// startSpan membuka child span untuk tracing performa; mengembalikan nil (no-op)
// saat SDK Sentry nonaktif (SENTRY_DSN kosong) agar tidak ada overhead tambahan.
func startSpan(c *gin.Context, name, op string) *sentry.Span {
	if sentry.CurrentHub().Client() == nil {
		return nil
	}
	return sentry.StartSpan(c, name, sentry.WithOpName(op))
}
