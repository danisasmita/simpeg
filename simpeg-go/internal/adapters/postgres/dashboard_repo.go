package postgres

import (
	"simpeg-go/internal/domain"

	"gorm.io/gorm"
)

type dashboardRepo struct {
	db *gorm.DB
}

func NewDashboardRepository(db *gorm.DB) domain.DashboardRepository {
	return &dashboardRepo{db: db}
}

func (r *dashboardRepo) Stats() (*domain.DashboardStats, error) {
	var stats domain.DashboardStats
	err := r.db.Raw(`SELECT
			(SELECT COUNT(*) FROM pegawais WHERE deleted_at IS NULL) AS total_pegawai,
			(SELECT COUNT(*) FROM pegawais WHERE deleted_at IS NULL AND status_aktif = 'aktif') AS pegawai_aktif,
			(SELECT COUNT(*) FROM unit_kerjas WHERE deleted_at IS NULL AND is_aktif = TRUE) AS total_unit_kerja,
			(SELECT COUNT(*) FROM jabatans WHERE deleted_at IS NULL AND is_aktif = TRUE) AS total_jabatan,
			(SELECT COUNT(*) FROM cutis WHERE status = 'menunggu') AS cuti_menunggu,
			(SELECT COUNT(*) FROM absensis WHERE tanggal = CURRENT_DATE) AS absensi_hari_ini`,
	).Scan(&stats).Error
	return &stats, err
}