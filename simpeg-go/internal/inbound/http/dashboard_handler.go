package http

import (
	"net/http"

	"simpeg-go/internal/domain"

	"github.com/gin-gonic/gin"
)

type DashboardHandler struct {
	repo domain.DashboardRepository
}

func NewDashboardHandler(repo domain.DashboardRepository) *DashboardHandler {
	return &DashboardHandler{repo: repo}
}

// Stats godoc
// @Summary Statistik dashboard
// @Description Ringkasan jumlah pegawai, unit kerja, golongan, dan metrik lainnya.
// @Tags Dashboard
// @Produce json
// @Security BearerAuth
// @Success 200 {object} domain.DashboardStats
// @Failure 500 {object} ErrorResponse
// @Router /dashboard/stats [get]
func (h *DashboardHandler) Stats(c *gin.Context) {
	stats, err := h.repo.Stats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil statistik dashboard"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": stats})
}
