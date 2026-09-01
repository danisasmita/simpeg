package http

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"

	"simpeg-go/internal/config"
	"simpeg-go/internal/domain"
	"simpeg-go/internal/outbound"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo  domain.UserRepository
	roleRepo  domain.RoleRepository
	cfg       config.JWTConfig
	mailer    *outbound.Mailer
	auditRepo domain.AuditRepository
}

func NewAuthHandler(userRepo domain.UserRepository, roleRepo domain.RoleRepository, cfg config.JWTConfig, mailer *outbound.Mailer, auditRepo domain.AuditRepository) *AuthHandler {
	return &AuthHandler{userRepo: userRepo, roleRepo: roleRepo, cfg: cfg, mailer: mailer, auditRepo: auditRepo}
}

func (h *AuthHandler) auditAuth(action, email string, userID *int64, ip string) {
	if h.auditRepo == nil {
		return
	}
	entry := &domain.AuditLog{
		UserID:     userID,
		Actor:      email,
		Module:     "AUTH",
		Action:     action,
		ResourceID: email,
		IPAddress:  ip,
	}
	if err := h.auditRepo.Create(entry); err != nil {
		slog.Warn("audit auth log gagal", "err", err, "action", action)
	}
}

// Login godoc
// @Summary Login pengguna
// @Description Mengautentikasi pengguna dan mengembalikan token JWT beserta data user.
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body domain.LoginRequest true "Kredensial login"
// @Success 200 {object} domain.LoginResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	span := startSpan(c, "service.AuthLogin", "business_logic")
	if span != nil {
		defer span.Finish()
	}

	var req domain.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	dbSpan := startSpan(c, "db.query_find_user_email", "query_database")
	user, err := h.userRepo.FindByEmail(req.Email)
	if dbSpan != nil {
		dbSpan.Finish()
	}
	if err != nil {
		h.auditAuth("AUTH_LOGIN_FAILED", req.Email, nil, clientIP(c))
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau password salah"})
		return
	}

	hashSpan := startSpan(c, "logic.bcrypt_compare", "hit_password_hash")
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if hashSpan != nil {
		hashSpan.Finish()
	}
	if err != nil {
		h.auditAuth("AUTH_LOGIN_FAILED", req.Email, &user.ID, clientIP(c))
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau password salah"})
		return
	}

	token, err := GenerateToken(user, h.cfg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal generate token"})
		return
	}

	h.auditAuth("AUTH_LOGIN", req.Email, &user.ID, clientIP(c))

	c.JSON(http.StatusOK, domain.LoginResponse{
		Token: token,
		User:  *user,
	})
}

// Register godoc
// @Summary Registrasi pengguna baru
// @Description Membuat akun baru dan langsung mengembalikan token JWT.
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body RegisterRequest true "Data registrasi"
// @Success 201 {object} domain.LoginResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hash password"})
		return
	}

	user := &domain.User{
		Name:     req.Name,
		Email:    req.Email,
		Password: string(hashedPassword),
		Role:     req.Role,
	}

	if err := h.userRepo.Create(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal register user"})
		return
	}

	h.auditAuth("AUTH_REGISTER", req.Email, &user.ID, clientIP(c))

	token, err := GenerateToken(user, h.cfg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal generate token"})
		return
	}

	c.JSON(http.StatusCreated, domain.LoginResponse{
		Token: token,
		User:  *user,
	})
}

// Profile godoc
// @Summary Lihat profil & permission
// @Description Mengembalikan data user yang sedang login beserta daftar nama permission.
// @Tags Auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} ProfileResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /auth/profile [get]
func (h *AuthHandler) Profile(c *gin.Context) {
	userID := c.GetInt64("user_id")

	user, err := h.userRepo.FindByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	perms, err := h.roleRepo.FindPermissionsByUser(userID)
	if err != nil {
		perms = []domain.Permission{}
	}
	permissionNames := make([]string, 0, len(perms))
	for _, p := range perms {
		permissionNames = append(permissionNames, p.Name)
	}

	c.JSON(http.StatusOK, gin.H{
		"user":        user,
		"permissions": permissionNames,
	})
}

// UpdateProfile godoc
// @Summary Perbarui profil
// @Description Mengubah nama dan email user yang sedang login.
// @Tags Auth
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body ProfileUpdateRequest true "Data profil"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /auth/profile [put]
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID := c.GetInt64("user_id")
	var req struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if req.Name == "" || req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama dan email wajib diisi"})
		return
	}

	if err := h.userRepo.Update(userID, req.Name, req.Email); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui profil"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Profil berhasil diperbarui"})
}

// UpdatePassword godoc
// @Summary Ubah password
// @Description Mengganti password user yang sedang login setelah memverifikasi password saat ini.
// @Tags Auth
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body PasswordUpdateRequest true "Data password"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Router /auth/password [put]
func (h *AuthHandler) UpdatePassword(c *gin.Context) {
	userID := c.GetInt64("user_id")
	var req struct {
		CurrentPassword      string `json:"current_password"`
		Password             string `json:"password"`
		PasswordConfirmation string `json:"password_confirmation"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	user, err := h.userRepo.FindByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.CurrentPassword)); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Password saat ini salah"})
		return
	}
	if req.Password == "" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Password baru wajib diisi"})
		return
	}
	if req.Password != req.PasswordConfirmation {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Konfirmasi password tidak cocok"})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hash password"})
		return
	}
	if err := h.userRepo.UpdatePassword(userID, string(hashed)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengubah password"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Password berhasil diubah"})
}

// DeleteAccount godoc
// @Summary Hapus akun
// @Description Menghapus akun user yang sedang login setelah verifikasi password.
// @Tags Auth
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body DeleteAccountRequest true "Konfirmasi password"
// @Success 200 {object} MessageResponse
// @Failure 404 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Router /auth/account [delete]
func (h *AuthHandler) DeleteAccount(c *gin.Context) {
	userID := c.GetInt64("user_id")
	var req struct {
		Password string `json:"password"`
	}
	_ = c.ShouldBindJSON(&req)

	user, err := h.userRepo.FindByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	if req.Password == "" || bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)) != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Password tidak valid"})
		return
	}

	if err := h.userRepo.Delete(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus akun"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Akun berhasil dihapus"})
}

// ConfirmPassword godoc
// @Summary Konfirmasi password
// @Description Memvalidasi password saat ini (dipakai sebelum aksi sensitif).
// @Tags Auth
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body ConfirmPasswordRequest true "Password saat ini"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Router /auth/confirm-password [post]
func (h *AuthHandler) ConfirmPassword(c *gin.Context) {
	userID := c.GetInt64("user_id")
	var req struct {
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	user, err := h.userRepo.FindByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)) != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Password tidak valid"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Password terkonfirmasi"})
}

// ForgotPassword godoc
// @Summary Lupa password
// @Description Mengirim token reset password ke email. Tanpa SMTP (dev), token dikembalikan pada respons.
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body ForgotPasswordRequest true "Email terdaftar"
// @Success 200 {object} TokenMessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /auth/forgot-password [post]
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email wajib diisi"})
		return
	}

	user, err := h.userRepo.FindByEmail(req.Email)
	if err != nil {
		// Tidak membocorkan apakah email terdaftar.
		c.JSON(http.StatusOK, gin.H{"message": "Jika email terdaftar, tautan reset akan dikirim"})
		return
	}

	token, err := generateResetToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat token reset"})
		return
	}
	if err := h.userRepo.CreatePasswordReset(user.Email, token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan token reset"})
		return
	}

	// Dev: tidak ada SMTP, kembalikan token di respons agar bisa langsung dipakai.
	if !h.mailer.Enabled() {
		c.JSON(http.StatusOK, gin.H{
			"message": "Token reset password berhasil dibuat",
			"token":   token,
		})
		return
	}

	if err := h.mailer.SendPasswordReset(user.Email, token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengirim email reset password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Jika email terdaftar, tautan reset telah dikirim melalui email"})
}

// ResetPassword godoc
// @Summary Reset password
// @Description Menetapkan password baru menggunakan token dari forgot-password.
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body ResetPasswordRequest true "Data reset"
// @Success 200 {object} MessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Router /auth/reset-password [post]
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req struct {
		Email                string `json:"email"`
		Token                string `json:"token"`
		Password             string `json:"password"`
		PasswordConfirmation string `json:"password_confirmation"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if req.Email == "" || req.Token == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email, token, dan password wajib diisi"})
		return
	}
	if req.Password != req.PasswordConfirmation {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Konfirmasi password tidak cocok"})
		return
	}

	stored, err := h.userRepo.FindPasswordReset(req.Email)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Token reset tidak valid"})
		return
	}
	if stored != req.Token {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Token reset tidak valid"})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hash password"})
		return
	}

	user, err := h.userRepo.FindByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Email tidak ditemukan"})
		return
	}
	if err := h.userRepo.UpdatePassword(user.ID, string(hashed)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mereset password"})
		return
	}
	if err := h.userRepo.DeletePasswordReset(req.Email); err != nil {
		// Non-fatal, token akan kedaluwarsa secara alami.
		_ = err
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password berhasil direset"})
}

// VerifyNotification godoc
// @Summary Kirim ulang link verifikasi email
// @Description Membuat dan mengirim token verifikasi email untuk user yang sedang login.
// @Tags Auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} TokenMessageResponse
// @Failure 401 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /auth/email/verify-notification [post]
func (h *AuthHandler) VerifyNotification(c *gin.Context) {
	userID := c.GetInt64("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token tidak valid"})
		return
	}
	user, err := h.userRepo.FindByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	token, err := generateResetToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat token verifikasi"})
		return
	}
	if err := h.userRepo.CreateEmailVerifyToken(user.Email, token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan token verifikasi"})
		return
	}

	// Dev: tanpa SMTP, kembalikan token di respons.
	if !h.mailer.Enabled() {
		c.JSON(http.StatusOK, gin.H{
			"message": "Token verifikasi email berhasil dibuat",
			"token":   token,
		})
		return
	}

	if err := h.mailer.SendEmailVerification(user.Email, token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengirim email verifikasi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Link verifikasi baru telah dikirim ke email Anda"})
}

// VerifyEmail godoc
// @Summary Verifikasi email
// @Description Memverifikasi email menggunakan token dari verify-notification.
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body EmailVerifyRequest true "Token verifikasi"
// @Success 200 {object} VerifiedResponse
// @Failure 400 {object} ErrorResponse
// @Failure 422 {object} ErrorResponse
// @Router /auth/email/verify [post]
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	var req struct {
		Token string `json:"token"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if req.Token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token wajib diisi"})
		return
	}

	email, err := h.userRepo.FindEmailVerifyToken(req.Token)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Token verifikasi tidak valid atau sudah kedaluwarsa"})
		return
	}

	if err := h.userRepo.MarkEmailVerified(email); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memverifikasi email"})
		return
	}
	if err := h.userRepo.DeleteEmailVerifyToken(email); err != nil {
		_ = err
	}

	c.JSON(http.StatusOK, gin.H{"data": gin.H{"verified": true, "message": "Email berhasil diverifikasi"}})
}

func generateResetToken() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
