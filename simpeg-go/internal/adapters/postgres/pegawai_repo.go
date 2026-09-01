package postgres

import (
	"fmt"
	"strings"
	"time"

	"simpeg-go/internal/domain"

	"gorm.io/gorm"
)

type pegawaiRepo struct {
	db *gorm.DB
}

func NewPegawaiRepository(db *gorm.DB) domain.PegawaiRepository {
	return &pegawaiRepo{db: db}
}

// pegawaiRow adalah representasi baris flat hasil JOIN untuk list pegawai.
type pegawaiRow struct {
	ID                        int64
	UserID                    *int64
	NIP                       *string
	NIDN                      *string
	NamaLengkap               string
	NamaPanggilan             *string
	JenisKelamin              string
	TempatLahir               *string
	TanggalLahir              *time.Time
	Agama                     *string
	StatusPernikahan          *string
	Kewarganegaraan           *string
	NIK                       *string
	NPWP                      *string
	NomorBPJSKesehatan        *string
	NomorBPJSKetenagakerjaan  *string
	EmailPribadi              *string
	EmailInstitusi            *string
	NomorHP                   *string
	NomorTelpDarurat          *string
	NamaKontakDarurat         *string
	HubunganKontakDarurat     *string
	AlamatKTP                 *string
	AlamatDomisili            *string
	StatusKepegawaianID       *int64
	UnitKerjaID               *int64
	JabatanID                 *int64
	GolonganID                *int64
	TanggalMasuk              *time.Time
	TanggalTMTPNS             *time.Time `gorm:"column:tanggal_tmt_pns"`
	TanggalPensiun            *time.Time
	StatusAktif               string
	Foto                      *string
	CreatedBy                 *int64
	UpdatedBy                 *int64
	CreatedAt                 time.Time
	UpdatedAt                 time.Time
	SkID                      *int64
	SkKode                    *string
	SkNama                    *string
	UkID                      *int64
	UkNama                    *string
	JID                       *int64 `gorm:"column:j_id"`
	JNama                     *string
	GID                       *int64 `gorm:"column:g_id"`
	GKode                     *string
	GNama                     *string
}

func (p pegawaiRow) pegawai() domain.Pegawai {
	out := domain.Pegawai{
		ID:                        p.ID,
		UserID:                    p.UserID,
		NIP:                       p.NIP,
		NIDN:                      p.NIDN,
		NamaLengkap:               p.NamaLengkap,
		NamaPanggilan:             p.NamaPanggilan,
		JenisKelamin:              p.JenisKelamin,
		TempatLahir:               p.TempatLahir,
		TanggalLahir:              p.TanggalLahir,
		Agama:                     p.Agama,
		StatusPernikahan:          p.StatusPernikahan,
		Kewarganegaraan:           p.Kewarganegaraan,
		NIK:                       p.NIK,
		NPWP:                      p.NPWP,
		NomorBPJSKesehatan:        p.NomorBPJSKesehatan,
		NomorBPJSKetenagakerjaan:  p.NomorBPJSKetenagakerjaan,
		EmailPribadi:              p.EmailPribadi,
		EmailInstitusi:            p.EmailInstitusi,
		NomorHP:                   p.NomorHP,
		NomorTelpDarurat:          p.NomorTelpDarurat,
		NamaKontakDarurat:         p.NamaKontakDarurat,
		HubunganKontakDarurat:     p.HubunganKontakDarurat,
		AlamatKTP:                 p.AlamatKTP,
		AlamatDomisili:            p.AlamatDomisili,
		StatusKepegawaianID:       p.StatusKepegawaianID,
		UnitKerjaID:               p.UnitKerjaID,
		JabatanID:                 p.JabatanID,
		GolonganID:                p.GolonganID,
		TanggalMasuk:              p.TanggalMasuk,
		TanggalTMTPNS:             p.TanggalTMTPNS,
		TanggalPensiun:            p.TanggalPensiun,
		StatusAktif:               p.StatusAktif,
		Foto:                      p.Foto,
		CreatedBy:                 p.CreatedBy,
		UpdatedBy:                 p.UpdatedBy,
		CreatedAt:                 p.CreatedAt,
		UpdatedAt:                 p.UpdatedAt,
	}
	if p.SkID != nil {
		out.StatusKepegawaian = &domain.StatusKepegawaian{ID: *p.SkID, Kode: derefStr(p.SkKode), Nama: derefStr(p.SkNama)}
	}
	if p.UkID != nil {
		out.UnitKerja = &domain.UnitKerja{ID: *p.UkID, Nama: derefStr(p.UkNama)}
	}
	if p.JID != nil {
		out.Jabatan = &domain.Jabatan{ID: *p.JID, Nama: derefStr(p.JNama)}
	}
	if p.GID != nil {
		out.Golongan = &domain.Golongan{ID: *p.GID, Kode: derefStr(p.GKode), Nama: derefStr(p.GNama)}
	}
	return out
}

const pegawaiListSelect = `p.id, p.user_id, p.nip, p.nidn, p.nama_lengkap, p.nama_panggilan,
			p.jenis_kelamin, p.tempat_lahir, p.tanggal_lahir, p.agama,
			p.status_pernikahan, p.kewarganegaraan, p.nik, p.npwp,
			p.nomor_bpjs_kesehatan, p.nomor_bpjs_ketenagakerjaan,
			p.email_pribadi, p.email_institusi, p.nomor_hp,
			p.nomor_telp_darurat, p.nama_kontak_darurat, p.hubungan_kontak_darurat,
			p.alamat_ktp, p.alamat_domisili,
			p.status_kepegawaian_id, p.unit_kerja_id, p.jabatan_id, p.golongan_id,
			p.tanggal_masuk, p.tanggal_tmt_pns, p.tanggal_pensiun,
			p.status_aktif, p.foto, p.created_by, p.updated_by,
			p.created_at, p.updated_at,
			sk.id AS sk_id, sk.kode AS sk_kode, sk.nama AS sk_nama,
			uk.id AS uk_id, uk.nama AS uk_nama,
			j.id AS j_id, j.nama AS j_nama,
			g.id AS g_id, g.kode AS g_kode, g.nama AS g_nama`

func (r *pegawaiRepo) FindAll(filter domain.PegawaiSearchFilter) ([]domain.Pegawai, int, error) {
	offset := (filter.Page - 1) * filter.Limit

	where := []string{"p.deleted_at IS NULL"}
	args := []interface{}{}

	if filter.Search != "" {
		args = append(args, "%"+filter.Search+"%", "%"+filter.Search+"%", "%"+filter.Search+"%")
		where = append(where, "(p.nama_lengkap ILIKE ? OR p.nip ILIKE ? OR p.nik ILIKE ?)")
	}
	if filter.Status != "" {
		args = append(args, filter.Status)
		where = append(where, "p.status_aktif = ?")
	}
	if filter.UnitID > 0 {
		args = append(args, filter.UnitID)
		where = append(where, "p.unit_kerja_id = ?")
	}
	if filter.JabID > 0 {
		args = append(args, filter.JabID)
		where = append(where, "p.jabatan_id = ?")
	}
	if filter.GolID > 0 {
		args = append(args, filter.GolID)
		where = append(where, "p.golongan_id = ?")
	}
	whereStr := strings.Join(where, " AND ")

	countArgs := make([]interface{}, len(args))
	copy(countArgs, args)

	var total int
	countQuery := `SELECT COUNT(*) FROM pegawais p WHERE ` + whereStr
	if err := r.db.Raw(countQuery, countArgs...).Scan(&total).Error; err != nil {
		return nil, 0, err
	}

	query := `SELECT ` + pegawaiListSelect + `
		FROM pegawais p
		LEFT JOIN status_kepegawaians sk ON sk.id = p.status_kepegawaian_id
		LEFT JOIN unit_kerjas uk ON uk.id = p.unit_kerja_id
		LEFT JOIN jabatans j ON j.id = p.jabatan_id
		LEFT JOIN golongans g ON g.id = p.golongan_id
		WHERE ` + whereStr + `
		ORDER BY p.nama_lengkap ASC LIMIT ? OFFSET ?`
	listArgs := make([]interface{}, len(args))
	copy(listArgs, args)
	listArgs = append(listArgs, filter.Limit, offset)

	var rows []pegawaiRow
	if err := r.db.Raw(query, listArgs...).Scan(&rows).Error; err != nil {
		return nil, 0, err
	}

	result := make([]domain.Pegawai, 0, len(rows))
	for _, row := range rows {
		item := row.pegawai()
		item.FotoURL = domain.FotoPathURL(item.Foto)
		result = append(result, item)
	}
	return result, total, nil
}

func (r *pegawaiRepo) FindByID(id int64) (*domain.Pegawai, error) {
	var p domain.Pegawai
	err := r.db.Table("pegawais").
		Select(`id, user_id, nip, nidn, nama_lengkap, nama_panggilan,
			jenis_kelamin, tempat_lahir, tanggal_lahir, agama,
			status_pernikahan, kewarganegaraan, nik, npwp,
			nomor_bpjs_kesehatan, nomor_bpjs_ketenagakerjaan,
			email_pribadi, email_institusi, nomor_hp,
			nomor_telp_darurat, nama_kontak_darurat, hubungan_kontak_darurat,
			alamat_ktp, alamat_domisili,
			status_kepegawaian_id, unit_kerja_id, jabatan_id, golongan_id,
			tanggal_masuk, tanggal_tmt_pns, tanggal_pensiun,
			status_aktif, foto, created_by, updated_by, created_at, updated_at`).
		Where("id = ? AND deleted_at IS NULL", id).
		Scan(&p).Error
	if err != nil {
		return nil, fmt.Errorf("pegawai not found: %w", err)
	}
	if p.ID == 0 {
		return nil, fmt.Errorf("pegawai not found")
	}
	p.FotoURL = domain.FotoPathURL(p.Foto)
	return &p, nil
}

func (r *pegawaiRepo) FindByUserID(userID int64) (*domain.Pegawai, error) {
	var p domain.Pegawai
	err := r.db.Table("pegawais").
		Select(`id, user_id, nip, nidn, nama_lengkap, nama_panggilan,
			jenis_kelamin, tempat_lahir, tanggal_lahir, agama,
			status_pernikahan, kewarganegaraan, nik, npwp,
			nomor_bpjs_kesehatan, nomor_bpjs_ketenagakerjaan,
			email_pribadi, email_institusi, nomor_hp,
			nomor_telp_darurat, nama_kontak_darurat, hubungan_kontak_darurat,
			alamat_ktp, alamat_domisili,
			status_kepegawaian_id, unit_kerja_id, jabatan_id, golongan_id,
			tanggal_masuk, tanggal_tmt_pns, tanggal_pensiun,
			status_aktif, foto, created_by, updated_by, created_at, updated_at`).
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Scan(&p).Error
	if err != nil {
		return nil, fmt.Errorf("pegawai not found: %w", err)
	}
	if p.ID == 0 {
		return nil, fmt.Errorf("pegawai not found")
	}
	p.FotoURL = domain.FotoPathURL(p.Foto)
	return &p, nil
}

func (r *pegawaiRepo) Create(p *domain.Pegawai) error {
	return r.db.Table("pegawais").Create(p).Error
}

func (r *pegawaiRepo) Update(p *domain.Pegawai) error {
	return r.db.Table("pegawais").
		Where("id = ? AND deleted_at IS NULL", p.ID).
		Updates(map[string]interface{}{
			"user_id":                    p.UserID,
			"nip":                        p.NIP,
			"nidn":                       p.NIDN,
			"nama_lengkap":               p.NamaLengkap,
			"nama_panggilan":             p.NamaPanggilan,
			"jenis_kelamin":              p.JenisKelamin,
			"tempat_lahir":               p.TempatLahir,
			"tanggal_lahir":              p.TanggalLahir,
			"agama":                      p.Agama,
			"status_pernikahan":          p.StatusPernikahan,
			"kewarganegaraan":            p.Kewarganegaraan,
			"nik":                        p.NIK,
			"npwp":                       p.NPWP,
			"nomor_bpjs_kesehatan":       p.NomorBPJSKesehatan,
			"nomor_bpjs_ketenagakerjaan": p.NomorBPJSKetenagakerjaan,
			"email_pribadi":              p.EmailPribadi,
			"email_institusi":            p.EmailInstitusi,
			"nomor_hp":                   p.NomorHP,
			"nomor_telp_darurat":         p.NomorTelpDarurat,
			"nama_kontak_darurat":        p.NamaKontakDarurat,
			"hubungan_kontak_darurat":    p.HubunganKontakDarurat,
			"alamat_ktp":                 p.AlamatKTP,
			"alamat_domisili":            p.AlamatDomisili,
			"status_kepegawaian_id":      p.StatusKepegawaianID,
			"unit_kerja_id":              p.UnitKerjaID,
			"jabatan_id":                 p.JabatanID,
			"golongan_id":                p.GolonganID,
			"tanggal_masuk":              p.TanggalMasuk,
			"tanggal_tmt_pns":            p.TanggalTMTPNS,
			"tanggal_pensiun":            p.TanggalPensiun,
			"status_aktif":               p.StatusAktif,
			"foto":                       p.Foto,
			"updated_by":                 p.UpdatedBy,
			"updated_at":                 gorm.Expr("NOW()"),
		}).Error
}

func (r *pegawaiRepo) Delete(id int64) error {
	return r.db.Table("pegawais").
		Where("id = ?", id).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}

func (r *pegawaiRepo) Count() (int, error) {
	var count int64
	err := r.db.Table("pegawais").Where("deleted_at IS NULL").Count(&count).Error
	return int(count), err
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}