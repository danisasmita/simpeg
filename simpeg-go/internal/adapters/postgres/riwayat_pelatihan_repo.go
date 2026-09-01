package postgres

import (
	"simpeg-go/internal/domain"

	"gorm.io/gorm"
)

type riwayatPelatihanRepo struct {
	db *gorm.DB
}

func NewRiwayatPelatihanRepository(db *gorm.DB) domain.RiwayatPelatihanRepository {
	return &riwayatPelatihanRepo{db: db}
}

const riwayatPelatihanCols = `id, pegawai_id, nama_pelatihan, penyelenggara, jenis, jumlah_jam,
	tanggal_mulai, tanggal_selesai, nomor_sertifikat, dokumen_sertifikat, created_by, created_at, updated_at`

func (r *riwayatPelatihanRepo) FindByPegawaiID(pegawaiID int64) ([]domain.RiwayatPelatihan, error) {
	result := []domain.RiwayatPelatihan{}
	err := r.db.Table("riwayat_pelatihans").
		Select(riwayatPelatihanCols).
		Where("pegawai_id = ? AND deleted_at IS NULL", pegawaiID).
		Order("tanggal_mulai DESC").
		Scan(&result).Error
	return result, err
}

func (r *riwayatPelatihanRepo) Create(rp *domain.RiwayatPelatihan) error {
	return r.db.Table("riwayat_pelatihans").Create(rp).Error
}

func (r *riwayatPelatihanRepo) Update(rp *domain.RiwayatPelatihan) error {
	return r.db.Table("riwayat_pelatihans").
		Where("id = ? AND deleted_at IS NULL", rp.ID).
		Updates(map[string]interface{}{
			"nama_pelatihan":     rp.NamaPelatihan,
			"penyelenggara":      rp.Penyelenggara,
			"jenis":              rp.Jenis,
			"jumlah_jam":         rp.JumlahJam,
			"tanggal_mulai":      rp.TanggalMulai,
			"tanggal_selesai":    rp.TanggalSelesai,
			"nomor_sertifikat":   rp.NomorSertifikat,
			"dokumen_sertifikat": rp.DokumenSertifikat,
			"updated_at":         gorm.Expr("NOW()"),
		}).Error
}

func (r *riwayatPelatihanRepo) Delete(id int64) error {
	return r.db.Table("riwayat_pelatihans").
		Where("id = ?", id).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}