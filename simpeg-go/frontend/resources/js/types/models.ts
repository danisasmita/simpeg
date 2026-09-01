export interface PaginatedData<T> {
    data: T[];
    links?: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total: number;
    page?: number;
    limit?: number;
}

export interface MasterItem {
    id: number;
    kode?: string;
    nama?: string;
    urutan?: number;
    singkatan?: string | null;
    tipe?: string;
    parent_id?: number | null;
    unit_kerja_id?: number | null;
    jenis?: string;
    is_aktif?: boolean;
    created_at?: string;
    updated_at?: string;
    children?: MasterItem[];
}

export type MasterType =
    | 'unit-kerja'
    | 'jabatan'
    | 'golongan'
    | 'status-kepegawaian';

export interface Golongan {
    id: number;
    kode: string;
    nama: string;
    urutan: number;
}

export interface StatusKepegawaian {
    id: number;
    kode: string;
    nama: string;
    is_aktif: boolean;
}

export interface UnitKerja {
    id: number;
    parent_id: number | null;
    kode: string;
    nama: string;
    singkatan: string | null;
    tipe: string;
    is_aktif: boolean;
    children?: UnitKerja[];
}

export interface Jabatan {
    id: number;
    unit_kerja_id: number | null;
    nama: string;
    jenis: string;
    kode: string | null;
    is_aktif: boolean;
}

export interface Pegawai {
    id: number;
    user_id: number | null;
    nip: string | null;
    nidn: string | null;
    nama_lengkap: string;
    nama_panggilan: string | null;
    jenis_kelamin: 'L' | 'P';
    tempat_lahir: string | null;
    tanggal_lahir: string | null;
    agama: string | null;
    status_pernikahan: string | null;
    kewarganegaraan: string | null;
    nik: string | null;
    npwp: string | null;
    nomor_bpjs_kesehatan: string | null;
    nomor_bpjs_ketenagakerjaan: string | null;
    email_pribadi: string | null;
    email_institusi: string | null;
    nomor_hp: string | null;
    nomor_telp_darurat: string | null;
    nama_kontak_darurat: string | null;
    hubungan_kontak_darurat: string | null;
    alamat_ktp: string | null;
    alamat_domisili: string | null;
    status_kepegawaian_id: number | null;
    unit_kerja_id: number | null;
    jabatan_id: number | null;
    golongan_id: number | null;
    tanggal_masuk: string | null;
    tanggal_tmt_pns: string | null;
    tanggal_pensiun: string | null;
    status_aktif: 'aktif' | 'nonaktif' | 'pensiun' | 'meninggal';
    foto: string | null;
    created_by?: number | null;
    updated_by?: number | null;
    created_at?: string;
    updated_at?: string;
    status_kepegawaian?: StatusKepegawaian;
    unit_kerja?: UnitKerja;
    jabatan?: Jabatan;
    golongan?: Golongan;
    foto_url?: string;
}

export interface Absensi {
    id: number;
    pegawai_id: number;
    tanggal: string;
    check_in_at: string | null;
    check_in_photo: string | null;
    check_in_location: string | null;
    check_out_at: string | null;
    check_out_photo: string | null;
    check_out_location: string | null;
    status: string;
    keterangan: string | null;
}

export interface Cuti {
    id: number;
    pegawai_id: number;
    jenis: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
    jumlah_hari: number;
    alasan: string;
    status: 'menunggu' | 'disetujui' | 'ditolak';
    disetujui_oleh: number | null;
    disetujui_pada: string | null;
    catatan_persetujuan: string | null;
    created_at: string;
    updated_at: string;
    pegawai?: {
        id: number;
        user_id: number | null;
        nip: string | null;
        nama_lengkap: string;
    } | null;
}

export interface RiwayatJabatan {
    id: number;
    pegawai_id: number;
    jabatan_id: number | null;
    unit_kerja_id: number | null;
    golongan_id: number | null;
    no_sk: string | null;
    tanggal_sk: string | null;
    tanggal_mulai: string;
    tanggal_selesai: string | null;
    is_aktif: boolean;
    keterangan: string | null;
    dokumen_sk: string | null;
}

export interface RiwayatGolongan {
    id: number;
    pegawai_id: number;
    golongan_id: number;
    no_sk: string | null;
    tanggal_sk: string | null;
    tanggal_mulai: string;
    tanggal_selesai: string | null;
    is_aktif: boolean;
    keterangan: string | null;
}

export interface RiwayatPendidikan {
    id: number;
    pegawai_id: number;
    jenjang: string;
    nama_institusi: string;
    jurusan_prodi: string | null;
    fakultas: string | null;
    tahun_masuk: number | null;
    tahun_lulus: number | null;
    ipk: string | null;
    nomor_ijazah: string | null;
    tanggal_ijazah: string | null;
    is_pendidikan_terakhir: boolean;
}

export interface RiwayatPelatihan {
    id: number;
    pegawai_id: number;
    nama_pelatihan: string;
    penyelenggara: string | null;
    jenis: string;
    jumlah_jam: number | null;
    tanggal_mulai: string | null;
    tanggal_selesai: string | null;
    nomor_sertifikat: string | null;
}

export interface LaporanPegawai {
    id: number;
    nip: string | null;
    nidn: string | null;
    nama_lengkap: string;
    jenis_kelamin: 'L' | 'P';
    email_institusi: string | null;
    nomor_hp: string | null;
    status_aktif: 'aktif' | 'nonaktif' | 'pensiun' | 'meninggal';
    status_kepegawaian: string | null;
    unit_kerja: string | null;
    jabatan: string | null;
    golongan: string | null;
}

export interface LaporanPegawaiSummary {
    total: number;
    by_status_aktif: Record<string, number>;
    by_unit_kerja: Record<string, number>;
    by_status_kepegawaian: Record<string, number>;
}