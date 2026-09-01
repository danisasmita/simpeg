import AppLayout from '@/Layouts/AppLayout';
import Head from '@/Components/Head';
import { useAuth } from '@/Contexts/AuthContext';
import { api, errorMessage } from '@/lib/api';
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import {
    ChevronRight,
    Users,
    Edit,
    Briefcase,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Award,
    User,
    Building2,
    Hash,
    CreditCard,
    Heart,
    FileText,
    GraduationCap,
    BookOpen,
    Clock,
    Shield,
    ChevronDown,
    ChevronUp,
    ArrowLeft,
    Fingerprint,
    Baby,
    Globe,
    Stethoscope,
    Home,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import type {
    Absensi,
    Cuti,
    MasterItem,
    Pegawai,
    RiwayatGolongan,
    RiwayatJabatan,
    RiwayatPelatihan,
    RiwayatPendidikan,
} from '@/types';

function InfoRow({ label, value, icon }: { label: string; value: string | null | undefined; icon?: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 border-b border-border py-3 last:border-0">
            <div className="mt-0.5 text-muted-foreground">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-foreground break-words">{value || '-'}</p>
            </div>
        </div>
    );
}

function SectionHeader({ title, icon, count }: { title: string; icon: React.ReactNode; count?: number }) {
    return (
        <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-base font-bold text-foreground">{title}</h3>
            {count !== undefined && (
                <Badge variant="secondary" className="ml-auto text-xs">{count}</Badge>
            )}
        </div>
    );
}

export default function PegawaiShow() {
    const { id } = useParams<{ id: string }>();
    const { can, hasRole } = useAuth();
    const [pegawai, setPegawai] = useState<Pegawai | null>(null);
    const [units, setUnits] = useState<MasterItem[]>([]);
    const [jabatans, setJabatans] = useState<MasterItem[]>([]);
    const [golongans, setGolongans] = useState<MasterItem[]>([]);
    const [statuses, setStatuses] = useState<MasterItem[]>([]);
    const [riwayatJabatans, setRiwayatJabatans] = useState<RiwayatJabatan[]>([]);
    const [riwayatGolongans, setRiwayatGolongans] = useState<RiwayatGolongan[]>([]);
    const [riwayatPendidikans, setRiwayatPendidikans] = useState<RiwayatPendidikan[]>([]);
    const [riwayatPelatihans, setRiwayatPelatihans] = useState<RiwayatPelatihan[]>([]);
    const [absensi, setAbsensi] = useState<Absensi[]>([]);
    const [cuti, setCuti] = useState<Cuti[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        pribadi: true,
        kontak: true,
        kepegawaian: true,
        identitas: true,
        kontak_darurat: false,
        alamat: false,
        riwayat_jabatan: true,
        riwayat_golongan: true,
        pendidikan: true,
        pelatihan: true,
        absensi: true,
        cuti: true,
    });

    const nameOf = (items: MasterItem[], itemId?: number | null) =>
        items.find((item) => item.id === itemId)?.nama ?? null;
    const unitName = (itemId?: number | null) => nameOf(units, itemId);
    const jabatanName = (itemId?: number | null) => nameOf(jabatans, itemId);
    const golonganName = (itemId?: number | null) => nameOf(golongans, itemId);
    const statusName = (itemId?: number | null) => nameOf(statuses, itemId);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const paths = [
                    `/pegawai/${id}`,
                    '/unit-kerja',
                    '/jabatan',
                    '/golongan',
                    '/status-kepegawaian',
                    `/pegawai/${id}/riwayat-jabatan`,
                    `/pegawai/${id}/riwayat-golongan`,
                    `/pegawai/${id}/riwayat-pendidikan`,
                    `/pegawai/${id}/riwayat-pelatihan`,
                    `/absensi/${id}/history`,
                    `/cuti?pegawai_id=${id}`,
                ];
                const [p, u, j, g, s, rj, rg, rp, rl, ab, ct] = await Promise.all(paths.map((path) => api.get(path)));
                if (cancelled) return;
                setPegawai(p.data?.data ?? null);
                setUnits(u.data?.data ?? []);
                setJabatans(j.data?.data ?? []);
                setGolongans(g.data?.data ?? []);
                setStatuses(s.data?.data ?? []);
                setRiwayatJabatans(rj.data?.data ?? []);
                setRiwayatGolongans(rg.data?.data ?? []);
                setRiwayatPendidikans(rp.data?.data ?? []);
                setRiwayatPelatihans(rl.data?.data ?? []);
                setAbsensi(ab.data?.data ?? []);
                setCuti(ct.data?.data ?? []);
            } catch (err) {
                if (!cancelled) setError(errorMessage(err));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [id]);

    const toggleSection = (key: string) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const formatDate = (value?: string | null) => {
        if (!value) return '-';
        try {
            const dateOnly = value.slice(0, 10);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return value;
            return new Date(dateOnly + 'T00:00:00').toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        } catch {
            return value;
        }
    };

    const timeOf = (value?: string | null) => {
        if (!value) return '-';
        try {
            return value.slice(11, 16);
        } catch {
            return value;
        }
    };

    const statusBadge = (status: string) => {
        const map: Record<string, { bg: string; text: string }> = {
            aktif: { bg: 'bg-green-100', text: 'text-green-700' },
            nonaktif: { bg: 'bg-gray-100', text: 'text-gray-700' },
            cuti: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
            tugas_belajar: { bg: 'bg-blue-100', text: 'text-blue-700' },
            pensiun: { bg: 'bg-gray-100', text: 'text-gray-700' },
            meninggal: { bg: 'bg-gray-100', text: 'text-gray-700' },
            keluar: { bg: 'bg-red-100', text: 'text-red-700' },
            disetujui: { bg: 'bg-green-100', text: 'text-green-700' },
            ditolak: { bg: 'bg-red-100', text: 'text-red-700' },
            menunggu: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
            hadir: { bg: 'bg-green-100', text: 'text-green-700' },
            terlambat: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
            tidak_hadir: { bg: 'bg-red-100', text: 'text-red-700' },
            izin: { bg: 'bg-blue-100', text: 'text-blue-700' },
            sakit: { bg: 'bg-purple-100', text: 'text-purple-700' },
        };
        const s = map[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
        return <Badge className={`${s.bg} ${s.text} text-xs`}>{status.replace(/_/g, ' ')}</Badge>;
    };

    const CollapsibleCard = ({ id: sid, title, icon, count, children }: { id: string; title: string; icon: React.ReactNode; count?: number; children: React.ReactNode }) => (
        <Card>
            <CardHeader className="pb-3">
                <button onClick={() => toggleSection(sid)} className="flex w-full items-center text-left">
                    <SectionHeader title={title} icon={icon} count={count} />
                    <span className="ml-2 text-muted-foreground">
                        {expandedSections[sid] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                </button>
            </CardHeader>
            {expandedSections[sid] && <CardContent className="pt-0">{children}</CardContent>}
        </Card>
    );

    const showAbsensi = hasRole('admin', 'pimpinan');

    if (loading && !pegawai) {
        return (
            <AppLayout title="Profil Pegawai">
                <div className="py-16 text-center text-muted-foreground">Memuat data pegawai...</div>
            </AppLayout>
        );
    }

    if (error && !pegawai) {
        return (
            <AppLayout title="Profil Pegawai">
                <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-600">{error}</div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title={`Profil - ${pegawai?.nama_lengkap ?? ''}`}>
            <Head title={`Profil ${pegawai?.nama_lengkap ?? ''}`} />

            <div className="space-y-6">
                {/* Breadcrumbs */}
                <div className="flex items-center text-sm text-muted-foreground space-x-2">
                    <Link to="/pegawai" className="hover:text-foreground flex items-center">
                        <Users size={16} className="mr-1" />
                        Data Pegawai
                    </Link>
                    <ChevronRight size={16} />
                    <span className="text-foreground font-medium">Profil Pegawai</span>
                </div>

                {/* Header Profil */}
                <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_12px_32px_rgba(12,75,49,0.08)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1a3a2a] to-[#2d5a42] opacity-90" />
                    <div className="relative flex flex-col md:flex-row gap-6 items-start md:items-center p-6">
                        <img
                            src={pegawai?.foto_url || (pegawai?.foto ? `/uploads/${pegawai.foto}` : '/images/avatar-default.png')}
                            alt={pegawai?.nama_lengkap ?? ''}
                            className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white/30 shadow-lg"
                        />
                        <div className="flex-1 space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                <h2 className="text-2xl font-extrabold text-white">{pegawai?.nama_lengkap}</h2>
                                {pegawai?.status_aktif && statusBadge(pegawai.status_aktif)}
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70 mt-2">
                                <div className="flex items-center gap-1.5">
                                    <Award size={16} /> NIP: {pegawai?.nip ?? '-'}
                                </div>
                                {pegawai && (
                                    <div className="flex items-center gap-1.5">
                                        <Briefcase size={16} /> {jabatanName(pegawai.jabatan_id)}
                                    </div>
                                )}
                                {pegawai && (
                                    <div className="flex items-center gap-1.5">
                                        <Building2 size={16} /> {unitName(pegawai.unit_kerja_id)}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {can('pegawai.update') && (
                                <Button asChild className="rounded-xl bg-white/20 hover:bg-white/30 text-white border-white/30">
                                    <Link to={`/pegawai/${pegawai?.id}/edit`}>
                                        <Edit size={16} className="mr-2" /> Edit Profil
                                    </Link>
                                </Button>
                            )}
                            <Button asChild variant="outline" className="rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/30">
                                <Link to="/pegawai">
                                    <ArrowLeft size={16} className="mr-2" /> Kembali
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
                        {error}
                    </div>
                )}

                {/* Grid Informasi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ── Kolom 1 ──────────────────────────────── */}
                    <div className="space-y-6">
                        {/* Data Pribadi */}
                        <CollapsibleCard id="pribadi" title="Data Pribadi" icon={<User size={18} className="text-primary" />}>
                            <div className="space-y-0">
                                <InfoRow label="Nama Lengkap" value={pegawai?.nama_lengkap} icon={<User size={14} />} />
                                <InfoRow label="Nama Panggilan" value={pegawai?.nama_panggilan} icon={<User size={14} />} />
                                <InfoRow label="NIP" value={pegawai?.nip} icon={<Fingerprint size={14} />} />
                                <InfoRow label="NIDN" value={pegawai?.nidn} icon={<Hash size={14} />} />
                                <InfoRow label="Jenis Kelamin" value={pegawai?.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'} icon={<Users size={14} />} />
                                <InfoRow label="Tempat, Tanggal Lahir" value={`${pegawai?.tempat_lahir || '-'}, ${formatDate(pegawai?.tanggal_lahir)}`} icon={<Baby size={14} />} />
                                <InfoRow label="Agama" value={pegawai?.agama} icon={<Heart size={14} />} />
                                <InfoRow label="Status Pernikahan" value={pegawai?.status_pernikahan} icon={<Heart size={14} />} />
                                <InfoRow label="Kewarganegaraan" value={pegawai?.kewarganegaraan} icon={<Globe size={14} />} />
                            </div>
                        </CollapsibleCard>

                        {/* Kontak */}
                        <CollapsibleCard id="kontak" title="Kontak" icon={<Phone size={18} className="text-primary" />}>
                            <div className="space-y-0">
                                <InfoRow label="Email Institusi" value={pegawai?.email_institusi} icon={<Mail size={14} />} />
                                <InfoRow label="Email Pribadi" value={pegawai?.email_pribadi} icon={<Mail size={14} />} />
                                <InfoRow label="Nomor HP/WA" value={pegawai?.nomor_hp} icon={<Phone size={14} />} />
                            </div>
                        </CollapsibleCard>

                        {/* Alamat */}
                        <CollapsibleCard id="alamat" title="Alamat" icon={<Home size={18} className="text-primary" />}>
                            <div className="space-y-0">
                                <InfoRow label="Alamat KTP" value={pegawai?.alamat_ktp} icon={<MapPin size={14} />} />
                                <InfoRow label="Alamat Domisili" value={pegawai?.alamat_domisili} icon={<MapPin size={14} />} />
                            </div>
                        </CollapsibleCard>

                        {/* Kontak Darurat */}
                        <CollapsibleCard id="kontak_darurat" title="Kontak Darurat" icon={<Phone size={18} className="text-primary" />}>
                            <div className="space-y-0">
                                <InfoRow label="Nama" value={pegawai?.nama_kontak_darurat} icon={<User size={14} />} />
                                <InfoRow label="Hubungan" value={pegawai?.hubungan_kontak_darurat} icon={<Heart size={14} />} />
                                <InfoRow label="Nomor Telepon" value={pegawai?.nomor_telp_darurat} icon={<Phone size={14} />} />
                            </div>
                        </CollapsibleCard>
                    </div>

                    {/* ── Kolom 2 ──────────────────────────────── */}
                    <div className="space-y-6">
                        {/* Data Kepegawaian */}
                        <CollapsibleCard id="kepegawaian" title="Data Kepegawaian" icon={<Briefcase size={18} className="text-primary" />}>
                            <div className="space-y-0">
                                <InfoRow label="Status Kepegawaian" value={statusName(pegawai?.status_kepegawaian_id)} icon={<Shield size={14} />} />
                                <InfoRow label="Unit Kerja" value={unitName(pegawai?.unit_kerja_id)} icon={<Building2 size={14} />} />
                                <InfoRow label="Jabatan" value={jabatanName(pegawai?.jabatan_id)} icon={<Briefcase size={14} />} />
                                <InfoRow label="Golongan" value={golonganName(pegawai?.golongan_id)} icon={<Award size={14} />} />
                                <InfoRow label="Tanggal Masuk" value={formatDate(pegawai?.tanggal_masuk)} icon={<Calendar size={14} />} />
                                <InfoRow label="TMT PNS" value={formatDate(pegawai?.tanggal_tmt_pns)} icon={<Calendar size={14} />} />
                                <InfoRow label="Tanggal Pensiun" value={formatDate(pegawai?.tanggal_pensiun)} icon={<Calendar size={14} />} />
                            </div>
                        </CollapsibleCard>

                        {/* Identitas Lainnya */}
                        <CollapsibleCard id="identitas" title="Identitas & Dokumen" icon={<FileText size={18} className="text-primary" />}>
                            <div className="space-y-0">
                                <InfoRow label="NIK KTP" value={pegawai?.nik} icon={<CreditCard size={14} />} />
                                <InfoRow label="NPWP" value={pegawai?.npwp} icon={<CreditCard size={14} />} />
                                <InfoRow label="BPJS Kesehatan" value={pegawai?.nomor_bpjs_kesehatan} icon={<Stethoscope size={14} />} />
                                <InfoRow label="BPJS Ketenagakerjaan" value={pegawai?.nomor_bpjs_ketenagakerjaan} icon={<Stethoscope size={14} />} />
                            </div>
                        </CollapsibleCard>

                        {/* Riwayat Jabatan */}
                        <CollapsibleCard id="riwayat_jabatan" title="Riwayat Jabatan" icon={<Briefcase size={18} className="text-primary" />} count={riwayatJabatans.length}>
                            {riwayatJabatans.length > 0 ? (
                                <div className="space-y-3">
                                    {riwayatJabatans.map((rj) => (
                                        <div key={rj.id} className={`rounded-xl border p-4 ${rj.is_aktif ? 'border-green-200 bg-green-50' : 'border-border'}`}>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-semibold text-foreground">{jabatanName(rj.jabatan_id) || '-'}</p>
                                                    <p className="text-sm text-muted-foreground">{unitName(rj.unit_kerja_id) || '-'}</p>
                                                </div>
                                                {rj.is_aktif && <Badge className="bg-green-100 text-green-700">Aktif</Badge>}
                                            </div>
                                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                                <span>No. SK: {rj.no_sk || '-'}</span>
                                                <span>Tgl SK: {formatDate(rj.tanggal_sk)}</span>
                                                <span>Mulai: {formatDate(rj.tanggal_mulai)}</span>
                                                <span>Selesai: {rj.tanggal_selesai ? formatDate(rj.tanggal_selesai) : 'Sedang Menjabat'}</span>
                                            </div>
                                            {rj.keterangan && <p className="mt-2 text-xs text-muted-foreground italic">{rj.keterangan}</p>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat jabatan</p>
                            )}
                        </CollapsibleCard>

                        {/* Riwayat Golongan */}
                        <CollapsibleCard id="riwayat_golongan" title="Riwayat Golongan" icon={<Award size={18} className="text-primary" />} count={riwayatGolongans.length}>
                            {riwayatGolongans.length > 0 ? (
                                <div className="space-y-3">
                                    {riwayatGolongans.map((rg) => (
                                        <div key={rg.id} className={`rounded-xl border p-4 ${rg.is_aktif ? 'border-green-200 bg-green-50' : 'border-border'}`}>
                                            <div className="flex items-start justify-between">
                                                <p className="font-semibold text-foreground">{golonganName(rg.golongan_id) || '-'}</p>
                                                {rg.is_aktif && <Badge className="bg-green-100 text-green-700">Aktif</Badge>}
                                            </div>
                                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                                <span>No. SK: {rg.no_sk || '-'}</span>
                                                <span>Tgl SK: {formatDate(rg.tanggal_sk)}</span>
                                                <span>Mulai: {formatDate(rg.tanggal_mulai)}</span>
                                                <span>Selesai: {rg.tanggal_selesai ? formatDate(rg.tanggal_selesai) : 'Berlaku'}</span>
                                            </div>
                                            {rg.keterangan && <p className="mt-2 text-xs text-muted-foreground italic">{rg.keterangan}</p>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat golongan</p>
                            )}
                        </CollapsibleCard>

                        {/* Riwayat Pendidikan */}
                        <CollapsibleCard id="pendidikan" title="Riwayat Pendidikan" icon={<GraduationCap size={18} className="text-primary" />} count={riwayatPendidikans.length}>
                            {riwayatPendidikans.length > 0 ? (
                                <div className="space-y-3">
                                    {riwayatPendidikans.map((rp) => (
                                        <div key={rp.id} className={`rounded-xl border p-4 ${rp.is_pendidikan_terakhir ? 'border-blue-200 bg-blue-50' : 'border-border'}`}>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <Badge className="bg-primary/10 text-primary mb-1">{rp.jenjang}</Badge>
                                                    <p className="font-semibold text-foreground">{rp.nama_institusi}</p>
                                                    {rp.jurusan_prodi && <p className="text-sm text-muted-foreground">{rp.jurusan_prodi}</p>}
                                                </div>
                                                {rp.is_pendidikan_terakhir && <Badge className="bg-blue-100 text-blue-700">Terakhir</Badge>}
                                            </div>
                                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                                <span>{rp.tahun_masuk} - {rp.tahun_lulus || 'Sekarang'}</span>
                                                {rp.ipk && <span>IPK: {rp.ipk}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat pendidikan</p>
                            )}
                        </CollapsibleCard>

                        {/* Riwayat Pelatihan */}
                        <CollapsibleCard id="pelatihan" title="Pelatihan & Diklat" icon={<BookOpen size={18} className="text-primary" />} count={riwayatPelatihans.length}>
                            {riwayatPelatihans.length > 0 ? (
                                <div className="space-y-3">
                                    {riwayatPelatihans.map((rp) => (
                                        <div key={rp.id} className="rounded-xl border border-border p-4">
                                            <p className="font-semibold text-foreground">{rp.nama_pelatihan}</p>
                                            <p className="text-sm text-muted-foreground">{rp.penyelenggara || '-'}</p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <Badge variant="secondary">{rp.jenis}</Badge>
                                                {rp.jumlah_jam ? <Badge variant="secondary">{rp.jumlah_jam} jam</Badge> : null}
                                            </div>
                                            <div className="mt-2 text-xs text-muted-foreground">
                                                {formatDate(rp.tanggal_mulai)} - {formatDate(rp.tanggal_selesai)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat pelatihan</p>
                            )}
                        </CollapsibleCard>

                        {/* Absensi Bulan Ini (Admin/Pimpinan) */}
                        {showAbsensi && (
                            <CollapsibleCard id="absensi" title="Absensi Terakhir" icon={<Clock size={18} className="text-primary" />} count={absensi.length}>
                                {absensi.length > 0 ? (
                                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                                        {absensi.map((a) => (
                                            <div key={a.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{formatDate(a.tanggal)}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Masuk: {timeOf(a.check_in_at)} | Pulang: {timeOf(a.check_out_at)}
                                                    </p>
                                                </div>
                                                {statusBadge(a.status)}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">Belum ada data absensi bulan ini</p>
                                )}
                            </CollapsibleCard>
                        )}

                        {/* Cuti (Admin/Pimpinan) */}
                        {showAbsensi && (
                            <CollapsibleCard id="cuti" title="Riwayat Cuti" icon={<Calendar size={18} className="text-primary" />} count={cuti.length}>
                                {cuti.length > 0 ? (
                                    <div className="space-y-3">
                                        {cuti.map((c) => (
                                            <div key={c.id} className="rounded-xl border border-border p-4">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-semibold text-foreground">{c.jenis}</p>
                                                        <p className="text-sm text-muted-foreground">{c.alasan}</p>
                                                    </div>
                                                    {statusBadge(c.status)}
                                                </div>
                                                <div className="mt-2 text-xs text-muted-foreground">
                                                    {formatDate(c.tanggal_mulai)} - {formatDate(c.tanggal_selesai)} ({c.jumlah_hari} hari)
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat cuti</p>
                                )}
                            </CollapsibleCard>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}