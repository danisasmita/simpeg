package postgres

import (
	"fmt"

	"simpeg-go/internal/domain"

	"gorm.io/gorm"
)

type statusKepegawaianRepo struct {
	db *gorm.DB
}

func NewStatusKepegawaianRepository(db *gorm.DB) domain.StatusKepegawaianRepository {
	return &statusKepegawaianRepo{db: db}
}

func (r *statusKepegawaianRepo) FindAll() ([]domain.StatusKepegawaian, error) {
	result := []domain.StatusKepegawaian{}
	err := r.db.Table("status_kepegawaians").
		Select("id, kode, nama, is_aktif, created_at, updated_at").
		Order("kode ASC").
		Scan(&result).Error
	return result, err
}

func (r *statusKepegawaianRepo) FindByID(id int64) (*domain.StatusKepegawaian, error) {
	var s domain.StatusKepegawaian
	err := r.db.Table("status_kepegawaians").
		Select("id, kode, nama, is_aktif, created_at, updated_at").
		Where("id = ?", id).
		Scan(&s).Error
	if err != nil {
		return nil, fmt.Errorf("status kepegawaian not found: %w", err)
	}
	if s.ID == 0 {
		return nil, fmt.Errorf("status kepegawaian not found")
	}
	return &s, nil
}

func (r *statusKepegawaianRepo) Create(s *domain.StatusKepegawaian) error {
	return r.db.Table("status_kepegawaians").Create(s).Error
}

func (r *statusKepegawaianRepo) Update(s *domain.StatusKepegawaian) error {
	return r.db.Table("status_kepegawaians").
		Where("id = ?", s.ID).
		Updates(map[string]interface{}{
			"kode":       s.Kode,
			"nama":       s.Nama,
			"is_aktif":   s.IsAktif,
			"updated_at": gorm.Expr("NOW()"),
		}).Error
}

func (r *statusKepegawaianRepo) Delete(id int64) error {
	return r.db.Exec("DELETE FROM status_kepegawaians WHERE id = ?", id).Error
}