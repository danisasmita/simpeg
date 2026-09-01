package postgres

import (
	"errors"

	"simpeg-go/internal/domain"

	"gorm.io/gorm"
)

type dokumenPegawaiRepo struct {
	db *gorm.DB
}

func NewDokumenPegawaiRepository(db *gorm.DB) domain.DokumenPegawaiRepository {
	return &dokumenPegawaiRepo{db: db}
}

const dokumenCols = `id, pegawai_id, nama_dokumen, kategori, nomor_dokumen, tanggal_dokumen,
	tanggal_expired, file_path, file_name, file_type, file_size, keterangan,
	uploaded_by, created_at, updated_at`

func (r *dokumenPegawaiRepo) FindByPegawaiID(pegawaiID int64) ([]domain.DokumenPegawai, error) {
	result := []domain.DokumenPegawai{}
	err := r.db.Table("dokumen_pegawais").
		Select(dokumenCols).
		Where("pegawai_id = ? AND deleted_at IS NULL", pegawaiID).
		Order("created_at DESC").
		Scan(&result).Error
	return result, err
}

func (r *dokumenPegawaiRepo) FindByID(id int64) (*domain.DokumenPegawai, error) {
	var d domain.DokumenPegawai
	err := r.db.Table("dokumen_pegawais").
		Select(dokumenCols).
		Where("id = ? AND deleted_at IS NULL", id).
		Scan(&d).Error
	if err != nil {
		return nil, err
	}
	if d.ID == 0 {
		return nil, errors.New("dokumen pegawai not found")
	}
	return &d, nil
}

func (r *dokumenPegawaiRepo) Create(d *domain.DokumenPegawai) error {
	return r.db.Table("dokumen_pegawais").Create(d).Error
}

func (r *dokumenPegawaiRepo) Update(d *domain.DokumenPegawai) error {
	return r.db.Table("dokumen_pegawais").
		Where("id = ? AND deleted_at IS NULL", d.ID).
		Updates(map[string]interface{}{
			"nama_dokumen":    d.NamaDokumen,
			"kategori":        d.Kategori,
			"nomor_dokumen":   d.NomorDokumen,
			"tanggal_dokumen": d.TanggalDokumen,
			"tanggal_expired": d.TanggalExpired,
			"file_path":       d.FilePath,
			"file_name":       d.FileName,
			"file_type":       d.FileType,
			"file_size":       d.FileSize,
			"keterangan":      d.Keterangan,
			"updated_at":      gorm.Expr("NOW()"),
		}).Error
}

func (r *dokumenPegawaiRepo) Delete(id int64) error {
	return r.db.Table("dokumen_pegawais").
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(map[string]interface{}{
			"deleted_at": gorm.Expr("NOW()"),
			"updated_at": gorm.Expr("NOW()"),
		}).Error
}