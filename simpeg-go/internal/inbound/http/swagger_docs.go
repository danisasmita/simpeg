package http

import "simpeg-go/internal/domain"

type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Role     string `json:"role"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordRequest struct {
	Email                string `json:"email" binding:"required,email"`
	Token                string `json:"token" binding:"required"`
	Password             string `json:"password" binding:"required,min=8"`
	PasswordConfirmation string `json:"password_confirmation" binding:"required"`
}

type EmailVerifyRequest struct {
	Token string `json:"token" binding:"required"`
}

type ProfileUpdateRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

type PasswordUpdateRequest struct {
	CurrentPassword      string `json:"current_password"`
	Password             string `json:"password"`
	PasswordConfirmation string `json:"password_confirmation"`
}

type ConfirmPasswordRequest struct {
	Password string `json:"password"`
}

type DeleteAccountRequest struct {
	Password string `json:"password"`
}

type CheckInRequest struct {
	PegawaiID int64  `json:"pegawai_id"`
	Photo     string `json:"photo"`
	Location  string `json:"location"`
}

type CheckOutRequest struct {
	PegawaiID int64  `json:"pegawai_id"`
	Photo     string `json:"photo"`
	Location  string `json:"location"`
}

type CutiStoreRequest struct {
	PegawaiID      int64  `json:"pegawai_id"`
	Jenis          string `json:"jenis"`
	TanggalMulai   string `json:"tanggal_mulai"`
	TanggalSelesai string `json:"tanggal_selesai"`
	JumlahHari     int    `json:"jumlah_hari"`
	Alasan         string `json:"alasan"`
}

type CutiApproveRequest struct {
	Status  string `json:"status"`
	Catatan string `json:"catatan"`
}

type PegawaiStoreRequest struct {
	domain.Pegawai
	CreateAccount bool   `json:"create_account"`
	Role          string `json:"role"`
}

type MessageResponse struct {
	Message string `json:"message"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

type TokenMessageResponse struct {
	Message string `json:"message"`
	Token   string `json:"token,omitempty"`
}

type VerifiedResponse struct {
	Data struct {
		Verified bool   `json:"verified"`
		Message  string `json:"message"`
	} `json:"data"`
}

type ProfileResponse struct {
	User        domain.User `json:"user"`
	Permissions []string    `json:"permissions"`
}

type CreateAccountRequest struct {
	UserID   int64  `json:"user_id"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type RoleStoreRequest struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
}

type GeocodeReverseResponse struct {
	Address string `json:"address"`
	Detail  struct {
		Road    string `json:"road"`
		Village string `json:"village"`
		City    string `json:"city"`
		State   string `json:"state"`
		Country string `json:"country"`
	} `json:"detail"`
}
