package http

import (
	"sync"
	"time"

	"simpeg-go/internal/domain"
)

type permissionCacheEntry struct {
	perms   []domain.Permission
	expires time.Time
}

// CachedRoleRepository membungkus domain.RoleRepository dan meng-cache hasil
// FindPermissionsByRole (dipakai PermissionMiddleware di setiap request).
type CachedRoleRepository struct {
	repo  domain.RoleRepository
	ttl   time.Duration
	mu    sync.Mutex
	cache map[string]*permissionCacheEntry
}

func NewCachedRoleRepository(repo domain.RoleRepository, ttl time.Duration) *CachedRoleRepository {
	return &CachedRoleRepository{
		repo:  repo,
		ttl:   ttl,
		cache: make(map[string]*permissionCacheEntry),
	}
}

func (c *CachedRoleRepository) Invalidate() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.cache = make(map[string]*permissionCacheEntry)
}

func (c *CachedRoleRepository) FindPermissionsByRole(name string) ([]domain.Permission, error) {
	now := time.Now()

	c.mu.Lock()
	if e, ok := c.cache[name]; ok && now.Before(e.expires) {
		perms := e.perms
		c.mu.Unlock()
		return perms, nil
	}
	c.mu.Unlock()

	perms, err := c.repo.FindPermissionsByRole(name)
	if err != nil {
		return nil, err
	}

	cp := make([]domain.Permission, len(perms))
	copy(cp, perms)

	c.mu.Lock()
	c.cache[name] = &permissionCacheEntry{perms: cp, expires: now.Add(c.ttl)}
	c.mu.Unlock()
	return cp, nil
}

func (c *CachedRoleRepository) FindAll() ([]domain.Role, error) {
	return c.repo.FindAll()
}

func (c *CachedRoleRepository) FindByName(name string) (*domain.Role, error) {
	return c.repo.FindByName(name)
}

func (c *CachedRoleRepository) Create(role *domain.Role) error {
	return c.repo.Create(role)
}

func (c *CachedRoleRepository) Update(name string, role *domain.Role) error {
	return c.repo.Update(name, role)
}

func (c *CachedRoleRepository) Delete(name string) error {
	return c.repo.Delete(name)
}

func (c *CachedRoleRepository) FindPermissionsByUser(userID int64) ([]domain.Permission, error) {
	return c.repo.FindPermissionsByUser(userID)
}

func (c *CachedRoleRepository) AllPermissions() ([]domain.Permission, error) {
	return c.repo.AllPermissions()
}
