package postgres

import (
	"simpeg-go/internal/domain"

	"gorm.io/gorm"
)

type riwayatGolonganRepo struct {
	db *gorm.DB
}

func NewRiwayatGolonganRepository(db *gorm.DB) domain.RiwayatGolonganRepository {
	return &riwayatGolonganRepo{db: db}
}

const riwayatGolonganCols = `id, pegawai_id, golongan_id, no_sk, tanggal_sk, tanggal_mulai,
	tanggal_selesai, is_aktif, keterangan, dokumen_sk, created_by, created_at, updated_at`

func (r *riwayatGolonganRepo) FindByPegawaiID(pegawaiID int64) ([]domain.RiwayatGolongan, error) {
	result := []domain.RiwayatGolongan{}
	err := r.db.Table("riwayat_golongans").
		Select(riwayatGolonganCols).
		Where("pegawai_id = ? AND deleted_at IS NULL", pegawaiID).
		Order("tanggal_mulai DESC").
		Scan(&result).Error
	return result, err
}

func (r *riwayatGolonganRepo) Create(rg *domain.RiwayatGolongan) error {
	return r.db.Table("riwayat_golongans").Create(rg).Error
}

func (r *riwayatGolonganRepo) Update(rg *domain.RiwayatGolongan) error {
	return r.db.Table("riwayat_golongans").
		Where("id = ? AND deleted_at IS NULL", rg.ID).
		Updates(map[string]interface{}{
			"golongan_id":    rg.GolonganID,
			"no_sk":          rg.NoSK,
			"tanggal_sk":     rg.TanggalSK,
			"tanggal_mulai":  rg.TanggalMulai,
			"tanggal_selesai": rg.TanggalSelesai,
			"is_aktif":       rg.IsAktif,
			"keterangan":     rg.Keterangan,
			"dokumen_sk":     rg.DokumenSK,
			"updated_at":     gorm.Expr("NOW()"),
		}).Error
}

func (r *riwayatGolonganRepo) Delete(id int64) error {
	return r.db.Table("riwayat_golongans").
		Where("id = ?", id).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}