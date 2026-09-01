-- =============================================================
-- Seed test data: users per-role + pegawai terhubung
-- Password untuk SEMUA user tes: password
-- =============================================================
BEGIN;

-- 1) Pegawai (email_institusi = email login, dipakai utk mapping user)
INSERT INTO pegawais
    (nip, nidn, nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir, agama,
     status_pernikahan, email_institusi, nomor_hp,
     status_kepegawaian_id, unit_kerja_id, jabatan_id, golongan_id,
     tanggal_masuk, status_aktif)
VALUES
    ('198003102010021001', '', 'Asep Operator', 'L', 'Bandar Lampung', '1980-03-10', 'Islam', 'Menikah',
     'operator@simpeg-uml.test', '081211111101',
     (SELECT id FROM status_kepegawaians WHERE nama='Tenaga Kependidikan Tetap'),
     (SELECT id FROM unit_kerjas WHERE nama='Biro Administrasi Umum'),
     (SELECT id FROM jabatans WHERE nama='Staf'),
     (SELECT id FROM golongans WHERE nama='Penata Muda'),
     '2010-02-01', 'aktif'),

    ('198505152011031002', '', 'Budi Hartono', 'L', 'Metro', '1985-05-15', 'Islam', 'Menikah',
     'bsdm@simpeg-uml.test', '081211111102',
     (SELECT id FROM status_kepegawaians WHERE nama='Tenaga Kependidikan Tetap'),
     (SELECT id FROM unit_kerjas WHERE nama='Biro Sumber Daya Manusia'),
     (SELECT id FROM jabatans WHERE nama='Kepala Bagian'),
     (SELECT id FROM golongans WHERE nama='Penata Muda TK I'),
     '2011-03-01', 'aktif'),

    ('196803251992031001', '', 'Dr. H. Prasetiyo, M.Pd.', 'L', 'Tanjungkarang', '1968-03-25', 'Islam', 'Menikah',
     'pimpinan@simpeg-uml.test', '081211111103',
     (SELECT id FROM status_kepegawaians WHERE nama='Dosen Tetap'),
     (SELECT id FROM unit_kerjas WHERE nama='Universitas Muhammadiyah Lampung'),
     (SELECT id FROM jabatans WHERE nama='Rektor'),
     (SELECT id FROM golongans WHERE nama='Pembina'),
     '1992-08-01', 'aktif'),

    ('199003042014022004', '', 'Siti Rahayu', 'P', 'Pringsewu', '1990-03-04', 'Islam', 'Belum Menikah',
     'staff@simpeg-uml.test', '081211111104',
     (SELECT id FROM status_kepegawaians WHERE nama='Tenaga Kependidikan Tetap Yayasan'),
     (SELECT id FROM unit_kerjas WHERE nama='Biro Administrasi Akademik dan Kemahasiswaan'),
     (SELECT id FROM jabatans WHERE nama='Staf'),
     (SELECT id FROM golongans WHERE nama='Pengatur'),
     '2014-02-01', 'aktif'),

    ('197706052000122005', '0221067705', 'Dr. Dewi Anggraini, M.T.', 'P', 'Jakarta', '1977-06-05', 'Islam', 'Menikah',
     'dosen@simpeg-uml.test', '081211111105',
     (SELECT id FROM status_kepegawaians WHERE nama='Dosen Tetap Yayasan'),
     (SELECT id FROM unit_kerjas WHERE nama='Fakultas Teknik'),
     (SELECT id FROM jabatans WHERE nama='Lektor'),
     (SELECT id FROM golongans WHERE nama='Penata Muda TK I'),
     '2000-12-01', 'aktif'),

    ('199505152019012006', '', 'Cuti Test', 'L', 'Telukbetung', '1995-05-15', 'Islam', 'Menikah',
     'cuti.test@simpeg-uml.test', '081211111106',
     (SELECT id FROM status_kepegawaians WHERE nama='Honorer'),
     (SELECT id FROM unit_kerjas WHERE nama='Biro Sumber Daya Manusia'),
     (SELECT id FROM jabatans WHERE nama='Staf'),
     (SELECT id FROM golongans WHERE nama='Pengatur Muda'),
     '2019-01-01', 'aktif');

-- 2) Users (semua password: password) — relasi via email_institusi
INSERT INTO users (name, email, password, role, pegawai_id)
SELECT
    nm.name, nm.email, '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', nm.role, p.id
FROM (VALUES
    ('Asep Operator',        'operator@simpeg-uml.test',   'operator',         'operator@simpeg-uml.test'),
    ('Budi Hartono',         'bsdm@simpeg-uml.test',       'operator_bsdm',    'bsdm@simpeg-uml.test'),
    ('Dr. H. Prasetiyo',     'pimpinan@simpeg-uml.test',   'pimpinan',         'pimpinan@simpeg-uml.test'),
    ('Siti Rahayu',          'staff@simpeg-uml.test',      'pegawai',          'staff@simpeg-uml.test'),
    ('Dr. Dewi Anggraini',   'dosen@simpeg-uml.test',      'dosen',            'dosen@simpeg-uml.test'),
    ('Cuti Test',            'cuti.test@simpeg-uml.test',  'pegawai',          'cuti.test@simpeg-uml.test')
) AS nm(name, email, role, email_institusi)
JOIN pegawais p ON p.email_institusi = nm.email_institusi
ON CONFLICT (email) DO NOTHING;

-- 3) Link balik pegawai.user_id
UPDATE pegawais p
SET user_id = u.id
FROM users u
WHERE u.email = p.email_institusi;

COMMIT;

-- Cek hasil
SELECT u.id, u.email, u.role, u.pegawai_id, p.nama_lengkap
FROM users u LEFT JOIN pegawais p ON p.id = u.pegawai_id
ORDER BY u.id;