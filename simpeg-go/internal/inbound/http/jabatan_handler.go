package http

import (
	"net/http"
	"strconv"

	"simpeg-go/internal/domain"

	"github.com/gin-gonic/gin"
)

type JabatanHandler struct {
	repo domain.JabatanRepository
}

func NewJabatanHandler(repo domain.JabatanRepository) *JabatanHandler {
	return &JabatanHandler{repo: repo}
}

// Index godoc
// @Summary Daftar jabatan
// @Tags Master Data
// @Produce json
// @Security BearerAuth
// @Success 200 {object} []domain.Jabatan
// @Failure 500 {object} ErrorResponse
// @Router /jabatan [get]
func (h *JabatanHandler) Index(c *gin.Context) {
	result, err := h.repo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

// Show godoc
// @Summary Detail jabatan
// @Tags Master Data
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID jabatan"
// @Success 200 {object} domain.Jabatan
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /jabatan/{id} [get]
func (h *JabatanHandler) Show(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	j, err := h.repo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Jabatan tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": j})
}

// Store godoc
// @Summary Tambah jabatan
// @Tags Master Data
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body domain.Jabatan true "Data jabatan (kode, nama, tipe)"
// @Success 201 {object} domain.Jabatan
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /jabatan [post]
func (h *JabatanHandler) Store(c *gin.Context) {
	var j domain.Jabatan
	if err := c.ShouldBindJSON(&j); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if j.Nama == "" || j.Jenis == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama dan jenis wajib diisi"})
		return
	}

	if err := h.repo.Create(&j); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan jabatan"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": j})
}

// Update godoc
// @Summary Ubah jabatan
// @Tags Master Data
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID jabatan"
// @Param body body domain.Jabatan true "Data jabatan"
// @Success 200 {object} domain.Jabatan
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /jabatan/{id} [put]
func (h *JabatanHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var j domain.Jabatan
	if err := c.ShouldBindJSON(&j); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	j.ID = id

	if err := h.repo.Update(&j); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update jabatan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": j})
}

// Delete godoc
// @Summary Hapus jabatan
// @Tags Master Data
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID jabatan"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /jabatan/{id} [delete]
func (h *JabatanHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hapus jabatan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Jabatan berhasil dihapus"})
}
