package postgres

import (
	"errors"
	"fmt"
	"time"

	"simpeg-go/internal/domain"

	"gorm.io/gorm"
)

type absensiRepo struct {
	db *gorm.DB
}

func NewAbsensiRepository(db *gorm.DB) domain.AbsensiRepository {
	return &absensiRepo{db: db}
}

const absensiCols = `id, pegawai_id, tanggal, check_in_at, check_in_photo, check_in_location,
	check_out_at, check_out_photo, check_out_location, status, keterangan, created_at, updated_at`

func (r *absensiRepo) FindAll(tanggal time.Time, pegawaiID int64) ([]domain.Absensi, error) {
	query := r.db.Table("absensis a").
		Select("a.id, a.pegawai_id, a.tanggal, a.check_in_at, a.check_in_photo, a.check_in_location, a.check_out_at, a.check_out_photo, a.check_out_location, a.status, a.keterangan, a.created_at, a.updated_at").
		Joins("JOIN pegawais p ON p.id = a.pegawai_id AND p.deleted_at IS NULL")

	if !tanggal.IsZero() {
		query = query.Where("a.tanggal = ?", tanggal)
	} else {
		query = query.Where("a.tanggal = ?", time.Now().Format("2006-01-02"))
	}
	if pegawaiID > 0 {
		query = query.Where("a.pegawai_id = ?", pegawaiID)
	}

	result := []domain.Absensi{}
	err := query.Order("a.tanggal DESC").Scan(&result).Error
	return result, err
}

func (r *absensiRepo) Summary(from, to time.Time, pegawaiID int64) (map[string]int, error) {
	query := r.db.Table("absensis").
		Select("status, COUNT(*) AS count").
		Where("tanggal BETWEEN ? AND ?", from, to)
	if pegawaiID > 0 {
		query = query.Where("pegawai_id = ?", pegawaiID)
	}

	var rows []struct {
		Status string
		Count  int
	}
	if err := query.Group("status").Scan(&rows).Error; err != nil {
		return nil, err
	}

	summary := map[string]int{}
	for _, row := range rows {
		summary[row.Status] = row.Count
	}
	return summary, nil
}

func (r *absensiRepo) FindByPegawaiAndDate(pegawaiID int64, tanggal time.Time) (*domain.Absensi, error) {
	var a domain.Absensi
	err := r.db.Table("absensis").
		Select(absensiCols).
		Where("pegawai_id = ? AND tanggal = ?", pegawaiID, tanggal).
		Scan(&a).Error
	if err != nil {
		return nil, err
	}
	if a.ID == 0 {
		return nil, errors.New("absensi not found")
	}
	return &a, nil
}

func (r *absensiRepo) FindByRange(pegawaiID int64, from, to time.Time) ([]domain.Absensi, error) {
	result := []domain.Absensi{}
	err := r.db.Table("absensis").
		Select(absensiCols).
		Where("pegawai_id = ? AND tanggal BETWEEN ? AND ?", pegawaiID, from, to).
		Order("tanggal DESC").
		Scan(&result).Error
	return result, err
}

func (r *absensiRepo) CheckIn(a *domain.Absensi) error {
	query := `INSERT INTO absensis (pegawai_id, tanggal, check_in_at, check_in_photo, check_in_location, status, created_at, updated_at)
		VALUES (?, ?, NOW(), ?, ?, ?, NOW(), NOW())
		ON CONFLICT (pegawai_id, tanggal) DO UPDATE
		SET check_in_at = NOW(), check_in_photo = EXCLUDED.check_in_photo, check_in_location = EXCLUDED.check_in_location,
			status = EXCLUDED.status, updated_at = NOW()
		RETURNING id, created_at, updated_at`

	var out struct {
		ID        int64
		CreatedAt time.Time
		UpdatedAt time.Time
	}
	if err := r.db.Raw(query, a.PegawaiID, a.Tanggal, a.CheckInPhoto, a.CheckInLocation, a.Status).Scan(&out).Error; err != nil {
		return err
	}
	a.ID = out.ID
	a.CreatedAt = out.CreatedAt
	a.UpdatedAt = out.UpdatedAt
	return nil
}

func (r *absensiRepo) CheckOutByPegawaiID(pegawaiID int64, photo, location string) error {
	res := r.db.Exec(`UPDATE absensis SET check_out_at = NOW(), check_out_photo = ?, check_out_location = ?, updated_at = NOW()
		WHERE pegawai_id = ? AND tanggal = CURRENT_DATE`,
		photo, location, pegawaiID)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return fmt.Errorf("anda belum absen masuk hari ini")
	}
	return nil
}

func (r *absensiRepo) CountByRange(from, to time.Time) (int, error) {
	var count int64
	err := r.db.Table("absensis").Where("tanggal BETWEEN ? AND ?", from, to).Count(&count).Error
	return int(count), err
}