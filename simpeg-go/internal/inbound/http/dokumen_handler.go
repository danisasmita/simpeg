package http

import (
	"fmt"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"simpeg-go/internal/domain"

	"github.com/gin-gonic/gin"
)

const (
	maxDokumenSize = 10 << 20
)

var allowedDokumenExtensions = map[string]struct{}{
	".pdf": {}, ".jpg": {}, ".jpeg": {}, ".png": {},
	".doc": {}, ".docx": {}, ".xls": {}, ".xlsx": {},
}

type DokumenPegawaiHandler struct {
	repo      domain.DokumenPegawaiRepository
	uploadDir string
}

func NewDokumenPegawaiHandler(repo domain.DokumenPegawaiRepository) *DokumenPegawaiHandler {
	return &DokumenPegawaiHandler{repo: repo, uploadDir: "uploads"}
}

// Index godoc
// @Summary Daftar dokumen pegawai
// @Tags Dokumen Pegawai
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID pegawai"
// @Success 200 {object} []domain.DokumenPegawai
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /pegawai/{id}/dokumen [get]
func (h *DokumenPegawaiHandler) Index(c *gin.Context) {
	pegawaiID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id pegawai tidak valid"})
		return
	}

	result, err := h.repo.FindByPegawaiID(pegawaiID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

// Show godoc
// @Summary Detail dokumen pegawai
// @Tags Dokumen Pegawai
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID dokumen"
// @Success 200 {object} domain.DokumenPegawai
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /dokumen-pegawai/{id} [get]
func (h *DokumenPegawaiHandler) Show(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	dokumen, err := h.repo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dokumen pegawai tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": dokumen})
}

// Store godoc
// @Summary Upload dokumen pegawai
// @Description Multipart/form-data. File wajib (kecuali `file_path` diisi); ekstensi diizinkan pdf/jpg/jpeg/png/doc/docx/xls/xlsx, maks 10MB.
// @Tags Dokumen Pegawai
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID pegawai"
// @Param file formData file false "Berkas dokumen"
// @Param nama_dokumen formData string true "Nama dokumen"
// @Param kategori formData string false "Kategori (default lainnya)"
// @Param nomor_dokumen formData string false "Nomor dokumen"
// @Param tanggal_dokumen formData string false "Tanggal dokumen (YYYY-MM-DD)"
// @Param tanggal_expired formData string false "Tanggal kedaluwarsa (YYYY-MM-DD)"
// @Param keterangan formData string false "Keterangan"
// @Param file_path formData string false "Path file alternatif bila tidak upload"
// @Success 201 {object} domain.DokumenPegawai
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /pegawai/{id}/dokumen [post]
func (h *DokumenPegawaiHandler) Store(c *gin.Context) {
	pegawaiID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id pegawai tidak valid"})
		return
	}

	dokumen, err := h.parseDokumen(c, pegawaiID, 0)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if userID, ok := c.Get("user_id"); ok {
		id, ok := userID.(int64)
		if ok {
			dokumen.UploadedBy = &id
		}
	}

	if err := h.repo.Create(dokumen); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan dokumen pegawai"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": dokumen})
}

// Update godoc
// @Summary Ubah dokumen pegawai
// @Description Multipart/form-data; kosongkan field yang tidak diubah. Tanpa file baru, dokumen lama tetap dipakai.
// @Tags Dokumen Pegawai
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID dokumen"
// @Param file formData file false "Berkas dokumen baru"
// @Param nama_dokumen formData string false "Nama dokumen"
// @Param kategori formData string false "Kategori"
// @Param nomor_dokumen formData string false "Nomor dokumen"
// @Param tanggal_dokumen formData string false "Tanggal dokumen (YYYY-MM-DD)"
// @Param tanggal_expired formData string false "Tanggal kedaluwarsa (YYYY-MM-DD)"
// @Param keterangan formData string false "Keterangan"
// @Param file_path formData string false "Path file alternatif"
// @Success 200 {object} domain.DokumenPegawai
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /dokumen-pegawai/{id} [put]
func (h *DokumenPegawaiHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	existing, err := h.repo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dokumen pegawai tidak ditemukan"})
		return
	}

	dokumen, err := h.parseDokumen(c, existing.PegawaiID, id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	dokumen.ID = id
	if dokumen.FilePath == "" {
		dokumen.FilePath = existing.FilePath
		dokumen.FileName = existing.FileName
		dokumen.FileType = existing.FileType
		dokumen.FileSize = existing.FileSize
	}

	if err := h.repo.Update(dokumen); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui dokumen pegawai"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": dokumen})
}

// Delete godoc
// @Summary Hapus dokumen pegawai
// @Tags Dokumen Pegawai
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID dokumen"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /dokumen-pegawai/{id} [delete]
func (h *DokumenPegawaiHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}
	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hapus dokumen pegawai"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Dokumen pegawai berhasil dihapus"})
}

// Download godoc
// @Summary Unduh berkas dokumen
// @Tags Dokumen Pegawai
// @Produce application/octet-stream
// @Security BearerAuth
// @Param id path int true "ID dokumen"
// @Success 200 {file} binary
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /dokumen-pegawai/{id}/download [get]
func (h *DokumenPegawaiHandler) Download(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	dokumen, err := h.repo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dokumen pegawai tidak ditemukan"})
		return
	}
	c.FileAttachment(dokumen.FilePath, filepath.Base(dokumen.FilePath))
}

func (h *DokumenPegawaiHandler) parseDokumen(c *gin.Context, pegawaiID int64, existingID int64) (*domain.DokumenPegawai, error) {
	if strings.Contains(strings.ToLower(c.GetHeader("Content-Type")), "application/json") {
		return h.parseDokumenJSON(c, pegawaiID, existingID)
	}

	nama := strings.TrimSpace(c.PostForm("nama_dokumen"))
	kategori := strings.TrimSpace(c.PostForm("kategori"))
	if kategori == "" {
		kategori = "lainnya"
	}
	if nama == "" {
		nama = strings.TrimSpace(c.PostForm("nama"))
	}
	if nama == "" {
		return nil, fmt.Errorf("nama_dokumen wajib diisi")
	}
	if !validKategoriDokumen(kategori) {
		return nil, fmt.Errorf("kategori dokumen tidak valid")
	}

	dokumen := &domain.DokumenPegawai{
		PegawaiID:      pegawaiID,
		NamaDokumen:    nama,
		Kategori:       kategori,
		NomorDokumen:   optionalString(c.PostForm("nomor_dokumen")),
		TanggalDokumen: optionalDate(c.PostForm("tanggal_dokumen")),
		TanggalExpired: optionalDate(c.PostForm("tanggal_expired")),
		Keterangan:     optionalString(c.PostForm("keterangan")),
		FilePath:       strings.TrimSpace(c.PostForm("file_path")),
		FileName:       optionalString(c.PostForm("file_name")),
		FileType:       optionalString(c.PostForm("file_type")),
	}
	if fileSize, err := strconv.ParseInt(c.PostForm("file_size"), 10, 64); err == nil && fileSize > 0 {
		dokumen.FileSize = &fileSize
	}

	file, err := c.FormFile("file")
	if err == nil && file != nil {
		if file.Size > maxDokumenSize {
			return nil, fmt.Errorf("ukuran file maksimal 10 MB")
		}
		if _, ok := allowedDokumenExtensions[strings.ToLower(filepath.Ext(file.Filename))]; !ok {
			return nil, fmt.Errorf("ekstensi file tidak diizinkan (pdf, jpg, jpeg, png, doc, docx, xls, xlsx)")
		}
		path, err := h.saveUploadedFile(c, pegawaiID, existingID, file)
		if err != nil {
			return nil, err
		}
		size := file.Size
		name := file.Filename
		contentType := file.Header.Get("Content-Type")
		dokumen.FilePath = path
		dokumen.FileName = &name
		dokumen.FileType = optionalString(contentType)
		dokumen.FileSize = &size
	}

	if dokumen.FilePath == "" && existingID == 0 {
		return nil, fmt.Errorf("file atau file_path wajib diisi")
	}
	return dokumen, nil
}

func (h *DokumenPegawaiHandler) parseDokumenJSON(c *gin.Context, pegawaiID int64, existingID int64) (*domain.DokumenPegawai, error) {
	var req struct {
		NamaDokumen    string  `json:"nama_dokumen"`
		Nama           string  `json:"nama"`
		Kategori       string  `json:"kategori"`
		NomorDokumen   *string `json:"nomor_dokumen"`
		TanggalDokumen string  `json:"tanggal_dokumen"`
		TanggalExpired string  `json:"tanggal_expired"`
		FilePath       string  `json:"file_path"`
		FileName       *string `json:"file_name"`
		FileType       *string `json:"file_type"`
		FileSize       *int64  `json:"file_size"`
		Keterangan     *string `json:"keterangan"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, fmt.Errorf("Invalid request body")
	}

	nama := strings.TrimSpace(req.NamaDokumen)
	if nama == "" {
		nama = strings.TrimSpace(req.Nama)
	}
	kategori := strings.TrimSpace(req.Kategori)
	if kategori == "" {
		kategori = "lainnya"
	}
	if nama == "" {
		return nil, fmt.Errorf("nama_dokumen wajib diisi")
	}
	if !validKategoriDokumen(kategori) {
		return nil, fmt.Errorf("kategori dokumen tidak valid")
	}
	if strings.TrimSpace(req.FilePath) == "" && existingID == 0 {
		return nil, fmt.Errorf("file_path wajib diisi")
	}

	return &domain.DokumenPegawai{
		PegawaiID:      pegawaiID,
		NamaDokumen:    nama,
		Kategori:       kategori,
		NomorDokumen:   normalizeOptionalString(req.NomorDokumen),
		TanggalDokumen: optionalDate(req.TanggalDokumen),
		TanggalExpired: optionalDate(req.TanggalExpired),
		FilePath:       strings.TrimSpace(req.FilePath),
		FileName:       normalizeOptionalString(req.FileName),
		FileType:       normalizeOptionalString(req.FileType),
		FileSize:       req.FileSize,
		Keterangan:     normalizeOptionalString(req.Keterangan),
	}, nil
}

func (h *DokumenPegawaiHandler) saveUploadedFile(c *gin.Context, pegawaiID int64, existingID int64, file *multipart.FileHeader) (string, error) {
	filename := sanitizeFilename(file.Filename)
	if filename == "" {
		filename = "dokumen"
	}
	prefix := time.Now().Format("20060102150405")
	if existingID > 0 {
		prefix = fmt.Sprintf("%s_%d", prefix, existingID)
	}
	path := filepath.Join(h.uploadDir, "dokumen", strconv.FormatInt(pegawaiID, 10), prefix+"_"+filename)
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return "", fmt.Errorf("gagal membuat folder upload")
	}
	if err := c.SaveUploadedFile(file, path); err != nil {
		return "", fmt.Errorf("gagal menyimpan file")
	}
	return path, nil
}

func validKategoriDokumen(kategori string) bool {
	switch kategori {
	case "identitas", "pendidikan", "kepegawaian", "kesehatan", "sertifikasi", "lainnya":
		return true
	default:
		return false
	}
}

func optionalString(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}

func normalizeOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	return optionalString(*value)
}

func optionalDate(value string) *time.Time {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return nil
	}
	return &parsed
}

func sanitizeFilename(value string) string {
	value = filepath.Base(value)
	value = strings.ReplaceAll(value, " ", "_")
	return strings.Map(func(r rune) rune {
		if r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '.' || r == '_' || r == '-' {
			return r
		}
		return -1
	}, value)
}
