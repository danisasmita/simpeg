package http

import (
	"net/http"
	"strconv"

	"simpeg-go/internal/domain"

	"github.com/gin-gonic/gin"
)

type RiwayatHandler struct {
	jabatanRepo    domain.RiwayatJabatanRepository
	golonganRepo   domain.RiwayatGolonganRepository
	pendidikanRepo domain.RiwayatPendidikanRepository
	pelatihanRepo  domain.RiwayatPelatihanRepository
}

func NewRiwayatHandler(
	jabatan domain.RiwayatJabatanRepository,
	golongan domain.RiwayatGolonganRepository,
	pendidikan domain.RiwayatPendidikanRepository,
	pelatihan domain.RiwayatPelatihanRepository,
) *RiwayatHandler {
	return &RiwayatHandler{
		jabatanRepo:    jabatan,
		golonganRepo:   golongan,
		pendidikanRepo: pendidikan,
		pelatihanRepo:  pelatihan,
	}
}

// getPegawaiID parses :id param (pegawai id) pada route /pegawai/:id/...
func getPegawaiID(c *gin.Context) (int64, error) {
	return strconv.ParseInt(c.Param("id"), 10, 64)
}

// --- Riwayat Jabatan ---
// JabatanIndex godoc
// @Summary Daftar riwayat jabatan pegawai
// @Tags Riwayat Jabatan
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID pegawai"
// @Success 200 {object} []domain.RiwayatJabatan
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /pegawai/{id}/riwayat-jabatan [get]
func (h *RiwayatHandler) JabatanIndex(c *gin.Context) {
	id, err := getPegawaiID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id pegawai tidak valid"})
		return
	}
	result, err := h.jabatanRepo.FindByPegawaiID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

// JabatanStore godoc
// @Summary Tambah riwayat jabatan pegawai
// @Tags Riwayat Jabatan
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID pegawai"
// @Param body body domain.RiwayatJabatan true "Data riwayat jabatan"
// @Success 201 {object} domain.RiwayatJabatan
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /pegawai/{id}/riwayat-jabatan [post]
func (h *RiwayatHandler) JabatanStore(c *gin.Context) {
	var r domain.RiwayatJabatan
	if err := c.ShouldBindJSON(&r); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	userID := c.GetInt64("user_id")
	r.CreatedBy = &userID
	if err := h.jabatanRepo.Create(&r); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal simpan riwayat jabatan"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": r})
}

// JabatanUpdate godoc
// @Summary Ubah riwayat jabatan
// @Tags Riwayat Jabatan
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID riwayat jabatan"
// @Param body body domain.RiwayatJabatan true "Data riwayat jabatan"
// @Success 200 {object} domain.RiwayatJabatan
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /riwayat-jabatan/{id} [put]
func (h *RiwayatHandler) JabatanUpdate(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var r domain.RiwayatJabatan
	if err := c.ShouldBindJSON(&r); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	r.ID = id
	if err := h.jabatanRepo.Update(&r); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update riwayat jabatan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": r})
}

// JabatanDelete godoc
// @Summary Hapus riwayat jabatan
// @Tags Riwayat Jabatan
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID riwayat jabatan"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /riwayat-jabatan/{id} [delete]
func (h *RiwayatHandler) JabatanDelete(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.jabatanRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hapus riwayat jabatan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Riwayat jabatan dihapus"})
}

// --- Riwayat Golongan ---
// GolonganIndex godoc
// @Summary Daftar riwayat golongan pegawai
// @Tags Riwayat Golongan
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID pegawai"
// @Success 200 {object} []domain.RiwayatGolongan
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /pegawai/{id}/riwayat-golongan [get]
func (h *RiwayatHandler) GolonganIndex(c *gin.Context) {
	id, err := getPegawaiID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id pegawai tidak valid"})
		return
	}
	result, err := h.golonganRepo.FindByPegawaiID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

// GolonganStore godoc
// @Summary Tambah riwayat golongan pegawai
// @Tags Riwayat Golongan
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID pegawai"
// @Param body body domain.RiwayatGolongan true "Data riwayat golongan"
// @Success 201 {object} domain.RiwayatGolongan
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /pegawai/{id}/riwayat-golongan [post]
func (h *RiwayatHandler) GolonganStore(c *gin.Context) {
	var r domain.RiwayatGolongan
	if err := c.ShouldBindJSON(&r); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	userID := c.GetInt64("user_id")
	r.CreatedBy = &userID
	if err := h.golonganRepo.Create(&r); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal simpan riwayat golongan"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": r})
}

// GolonganUpdate godoc
// @Summary Ubah riwayat golongan
// @Tags Riwayat Golongan
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID riwayat golongan"
// @Param body body domain.RiwayatGolongan true "Data riwayat golongan"
// @Success 200 {object} domain.RiwayatGolongan
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /riwayat-golongan/{id} [put]
func (h *RiwayatHandler) GolonganUpdate(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var r domain.RiwayatGolongan
	if err := c.ShouldBindJSON(&r); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	r.ID = id
	if err := h.golonganRepo.Update(&r); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update riwayat golongan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": r})
}

// GolonganDelete godoc
// @Summary Hapus riwayat golongan
// @Tags Riwayat Golongan
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID riwayat golongan"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /riwayat-golongan/{id} [delete]
func (h *RiwayatHandler) GolonganDelete(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.golonganRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hapus riwayat golongan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Riwayat golongan dihapus"})
}

// --- Riwayat Pendidikan ---
// PendidikanIndex godoc
// @Summary Daftar riwayat pendidikan pegawai
// @Tags Riwayat Pendidikan
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID pegawai"
// @Success 200 {object} []domain.RiwayatPendidikan
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /pegawai/{id}/riwayat-pendidikan [get]
func (h *RiwayatHandler) PendidikanIndex(c *gin.Context) {
	id, err := getPegawaiID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id pegawai tidak valid"})
		return
	}
	result, err := h.pendidikanRepo.FindByPegawaiID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

// PendidikanStore godoc
// @Summary Tambah riwayat pendidikan pegawai
// @Tags Riwayat Pendidikan
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID pegawai"
// @Param body body domain.RiwayatPendidikan true "Data riwayat pendidikan"
// @Success 201 {object} domain.RiwayatPendidikan
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /pegawai/{id}/riwayat-pendidikan [post]
func (h *RiwayatHandler) PendidikanStore(c *gin.Context) {
	var r domain.RiwayatPendidikan
	if err := c.ShouldBindJSON(&r); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	userID := c.GetInt64("user_id")
	r.CreatedBy = &userID
	if err := h.pendidikanRepo.Create(&r); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal simpan riwayat pendidikan"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": r})
}

// PendidikanUpdate godoc
// @Summary Ubah riwayat pendidikan
// @Tags Riwayat Pendidikan
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID riwayat pendidikan"
// @Param body body domain.RiwayatPendidikan true "Data riwayat pendidikan"
// @Success 200 {object} domain.RiwayatPendidikan
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /riwayat-pendidikan/{id} [put]
func (h *RiwayatHandler) PendidikanUpdate(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var r domain.RiwayatPendidikan
	if err := c.ShouldBindJSON(&r); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	r.ID = id
	if err := h.pendidikanRepo.Update(&r); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update riwayat pendidikan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": r})
}

// PendidikanDelete godoc
// @Summary Hapus riwayat pendidikan
// @Tags Riwayat Pendidikan
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID riwayat pendidikan"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /riwayat-pendidikan/{id} [delete]
func (h *RiwayatHandler) PendidikanDelete(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.pendidikanRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hapus riwayat pendidikan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Riwayat pendidikan dihapus"})
}

// --- Riwayat Pelatihan ---
// PelatihanIndex godoc
// @Summary Daftar riwayat pelatihan pegawai
// @Tags Riwayat Pelatihan
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID pegawai"
// @Success 200 {object} []domain.RiwayatPelatihan
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /pegawai/{id}/riwayat-pelatihan [get]
func (h *RiwayatHandler) PelatihanIndex(c *gin.Context) {
	id, err := getPegawaiID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id pegawai tidak valid"})
		return
	}
	result, err := h.pelatihanRepo.FindByPegawaiID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

// PelatihanStore godoc
// @Summary Tambah riwayat pelatihan pegawai
// @Tags Riwayat Pelatihan
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID pegawai"
// @Param body body domain.RiwayatPelatihan true "Data riwayat pelatihan"
// @Success 201 {object} domain.RiwayatPelatihan
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /pegawai/{id}/riwayat-pelatihan [post]
func (h *RiwayatHandler) PelatihanStore(c *gin.Context) {
	var r domain.RiwayatPelatihan
	if err := c.ShouldBindJSON(&r); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	userID := c.GetInt64("user_id")
	r.CreatedBy = &userID
	if err := h.pelatihanRepo.Create(&r); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal simpan riwayat pelatihan"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": r})
}

// PelatihanUpdate godoc
// @Summary Ubah riwayat pelatihan
// @Tags Riwayat Pelatihan
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID riwayat pelatihan"
// @Param body body domain.RiwayatPelatihan true "Data riwayat pelatihan"
// @Success 200 {object} domain.RiwayatPelatihan
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /riwayat-pelatihan/{id} [put]
func (h *RiwayatHandler) PelatihanUpdate(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var r domain.RiwayatPelatihan
	if err := c.ShouldBindJSON(&r); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	r.ID = id
	if err := h.pelatihanRepo.Update(&r); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update riwayat pelatihan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": r})
}

// PelatihanDelete godoc
// @Summary Hapus riwayat pelatihan
// @Tags Riwayat Pelatihan
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID riwayat pelatihan"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /riwayat-pelatihan/{id} [delete]
func (h *RiwayatHandler) PelatihanDelete(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.pelatihanRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hapus riwayat pelatihan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Riwayat pelatihan dihapus"})
}
