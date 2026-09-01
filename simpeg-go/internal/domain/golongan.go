package domain

import "time"

type Golongan struct {
	ID        int64     `json:"id"`
	Kode      string    `json:"kode"`
	Nama      string    `json:"nama"`
	Urutan    int       `json:"urutan"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type GolonganRepository interface {
	FindAll() ([]Golongan, error)
	FindByID(id int64) (*Golongan, error)
	Create(g *Golongan) error
	Update(g *Golongan) error
	Delete(id int64) error
}
