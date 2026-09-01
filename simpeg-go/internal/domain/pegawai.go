package domain

import "time"

type Pegawai struct {
	ID                      int64      `json:"id"`
	UserID                  *int64     `json:"user_id,omitempty"`
	NIP                     *string    `json:"nip,omitempty" gorm:"column:nip"`
	NIDN                    *string    `json:"nidn,omitempty" gorm:"column:nidn"`
	NamaLengkap             string     `json:"nama_lengkap"`
	NamaPanggilan           *string    `json:"nama_panggilan,omitempty"`
	JenisKelamin            string     `json:"jenis_kelamin"`
	TempatLahir             *string    `json:"tempat_lahir,omitempty"`
	TanggalLahir            *time.Time `json:"tanggal_lahir,omitempty"`
	Agama                   *string    `json:"agama,omitempty"`
	StatusPernikahan        *string    `json:"status_pernikahan,omitempty"`
	Kewarganegaraan         *string    `json:"kewarganegaraan,omitempty"`
	NIK                     *string    `json:"nik,omitempty"`
	NPWP                    *string    `json:"npwp,omitempty"`
	NomorBPJSKesehatan      *string    `json:"nomor_bpjs_kesehatan,omitempty" gorm:"column:nomor_bpjs_kesehatan"`
	NomorBPJSKetenagakerjaan *string   `json:"nomor_bpjs_ketenagakerjaan,omitempty" gorm:"column:nomor_bpjs_ketenagakerjaan"`
	EmailPribadi            *string    `json:"email_pribadi,omitempty"`
	EmailInstitusi          *string    `json:"email_institusi,omitempty"`
	NomorHP                 *string    `json:"nomor_hp,omitempty"`
	NomorTelpDarurat        *string    `json:"nomor_telp_darurat,omitempty"`
	NamaKontakDarurat       *string    `json:"nama_kontak_darurat,omitempty"`
	HubunganKontakDarurat   *string    `json:"hubungan_kontak_darurat,omitempty"`
	AlamatKTP               *string    `json:"alamat_ktp,omitempty"`
	AlamatDomisili          *string    `json:"alamat_domisili,omitempty"`
	StatusKepegawaianID     *int64     `json:"status_kepegawaian_id,omitempty"`
	UnitKerjaID             *int64     `json:"unit_kerja_id,omitempty"`
	JabatanID               *int64     `json:"jabatan_id,omitempty"`
	GolonganID              *int64     `json:"golongan_id,omitempty"`
	TanggalMasuk            *time.Time `json:"tanggal_masuk,omitempty"`
	TanggalTMTPNS           *time.Time `json:"tanggal_tmt_pns,omitempty" gorm:"column:tanggal_tmt_pns"`
	TanggalPensiun          *time.Time `json:"tanggal_pensiun,omitempty"`
	StatusAktif             string     `json:"status_aktif"`
	Foto                    *string    `json:"foto,omitempty"`
	FotoURL                 string     `json:"foto_url,omitempty" gorm:"-"`
	CreatedBy               *int64     `json:"created_by,omitempty"`
	UpdatedBy               *int64     `json:"updated_by,omitempty"`
	CreatedAt               time.Time  `json:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at"`

	// Relations (for detail view)
	StatusKepegawaian *StatusKepegawaian `json:"status_kepegawaian,omitempty" gorm:"-"`
	UnitKerja         *UnitKerja         `json:"unit_kerja,omitempty" gorm:"-"`
	Jabatan           *Jabatan           `json:"jabatan,omitempty" gorm:"-"`
	Golongan          *Golongan          `json:"golongan,omitempty" gorm:"-"`
}

type PegawaiRepository interface {
	FindAll(filter PegawaiSearchFilter) ([]Pegawai, int, error)
	FindByID(id int64) (*Pegawai, error)
	FindByUserID(userID int64) (*Pegawai, error)
	Create(p *Pegawai) error
	Update(p *Pegawai) error
	Delete(id int64) error
	Count() (int, error)
}

func FotoPathURL(foto *string) string {
	if foto == nil || *foto == "" {
		return ""
	}
	return "/uploads/" + *foto
}

type PegawaiSearchFilter struct {
	Page     int
	Limit    int
	Search   string
	Status   string
	UnitID   int64
	GolID    int64
	JabID    int64
}
