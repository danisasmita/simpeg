package postgres

import (
	"fmt"

	"simpeg-go/internal/domain"

	"gorm.io/gorm"
)

type jabatanRepo struct {
	db *gorm.DB
}

func NewJabatanRepository(db *gorm.DB) domain.JabatanRepository {
	return &jabatanRepo{db: db}
}

func (r *jabatanRepo) FindAll() ([]domain.Jabatan, error) {
	result := []domain.Jabatan{}
	err := r.db.Table("jabatans").
		Select("id, unit_kerja_id, nama, jenis, kode, is_aktif, created_at, updated_at").
		Where("deleted_at IS NULL").
		Order("nama ASC").
		Scan(&result).Error
	return result, err
}

func (r *jabatanRepo) FindByID(id int64) (*domain.Jabatan, error) {
	var j domain.Jabatan
	err := r.db.Table("jabatans").
		Select("id, unit_kerja_id, nama, jenis, kode, is_aktif, created_at, updated_at").
		Where("id = ? AND deleted_at IS NULL", id).
		Scan(&j).Error
	if err != nil {
		return nil, fmt.Errorf("jabatan not found: %w", err)
	}
	if j.ID == 0 {
		return nil, fmt.Errorf("jabatan not found")
	}
	return &j, nil
}

func (r *jabatanRepo) Create(j *domain.Jabatan) error {
	return r.db.Table("jabatans").Create(j).Error
}

func (r *jabatanRepo) Update(j *domain.Jabatan) error {
	return r.db.Table("jabatans").
		Where("id = ? AND deleted_at IS NULL", j.ID).
		Updates(map[string]interface{}{
			"unit_kerja_id": j.UnitKerjaID,
			"nama":          j.Nama,
			"jenis":         j.Jenis,
			"kode":          j.Kode,
			"is_aktif":      j.IsAktif,
			"updated_at":    gorm.Expr("NOW()"),
		}).Error
}

func (r *jabatanRepo) Delete(id int64) error {
	return r.db.Table("jabatans").
		Where("id = ?", id).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}