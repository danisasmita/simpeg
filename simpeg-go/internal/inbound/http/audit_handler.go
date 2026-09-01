package http

import (
	"net/http"
	"strconv"
	"time"

	"simpeg-go/internal/domain"

	"github.com/gin-gonic/gin"
)

type AuditLogHandler struct {
	repo domain.AuditRepository
}

func NewAuditLogHandler(repo domain.AuditRepository) *AuditLogHandler {
	return &AuditLogHandler{repo: repo}
}

// Index godoc
// @Summary Daftar audit log
// @Description Jejak transaksi bisnis pengguna. Filter: module, action, user_id, from, to (YYYY-MM-DD). Respons `{data, total, page, limit}`.
// @Tags Audit Log
// @Produce json
// @Security BearerAuth
// @Param page query int false "Halaman (default 1)"
// @Param limit query int false "Jumlah per halaman (default 20, maks 100)"
// @Param module query string false "Filter modul (mis. PEGAWAI, CUTI)"
// @Param action query string false "Filter aksi (mis. PEGAWAI_UPDATE, CUTI_APPROVE)"
// @Param user_id query int false "Filter ID pengguna"
// @Param from query string false "Tanggal awal (YYYY-MM-DD)"
// @Param to query string false "Tanggal akhir (YYYY-MM-DD)"
// @Success 200 {object} []domain.AuditLog
// @Failure 500 {object} ErrorResponse
// @Router /audit-logs [get]
func (h *AuditLogHandler) Index(c *gin.Context) {
	filter := domain.AuditLogFilter{
		Page:   parsePositiveInt(c.DefaultQuery("page", "1"), 1),
		Limit:  parsePositiveInt(c.DefaultQuery("limit", "20"), 20),
		Module: c.Query("module"),
		Action: c.Query("action"),
	}
	if v, err := strconv.ParseInt(c.Query("user_id"), 10, 64); err == nil && v > 0 {
		filter.UserID = v
	}
	if v, err := time.Parse("2006-01-02", c.Query("from")); err == nil {
		filter.From = v
	}
	if v, err := time.Parse("2006-01-02", c.Query("to")); err == nil {
		filter.To = v
	}

	rows, total, err := h.repo.FindAll(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil audit log"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  rows,
		"total": total,
		"page":  filter.Page,
		"limit": filter.Limit,
	})
}

func parsePositiveInt(raw string, fallback int) int {
	v, err := strconv.Atoi(raw)
	if err != nil || v < 1 {
		return fallback
	}
	return v
}
