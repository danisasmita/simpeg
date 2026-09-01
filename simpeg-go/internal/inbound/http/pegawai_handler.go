package http

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"simpeg-go/internal/domain"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func randomSuffix(n int) string {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano()%10000)
	}
	return hex.EncodeToString(buf)
}

type PegawaiHandler struct {
	repo      domain.PegawaiRepository
	userRepo  domain.UserRepository
	roleRepo  domain.RoleRepository
	uploadDir string
}

func NewPegawaiHandler(repo domain.PegawaiRepository, userRepo domain.UserRepository, roleRepo domain.RoleRepository) *PegawaiHandler {
	return &PegawaiHandler{
		repo:      repo,
		userRepo:  userRepo,
		roleRepo:  roleRepo,
		uploadDir: "uploads",
	}
}

// Index godoc
// @Summary Daftar pegawai
// @Description List pegawai mendukung paginasi dan filter: search, status_aktif, unit_kerja_id, jabatan_id, golongan_id.
// @Tags Pegawai
// @Produce json
// @Security BearerAuth
// @Param page query int false "Halaman (default 1)"
// @Param limit query int false "Jumlah per halaman (default 15, maks 100)"
// @Param search query string false "Kata kunci pencarian"
// @Param status_aktif query string false "Filter status aktif"
// @Param unit_kerja_id query int false "Filter unit kerja"
// @Param jabatan_id query int false "Filter jabatan"
// @Param golongan_id query int false "Filter golongan"
// @Success 200 {object} []domain.Pegawai
// @Failure 500 {object} ErrorResponse
// @Router /pegawai [get]
func (h *PegawaiHandler) Index(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "15"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 15
	}

	filter := domain.PegawaiSearchFilter{
		Page:   page,
		Limit:  limit,
		Search: c.Query("search"),
		Status: c.Query("status_aktif"),
	}
	filter.UnitID, _ = strconv.ParseInt(c.Query("unit_kerja_id"), 10, 64)
	filter.JabID, _ = strconv.ParseInt(c.Query("jabatan_id"), 10, 64)
	filter.GolID, _ = strconv.ParseInt(c.Query("golongan_id"), 10, 64)

	result, total, err := h.repo.FindAll(filter)
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

// Show godoc
// @Summary Detail pegawai
// @Tags Pegawai
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID pegawai"
// @Success 200 {object} domain.Pegawai
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /pegawai/{id} [get]
func (h *PegawaiHandler) Show(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	p, err := h.repo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pegawai tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": p})
}

type pegawaiStoreReq struct {
	CreateAccount bool   `json:"create_account"`
	Role          string `json:"role"`
	domain.Pegawai
}

// Store godoc
// @Summary Tambah pegawai
// @Description Menerima JSON ataupun multipart (field `data` berisi JSON pegawai, `foto` file JPG/PNG maks 2MB). Foto disimpan dengan nama unik.
// @Tags Pegawai
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param body body PegawaiStoreRequest true "Data pegawai (opsi create_account & role untuk membuat akun user)"
// @Param foto formData file false "Foto pegawai (JPG/PNG, maks 2MB)"
// @Success 201 {object} domain.Pegawai
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /pegawai [post]
func (h *PegawaiHandler) Store(c *gin.Context) {
	span := startSpan(c, "service.PegawaiStore", "business_logic")
	if span != nil {
		defer span.Finish()
	}

	fotoSpan := startSpan(c, "http.parse_multipart_pegawai", "request_parse")
	req, foto, err := h.parsePegawaiRequest(c)
	if fotoSpan != nil {
		fotoSpan.Finish()
	}
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.NamaLengkap == "" || req.JenisKelamin == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama lengkap dan jenis kelamin wajib diisi"})
		return
	}

	if req.StatusAktif == "" {
		req.StatusAktif = "aktif"
	}

	userID := c.GetInt64("user_id")
	p := req.Pegawai
	p.CreatedBy = &userID
	p.UpdatedBy = &userID

	if foto != nil {
		saveFotoSpan := startSpan(c, "logic.save_foto_pegawai", "file_io")
		path, err := h.saveFoto(foto)
		if saveFotoSpan != nil {
			saveFotoSpan.Finish()
		}
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		p.Foto = &path
	}

	if req.CreateAccount {
		email := ""
		if p.EmailInstitusi != nil {
			email = *p.EmailInstitusi
		}
		if email == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Buat akun login memerlukan email institusi"})
			return
		}

		roleName := strings.ToLower(req.Role)
		if roleName == "" {
			roleName = "pegawai"
		}
		if _, err := h.roleRepo.FindByName(roleName); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Peran tidak dikenal: " + roleName})
			return
		}

		if _, err := h.userRepo.FindByEmail(email); err == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Email sudah terdaftar"})
			return
		}

		hashAccSpan := startSpan(c, "logic.bcrypt_password_default", "hit_password_hash")
		hashed, err := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)
		if hashAccSpan != nil {
			hashAccSpan.Finish()
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hash password"})
			return
		}

		user := &domain.User{
			Name:     p.NamaLengkap,
			Email:    email,
			Password: string(hashed),
			Role:     roleName,
		}
		if err := h.userRepo.Create(user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat akun login"})
			return
		}
		p.UserID = &user.ID

		storeSpan := startSpan(c, "db.insert_pegawai", "query_database")
		err = h.repo.Create(&p)
		if storeSpan != nil {
			storeSpan.Finish()
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan pegawai"})
			return
		}
		if err := h.userRepo.UpdatePegawaiID(user.ID, p.ID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghubungkan akun ke pegawai"})
			return
		}
	} else {
		storeSpan := startSpan(c, "db.insert_pegawai", "query_database")
		err = h.repo.Create(&p)
		if storeSpan != nil {
			storeSpan.Finish()
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan pegawai"})
			return
		}
	}

	p.FotoURL = domain.FotoPathURL(p.Foto)
	c.JSON(http.StatusCreated, gin.H{"data": p})
}

// Update godoc
// @Summary Ubah pegawai
// @Description Menerima JSON ataupun multipart (field `data` berisi JSON pegawai, `foto` file baru opsional).
// @Tags Pegawai
// @Accept multipart/form-data
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID pegawai"
// @Param body body PegawaiStoreRequest true "Data pegawai"
// @Param foto formData file false "Foto pegawai baru (JPG/PNG, maks 2MB)"
// @Success 200 {object} domain.Pegawai
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /pegawai/{id} [put]
func (h *PegawaiHandler) Update(c *gin.Context) {
	span := startSpan(c, "service.PegawaiUpdate", "business_logic")
	if span != nil {
		defer span.Finish()
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	parseSpan := startSpan(c, "http.parse_multipart_pegawai", "request_parse")
	req, foto, err := h.parsePegawaiRequest(c)
	if parseSpan != nil {
		parseSpan.Finish()
	}
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	loadSpan := startSpan(c, "db.select_pegawai_by_id", "query_database")
	existing, err := h.repo.FindByID(id)
	if loadSpan != nil {
		loadSpan.Finish()
	}
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pegawai tidak ditemukan"})
		return
	}

	p := req.Pegawai
	p.ID = id
	userID := c.GetInt64("user_id")
	p.UpdatedBy = &userID

	if foto != nil {
		saveFotoSpan := startSpan(c, "logic.save_foto_pegawai", "file_io")
		path, err := h.saveFoto(foto)
		if saveFotoSpan != nil {
			saveFotoSpan.Finish()
		}
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		p.Foto = &path
	} else if p.Foto == nil {
		p.Foto = existing.Foto
	}

	updateSpan := startSpan(c, "db.update_pegawai", "query_database")
	err = h.repo.Update(&p)
	if updateSpan != nil {
		updateSpan.Finish()
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update pegawai"})
		return
	}
	p.FotoURL = domain.FotoPathURL(p.Foto)
	c.JSON(http.StatusOK, gin.H{"data": p})
}

func (h *PegawaiHandler) parsePegawaiRequest(c *gin.Context) (pegawaiStoreReq, *multipart.FileHeader, error) {
	var req pegawaiStoreReq

	contentType := strings.ToLower(c.GetHeader("Content-Type"))
	if strings.Contains(contentType, "multipart/form-data") {
		if data := c.PostForm("data"); data != "" {
			if err := json.Unmarshal([]byte(data), &req); err != nil {
				return req, nil, fmt.Errorf("Invalid request body")
			}
		}
		foto, _ := c.FormFile("foto")
		return req, foto, nil
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		return req, nil, fmt.Errorf("Invalid request body")
	}
	return req, nil, nil
}

func (h *PegawaiHandler) saveFoto(file *multipart.FileHeader) (string, error) {
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
		return "", fmt.Errorf("foto harus berformat JPG/JPEG/PNG")
	}
	if file.Size > 2<<20 {
		return "", fmt.Errorf("ukuran foto maksimal 2 MB")
	}

	name := sanitizeFilename(file.Filename)
	if name == "" || !strings.Contains(name, ".") {
		name = "foto" + ext
	}
	storageName := fmt.Sprintf("%s_%s_%s", time.Now().Format("20060102150405"), randomSuffix(4), name)

	dir := filepath.Join(h.uploadDir, "pegawai", "foto")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("gagal membuat folder foto")
	}

	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("gagal membaca file foto")
	}
	defer src.Close()

	path := filepath.Join(dir, storageName)
	dst, err := os.Create(path)
	if err != nil {
		return "", fmt.Errorf("gagal menyimpan foto")
	}
	defer dst.Close()
	if _, err := io.Copy(dst, src); err != nil {
		os.Remove(path)
		return "", fmt.Errorf("gagal menyimpan foto")
	}

	return "pegawai/foto/" + storageName, nil
}

// Delete godoc
// @Summary Hapus pegawai
// @Tags Pegawai
// @Produce json
// @Security BearerAuth
// @Param id path int true "ID pegawai"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /pegawai/{id} [delete]
func (h *PegawaiHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hapus pegawai"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Pegawai berhasil dihapus"})
}
