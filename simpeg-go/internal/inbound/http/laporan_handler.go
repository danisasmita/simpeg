package http

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"simpeg-go/internal/domain"

	"github.com/gin-gonic/gin"
)

type LaporanHandler struct {
	repo domain.LaporanRepository
}

func NewLaporanHandler(repo domain.LaporanRepository) *LaporanHandler {
	return &LaporanHandler{repo: repo}
}

// PegawaiIndex godoc
// @Summary Laporan data pegawai
// @Description Daftar pegawai untuk laporan dengan ringkasan. Respons berbentuk `{data, total, summary}`.
// @Tags Laporan
// @Produce json
// @Security BearerAuth
// @Param status_aktif query string false "Filter status kepegawaian aktif"
// @Param unit_kerja_id query int false "Filter unit kerja"
// @Success 200 {object} domain.LaporanPegawaiRow
// @Failure 500 {object} ErrorResponse
// @Router /laporan/pegawai [get]
func (h *LaporanHandler) PegawaiIndex(c *gin.Context) {
	span := startSpan(c, "service.LaporanPegawai", "business_logic")
	if span != nil {
		defer span.Finish()
	}

	statusAktif := c.Query("status_aktif")
	unitKerjaID, _ := strconv.ParseInt(c.Query("unit_kerja_id"), 10, 64)

	dbSpan := startSpan(c, "db.query_laporan_pegawai", "query_database")
	rows, err := h.repo.Pegawai(statusAktif, unitKerjaID)
	if dbSpan != nil {
		dbSpan.Finish()
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data laporan"})
		return
	}
	dbSpan = startSpan(c, "db.query_summary_laporan", "query_database")
	summary, err := h.repo.Summary(statusAktif, unitKerjaID)
	if dbSpan != nil {
		dbSpan.Finish()
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghitung ringkasan laporan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": rows, "total": len(rows), "summary": summary})
}

// PegawaiExport godoc
// @Summary Export laporan pegawai (CSV)
// @Description Mengunduh laporan pegawai dalam format CSV (UTF-8 BOM, dikonsumsi Excel).
// @Tags Laporan
// @Produce text/csv
// @Security BearerAuth
// @Param status_aktif query string false "Filter status kepegawaian aktif"
// @Param unit_kerja_id query int false "Filter unit kerja"
// @Success 200 {file} binary
// @Failure 500 {object} ErrorResponse
// @Router /laporan/pegawai/export [get]
func (h *LaporanHandler) PegawaiExport(c *gin.Context) {
	span := startSpan(c, "service.LaporanPegawaiExport", "business_logic")
	if span != nil {
		defer span.Finish()
	}

	statusAktif := c.Query("status_aktif")
	unitKerjaID, _ := strconv.ParseInt(c.Query("unit_kerja_id"), 10, 64)

	dbSpan := startSpan(c, "db.query_laporan_export", "query_database")
	rows, err := h.repo.Pegawai(statusAktif, unitKerjaID)
	if dbSpan != nil {
		dbSpan.Finish()
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data laporan"})
		return
	}

	genSpan := startSpan(c, "logic.generate_csv", "hit_generate_file")
	if genSpan != nil {
		defer genSpan.Finish()
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="laporan-pegawai-%s.csv"`, time.Now().Format("20060102")))
	c.Header("X-Content-Type-Options", "nosniff")

	if _, err := c.Writer.Write([]byte("\xEF\xBB\xBF")); err != nil {
		return
	}

	writer := csv.NewWriter(c.Writer)
	if err := writer.Write([]string{
		"No", "NIP", "NIDN", "Nama Lengkap", "Jenis Kelamin", "Email Institusi",
		"No. HP", "Status Aktif", "Status Kepegawaian", "Unit Kerja", "Jabatan", "Golongan",
	}); err != nil {
		return
	}
	for i, row := range rows {
		if err := writer.Write([]string{
			strconv.Itoa(i + 1),
			ptrString(row.NIP),
			ptrString(row.NIDN),
			row.NamaLengkap,
			row.JenisKelamin,
			ptrString(row.EmailInstitusi),
			ptrString(row.NomorHP),
			row.StatusAktif,
			ptrString(row.StatusKepegawaian),
			ptrString(row.UnitKerja),
			ptrString(row.Jabatan),
			ptrString(row.Golongan),
		}); err != nil {
			return
		}
	}
	writer.Flush()
}

func ptrString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
