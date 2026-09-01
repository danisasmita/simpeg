package domain

type LaporanPegawaiRow struct {
	ID                int64   `json:"id"`
	NIP               *string `json:"nip,omitempty"`
	NIDN              *string `json:"nidn,omitempty"`
	NamaLengkap       string  `json:"nama_lengkap"`
	JenisKelamin      string  `json:"jenis_kelamin"`
	EmailInstitusi    *string `json:"email_institusi,omitempty"`
	NomorHP           *string `json:"nomor_hp,omitempty"`
	StatusAktif       string  `json:"status_aktif"`
	StatusKepegawaian *string `json:"status_kepegawaian,omitempty"`
	UnitKerja         *string `json:"unit_kerja,omitempty"`
	Jabatan           *string `json:"jabatan,omitempty"`
	Golongan          *string `json:"golongan,omitempty"`
}

type LaporanPegawaiSummary struct {
	Total               int            `json:"total"`
	ByStatusAktif       map[string]int `json:"by_status_aktif"`
	ByUnitKerja         map[string]int `json:"by_unit_kerja"`
	ByStatusKepegawaian map[string]int `json:"by_status_kepegawaian"`
}

type LaporanRepository interface {
	Pegawai(statusAktif string, unitKerjaID int64) ([]LaporanPegawaiRow, error)
	Summary(statusAktif string, unitKerjaID int64) (*LaporanPegawaiSummary, error)
}