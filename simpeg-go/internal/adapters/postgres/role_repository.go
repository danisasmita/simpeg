package postgres

import (
	"errors"
	"fmt"

	"simpeg-go/internal/domain"

	"gorm.io/gorm"
)

type RoleRepository struct {
	db *gorm.DB
}

func NewRoleRepository(db *gorm.DB) *RoleRepository {
	return &RoleRepository{db: db}
}

func (r *RoleRepository) AllPermissions() ([]domain.Permission, error) {
	var perms []domain.Permission
	err := r.db.Table("permissions").
		Select("id, name, COALESCE(description, '') AS description, created_at").
		Order("name").
		Scan(&perms).Error
	return perms, err
}

func (r *RoleRepository) FindAll() ([]domain.Role, error) {
	roles, err := r.fetchRoles()
	if err != nil {
		return nil, err
	}

	permissions, err := r.fetchAllPermissions()
	if err != nil {
		return nil, err
	}

	for i := range roles {
		roles[i].Permissions = permissions[roles[i].ID]
	}
	return roles, nil
}

func (r *RoleRepository) fetchRoles() ([]domain.Role, error) {
	var roles []domain.Role
	err := r.db.Table("roles").
		Select("id, name, COALESCE(description, '') AS description, created_at, updated_at").
		Order("name").
		Scan(&roles).Error
	return roles, err
}

func (r *RoleRepository) fetchAllPermissions() (map[int64][]string, error) {
	var rows []struct {
		RoleID int64
		Name   string
	}
	err := r.db.Table("role_permissions rp").
		Joins("JOIN permissions p ON p.id = rp.permission_id").
		Select("rp.role_id, p.name").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	result := map[int64][]string{}
	for _, row := range rows {
		result[row.RoleID] = append(result[row.RoleID], row.Name)
	}
	return result, nil
}

func (r *RoleRepository) FindByName(name string) (*domain.Role, error) {
	var ro domain.Role
	err := r.db.Table("roles").
		Select("id, name, COALESCE(description, '') AS description, created_at, updated_at").
		Where("name = ?", name).
		Scan(&ro).Error
	if err != nil {
		return nil, err
	}
	if ro.ID == 0 {
		return nil, errors.New("role not found")
	}

	perms, err := r.FindPermissionsByRole(name)
	if err != nil {
		return nil, err
	}
	ro.Permissions = make([]string, 0, len(perms))
	for _, p := range perms {
		ro.Permissions = append(ro.Permissions, p.Name)
	}
	return &ro, nil
}

func (r *RoleRepository) FindPermissionsByRole(name string) ([]domain.Permission, error) {
	var perms []domain.Permission
	err := r.db.Table("role_permissions rp").
		Joins("JOIN roles r ON r.id = rp.role_id").
		Joins("JOIN permissions p ON p.id = rp.permission_id").
		Select("p.id, p.name, COALESCE(p.description, '') AS description, p.created_at").
		Where("r.name = ?", name).
		Order("p.name").
		Scan(&perms).Error
	return perms, err
}

func (r *RoleRepository) FindPermissionsByUser(userID int64) ([]domain.Permission, error) {
	var perms []domain.Permission
	err := r.db.Table("users u").
		Joins("JOIN roles r ON r.name = u.role").
		Joins("JOIN role_permissions rp ON rp.role_id = r.id").
		Joins("JOIN permissions p ON p.id = rp.permission_id").
		Select("p.id, p.name, COALESCE(p.description, '') AS description, p.created_at").
		Where("u.id = ?", userID).
		Order("p.name").
		Scan(&perms).Error
	return perms, err
}

func (r *RoleRepository) Create(role *domain.Role) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Table("roles").Create(role).Error; err != nil {
			return err
		}
		if len(role.Permissions) > 0 {
			if err := replacePermissions(tx, role.ID, role.Permissions); err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *RoleRepository) Update(name string, role *domain.Role) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		roleID, err := roleIDByName(tx, name)
		if err != nil {
			return err
		}

		if err := tx.Table("roles").
			Where("name = ?", name).
			Updates(map[string]interface{}{
				"description": role.Description,
				"updated_at":  gorm.Expr("NOW()"),
			}).Error; err != nil {
			return err
		}

		if len(role.Permissions) > 0 {
			if err := replacePermissions(tx, roleID, role.Permissions); err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *RoleRepository) Delete(name string) error {
	roleID, err := roleIDByName(r.db, name)
	if err != nil {
		return err
	}
	return r.db.Exec("DELETE FROM roles WHERE id = ?", roleID).Error
}

func roleIDByName(db *gorm.DB, name string) (int64, error) {
	var row struct{ ID int64 }
	err := db.Table("roles").
		Select("id").
		Where("name = ?", name).
		Scan(&row).Error
	if err != nil {
		return 0, err
	}
	if row.ID == 0 {
		return 0, errors.New("role not found")
	}
	return row.ID, nil
}

func replacePermissions(tx *gorm.DB, roleID int64, perms []string) error {
	if err := tx.Exec(`DELETE FROM role_permissions WHERE role_id = ?`, roleID).Error; err != nil {
		return err
	}

	for _, name := range perms {
		var row struct{ ID int64 }
		err := tx.Table("permissions").
			Select("id").
			Where("name = ?", name).
			Scan(&row).Error
		if err != nil {
			return fmt.Errorf("permission not found: %s", name)
		}
		if row.ID == 0 {
			return fmt.Errorf("permission not found: %s", name)
		}
		if err := tx.Exec(`INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?) ON CONFLICT DO NOTHING`,
			roleID, row.ID).Error; err != nil {
			return err
		}
	}
	return nil
}