package domain

import "time"

type Absensi struct {
	ID                int64      `json:"id"`
	PegawaiID         int64      `json:"pegawai_id"`
	Tanggal           time.Time  `json:"tanggal"`
	CheckInAt         *time.Time `json:"check_in_at,omitempty"`
	CheckInPhoto      *string    `json:"check_in_photo,omitempty"`
	CheckInLocation   *string    `json:"check_in_location,omitempty"`
	CheckOutAt        *time.Time `json:"check_out_at,omitempty"`
	CheckOutPhoto     *string    `json:"check_out_photo,omitempty"`
	CheckOutLocation  *string    `json:"check_out_location,omitempty"`
	Status            string     `json:"status"`
	Keterangan        *string    `json:"keterangan,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	Pegawai           *Pegawai   `json:"pegawai,omitempty" gorm:"-"`
}

type Cuti struct {
	ID                 int64      `json:"id"`
	PegawaiID          int64      `json:"pegawai_id"`
	Jenis              string     `json:"jenis"`
	TanggalMulai       time.Time  `json:"tanggal_mulai"`
	TanggalSelesai     time.Time  `json:"tanggal_selesai"`
	JumlahHari         int        `json:"jumlah_hari"`
	Alasan             string     `json:"alasan"`
	Status             string     `json:"status"`
	DisetujuiOleh      *int64     `json:"disetujui_oleh,omitempty"`
	DisetujuiPada      *time.Time `json:"disetujui_pada,omitempty"`
	CatatanPersetujuan *string    `json:"catatan_persetujuan,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	Pegawai            *Pegawai   `json:"pegawai,omitempty" gorm:"-"`
}

type AbsensiRepository interface {
	FindAll(tanggal time.Time, pegawaiID int64) ([]Absensi, error)
	FindByPegawaiAndDate(pegawaiID int64, tanggal time.Time) (*Absensi, error)
	FindByRange(pegawaiID int64, from, to time.Time) ([]Absensi, error)
	Summary(from, to time.Time, pegawaiID int64) (map[string]int, error)
	CheckIn(a *Absensi) error
	CheckOutByPegawaiID(pegawaiID int64, photo, location string) error
	CountByRange(from, to time.Time) (int, error)
}

type CutiRepository interface {
	FindAll(page, limit int, status string) ([]Cuti, int, error)
	FindByPegawaiID(pegawaiID int64) ([]Cuti, error)
	FindByID(id int64) (*Cuti, error)
	Create(c *Cuti) error
	UpdateStatus(id int64, status string, disetujuiOleh int64, catatan string) error
	CountPending() (int, error)
}
