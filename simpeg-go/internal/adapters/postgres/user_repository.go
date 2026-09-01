package postgres

import (
	"fmt"

	"simpeg-go/internal/domain"

	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

const userCols = "id, name, email, password, role, pegawai_id, created_at, updated_at"

func (r *UserRepository) FindByEmail(email string) (*domain.User, error) {
	var user domain.User
	err := r.db.Table("users").
		Select(userCols).
		Where("email = ?", email).
		Scan(&user).Error
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	if user.ID == 0 {
		return nil, fmt.Errorf("user not found")
	}
	return &user, nil
}

func (r *UserRepository) FindByID(id int64) (*domain.User, error) {
	var user domain.User
	err := r.db.Table("users").
		Select(userCols).
		Where("id = ?", id).
		Scan(&user).Error
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	if user.ID == 0 {
		return nil, fmt.Errorf("user not found")
	}
	return &user, nil
}

func (r *UserRepository) Create(user *domain.User) error {
	return r.db.Table("users").Create(user).Error
}

func (r *UserRepository) Update(id int64, name, email string) error {
	return r.db.Table("users").
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"name":       name,
			"email":      email,
			"updated_at": gorm.Expr("NOW()"),
		}).Error
}

func (r *UserRepository) UpdatePassword(id int64, hashed string) error {
	return r.db.Table("users").
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"password":   hashed,
			"updated_at": gorm.Expr("NOW()"),
		}).Error
}

func (r *UserRepository) UpdatePegawaiID(id, pegawaiID int64) error {
	return r.db.Table("users").
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"pegawai_id": pegawaiID,
			"updated_at": gorm.Expr("NOW()"),
		}).Error
}

func (r *UserRepository) Delete(id int64) error {
	return r.db.Exec("DELETE FROM users WHERE id = ?", id).Error
}

func (r *UserRepository) CreatePasswordReset(email, token string) error {
	return r.db.Exec(`INSERT INTO password_reset_tokens (email, token, created_at)
		VALUES (?, ?, NOW())
		ON CONFLICT (email) DO UPDATE SET token = EXCLUDED.token, created_at = NOW()`,
		email, token).Error
}

func (r *UserRepository) FindPasswordReset(email string) (string, error) {
	var row struct{ Token string }
	err := r.db.Table("password_reset_tokens").
		Select("token").
		Where("email = ?", email).
		Scan(&row).Error
	if err != nil {
		return "", fmt.Errorf("reset token not found: %w", err)
	}
	if row.Token == "" {
		return "", fmt.Errorf("reset token not found")
	}
	return row.Token, nil
}

func (r *UserRepository) DeletePasswordReset(email string) error {
	return r.db.Exec("DELETE FROM password_reset_tokens WHERE email = ?", email).Error
}

func (r *UserRepository) CreateEmailVerifyToken(email, token string) error {
	return r.db.Exec(`INSERT INTO email_verify_tokens (email, token, created_at)
		VALUES (?, ?, NOW())
		ON CONFLICT (email) DO UPDATE SET token = EXCLUDED.token, created_at = NOW()`,
		email, token).Error
}

func (r *UserRepository) FindEmailVerifyToken(token string) (string, error) {
	var row struct{ Email string }
	err := r.db.Table("email_verify_tokens").
		Select("email").
		Where("token = ?", token).
		Scan(&row).Error
	if err != nil {
		return "", fmt.Errorf("verify token not found: %w", err)
	}
	if row.Email == "" {
		return "", fmt.Errorf("verify token not found")
	}
	return row.Email, nil
}

func (r *UserRepository) MarkEmailVerified(email string) error {
	return r.db.Exec(`UPDATE users SET email_verified_at = NOW() WHERE email = ?`, email).Error
}

func (r *UserRepository) DeleteEmailVerifyToken(email string) error {
	return r.db.Exec("DELETE FROM email_verify_tokens WHERE email = ?", email).Error
}