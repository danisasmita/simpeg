package http

import (
	"net/http"

	"simpeg-go/internal/domain"

	"github.com/gin-gonic/gin"
)

type RolesHandler struct {
	repo domain.RoleRepository
}

func NewRolesHandler(repo domain.RoleRepository) *RolesHandler {
	return &RolesHandler{repo: repo}
}

// Index godoc
// @Summary Daftar role
// @Tags Roles & Permissions
// @Produce json
// @Security BearerAuth
// @Success 200 {object} []domain.Role
// @Failure 500 {object} ErrorResponse
// @Router /roles [get]
func (h *RolesHandler) Index(c *gin.Context) {
	roles, err := h.repo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data roles"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": roles})
}

// Show godoc
// @Summary Detail role berdasarkan nama
// @Tags Roles & Permissions
// @Produce json
// @Security BearerAuth
// @Param name path string true "Nama role"
// @Success 200 {object} domain.Role
// @Failure 404 {object} ErrorResponse
// @Router /roles/{name} [get]
func (h *RolesHandler) Show(c *gin.Context) {
	name := c.Param("name")
	role, err := h.repo.FindByName(name)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": role})
}

// Permissions godoc
// @Summary Daftar semua permission
// @Tags Roles & Permissions
// @Produce json
// @Security BearerAuth
// @Success 200 {object} []domain.Permission
// @Failure 500 {object} ErrorResponse
// @Router /roles/permissions [get]
func (h *RolesHandler) Permissions(c *gin.Context) {
	perms, err := h.repo.AllPermissions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar permissions"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": perms})
}

// Store godoc
// @Summary Buat role baru
// @Tags Roles & Permissions
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body RoleStoreRequest true "Data role (name, description, permissions)"
// @Success 201 {object} domain.Role
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /roles [post]
func (h *RolesHandler) Store(c *gin.Context) {
	var req struct {
		Name        string   `json:"name"`
		Description string   `json:"description"`
		Permissions []string `json:"permissions"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama role wajib diisi"})
		return
	}

	role := &domain.Role{Name: req.Name, Description: req.Description, Permissions: req.Permissions}
	if err := h.repo.Create(role); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat role"})
		return
	}
	h.invalidatePermissionCache()
	c.JSON(http.StatusCreated, gin.H{"data": role})
}

// Update godoc
// @Summary Ubah role
// @Tags Roles & Permissions
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param name path string true "Nama role"
// @Param body body RoleStoreRequest true "Data role baru"
// @Success 200 {object} domain.Role
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /roles/{name} [put]
func (h *RolesHandler) Update(c *gin.Context) {
	name := c.Param("name")
	var req struct {
		Description string   `json:"description"`
		Permissions []string `json:"permissions"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	role := &domain.Role{Name: name, Description: req.Description, Permissions: req.Permissions}
	if err := h.repo.Update(name, role); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role tidak ditemukan"})
		return
	}
	h.invalidatePermissionCache()
	updated, err := h.repo.FindByName(name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data role"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": updated})
}

// Delete godoc
// @Summary Hapus role
// @Description Role `admin` tidak dapat dihapus.
// @Tags Roles & Permissions
// @Produce json
// @Security BearerAuth
// @Param name path string true "Nama role"
// @Success 200 {object} MessageResponse
// @Failure 403 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /roles/{name} [delete]
func (h *RolesHandler) Delete(c *gin.Context) {
	name := c.Param("name")
	if name == "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Role admin tidak dapat dihapus"})
		return
	}
	if err := h.repo.Delete(name); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role tidak ditemukan"})
		return
	}
	h.invalidatePermissionCache()
	c.JSON(http.StatusOK, gin.H{"message": "Role berhasil dihapus"})
}

func (h *RolesHandler) invalidatePermissionCache() {
	if c, ok := h.repo.(interface{ Invalidate() }); ok {
		c.Invalidate()
	}
}
