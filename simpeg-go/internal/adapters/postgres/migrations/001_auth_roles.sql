-- Migration: Auth secondary (roles/permissions, password reset)
-- Idempotent: IF NOT EXISTS / ON CONFLICT DO NOTHING

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    email VARCHAR(255) NOT NULL PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions catalog
CREATE TABLE IF NOT EXISTS permissions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles catalog
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role <-> permission join
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Seed: Permissions catalog
INSERT INTO permissions (name) VALUES
    ('pegawai.view'), ('pegawai.create'), ('pegawai.update'), ('pegawai.delete'), ('pegawai.export'),
    ('absensi.view'), ('absensi.create'),
    ('cuti.view'), ('cuti.create'), ('cuti.approve'),
    ('master.view'), ('master.create'), ('master.update'), ('master.delete'),
    ('user.view'), ('user.create'), ('user.update'), ('user.delete'),
    ('laporan.view'), ('laporan.export'),
    ('settings.view'), ('settings.update')
ON CONFLICT (name) DO NOTHING;

-- Seed: Roles
INSERT INTO roles (name) VALUES
    ('admin'), ('operator'), ('pimpinan'), ('pegawai'), ('dosen'), ('operator_bsdm')
ON CONFLICT (name) DO NOTHING;

-- Seed: role_permissions admin = all
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Seed: role_permissions operator
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.name IN (
    'pegawai.view','pegawai.create','pegawai.update','pegawai.export',
    'absensi.view','absensi.create',
    'cuti.view','cuti.create',
    'master.view',
    'laporan.view','laporan.export'
  )
WHERE r.name = 'operator'
ON CONFLICT DO NOTHING;

-- Seed: role_permissions operator_bsdm
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.name IN (
    'pegawai.view','pegawai.create','pegawai.update','pegawai.export',
    'absensi.view','absensi.create',
    'cuti.view','cuti.create',
    'master.view',
    'laporan.view','laporan.export'
  )
WHERE r.name = 'operator_bsdm'
ON CONFLICT DO NOTHING;

-- Seed: role_permissions pimpinan
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.name IN ('pegawai.view','absensi.view','cuti.view','cuti.approve','laporan.view','laporan.export')
WHERE r.name = 'pimpinan'
ON CONFLICT DO NOTHING;

-- Seed: role_permissions pegawai & dosen
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.name IN ('pegawai.view','absensi.view','absensi.create','cuti.view','cuti.create')
WHERE r.name IN ('pegawai','dosen')
ON CONFLICT DO NOTHING;
