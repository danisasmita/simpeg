package domain

import "time"

type Jabatan struct {
	ID          int64     `json:"id"`
	UnitKerjaID *int64    `json:"unit_kerja_id,omitempty"`
	Nama        string    `json:"nama"`
	Jenis       string    `json:"jenis"`
	Kode        *string   `json:"kode,omitempty"`
	IsAktif     bool      `json:"is_aktif"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type JabatanRepository interface {
	FindAll() ([]Jabatan, error)
	FindByID(id int64) (*Jabatan, error)
	Create(j *Jabatan) error
	Update(j *Jabatan) error
	Delete(id int64) error
}
