package domain

type DashboardStats struct {
	TotalPegawai   int `json:"total_pegawai"`
	PegawaiAktif   int `json:"pegawai_aktif"`
	TotalUnitKerja int `json:"total_unit_kerja"`
	TotalJabatan   int `json:"total_jabatan"`
	CutiMenunggu   int `json:"cuti_menunggu"`
	AbsensiHariIni int `json:"absensi_hari_ini"`
}

type DashboardRepository interface {
	Stats() (*DashboardStats, error)
}
