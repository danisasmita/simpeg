package postgres

import (
	"fmt"

	"simpeg-go/internal/domain"

	"gorm.io/gorm"
)

type unitKerjaRepo struct {
	db *gorm.DB
}

func NewUnitKerjaRepository(db *gorm.DB) domain.UnitKerjaRepository {
	return &unitKerjaRepo{db: db}
}

func (r *unitKerjaRepo) FindAll() ([]domain.UnitKerja, error) {
	result := []domain.UnitKerja{}
	err := r.db.Table("unit_kerjas").
		Select("id, parent_id, kode, nama, singkatan, tipe, is_aktif, created_at, updated_at").
		Where("deleted_at IS NULL").
		Order("kode ASC").
		Scan(&result).Error
	return result, err
}

func (r *unitKerjaRepo) FindTree() ([]domain.UnitKerja, error) {
	all, err := r.FindAll()
	if err != nil {
		return nil, err
	}

	// Build tree: root = parent_id IS NULL
	return buildTree(all, nil), nil
}

func buildTree(all []domain.UnitKerja, parentID *int64) []domain.UnitKerja {
	var tree []domain.UnitKerja
	for _, u := range all {
		if (parentID == nil && u.ParentID == nil) || (parentID != nil && u.ParentID != nil && *u.ParentID == *parentID) {
			u.Children = buildTree(all, &u.ID)
			tree = append(tree, u)
		}
	}
	return tree
}

func (r *unitKerjaRepo) FindByID(id int64) (*domain.UnitKerja, error) {
	var u domain.UnitKerja
	err := r.db.Table("unit_kerjas").
		Select("id, parent_id, kode, nama, singkatan, tipe, is_aktif, created_at, updated_at").
		Where("id = ? AND deleted_at IS NULL", id).
		Scan(&u).Error
	if err != nil {
		return nil, fmt.Errorf("unit kerja not found: %w", err)
	}
	if u.ID == 0 {
		return nil, fmt.Errorf("unit kerja not found")
	}
	return &u, nil
}

func (r *unitKerjaRepo) Create(u *domain.UnitKerja) error {
	return r.db.Table("unit_kerjas").Create(u).Error
}

func (r *unitKerjaRepo) Update(u *domain.UnitKerja) error {
	return r.db.Table("unit_kerjas").
		Where("id = ? AND deleted_at IS NULL", u.ID).
		Updates(map[string]interface{}{
			"parent_id":  u.ParentID,
			"kode":       u.Kode,
			"nama":       u.Nama,
			"singkatan":  u.Singkatan,
			"tipe":       u.Tipe,
			"is_aktif":   u.IsAktif,
			"updated_at": gorm.Expr("NOW()"),
		}).Error
}

func (r *unitKerjaRepo) Delete(id int64) error {
	return r.db.Table("unit_kerjas").
		Where("id = ?", id).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}