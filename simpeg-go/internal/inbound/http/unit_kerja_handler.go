package http

import (
	"net/http"
	"strconv"

	"simpeg-go/internal/domain"

	"github.com/gin-gonic/gin"
)

type UnitKerjaHandler struct {
	repo domain.UnitKerjaRepository
}

func NewUnitKerjaHandler(repo domain.UnitKerjaRepository) *UnitKerjaHandler {
	return &UnitKerjaHandler{repo: repo}
}

// Index godoc
// @Summary Daftar unit kerja
// @Description Daftar unit kerja; gunakan ?tree=1 untuk hierarki unit kerja.
// @Tags Master Data
// @Produce json
// @Security BearerAuth
// @Param tree query int false "1 untuk hierarki"
// @Success 200 {object} []domain.UnitKerja
// @Failure 500 {object} ErrorResponse
// @Router /unit-kerja [get]
func (h *UnitKerjaHandler) Index(c *gin.Context) {
	if c.Query("tree") == "1" {
		result, err := h.repo.FindTree()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": result})
		return
	}

	result, err := h.repo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

// Show godoc
// @Summary Detail unit kerja
// @Tags Master Data
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID unit kerja"
// @Success 200 {object} domain.UnitKerja
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /unit-kerja/{id} [get]
func (h *UnitKerjaHandler) Show(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	u, err := h.repo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Unit kerja tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": u})
}

// Store godoc
// @Summary Tambah unit kerja
// @Tags Master Data
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body domain.UnitKerja true "Data unit kerja (kode, nama, tipe)"
// @Success 201 {object} domain.UnitKerja
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /unit-kerja [post]
func (h *UnitKerjaHandler) Store(c *gin.Context) {
	var u domain.UnitKerja
	if err := c.ShouldBindJSON(&u); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if u.Kode == "" || u.Nama == "" || u.Tipe == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Kode, nama, dan tipe wajib diisi"})
		return
	}

	if err := h.repo.Create(&u); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan unit kerja"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": u})
}

// Update godoc
// @Summary Ubah unit kerja
// @Tags Master Data
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID unit kerja"
// @Param body body domain.UnitKerja true "Data unit kerja"
// @Success 200 {object} domain.UnitKerja
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /unit-kerja/{id} [put]
func (h *UnitKerjaHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var u domain.UnitKerja
	if err := c.ShouldBindJSON(&u); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	u.ID = id

	if err := h.repo.Update(&u); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update unit kerja"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": u})
}

// Delete godoc
// @Summary Hapus unit kerja
// @Tags Master Data
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID unit kerja"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /unit-kerja/{id} [delete]
func (h *UnitKerjaHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hapus unit kerja"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Unit kerja berhasil dihapus"})
}
