package domain

import (
	"database/sql/driver"
	"fmt"
	"time"
)

// AuditJSON menyimpan nilai JSONB (raw bytes) untuk kolom old_values/new_values.
type AuditJSON []byte

func (j AuditJSON) Value() (driver.Value, error) {
	if len(j) == 0 {
		return nil, nil
	}
	return []byte(j), nil
}

func (j *AuditJSON) Scan(value any) error {
	if value == nil {
		*j = nil
		return nil
	}
	switch v := value.(type) {
	case []byte:
		*j = append([]byte(nil), v...)
	case string:
		*j = []byte(v)
	default:
		return fmt.Errorf("audit_json: unsupported type %T", value)
	}
	return nil
}

func (j AuditJSON) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("null"), nil
	}
	return j, nil
}

type AuditLog struct {
	ID         int64     `json:"id" gorm:"column:id;primaryKey"`
	UserID     *int64    `json:"user_id" gorm:"column:user_id"`
	Actor      string    `json:"actor" gorm:"column:actor"`
	Module     string    `json:"module" gorm:"column:module"`
	Action     string    `json:"action" gorm:"column:action"`
	ResourceID string    `json:"resource_id" gorm:"column:resource_id"`
	OldValues  AuditJSON `json:"old_values,omitempty" gorm:"column:old_values;type:jsonb"`
	NewValues  AuditJSON `json:"new_values,omitempty" gorm:"column:new_values;type:jsonb"`
	IPAddress  string    `json:"ip_address" gorm:"column:ip_address"`
	CreatedAt  time.Time `json:"created_at" gorm:"column:created_at"`
}

type AuditLogFilter struct {
	Page   int
	Limit  int
	Module string
	Action string
	UserID int64
	From   time.Time
	To     time.Time
}

type AuditRepository interface {
	Create(entry *AuditLog) error
	FindAll(filter AuditLogFilter) ([]AuditLog, int64, error)
}
