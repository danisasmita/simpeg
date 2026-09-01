package domain

import "time"

type RiwayatJabatan struct {
	ID          int64     `json:"id"`
	PegawaiID   int64     `json:"pegawai_id"`
	JabatanID   *int64    `json:"jabatan_id,omitempty"`
	UnitKerjaID *int64    `json:"unit_kerja_id,omitempty"`
	GolonganID  *int64    `json:"golongan_id,omitempty"`
	NoSK        *string   `json:"no_sk,omitempty" gorm:"column:no_sk"`
	TanggalSK   *time.Time `json:"tanggal_sk,omitempty" gorm:"column:tanggal_sk"`
	TanggalMulai time.Time `json:"tanggal_mulai"`
	TanggalSelesai *time.Time `json:"tanggal_selesai,omitempty"`
	IsAktif     bool      `json:"is_aktif"`
	Keterangan  *string   `json:"keterangan,omitempty"`
	DokumenSK   *string   `json:"dokumen_sk,omitempty" gorm:"column:dokumen_sk"`
	CreatedBy   *int64    `json:"created_by,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type RiwayatGolongan struct {
	ID             int64     `json:"id"`
	PegawaiID      int64     `json:"pegawai_id"`
	GolonganID     int64     `json:"golongan_id"`
	NoSK           *string   `json:"no_sk,omitempty" gorm:"column:no_sk"`
	TanggalSK      *time.Time `json:"tanggal_sk,omitempty" gorm:"column:tanggal_sk"`
	TanggalMulai   time.Time `json:"tanggal_mulai"`
	TanggalSelesai *time.Time `json:"tanggal_selesai,omitempty"`
	IsAktif        bool      `json:"is_aktif"`
	Keterangan     *string   `json:"keterangan,omitempty"`
	DokumenSK      *string   `json:"dokumen_sk,omitempty" gorm:"column:dokumen_sk"`
	CreatedBy      *int64    `json:"created_by,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type RiwayatPendidikan struct {
	ID                   int64     `json:"id"`
	PegawaiID            int64     `json:"pegawai_id"`
	Jenjang              string    `json:"jenjang"`
	NamaInstitusi        string    `json:"nama_institusi"`
	JurusanProdi         *string   `json:"jurusan_prodi,omitempty"`
	Fakultas             *string   `json:"fakultas,omitempty"`
	TahunMasuk           *int      `json:"tahun_masuk,omitempty"`
	TahunLulus           *int      `json:"tahun_lulus,omitempty"`
	IPK                  *string   `json:"ipk,omitempty" gorm:"column:ipk"`
	NomorIjazah          *string   `json:"nomor_ijazah,omitempty"`
	TanggalIjazah        *time.Time `json:"tanggal_ijazah,omitempty"`
	DokumenIjazah        *string   `json:"dokumen_ijazah,omitempty"`
	IsPendidikanTerakhir bool      `json:"is_pendidikan_terakhir"`
	CreatedBy            *int64    `json:"created_by,omitempty"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

type RiwayatPelatihan struct {
	ID                    int64     `json:"id"`
	PegawaiID             int64     `json:"pegawai_id"`
	NamaPelatihan         string    `json:"nama_pelatihan"`
	Penyelenggara         *string   `json:"penyelenggara,omitempty"`
	Jenis                 string    `json:"jenis"`
	JumlahJam             *int      `json:"jumlah_jam,omitempty"`
	TanggalMulai          *time.Time `json:"tanggal_mulai,omitempty"`
	TanggalSelesai        *time.Time `json:"tanggal_selesai,omitempty"`
	NomorSertifikat       *string   `json:"nomor_sertifikat,omitempty"`
	DokumenSertifikat     *string   `json:"dokumen_sertifikat,omitempty"`
	CreatedBy             *int64    `json:"created_by,omitempty"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

type RiwayatJabatanRepository interface {
	FindByPegawaiID(pegawaiID int64) ([]RiwayatJabatan, error)
	Create(r *RiwayatJabatan) error
	Update(r *RiwayatJabatan) error
	Delete(id int64) error
}

type RiwayatGolonganRepository interface {
	FindByPegawaiID(pegawaiID int64) ([]RiwayatGolongan, error)
	Create(r *RiwayatGolongan) error
	Update(r *RiwayatGolongan) error
	Delete(id int64) error
}

type RiwayatPendidikanRepository interface {
	FindByPegawaiID(pegawaiID int64) ([]RiwayatPendidikan, error)
	Create(r *RiwayatPendidikan) error
	Update(r *RiwayatPendidikan) error
	Delete(id int64) error
}

type RiwayatPelatihanRepository interface {
	FindByPegawaiID(pegawaiID int64) ([]RiwayatPelatihan, error)
	Create(r *RiwayatPelatihan) error
	Update(r *RiwayatPelatihan) error
	Delete(id int64) error
}
