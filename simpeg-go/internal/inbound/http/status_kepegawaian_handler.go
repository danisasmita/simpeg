package http

import (
	"net/http"
	"strconv"

	"simpeg-go/internal/domain"

	"github.com/gin-gonic/gin"
)

type StatusKepegawaianHandler struct {
	repo domain.StatusKepegawaianRepository
}

func NewStatusKepegawaianHandler(repo domain.StatusKepegawaianRepository) *StatusKepegawaianHandler {
	return &StatusKepegawaianHandler{repo: repo}
}

// Index godoc
// @Summary Daftar status kepegawaian
// @Tags Master Data
// @Produce json
// @Security BearerAuth
// @Success 200 {object} []domain.StatusKepegawaian
// @Failure 500 {object} ErrorResponse
// @Router /status-kepegawaian [get]
func (h *StatusKepegawaianHandler) Index(c *gin.Context) {
	result, err := h.repo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

// Show godoc
// @Summary Detail status kepegawaian
// @Tags Master Data
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID status kepegawaian"
// @Success 200 {object} domain.StatusKepegawaian
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /status-kepegawaian/{id} [get]
func (h *StatusKepegawaianHandler) Show(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	status, err := h.repo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Status kepegawaian tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": status})
}

// Store godoc
// @Summary Tambah status kepegawaian
// @Tags Master Data
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body domain.StatusKepegawaian true "Data status kepegawaian"
// @Success 201 {object} domain.StatusKepegawaian
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /status-kepegawaian [post]
func (h *StatusKepegawaianHandler) Store(c *gin.Context) {
	var s domain.StatusKepegawaian
	if err := c.ShouldBindJSON(&s); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if s.Kode == "" || s.Nama == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Kode dan nama wajib diisi"})
		return
	}

	if err := h.repo.Create(&s); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan status kepegawaian"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": s})
}

// Update godoc
// @Summary Ubah status kepegawaian
// @Tags Master Data
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID status kepegawaian"
// @Param body body domain.StatusKepegawaian true "Data status kepegawaian"
// @Success 200 {object} domain.StatusKepegawaian
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /status-kepegawaian/{id} [put]
func (h *StatusKepegawaianHandler) Update(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	var s domain.StatusKepegawaian
	if err := c.ShouldBindJSON(&s); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	s.ID = id

	if err := h.repo.Update(&s); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update status kepegawaian"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": s})
}

// Delete godoc
// @Summary Hapus status kepegawaian
// @Tags Master Data
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID status kepegawaian"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /status-kepegawaian/{id} [delete]
func (h *StatusKepegawaianHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hapus status kepegawaian"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Status kepegawaian berhasil dihapus"})
}
