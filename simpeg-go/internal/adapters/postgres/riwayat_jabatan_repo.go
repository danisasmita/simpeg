package postgres

import (
	"simpeg-go/internal/domain"

	"gorm.io/gorm"
)

type riwayatJabatanRepo struct {
	db *gorm.DB
}

func NewRiwayatJabatanRepository(db *gorm.DB) domain.RiwayatJabatanRepository {
	return &riwayatJabatanRepo{db: db}
}

const riwayatJabatanCols = `id, pegawai_id, jabatan_id, unit_kerja_id, golongan_id, no_sk,
	tanggal_sk, tanggal_mulai, tanggal_selesai, is_aktif, keterangan, dokumen_sk,
	created_by, created_at, updated_at`

func (r *riwayatJabatanRepo) FindByPegawaiID(pegawaiID int64) ([]domain.RiwayatJabatan, error) {
	result := []domain.RiwayatJabatan{}
	err := r.db.Table("riwayat_jabatans").
		Select(riwayatJabatanCols).
		Where("pegawai_id = ? AND deleted_at IS NULL", pegawaiID).
		Order("tanggal_mulai DESC").
		Scan(&result).Error
	return result, err
}

func (r *riwayatJabatanRepo) Create(rj *domain.RiwayatJabatan) error {
	return r.db.Table("riwayat_jabatans").Create(rj).Error
}

func (r *riwayatJabatanRepo) Update(rj *domain.RiwayatJabatan) error {
	return r.db.Table("riwayat_jabatans").
		Where("id = ? AND deleted_at IS NULL", rj.ID).
		Updates(map[string]interface{}{
			"jabatan_id":     rj.JabatanID,
			"unit_kerja_id":  rj.UnitKerjaID,
			"golongan_id":    rj.GolonganID,
			"no_sk":          rj.NoSK,
			"tanggal_sk":     rj.TanggalSK,
			"tanggal_mulai":  rj.TanggalMulai,
			"tanggal_selesai": rj.TanggalSelesai,
			"is_aktif":       rj.IsAktif,
			"keterangan":     rj.Keterangan,
			"dokumen_sk":     rj.DokumenSK,
			"updated_at":     gorm.Expr("NOW()"),
		}).Error
}

func (r *riwayatJabatanRepo) Delete(id int64) error {
	return r.db.Table("riwayat_jabatans").
		Where("id = ?", id).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}