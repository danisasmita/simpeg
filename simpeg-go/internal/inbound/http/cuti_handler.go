package http

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"simpeg-go/internal/domain"

	"github.com/gin-gonic/gin"
)

var cutiJenisValid = map[string]bool{
	"tahunan":        true,
	"sakit":          true,
	"melahirkan":     true,
	"besar":          true,
	"alasan_penting": true,
}

type CutiHandler struct {
	repo     domain.CutiRepository
	userRepo domain.UserRepository
}

func NewCutiHandler(repo domain.CutiRepository, userRepo domain.UserRepository) *CutiHandler {
	return &CutiHandler{repo: repo, userRepo: userRepo}
}

// Index godoc
// @Summary Daftar cuti
// @Description Tanpa `pegawai_id` mengembalikan list semua cuti (paginasi, filter status). Dengan `pegawai_id` mengembalikan cuti milik pegawai tersebut.
// @Tags Cuti
// @Produce json
// @Security BearerAuth
// @Param pegawai_id query int false "Filter ID pegawai"
// @Param page query int false "Halaman (default 1)"
// @Param limit query int false "Jumlah per halaman (default 20, maks 100)"
// @Param status query string false "Filter status"
// @Success 200 {object} []domain.Cuti
// @Failure 500 {object} ErrorResponse
// @Router /cuti [get]
func (h *CutiHandler) Index(c *gin.Context) {
	if pegawaiID := c.Query("pegawai_id"); pegawaiID != "" {
		id, _ := strconv.ParseInt(pegawaiID, 10, 64)
		result, err := h.repo.FindByPegawaiID(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": result})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	status := c.Query("status")
	result, total, err := h.repo.FindAll(page, limit, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data":  result,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// Store godoc
// @Summary Ajukan cuti
// @Description Self-service: admin/operator (HRD) bisa ajukan atas nama siapa pun; pegawai/dosen/pimpinan WAJIB atas nama sendiri (pegawai_id dipaksa milik akun yang login). Jenis cuti: tahunan, sakit, melahirkan, besar, alasan_penting.
// @Tags Cuti
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body CutiStoreRequest true "Data pengajuan cuti"
// @Success 201 {object} domain.Cuti
// @Failure 400 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /cuti [post]
func (h *CutiHandler) Store(c *gin.Context) {
	span := startSpan(c, "service.CutiStore", "business_logic")
	if span != nil {
		defer span.Finish()
	}

	var req struct {
		PegawaiID      int64  `json:"pegawai_id"`
		Jenis          string `json:"jenis"`
		TanggalMulai   string `json:"tanggal_mulai"`
		TanggalSelesai string `json:"tanggal_selesai"`
		JumlahHari     int    `json:"jumlah_hari"`
		Alasan         string `json:"alasan"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if req.Jenis == "" || req.Alasan == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data cuti belum lengkap"})
		return
	}

	jenis := strings.ToLower(req.Jenis)
	if !cutiJenisValid[jenis] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Jenis cuti tidak valid"})
		return
	}

	start, errStart := time.Parse("2006-01-02", req.TanggalMulai)
	end, errEnd := time.Parse("2006-01-02", req.TanggalSelesai)
	if errStart != nil || errEnd != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal tidak valid (YYYY-MM-DD)"})
		return
	}
	if end.Before(start) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tanggal selesai harus setelah atau sama dengan tanggal mulai"})
		return
	}

	pegawaiID, err := h.resolvePegawaiID(c, req.PegawaiID)
	if err != nil {
		c.JSON(statusForCutiError(err), gin.H{"error": err.Error()})
		return
	}

	cuti := &domain.Cuti{
		PegawaiID:      pegawaiID,
		Jenis:          jenis,
		TanggalMulai:   start,
		TanggalSelesai: end,
		JumlahHari:     req.JumlahHari,
		Alasan:         req.Alasan,
		Status:         "menunggu",
	}
	if cuti.JumlahHari == 0 {
		cuti.JumlahHari = int(end.Sub(start).Hours()/24) + 1
	}

	if err := h.repo.Create(cuti); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengajukan cuti"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": cuti})
}

// resolvePegawaiID menerapkan kebijakan self-service cuti:
//   - Admin/Operator/BSDM (HRD): boleh mengajukan atas nama siapa pun → pakai value dari client.
//   - Role lain (pegawai/dosen/pimpinan): WAJIB atas nama dirinya sendiri.
//     a. Akun belum terhubung ke data pegawai → 422.
//     b. Client mencoba kirim pegawai_id orang lain → 403 (anti-tamper).
func (h *CutiHandler) resolvePegawaiID(c *gin.Context, requestedID int64) (int64, error) {
	switch c.GetString("user_role") {
	case "admin", "operator", "operator_bsdm":
		if requestedID <= 0 {
			return 0, errCutiUnprocessable("Pilih pegawai.")
		}
		return requestedID, nil
	}

	user, err := h.userRepo.FindByID(c.GetInt64("user_id"))
	if err != nil || user.PegawaiID == nil {
		return 0, errCutiUnprocessable("Akun belum terhubung ke data pegawai")
	}
	if requestedID != 0 && requestedID != *user.PegawaiID {
		return 0, errCutiForbidden("Cuti hanya dapat diajukan atas nama sendiri")
	}
	return *user.PegawaiID, nil
}

type cutiError struct {
	code int
	msg  string
}

func (e *cutiError) Error() string { return e.msg }

func errCutiUnprocessable(msg string) error {
	return &cutiError{code: http.StatusUnprocessableEntity, msg: msg}
}

func errCutiForbidden(msg string) error {
	return &cutiError{code: http.StatusForbidden, msg: msg}
}

func statusForCutiError(err error) int {
	if ce, ok := err.(*cutiError); ok {
		return ce.code
	}
	return http.StatusBadRequest
}

// Approve godoc
// @Summary Setujui/tolak cuti
// @Description Status: `disetujui` atau `ditolak`.
// @Tags Cuti
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID cuti"
// @Param body body CutiApproveRequest true "Keputusan verifikasi"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /cuti/{id} [patch]
func (h *CutiHandler) Approve(c *gin.Context) {
	span := startSpan(c, "service.CutiApprove", "business_logic")
	if span != nil {
		defer span.Finish()
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var req struct {
		Status  string `json:"status"`
		Catatan string `json:"catatan"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if req.Status != "disetujui" && req.Status != "ditolak" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status harus disetujui atau ditolak"})
		return
	}

	userID := c.GetInt64("user_id")
	dbSpan := startSpan(c, "db.update_status_cuti", "query_database")
	err = h.repo.UpdateStatus(id, req.Status, userID, req.Catatan)
	if dbSpan != nil {
		dbSpan.Finish()
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update status cuti"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Status cuti berhasil diupdate"})
}
