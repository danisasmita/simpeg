package domain

import "time"

type StatusKepegawaian struct {
	ID        int64     `json:"id"`
	Kode      string    `json:"kode"`
	Nama      string    `json:"nama"`
	IsAktif   bool      `json:"is_aktif"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type StatusKepegawaianRepository interface {
	FindAll() ([]StatusKepegawaian, error)
	FindByID(id int64) (*StatusKepegawaian, error)
	Create(s *StatusKepegawaian) error
	Update(s *StatusKepegawaian) error
	Delete(id int64) error
}
