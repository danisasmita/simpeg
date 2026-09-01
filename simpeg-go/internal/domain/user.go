package domain

import "time"

type User struct {
	ID        int64     `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Email     string    `json:"email" db:"email"`
	Password  string    `json:"-" db:"password"`
	Role      string    `json:"role" db:"role"`
	PegawaiID *int64    `json:"pegawai_id,omitempty" db:"pegawai_id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type UserRepository interface {
	FindByEmail(email string) (*User, error)
	FindByID(id int64) (*User, error)
	Create(user *User) error
	Update(id int64, name, email string) error
	UpdatePassword(id int64, hashed string) error
	UpdatePegawaiID(id, pegawaiID int64) error
	Delete(id int64) error
	CreatePasswordReset(email, token string) error
	FindPasswordReset(email string) (token string, err error)
	DeletePasswordReset(email string) error
	CreateEmailVerifyToken(email, token string) error
	FindEmailVerifyToken(token string) (email string, err error)
	MarkEmailVerified(email string) error
	DeleteEmailVerifyToken(email string) error
}

type RoleAssignmentRepository interface {
	RoleNameByUser(userID int64) (string, error)
	AssignRole(userID int64, roleName string) error
}
