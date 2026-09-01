package postgres

import (
	"simpeg-go/internal/domain"

	"gorm.io/gorm"
)

type laporanRepo struct {
	db *gorm.DB
}

func NewLaporanRepository(db *gorm.DB) domain.LaporanRepository {
	return &laporanRepo{db: db}
}

type laporanPegawaiRowScan struct {
	ID                int64
	NIP               *string
	NIDN              *string
	NamaLengkap       string
	JenisKelamin      string
	EmailInstitusi    *string
	NomorHP           *string
	StatusAktif       string
	StatusKepegawaian string
	UnitKerja         string
	Jabatan           string
	Golongan          string
}

func (r laporanPegawaiRowScan) row() domain.LaporanPegawaiRow {
	out := domain.LaporanPegawaiRow{
		ID:           r.ID,
		NIP:          r.NIP,
		NIDN:         r.NIDN,
		NamaLengkap:  r.NamaLengkap,
		JenisKelamin: r.JenisKelamin,
		EmailInstitusi: r.EmailInstitusi,
		NomorHP:      r.NomorHP,
		StatusAktif:  r.StatusAktif,
	}
	if r.StatusKepegawaian != "" {
		out.StatusKepegawaian = &r.StatusKepegawaian
	}
	if r.UnitKerja != "" {
		out.UnitKerja = &r.UnitKerja
	}
	if r.Jabatan != "" {
		out.Jabatan = &r.Jabatan
	}
	if r.Golongan != "" {
		out.Golongan = &r.Golongan
	}
	return out
}

const laporanPegawaiSelect = `
	SELECT p.id, p.nip, p.nidn, p.nama_lengkap, p.jenis_kelamin,
	       p.email_institusi, p.nomor_hp, p.status_aktif,
	       COALESCE(sk.nama, '') AS status_kepegawaian,
	       COALESCE(uk.nama, '') AS unit_kerja,
	       COALESCE(j.nama, '') AS jabatan,
	       COALESCE(g.kode || ' - ' || g.nama, '') AS golongan
	FROM pegawais p
	LEFT JOIN status_kepegawaians sk ON sk.id = p.status_kepegawaian_id
	LEFT JOIN unit_kerjas uk ON uk.id = p.unit_kerja_id
	LEFT JOIN jabatans j ON j.id = p.jabatan_id
	LEFT JOIN golongans g ON g.id = p.golongan_id
	WHERE p.deleted_at IS NULL
	  AND (? = '' OR p.status_aktif = ?)
	  AND (? = 0 OR p.unit_kerja_id = ?)
	ORDER BY uk.nama ASC, p.nama_lengkap ASC`

func (r *laporanRepo) Pegawai(statusAktif string, unitKerjaID int64) ([]domain.LaporanPegawaiRow, error) {
	var rows []laporanPegawaiRowScan
	if err := r.db.Raw(laporanPegawaiSelect, statusAktif, statusAktif, unitKerjaID, unitKerjaID).Scan(&rows).Error; err != nil {
		return nil, err
	}

	result := make([]domain.LaporanPegawaiRow, 0, len(rows))
	for _, row := range rows {
		result = append(result, row.row())
	}
	return result, nil
}

func (r *laporanRepo) Summary(statusAktif string, unitKerjaID int64) (*domain.LaporanPegawaiSummary, error) {
	summary := &domain.LaporanPegawaiSummary{
		ByStatusAktif:       map[string]int{},
		ByUnitKerja:         map[string]int{},
		ByStatusKepegawaian: map[string]int{},
	}

	base := ` FROM pegawais p WHERE p.deleted_at IS NULL AND (? = '' OR p.status_aktif = ?) AND (? = 0 OR p.unit_kerja_id = ?)`
	args := []interface{}{statusAktif, statusAktif, unitKerjaID, unitKerjaID}

	var totalRow struct{ Count int }
	if err := r.db.Raw("SELECT COUNT(*) AS count"+base, args...).Scan(&totalRow).Error; err != nil {
		return nil, err
	}
	summary.Total = totalRow.Count

	var byStatus []struct {
		StatusAktif string
		Count       int
	}
	if err := r.db.Raw(`SELECT p.status_aktif, COUNT(*) AS count`+base+` GROUP BY p.status_aktif`, args...).Scan(&byStatus).Error; err != nil {
		return nil, err
	}
	for _, row := range byStatus {
		summary.ByStatusAktif[row.StatusAktif] = row.Count
	}

	var byUnit []struct {
		Nama  string
		Count int
	}
	if err := r.db.Raw(`SELECT COALESCE(uk.nama, 'Belum ada unit kerja') AS nama, COUNT(*) AS count
		 FROM pegawais p LEFT JOIN unit_kerjas uk ON uk.id = p.unit_kerja_id
		 WHERE p.deleted_at IS NULL AND (? = '' OR p.status_aktif = ?) AND (? = 0 OR p.unit_kerja_id = ?)
		 GROUP BY uk.nama ORDER BY uk.nama ASC`, args...).Scan(&byUnit).Error; err != nil {
		return nil, err
	}
	for _, row := range byUnit {
		summary.ByUnitKerja[row.Nama] = row.Count
	}

	var byStatusKepegawaian []struct {
		Nama  string
		Count int
	}
	if err := r.db.Raw(`SELECT COALESCE(sk.nama, 'Belum ada status kepegawaian') AS nama, COUNT(*) AS count
		 FROM pegawais p LEFT JOIN status_kepegawaians sk ON sk.id = p.status_kepegawaian_id
		 WHERE p.deleted_at IS NULL AND (? = '' OR p.status_aktif = ?) AND (? = 0 OR p.unit_kerja_id = ?)
		 GROUP BY sk.nama ORDER BY sk.nama ASC`, args...).Scan(&byStatusKepegawaian).Error; err != nil {
		return nil, err
	}
	for _, row := range byStatusKepegawaian {
		summary.ByStatusKepegawaian[row.Nama] = row.Count
	}

	return summary, nil
}