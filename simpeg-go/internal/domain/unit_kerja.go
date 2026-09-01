package domain

import "time"

type UnitKerja struct {
	ID        int64      `json:"id"`
	ParentID  *int64     `json:"parent_id,omitempty"`
	Kode      string     `json:"kode"`
	Nama      string     `json:"nama"`
	Singkatan *string    `json:"singkatan,omitempty"`
	Tipe      string     `json:"tipe"`
	IsAktif   bool       `json:"is_aktif"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	Children  []UnitKerja `json:"children,omitempty" gorm:"-"`
}

type UnitKerjaRepository interface {
	FindAll() ([]UnitKerja, error)
	FindTree() ([]UnitKerja, error)
	FindByID(id int64) (*UnitKerja, error)
	Create(u *UnitKerja) error
	Update(u *UnitKerja) error
	Delete(id int64) error
}
