package postgres

import (
	"fmt"

	"simpeg-go/internal/domain"

	"gorm.io/gorm"
)

type golonganRepo struct {
	db *gorm.DB
}

func NewGolonganRepository(db *gorm.DB) domain.GolonganRepository {
	return &golonganRepo{db: db}
}

func (r *golonganRepo) FindAll() ([]domain.Golongan, error) {
	result := []domain.Golongan{}
	err := r.db.Table("golongans").
		Select("id, kode, nama, urutan, created_at, updated_at").
		Where("deleted_at IS NULL").
		Order("urutan ASC").
		Scan(&result).Error
	return result, err
}

func (r *golonganRepo) FindByID(id int64) (*domain.Golongan, error) {
	var g domain.Golongan
	err := r.db.Table("golongans").
		Select("id, kode, nama, urutan, created_at, updated_at").
		Where("id = ? AND deleted_at IS NULL", id).
		Scan(&g).Error
	if err != nil {
		return nil, fmt.Errorf("golongan not found: %w", err)
	}
	if g.ID == 0 {
		return nil, fmt.Errorf("golongan not found")
	}
	return &g, nil
}

func (r *golonganRepo) Create(g *domain.Golongan) error {
	return r.db.Table("golongans").Create(g).Error
}

func (r *golonganRepo) Update(g *domain.Golongan) error {
	return r.db.Table("golongans").
		Where("id = ? AND deleted_at IS NULL", g.ID).
		Updates(map[string]interface{}{
			"kode":       g.Kode,
			"nama":       g.Nama,
			"urutan":     g.Urutan,
			"updated_at": gorm.Expr("NOW()"),
		}).Error
}

func (r *golonganRepo) Delete(id int64) error {
	return r.db.Table("golongans").
		Where("id = ?", id).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}