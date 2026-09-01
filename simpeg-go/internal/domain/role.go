package domain

import "time"

type Permission struct {
	ID          int64     `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description,omitempty" db:"description"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type Role struct {
	ID          int64     `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description,omitempty" db:"description"`
	Permissions []string  `json:"permissions,omitempty" db:"-" gorm:"-"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type RoleRepository interface {
	FindAll() ([]Role, error)
	FindByName(name string) (*Role, error)
	Create(role *Role) error
	Update(name string, role *Role) error
	Delete(name string) error
	FindPermissionsByRole(name string) ([]Permission, error)
	FindPermissionsByUser(userID int64) ([]Permission, error)
	AllPermissions() ([]Permission, error)
}
