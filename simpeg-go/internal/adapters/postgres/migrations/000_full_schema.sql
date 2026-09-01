-- Migration: Full SIMPEG database schema
-- Replicates Laravel schema for Go backend

-- Master Data: Golongan
CREATE TABLE IF NOT EXISTS golongans (
    id BIGSERIAL PRIMARY KEY,
    kode VARCHAR(10) NOT NULL UNIQUE,
    nama VARCHAR(255) NOT NULL,
    urutan INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Master Data: Unit Kerja (hierarchical)
CREATE TABLE IF NOT EXISTS unit_kerjas (
    id BIGSERIAL PRIMARY KEY,
    parent_id BIGINT REFERENCES unit_kerjas(id) ON DELETE SET NULL,
    kode VARCHAR(20) NOT NULL UNIQUE,
    nama VARCHAR(255) NOT NULL,
    singkatan VARCHAR(20),
    tipe VARCHAR(30) DEFAULT 'unit',
    is_aktif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Master Data: Jabatan
CREATE TABLE IF NOT EXISTS jabatans (
    id BIGSERIAL PRIMARY KEY,
    unit_kerja_id BIGINT REFERENCES unit_kerjas(id) ON DELETE SET NULL,
    nama VARCHAR(255) NOT NULL,
    jenis VARCHAR(30) DEFAULT 'struktural',
    kode VARCHAR(20) UNIQUE,
    is_aktif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Master Data: Status Kepegawaian
CREATE TABLE IF NOT EXISTS status_kepegawaians (
    id BIGSERIAL PRIMARY KEY,
    kode VARCHAR(20) NOT NULL UNIQUE,
    nama VARCHAR(255) NOT NULL,
    is_aktif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (auth)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'operator',
    pegawai_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Core: Pegawai
CREATE TABLE IF NOT EXISTS pegawais (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    nip VARCHAR(30) UNIQUE,
    nidn VARCHAR(20),
    nama_lengkap VARCHAR(255) NOT NULL,
    nama_panggilan VARCHAR(255),
    jenis_kelamin VARCHAR(1) NOT NULL CHECK (jenis_kelamin IN ('L','P')),
    tempat_lahir VARCHAR(255),
    tanggal_lahir DATE,
    agama VARCHAR(50),
    status_pernikahan VARCHAR(50),
    kewarganegaraan VARCHAR(50) DEFAULT 'WNI',
    nik VARCHAR(20) UNIQUE,
    npwp VARCHAR(20),
    nomor_bpjs_kesehatan VARCHAR(30),
    nomor_bpjs_ketenagakerjaan VARCHAR(30),
    email_pribadi VARCHAR(255),
    email_institusi VARCHAR(255),
    nomor_hp VARCHAR(20),
    nomor_telp_darurat VARCHAR(20),
    nama_kontak_darurat VARCHAR(255),
    hubungan_kontak_darurat VARCHAR(255),
    alamat_ktp TEXT,
    alamat_domisili TEXT,
    status_kepegawaian_id BIGINT REFERENCES status_kepegawaians(id) ON DELETE SET NULL,
    unit_kerja_id BIGINT REFERENCES unit_kerjas(id) ON DELETE SET NULL,
    jabatan_id BIGINT REFERENCES jabatans(id) ON DELETE SET NULL,
    golongan_id BIGINT REFERENCES golongans(id) ON DELETE SET NULL,
    tanggal_masuk DATE,
    tanggal_tmt_pns DATE,
    tanggal_pensiun DATE,
    status_aktif VARCHAR(20) DEFAULT 'aktif',
    foto VARCHAR(255),
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_pegawais_nama ON pegawais(nama_lengkap);
CREATE INDEX idx_pegawais_unit ON pegawais(unit_kerja_id);
CREATE INDEX idx_pegawais_jabatan ON pegawais(jabatan_id);
CREATE INDEX idx_pegawais_golongan ON pegawais(golongan_id);
CREATE INDEX idx_pegawais_status_kepegaw ON pegawais(status_kepegawaian_id);

-- Riwayat: Jabatan
CREATE TABLE IF NOT EXISTS riwayat_jabatans (
    id BIGSERIAL PRIMARY KEY,
    pegawai_id BIGINT NOT NULL REFERENCES pegawais(id) ON DELETE CASCADE,
    jabatan_id BIGINT REFERENCES jabatans(id) ON DELETE SET NULL,
    unit_kerja_id BIGINT REFERENCES unit_kerjas(id) ON DELETE SET NULL,
    golongan_id BIGINT REFERENCES golongans(id) ON DELETE SET NULL,
    no_sk VARCHAR(50),
    tanggal_sk DATE,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE,
    is_aktif BOOLEAN DEFAULT FALSE,
    keterangan TEXT,
    dokumen_sk VARCHAR(255),
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Riwayat: Golongan
CREATE TABLE IF NOT EXISTS riwayat_golongans (
    id BIGSERIAL PRIMARY KEY,
    pegawai_id BIGINT NOT NULL REFERENCES pegawais(id) ON DELETE CASCADE,
    golongan_id BIGINT NOT NULL REFERENCES golongans(id),
    no_sk VARCHAR(50),
    tanggal_sk DATE,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE,
    is_aktif BOOLEAN DEFAULT FALSE,
    keterangan TEXT,
    dokumen_sk VARCHAR(255),
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Riwayat: Pendidikan
CREATE TABLE IF NOT EXISTS riwayat_pendidikans (
    id BIGSERIAL PRIMARY KEY,
    pegawai_id BIGINT NOT NULL REFERENCES pegawais(id) ON DELETE CASCADE,
    jenjang VARCHAR(20) NOT NULL,
    nama_institusi VARCHAR(255) NOT NULL,
    jurusan_prodi VARCHAR(255),
    fakultas VARCHAR(255),
    tahun_masuk INTEGER,
    tahun_lulus INTEGER,
    ipk VARCHAR(10),
    nomor_ijazah VARCHAR(50),
    tanggal_ijazah DATE,
    dokumen_ijazah VARCHAR(255),
    is_pendidikan_terakhir BOOLEAN DEFAULT FALSE,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Riwayat: Pelatihan
CREATE TABLE IF NOT EXISTS riwayat_pelatihans (
    id BIGSERIAL PRIMARY KEY,
    pegawai_id BIGINT NOT NULL REFERENCES pegawais(id) ON DELETE CASCADE,
    nama_pelatihan VARCHAR(255) NOT NULL,
    penyelenggara VARCHAR(255),
    jenis VARCHAR(30) DEFAULT 'diklat',
    jumlah_jam INTEGER,
    tanggal_mulai DATE,
    tanggal_selesai DATE,
    nomor_sertifikat VARCHAR(50),
    dokumen_sertifikat VARCHAR(255),
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Dokumen Pegawai
CREATE TABLE IF NOT EXISTS dokumen_pegawais (
    id BIGSERIAL PRIMARY KEY,
    pegawai_id BIGINT NOT NULL REFERENCES pegawais(id) ON DELETE CASCADE,
    nama_dokumen VARCHAR(255) NOT NULL,
    kategori VARCHAR(30) DEFAULT 'lainnya',
    nomor_dokumen VARCHAR(100),
    tanggal_dokumen DATE,
    tanggal_expired DATE,
    file_path VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    file_size BIGINT,
    keterangan TEXT,
    uploaded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Absensi
CREATE TABLE IF NOT EXISTS absensis (
    id BIGSERIAL PRIMARY KEY,
    pegawai_id BIGINT NOT NULL REFERENCES pegawais(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    check_in_at TIMESTAMPTZ,
    check_in_photo VARCHAR(255),
    check_in_location TEXT,
    check_out_at TIMESTAMPTZ,
    check_out_photo VARCHAR(255),
    check_out_location TEXT,
    status VARCHAR(20) DEFAULT 'hadir',
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (pegawai_id, tanggal)
);

-- Cuti
CREATE TABLE IF NOT EXISTS cutis (
    id BIGSERIAL PRIMARY KEY,
    pegawai_id BIGINT NOT NULL REFERENCES pegawais(id) ON DELETE CASCADE,
    jenis VARCHAR(30) NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    jumlah_hari INTEGER NOT NULL,
    alasan TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'menunggu',
    disetujui_oleh BIGINT REFERENCES users(id) ON DELETE SET NULL,
    disetujui_pada TIMESTAMPTZ,
    catatan_persetujuan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed: 17 Golongan (PNS grading system)
INSERT INTO golongans (kode, nama, urutan) VALUES
    ('I/a', 'Juru Muda', 1),
    ('I/b', 'Juru Muda Tingkat I', 2),
    ('I/c', 'Juru', 3),
    ('I/d', 'Juru Tingkat I', 4),
    ('II/a', 'Pengatur Muda', 5),
    ('II/b', 'Pengatur Muda TK I', 6),
    ('II/c', 'Pengatur', 7),
    ('II/d', 'Pengatur Tingkat I', 8),
    ('III/a', 'Penata Muda', 9),
    ('III/b', 'Penata Muda TK I', 10),
    ('III/c', 'Penata', 11),
    ('III/d', 'Penata Tingkat I', 12),
    ('IV/a', 'Pembina', 13),
    ('IV/b', 'Pembina Tingkat I', 14),
    ('IV/c', 'Pembina Utama Muda', 15),
    ('IV/d', 'Pembina Utama Madya', 16),
    ('IV/e', 'Pembina Utama', 17)
ON CONFLICT (kode) DO NOTHING;

-- Seed: 7 Status Kepegawaian
INSERT INTO status_kepegawaians (kode, nama) VALUES
    ('DT', 'Dosen Tetap'),
    ('DTY', 'Dosen Tetap Yayasan'),
    ('DLB', 'Dosen Luar Biasa'),
    ('TT', 'Tenaga Kependidikan Tetap'),
    ('TTY', 'Tenaga Kependidikan Tetap Yayasan'),
    ('HON', 'Honorer'),
    ('PNS', 'PNS/ASN DPK')
ON CONFLICT (kode) DO NOTHING;

-- Seed: Root Unit Kerja
INSERT INTO unit_kerjas (kode, nama, singkatan, tipe, parent_id)
SELECT 'UML', 'Universitas Muhammadiyah Lampung', 'UML', 'universitas', NULL
WHERE NOT EXISTS (SELECT 1 FROM unit_kerjas WHERE kode = 'UML');

-- Seed: Fakultas (6)
INSERT INTO unit_kerjas (kode, nama, singkatan, tipe, parent_id)
VALUES
    ('FH', 'Fakultas Hukum', 'FH', 'fakultas', (SELECT id FROM unit_kerjas WHERE kode='UML')),
    ('FE', 'Fakultas Ekonomi dan Bisnis', 'FE', 'fakultas', (SELECT id FROM unit_kerjas WHERE kode='UML')),
    ('FISIP', 'Fakultas Ilmu Sosial dan Ilmu Politik', 'FISIP', 'fakultas', (SELECT id FROM unit_kerjas WHERE kode='UML')),
    ('FAI', 'Fakultas Agama Islam', 'FAI', 'fakultas', (SELECT id FROM unit_kerjas WHERE kode='UML')),
    ('FT', 'Fakultas Teknik', 'FT', 'fakultas', (SELECT id FROM unit_kerjas WHERE kode='UML')),
    ('FKIP', 'Fakultas Keguruan dan Ilmu Pendidikan', 'FKIP', 'fakultas', (SELECT id FROM unit_kerjas WHERE kode='UML'))
ON CONFLICT (kode) DO NOTHING;

-- Seed: Biro/Lembaga (6)
INSERT INTO unit_kerjas (kode, nama, singkatan, tipe, parent_id)
VALUES
    ('BSDM', 'Biro Sumber Daya Manusia', 'BSDM', 'biro', (SELECT id FROM unit_kerjas WHERE kode='UML')),
    ('BAU', 'Biro Administrasi Umum', 'BAU', 'biro', (SELECT id FROM unit_kerjas WHERE kode='UML')),
    ('BAAK', 'Biro Administrasi Akademik dan Kemahasiswaan', 'BAAK', 'biro', (SELECT id FROM unit_kerjas WHERE kode='UML')),
    ('BAK', 'Biro Administrasi Keuangan', 'BAK', 'biro', (SELECT id FROM unit_kerjas WHERE kode='UML')),
    ('LPM', 'Lembaga Penjaminan Mutu', 'LPM', 'lembaga', (SELECT id FROM unit_kerjas WHERE kode='UML')),
    ('LPPM', 'Lembaga Penelitian dan Pengabdian Masyarakat', 'LPPM', 'lembaga', (SELECT id FROM unit_kerjas WHERE kode='UML'))
ON CONFLICT (kode) DO NOTHING;

-- Seed: Jabatan Struktural (12)
INSERT INTO jabatans (nama, jenis, kode)
VALUES
    ('Rektor', 'struktural', 'REKTOR'),
    ('Wakil Rektor I', 'struktural', 'WR1'),
    ('Wakil Rektor II', 'struktural', 'WR2'),
    ('Wakil Rektor III', 'struktural', 'WR3'),
    ('Dekan', 'struktural', 'DEKAN'),
    ('Wakil Dekan', 'struktural', 'WADEK'),
    ('Kepala Program Studi', 'struktural', 'KAPRODI'),
    ('Kepala Biro', 'struktural', 'KABIRO'),
    ('Kepala Bagian', 'struktural', 'KABAG'),
    ('Kepala Sub Bagian', 'struktural', 'KASUBAG'),
    ('Kepala Lembaga', 'struktural', 'KALEM'),
    ('Staf', 'struktural', 'STAF')
ON CONFLICT (kode) DO NOTHING;

-- Seed: Jabatan Akademik (4)
INSERT INTO jabatans (nama, jenis, kode)
VALUES
    ('Asisten Ahli', 'akademik', 'AA'),
    ('Lektor', 'akademik', 'LEKTOR'),
    ('Lektor Kepala', 'akademik', 'LK'),
    ('Profesor', 'akademik', 'PROF')
ON CONFLICT (kode) DO NOTHING;

-- Seed: User Admin (default password: password)
INSERT INTO users (name, email, password, role)
SELECT 'Administrator SIMPEG', 'admin@simpeg-uml.test', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@simpeg-uml.test');
