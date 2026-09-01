package http

import (
	"net/http"
	"strconv"

	"simpeg-go/internal/domain"

	"github.com/gin-gonic/gin"
)

type GolonganHandler struct {
	repo domain.GolonganRepository
}

func NewGolonganHandler(repo domain.GolonganRepository) *GolonganHandler {
	return &GolonganHandler{repo: repo}
}

// Index godoc
// @Summary Daftar golongan
// @Tags Master Data
// @Produce json
// @Security BearerAuth
// @Success 200 {object} []domain.Golongan
// @Failure 500 {object} ErrorResponse
// @Router /golongan [get]
func (h *GolonganHandler) Index(c *gin.Context) {
	result, err := h.repo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

// Show godoc
// @Summary Detail golongan
// @Tags Master Data
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID golongan"
// @Success 200 {object} domain.Golongan
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /golongan/{id} [get]
func (h *GolonganHandler) Show(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	g, err := h.repo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Golongan tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": g})
}

// Store godoc
// @Summary Tambah golongan
// @Tags Master Data
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body domain.Golongan true "Data golongan (kode, nama)"
// @Success 201 {object} domain.Golongan
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /golongan [post]
func (h *GolonganHandler) Store(c *gin.Context) {
	var g domain.Golongan
	if err := c.ShouldBindJSON(&g); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if g.Kode == "" || g.Nama == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Kode dan nama wajib diisi"})
		return
	}

	if err := h.repo.Create(&g); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan golongan"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": g})
}

// Update godoc
// @Summary Ubah golongan
// @Tags Master Data
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID golongan"
// @Param body body domain.Golongan true "Data golongan"
// @Success 200 {object} domain.Golongan
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /golongan/{id} [put]
func (h *GolonganHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var g domain.Golongan
	if err := c.ShouldBindJSON(&g); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	g.ID = id

	if err := h.repo.Update(&g); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update golongan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": g})
}

// Delete godoc
// @Summary Hapus golongan
// @Tags Master Data
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID golongan"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /golongan/{id} [delete]
func (h *GolonganHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hapus golongan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Golongan berhasil dihapus"})
}
