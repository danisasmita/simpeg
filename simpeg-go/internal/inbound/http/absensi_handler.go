package http

import (
	"net/http"
	"strconv"
	"time"

	"simpeg-go/internal/domain"

	"github.com/gin-gonic/gin"
)

type AbsensiHandler struct {
	repo domain.AbsensiRepository
}

func NewAbsensiHandler(repo domain.AbsensiRepository) *AbsensiHandler {
	return &AbsensiHandler{repo: repo}
}

// CheckIn godoc
// @Summary Absen masuk
// @Description Mencatat kehadiran masuk pegawai. `photo` berupa data URI/base64 untuk wajah (opsional).
// @Tags Absensi
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body CheckInRequest true "Data absen masuk"
// @Success 200 {object} domain.Absensi
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /absensi/check-in [post]
func (h *AbsensiHandler) CheckIn(c *gin.Context) {
	var req struct {
		PegawaiID int64  `json:"pegawai_id"`
		Photo     string `json:"photo"`
		Location  string `json:"location"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if req.PegawaiID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "pegawai_id wajib diisi"})
		return
	}

	a := &domain.Absensi{
		PegawaiID:       req.PegawaiID,
		Tanggal:         time.Now(),
		CheckInPhoto:    &req.Photo,
		CheckInLocation: &req.Location,
		Status:          "hadir",
	}

	dbSpan := startSpan(c, "db.upsert_absensi_checkin", "query_database")
	err := h.repo.CheckIn(a)
	if dbSpan != nil {
		dbSpan.Finish()
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal absen masuk"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": a})
}

// CheckOut godoc
// @Summary Absen pulang
// @Description Mencatat kehadiran pulang pegawai. `photo` berupa data URI/base64 untuk wajah (opsional).
// @Tags Absensi
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body CheckOutRequest true "Data absen pulang"
// @Success 200 {object} domain.Absensi
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /absensi/check-out [post]
func (h *AbsensiHandler) CheckOut(c *gin.Context) {
	var req struct {
		PegawaiID int64  `json:"pegawai_id"`
		Photo     string `json:"photo"`
		Location  string `json:"location"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if req.PegawaiID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "pegawai_id wajib diisi"})
		return
	}

	dbSpan := startSpan(c, "db.update_absensi_checkout", "query_database")
	err := h.repo.CheckOutByPegawaiID(req.PegawaiID, req.Photo, req.Location)
	if dbSpan != nil {
		dbSpan.Finish()
	}
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Check out berhasil"})
}

// History godoc
// @Summary Riwayat absensi pegawai
// @Description Rentang default 30 hari terakhir; gunakan `from`/`to` (YYYY-MM-DD) untuk rentang tertentu.
// @Tags Absensi
// @Produce json
// @Security BearerAuth
// @Param pegawaiId path int true "ID pegawai"
// @Param from query string false "Tanggal awal (YYYY-MM-DD)"
// @Param to query string false "Tanggal akhir (YYYY-MM-DD)"
// @Success 200 {object} []domain.Absensi
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /absensi/{pegawaiId}/history [get]
func (h *AbsensiHandler) History(c *gin.Context) {
	pegawaiID, err := strconv.ParseInt(c.Param("pegawaiId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id pegawai tidak valid"})
		return
	}

	from := time.Now().AddDate(0, -1, 0)
	to := time.Now()

	if f := c.Query("from"); f != "" {
		if parsed, err := time.Parse("2006-01-02", f); err == nil {
			from = parsed
		}
	}
	if t := c.Query("to"); t != "" {
		if parsed, err := time.Parse("2006-01-02", t); err == nil {
			to = parsed
		}
	}

	result, err := h.repo.FindByRange(pegawaiID, from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}
