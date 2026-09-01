package http

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"simpeg-go/internal/config"
	"simpeg-go/internal/domain"

	"github.com/gin-gonic/gin"
)

type GoogleAuthHandler struct {
	userRepo domain.UserRepository
	cfg      config.GoogleConfig
	jwtCfg   config.JWTConfig
	client   *http.Client
}

func NewGoogleAuthHandler(userRepo domain.UserRepository, cfg *config.Config, jwtCfg config.JWTConfig) *GoogleAuthHandler {
	return &GoogleAuthHandler{
		userRepo: userRepo,
		cfg:      cfg.Google,
		jwtCfg:   jwtCfg,
		client:   &http.Client{Timeout: 10 * time.Second},
	}
}

// Redirect godoc
// @Summary Login Google (redirect)
// @Description Mengalihkan ke halaman otorisasi Google OAuth2. Pada sukses, browser diarahkan ulang ke frontend dengan token JWT.
// @Tags Auth
// @Produce json
// @Success 302 {string} string "Redirect ke Google OAuth2"
// @Router /auth/google [get]
func (h *GoogleAuthHandler) Redirect(c *gin.Context) {
	if !h.cfg.Enabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Google SSO belum dikonfigurasi pada server",
		})
		return
	}

	q := url.Values{}
	q.Set("client_id", h.cfg.ClientID)
	q.Set("redirect_uri", h.cfg.RedirectURL)
	q.Set("response_type", "code")
	q.Set("scope", "openid email profile")
	q.Set("access_type", "online")
	q.Set("prompt", "select_account")
	q.Set("state", "/auth/google/callback")

	authURL := "https://accounts.google.com/o/oauth2/v2/auth?" + q.Encode()
	c.Redirect(http.StatusFound, authURL)
}

// Callback godoc
// @Summary Callback Google OAuth2
// @Description Dipanggil Google setelah otorisasi; menukar `code` dengan token dan mengembalikan JWT ke frontend via redirect.
// @Tags Auth
// @Produce json
// @Param code query string true "Kode otorisasi dari Google"
// @Param state query string true "State anti-CSRF"
// @Success 302 {string} string "Redirect ke frontend dengan token JWT"
// @Failure 400 {object} ErrorResponse
// @Router /auth/google/callback [get]
func (h *GoogleAuthHandler) Callback(c *gin.Context) {
	code := c.Query("code")
	state := c.DefaultQuery("state", "/auth/google/callback")
	if code == "" {
		c.Redirect(http.StatusFound, h.frontendURL(c, state, "", "Google menolak otorisasi. Silakan coba lagi."))
		return
	}

	if !h.cfg.Enabled() {
		c.Redirect(http.StatusFound, h.frontendURL(c, state, "", "Google SSO belum dikonfigurasi pada server"))
		return
	}

	token, err := h.exchangeCode(code)
	if err != nil {
		c.Redirect(http.StatusFound, h.frontendURL(c, state, "", "Gagal menukar kode otorisasi Google"))
		return
	}

	info, err := h.fetchUserInfo(token)
	if err != nil {
		c.Redirect(http.StatusFound, h.frontendURL(c, state, "", "Gagal mengambil data profil Google"))
		return
	}

	if !info.VerifiedEmail || info.Email == "" {
		c.Redirect(http.StatusFound, h.frontendURL(c, state, "", "Akun Google tidak memiliki email terverifikasi"))
		return
	}

	user, err := h.userRepo.FindByEmail(info.Email)
	if err != nil {
		user = &domain.User{
			Name:  info.Name,
			Email: info.Email,
			Role:  "pegawai",
		}
		if err := h.userRepo.Create(user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat akun dari Google"})
			return
		}
	}

	jwtToken, err := GenerateToken(user, h.jwtCfg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal generate token"})
		return
	}

	c.Redirect(http.StatusFound, h.frontendURL(c, state, jwtToken, ""))
}

func (h *GoogleAuthHandler) exchangeCode(code string) (string, error) {
	form := url.Values{}
	form.Set("code", code)
	form.Set("client_id", h.cfg.ClientID)
	form.Set("client_secret", h.cfg.ClientSecret)
	form.Set("redirect_uri", h.cfg.RedirectURL)
	form.Set("grant_type", "authorization_code")

	resp, err := h.client.PostForm("https://oauth2.googleapis.com/token", form)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("google token exchange failed: %d", resp.StatusCode)
	}

	var payload struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return "", err
	}
	if payload.AccessToken == "" {
		return "", errors.New("empty access token")
	}
	return payload.AccessToken, nil
}

func (h *GoogleAuthHandler) fetchUserInfo(accessToken string) (*googleUserInfo, error) {
	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet,
		"https://www.googleapis.com/oauth2/v2/userinfo?access_token="+url.QueryEscape(accessToken), nil)
	if err != nil {
		return nil, err
	}
	resp, err := h.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google userinfo failed: %d", resp.StatusCode)
	}

	var info googleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}
	return &info, nil
}

func (h *GoogleAuthHandler) frontendURL(c *gin.Context, state, token, errMsg string) string {
	base := c.Request.Host
	scheme := "http"
	if c.Request.TLS != nil || strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https") {
		scheme = "https"
	}
	redirect := scheme + "://" + strings.TrimRight(base, "/") + "/" + strings.TrimLeft(state, "/")

	sep := "?"
	if strings.Contains(redirect, "?") {
		sep = "&"
	}
	if token != "" {
		return redirect + sep + "token=" + url.QueryEscape(token)
	}
	if errMsg != "" {
		return redirect + sep + "error=" + url.QueryEscape(errMsg)
	}
	return redirect
}

type googleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	Name          string `json:"name"`
	VerifiedEmail bool   `json:"verified_email"`
}
