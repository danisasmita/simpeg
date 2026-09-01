package postgres

import (
	"simpeg-go/internal/domain"

	"gorm.io/gorm"
)

type riwayatPendidikanRepo struct {
	db *gorm.DB
}

func NewRiwayatPendidikanRepository(db *gorm.DB) domain.RiwayatPendidikanRepository {
	return &riwayatPendidikanRepo{db: db}
}

const riwayatPendidikanCols = `id, pegawai_id, jenjang, nama_institusi, jurusan_prodi, fakultas,
	tahun_masuk, tahun_lulus, ipk, nomor_ijazah, tanggal_ijazah, dokumen_ijazah,
	is_pendidikan_terakhir, created_by, created_at, updated_at`

func (r *riwayatPendidikanRepo) FindByPegawaiID(pegawaiID int64) ([]domain.RiwayatPendidikan, error) {
	result := []domain.RiwayatPendidikan{}
	err := r.db.Table("riwayat_pendidikans").
		Select(riwayatPendidikanCols).
		Where("pegawai_id = ? AND deleted_at IS NULL", pegawaiID).
		Order("tahun_lulus DESC").
		Scan(&result).Error
	return result, err
}

func (r *riwayatPendidikanRepo) Create(rp *domain.RiwayatPendidikan) error {
	return r.db.Table("riwayat_pendidikans").Create(rp).Error
}

func (r *riwayatPendidikanRepo) Update(rp *domain.RiwayatPendidikan) error {
	return r.db.Table("riwayat_pendidikans").
		Where("id = ? AND deleted_at IS NULL", rp.ID).
		Updates(map[string]interface{}{
			"jenjang":                rp.Jenjang,
			"nama_institusi":         rp.NamaInstitusi,
			"jurusan_prodi":          rp.JurusanProdi,
			"fakultas":               rp.Fakultas,
			"tahun_masuk":            rp.TahunMasuk,
			"tahun_lulus":            rp.TahunLulus,
			"ipk":                    rp.IPK,
			"nomor_ijazah":           rp.NomorIjazah,
			"tanggal_ijazah":         rp.TanggalIjazah,
			"dokumen_ijazah":         rp.DokumenIjazah,
			"is_pendidikan_terakhir": rp.IsPendidikanTerakhir,
			"updated_at":             gorm.Expr("NOW()"),
		}).Error
}

func (r *riwayatPendidikanRepo) Delete(id int64) error {
	return r.db.Table("riwayat_pendidikans").
		Where("id = ?", id).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}