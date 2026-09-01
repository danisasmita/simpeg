package postgres

import (
	"errors"
	"time"

	"simpeg-go/internal/domain"

	"gorm.io/gorm"
)

type cutiRepo struct {
	db *gorm.DB
}

func NewCutiRepository(db *gorm.DB) domain.CutiRepository {
	return &cutiRepo{db: db}
}

const cutiBaseCols = `c.id, c.pegawai_id, c.jenis, c.tanggal_mulai, c.tanggal_selesai, c.jumlah_hari,
	c.alasan, c.status, c.disetujui_oleh, c.disetujui_pada, c.catatan_persetujuan, c.created_at, c.updated_at`

const pegawaiLiteCols = `p.id AS p_id, p.user_id AS p_user_id, p.nip AS p_nip, p.nidn AS p_nidn, p.nama_lengkap AS p_nama_lengkap`

type cutiWithPegawai struct {
	ID                 int64
	PegawaiID          int64
	Jenis              string
	TanggalMulai       time.Time
	TanggalSelesai     time.Time
	JumlahHari         int
	Alasan             string
	Status             string
	DisetujuiOleh      *int64
	DisetujuiPada      *time.Time
	CatatanPersetujuan *string
	CreatedAt          time.Time
	UpdatedAt          time.Time
	PId                int64
	PUserID            *int64
	PNIP               *string
	PNIDN              *string
	PNamaLengkap       string
}

func (c cutiWithPegawai) cuti() domain.Cuti {
	return domain.Cuti{
		ID:                 c.ID,
		PegawaiID:          c.PegawaiID,
		Jenis:              c.Jenis,
		TanggalMulai:       c.TanggalMulai,
		TanggalSelesai:     c.TanggalSelesai,
		JumlahHari:         c.JumlahHari,
		Alasan:             c.Alasan,
		Status:             c.Status,
		DisetujuiOleh:      c.DisetujuiOleh,
		DisetujuiPada:      c.DisetujuiPada,
		CatatanPersetujuan: c.CatatanPersetujuan,
		CreatedAt:          c.CreatedAt,
		UpdatedAt:          c.UpdatedAt,
		Pegawai: &domain.Pegawai{
			ID:          c.PId,
			UserID:      c.PUserID,
			NIP:         c.PNIP,
			NIDN:        c.PNIDN,
			NamaLengkap: c.PNamaLengkap,
		},
	}
}

func (r *cutiRepo) FindAll(page, limit int, status string) ([]domain.Cuti, int, error) {
	offset := (page - 1) * limit

	var total int
	countQuery := `SELECT COUNT(*) FROM cutis c WHERE (? = '' OR c.status = ?)`
	if err := r.db.Raw(countQuery, status, status).Scan(&total).Error; err != nil {
		return nil, 0, err
	}

	query := `SELECT ` + cutiBaseCols + `, ` + pegawaiLiteCols + `
		 FROM cutis c
		 JOIN pegawais p ON p.id = c.pegawai_id AND p.deleted_at IS NULL
		 WHERE (? = '' OR c.status = ?)
		 ORDER BY c.created_at DESC
		 LIMIT ? OFFSET ?`

	var rows []cutiWithPegawai
	if err := r.db.Raw(query, status, status, limit, offset).Scan(&rows).Error; err != nil {
		return nil, 0, err
	}

	result := make([]domain.Cuti, 0, len(rows))
	for _, row := range rows {
		result = append(result, row.cuti())
	}
	return result, total, nil
}

func (r *cutiRepo) FindByPegawaiID(pegawaiID int64) ([]domain.Cuti, error) {
	query := `SELECT ` + cutiBaseCols + `, ` + pegawaiLiteCols + `
		 FROM cutis c
		 JOIN pegawais p ON p.id = c.pegawai_id AND p.deleted_at IS NULL
		 WHERE c.pegawai_id = ? ORDER BY c.created_at DESC`

	var rows []cutiWithPegawai
	if err := r.db.Raw(query, pegawaiID).Scan(&rows).Error; err != nil {
		return nil, err
	}

	result := make([]domain.Cuti, 0, len(rows))
	for _, row := range rows {
		result = append(result, row.cuti())
	}
	return result, nil
}

func (r *cutiRepo) FindByID(id int64) (*domain.Cuti, error) {
	var c domain.Cuti
	err := r.db.Table("cutis").
		Select("id, pegawai_id, jenis, tanggal_mulai, tanggal_selesai, jumlah_hari, alasan, status, disetujui_oleh, disetujui_pada, catatan_persetujuan, created_at, updated_at").
		Where("id = ?", id).
		Scan(&c).Error
	if err != nil {
		return nil, err
	}
	if c.ID == 0 {
		return nil, errors.New("cuti not found")
	}
	return &c, nil
}

func (r *cutiRepo) Create(c *domain.Cuti) error {
	return r.db.Table("cutis").Create(c).Error
}

func (r *cutiRepo) UpdateStatus(id int64, status string, disetujuiOleh int64, catatan string) error {
	return r.db.Table("cutis").
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":               status,
			"disetujui_oleh":       disetujuiOleh,
			"disetujui_pada":       gorm.Expr("NOW()"),
			"catatan_persetujuan":  catatan,
			"updated_at":           gorm.Expr("NOW()"),
		}).Error
}

func (r *cutiRepo) CountPending() (int, error) {
	var count int64
	err := r.db.Table("cutis").Where("status = ?", "menunggu").Count(&count).Error
	return int(count), err
}