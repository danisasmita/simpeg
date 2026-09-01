package domain

import "time"

type DokumenPegawai struct {
	ID             int64      `json:"id"`
	PegawaiID      int64      `json:"pegawai_id"`
	NamaDokumen    string     `json:"nama_dokumen"`
	Kategori       string     `json:"kategori"`
	NomorDokumen   *string    `json:"nomor_dokumen,omitempty"`
	TanggalDokumen *time.Time `json:"tanggal_dokumen,omitempty"`
	TanggalExpired *time.Time `json:"tanggal_expired,omitempty"`
	FilePath       string     `json:"file_path"`
	FileName       *string    `json:"file_name,omitempty"`
	FileType       *string    `json:"file_type,omitempty"`
	FileSize       *int64     `json:"file_size,omitempty"`
	Keterangan     *string    `json:"keterangan,omitempty"`
	UploadedBy     *int64     `json:"uploaded_by,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type DokumenPegawaiRepository interface {
	FindByPegawaiID(pegawaiID int64) ([]DokumenPegawai, error)
	FindByID(id int64) (*DokumenPegawai, error)
	Create(d *DokumenPegawai) error
	Update(d *DokumenPegawai) error
	Delete(id int64) error
}
