package postgres

import (
	"simpeg-go/internal/domain"

	"gorm.io/gorm"
)

type auditRepo struct {
	db *gorm.DB
}

func NewAuditRepository(db *gorm.DB) domain.AuditRepository {
	return &auditRepo{db: db}
}

func (r *auditRepo) Create(entry *domain.AuditLog) error {
	return r.db.Create(entry).Error
}

func (r *auditRepo) FindAll(filter domain.AuditLogFilter) ([]domain.AuditLog, int64, error) {
	q := r.db.Model(&domain.AuditLog{})
	if filter.Module != "" {
		q = q.Where("module = ?", filter.Module)
	}
	if filter.Action != "" {
		q = q.Where("action = ?", filter.Action)
	}
	if filter.UserID != 0 {
		q = q.Where("user_id = ?", filter.UserID)
	}
	if !filter.From.IsZero() {
		q = q.Where("created_at >= ?", filter.From)
	}
	if !filter.To.IsZero() {
		q = q.Where("created_at <= ?", filter.To)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 || limit > 100 {
		limit = 20
	}

	var rows []domain.AuditLog
	if err := q.Order("created_at DESC, id DESC").Limit(limit).Offset((page - 1) * limit).Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}
