-- Migration: Audit trail (jejak transaksi bisnis pengguna)
-- Idempotent: IF NOT EXISTS / ON CONFLICT DO NOTHING

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    actor VARCHAR(255) NOT NULL DEFAULT '',
    module VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100) NOT NULL DEFAULT '',
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module_action ON audit_logs (module, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);

-- Permission untuk melihat audit log
INSERT INTO permissions (name) VALUES ('audit.view')
ON CONFLICT (name) DO NOTHING;

-- Grant ke role admin (semua) dan operator
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'admin' AND p.name = 'audit.view'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name = 'audit.view'
WHERE r.name IN ('operator')
ON CONFLICT DO NOTHING;