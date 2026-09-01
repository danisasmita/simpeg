import Head from '@/Components/Head';
import { Link } from 'react-router-dom';
import AppLayout from '@/Layouts/AppLayout';
import { useAuth } from '@/Contexts/AuthContext';
import { api, errorMessage } from '@/lib/api';
import { useMemo, useState, useEffect } from 'react';
import {
    CalendarCheck,
    CalendarDays,
    Clock,
    FileText,
    MapPin,
    Camera,
    X,
    ChevronRight,
    CalendarOff,
    Timer,
    AlertCircle,
} from 'lucide-react';
import type { Absensi, Cuti } from '@/types';

type PegawaiLite = {
    id: number;
    user_id: number | null;
    nip: string | null;
    nama_lengkap: string;
};

interface Ringkasan {
    hadir: number;
    sisa_cuti: number;
    menunggu: number;
    rata_rata_jam: string;
}

const CUTI_QUOTA = 12;

export default function Riwayat() {
    const { user } = useAuth();
    const [pegawais, setPegawais] = useState<PegawaiLite[]>([]);
    const [currentPegawai, setCurrentPegawai] = useState<PegawaiLite | null>(null);
    const [records, setRecords] = useState<Absensi[]>([]);
    const [cutiRequests, setCutiRequests] = useState<Cuti[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [detail, setDetail] = useState<Absensi | null>(null);
    const [showCutiModal, setShowCutiModal] = useState(false);
    const [cutiForm, setCutiForm] = useState({
        jenis: '',
        tanggal_mulai: '',
        tanggal_selesai: '',
        alasan: '',
    });
    const [cutiProcessing, setCutiProcessing] = useState(false);
    const [cutiErrors, setCutiErrors] = useState<Record<string, string>>({});
    const [cutiSuccess, setCutiSuccess] = useState(false);
    const [cutiSubmitted, setCutiSubmitted] = useState<{ jenis: string; jumlah_hari: number; tanggal_mulai: string; tanggal_selesai: string } | null>(null);

    useEffect(() => {
        api.get('/pegawai?limit=100')
            .then(({ data }) => {
                const list: PegawaiLite[] = data?.data ?? [];
                setPegawais(list);
                const mineId = user?.pegawai_id ?? list.find((p) => p.user_id === user?.id)?.id ?? null;
                setCurrentPegawai(mineId ? list.find((p) => p.id === mineId) ?? { id: mineId, user_id: null, nip: null, nama_lengkap: user?.name ?? '' } : null);
            })
            .catch((err) => setLoadError(errorMessage(err)));
    }, [user]);

    useEffect(() => {
        if (!currentPegawai) return;
        setLoadError(null);
        Promise.all([
            api.get(`/absensi/${currentPegawai.id}/history`),
            api.get(`/cuti?pegawai_id=${currentPegawai.id}`),
        ])
            .then(([ab, ct]) => {
                setRecords(ab.data?.data ?? []);
                setCutiRequests(ct.data?.data ?? []);
            })
            .catch((err) => setLoadError(errorMessage(err)));
    }, [currentPegawai]);

    const parseDate = (val?: string | null) => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    };

    const formatTanggal = (val: string) => {
        const d = parseDate(val);
        if (!d) return val;
        return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatTanggalShort = (val: string) => {
        const d = parseDate(val);
        if (!d) return val;
        return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    const formatTime = (dt: string | null) => {
        if (!dt) return '-';
        const d = parseDate(dt);
        if (!d) return '-';
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateTime = (dt: string | null) => {
        if (!dt) return '-';
        const d = parseDate(dt);
        if (!d) return '-';
        return d.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const calcDuration = (inAt: string | null, outAt: string | null) => {
        if (!inAt || !outAt) return null;
        const a = parseDate(inAt);
        const b = parseDate(outAt);
        if (!a || !b) return null;
        const diff = b.getTime() - a.getTime();
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        return `${hours}j ${mins}m`;
    };

    const formatCutiDate = (val: string) => {
        const d = parseDate(val);
        if (!d) return val;
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const ringkasan: Ringkasan = useMemo(() => {
        const now = new Date();
        const monthRecords = records.filter((r) => {
            const d = parseDate(r.tanggal);
            return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const hadir = monthRecords.filter((r) => r.status === 'hadir').length;
        const menunggu = cutiRequests.filter((c) => c.status === 'menunggu').length;
        const approved = cutiRequests
            .filter((c) => c.status === 'disetujui')
            .reduce((sum, c) => sum + c.jumlah_hari, 0);
        const sisa_cuti = Math.max(0, CUTI_QUOTA - approved);
        const done = records
            .filter((r) => r.check_in_at && r.check_out_at)
            .map((r) => (new Date(r.check_out_at!).getTime() - new Date(r.check_in_at!).getTime()) / 3600000);
        const avg = done.length ? done.reduce((a, b) => a + b, 0) / done.length : 0;
        const rata_rata_jam = done.length ? `${Math.floor(avg)}j ${Math.round((avg % 1) * 60)}m` : '0j 0m';
        return { hadir, sisa_cuti, menunggu, rata_rata_jam };
    }, [records, cutiRequests]);

    const recentAttendance = records.slice(0, 7);

    const submitCuti = async () => {
        if (!currentPegawai) return;
        setCutiProcessing(true);
        setCutiErrors({});
        const start = new Date(cutiForm.tanggal_mulai);
        const end = new Date(cutiForm.tanggal_selesai);
        const jumlah_hari = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
        const jenisLabel: Record<string, string> = {
            tahunan: 'Cuti Tahunan',
            sakit: 'Cuti Sakit',
            melahirkan: 'Cuti Melahirkan',
            besar: 'Cuti Besar',
            alasan_penting: 'Alasan Penting',
        };
        try {
            await api.post('/cuti', {
                pegawai_id: currentPegawai.id,
                jenis: cutiForm.jenis,
                tanggal_mulai: cutiForm.tanggal_mulai,
                tanggal_selesai: cutiForm.tanggal_selesai,
                jumlah_hari,
                alasan: cutiForm.alasan,
            });
            const { data } = await api.get(`/cuti?pegawai_id=${currentPegawai.id}`);
            setCutiRequests(data?.data ?? []);
            setCutiSubmitted({
                jenis: jenisLabel[cutiForm.jenis] || cutiForm.jenis,
                jumlah_hari,
                tanggal_mulai: cutiForm.tanggal_mulai,
                tanggal_selesai: cutiForm.tanggal_selesai,
            });
            setCutiSuccess(true);
        } catch (err) {
            setCutiErrors({ alasan: errorMessage(err) });
        } finally {
            setCutiProcessing(false);
        }
    };

    const closeCutiModal = () => {
        setShowCutiModal(false);
        setCutiSuccess(false);
        setCutiSubmitted(null);
        setCutiForm({ jenis: '', tanggal_mulai: '', tanggal_selesai: '', alasan: '' });
    };

    const statusColor = (status: string) => {
        switch (status) {
            case 'hadir': return 'bg-green-100 text-green-700';
            case 'cuti': return 'bg-yellow-100 text-yellow-700';
            case 'disetujui': return 'bg-green-100 text-green-700';
            case 'menunggu': return 'bg-orange-100 text-orange-700';
            case 'ditolak': return 'bg-red-100 text-red-700';
            default: return 'bg-red-100 text-red-700';
        }
    };

    return (
        <AppLayout title="Kehadiran Saya">
            <Head title="Kehadiran Saya" />
            <div className="mx-auto max-w-6xl space-y-6">
                {/* Hero Banner */}
                <div className="relative overflow-hidden rounded-2xl p-8 text-white" style={{ backgroundColor: '#1a3a2a' }}>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold md:text-3xl">Kehadiran Saya</h2>
                        <p className="mt-1 text-white/80">Pantau kehadiran dan pengajuan cuti Anda.</p>
                        <div className="mt-4 flex gap-3">
                            <Link
                                to="/absensi"
                                className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm hover:bg-white/30"
                            >
                                <CalendarCheck size={16} /> Presensi
                            </Link>
                            <button
                                onClick={() => setShowCutiModal(true)}
                                disabled={!currentPegawai}
                                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: '#dfb23c', color: '#1a3a2a' }}
                            >
                                <CalendarDays size={16} /> Ajukan Cuti
                            </button>
                        </div>
                    </div>
                    <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent" />
                </div>

                {loadError && (
                    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                        <AlertCircle size={18} className="shrink-0" />
                        {loadError}
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                    <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Hadir Bulan Ini</p>
                                <p className="mt-1 text-2xl font-bold">{ringkasan.hadir}</p>
                                <p className="text-[10px] text-muted-foreground">hari</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                                <CalendarCheck size={18} className="text-green-600" />
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Sisa Cuti</p>
                                <p className="mt-1 text-2xl font-bold">{ringkasan.sisa_cuti}</p>
                                <p className="text-[10px] text-muted-foreground">hari tersisa</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                                <CalendarOff size={18} className="text-blue-600" />
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Menunggu</p>
                                <p className="mt-1 text-2xl font-bold">{ringkasan.menunggu}</p>
                                <p className="text-[10px] text-muted-foreground">pengajuan</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                                <AlertCircle size={18} className="text-orange-600" />
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Rata-rata Jam</p>
                                <p className="mt-1 text-2xl font-bold">{ringkasan.rata_rata_jam}</p>
                                <p className="text-[10px] text-muted-foreground">per hari</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                                <Timer size={18} className="text-purple-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid gap-6 lg:grid-cols-5">
                    {/* Recent Attendance */}
                    <div className="rounded-xl border bg-card p-5 lg:col-span-3">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold">Riwayat Kehadiran</h3>
                                <p className="text-xs text-muted-foreground">7 hari terakhir</p>
                            </div>
                            {records.length > 7 && (
                                <button
                                    onClick={() => {
                                        const el = document.getElementById('full-history');
                                        el?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="text-xs font-medium text-primary hover:underline"
                                >
                                    Lihat Semua
                                </button>
                            )}
                        </div>
                        <div className="space-y-3">
                            {recentAttendance.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">Belum ada riwayat kehadiran.</p>
                            ) : (
                                recentAttendance.map((r) => (
                                    <div
                                        key={r.id}
                                        className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/50"
                                        onClick={() => setDetail(r)}
                                    >
                                        <div className="mb-2 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold">{formatTanggalShort(r.tanggal)}</p>
                                                <p className="text-xs text-muted-foreground">{currentPegawai?.nama_lengkap}</p>
                                            </div>
                                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor(r.status)}`}>
                                                {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">Masuk</p>
                                                <p className="text-sm font-bold text-green-600">{formatTime(r.check_in_at)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">Keluar</p>
                                                <p className="text-sm font-bold text-red-600">{formatTime(r.check_out_at)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">Total</p>
                                                <p className="text-sm font-bold text-primary">
                                                    {calcDuration(r.check_in_at, r.check_out_at) ?? '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* My Leave Requests */}
                    <div className="rounded-xl border bg-card p-5 lg:col-span-2">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold">Pengajuan Cuti</h3>
                                <p className="text-xs text-muted-foreground">Pengajuan terakhir</p>
                            </div>
                            <Link to="/cuti" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                                Lihat <ChevronRight size={12} />
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {cutiRequests.length === 0 ? (
                                <div className="flex flex-col items-center py-8 text-center">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                        <FileText size={20} className="text-muted-foreground" />
                                    </div>
                                    <p className="mt-3 text-sm text-muted-foreground">Belum ada pengajuan cuti.</p>
                                </div>
                            ) : (
                                cutiRequests.slice(0, 5).map((c) => (
                                    <div key={c.id} className="rounded-lg border p-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium capitalize">{c.jenis}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatCutiDate(c.tanggal_mulai)} - {formatCutiDate(c.tanggal_selesai)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{c.jumlah_hari} hari</p>
                                            </div>
                                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor(c.status)}`}>
                                                {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Full History Table (hidden, scroll target) */}
                <div id="full-history" className="hidden" />
            </div>

            {/* Detail Modal */}
            {detail && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setDetail(null)}>
                    <div
                        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
                            <h3 className="font-bold">Detail Kehadiran</h3>
                            <button onClick={() => setDetail(null)} className="rounded-full p-1.5 hover:bg-muted">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="px-5 pb-5">
                            <div className="flex items-center gap-3 border-b py-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                    {(currentPegawai?.nama_lengkap ?? '?').charAt(0)}
                                </div>
                                <div>
                                    <p className="font-semibold">{currentPegawai?.nama_lengkap}</p>
                                    <p className="text-xs text-muted-foreground">NIP {currentPegawai?.nip || '-'}</p>
                                </div>
                                <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(detail.status)}`}>
                                    {detail.status.charAt(0).toUpperCase() + detail.status.slice(1)}
                                </span>
                            </div>

                            <div className="border-b py-4">
                                <p className="text-xs text-muted-foreground">{formatTanggal(detail.tanggal)}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 border-b py-4">
                                <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                                    <div className="flex items-center gap-1 text-[11px] font-medium text-green-600">
                                        <Clock size={11} /> Masuk
                                    </div>
                                    <p className="mt-1 text-2xl font-bold text-green-700">{formatTime(detail.check_in_at)}</p>
                                    <p className="text-[10px] text-green-500">{formatDateTime(detail.check_in_at)}</p>
                                </div>
                                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                                    <div className="flex items-center gap-1 text-[11px] font-medium text-red-600">
                                        <Clock size={11} /> Keluar
                                    </div>
                                    <p className="mt-1 text-2xl font-bold text-red-700">{formatTime(detail.check_out_at)}</p>
                                    <p className="text-[10px] text-red-500">{formatDateTime(detail.check_out_at)}</p>
                                </div>
                            </div>

                            {calcDuration(detail.check_in_at, detail.check_out_at) && (
                                <div className="flex items-center justify-center gap-2 border-b py-3">
                                    <span className="text-sm text-muted-foreground">Lama kerja:</span>
                                    <span className="text-lg font-bold text-primary">{calcDuration(detail.check_in_at, detail.check_out_at)}</span>
                                </div>
                            )}

                            {(detail.check_in_location || detail.check_out_location) && (
                                <div className="space-y-3 border-b py-4">
                                    {detail.check_in_location && (
                                        <div className="flex gap-2">
                                            <MapPin size={14} className="mt-0.5 shrink-0 text-green-600" />
                                            <div>
                                                <p className="text-[11px] font-medium text-green-600">Lokasi Masuk</p>
                                                <p className="text-sm leading-snug">{detail.check_in_location}</p>
                                            </div>
                                        </div>
                                    )}
                                    {detail.check_out_location && (
                                        <div className="flex gap-2">
                                            <MapPin size={14} className="mt-0.5 shrink-0 text-red-600" />
                                            <div>
                                                <p className="text-[11px] font-medium text-red-600">Lokasi Pulang</p>
                                                <p className="text-sm leading-snug">{detail.check_out_location}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {(detail.check_in_photo || detail.check_out_photo) && (
                                <div className="grid grid-cols-2 gap-3 border-b py-4">
                                    {detail.check_in_photo && (
                                        <div>
                                            <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                                                <Camera size={11} /> Foto Masuk
                                            </div>
                                            <img
                                                src={detail.check_in_photo}
                                                alt="Foto masuk"
                                                className="aspect-[3/4] w-full rounded-lg object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    )}
                                    {detail.check_out_photo && (
                                        <div>
                                            <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                                                <Camera size={11} /> Foto Pulang
                                            </div>
                                            <img
                                                src={detail.check_out_photo}
                                                alt="Foto pulang"
                                                className="aspect-[3/4] w-full rounded-lg object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {detail.keterangan && (
                                <div className="pt-4">
                                    <p className="text-[11px] font-medium text-muted-foreground">Keterangan</p>
                                    <p className="mt-0.5 text-sm">{detail.keterangan}</p>
                                </div>
                            )}
                        </div>

                        <div className="sticky bottom-0 border-t bg-white px-5 py-3">
                            <button
                                onClick={() => setDetail(null)}
                                className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ajukan Cuti Modal */}
            {showCutiModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={closeCutiModal}>
                    <div
                        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {cutiSuccess && cutiSubmitted ? (
                            <>
                                <div className="rounded-t-2xl bg-gradient-to-b from-green-50 to-white px-5 pt-8 pb-6 text-center">
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
                                        <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="mt-4 text-xl font-bold">Pengajuan Terkirim!</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">Pengajuan cuti Anda berhasil dikirim untuk persetujuan.</p>
                                </div>

                                <div className="mx-5 rounded-xl border p-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Jenis Cuti</span>
                                            <span className="text-sm font-semibold">{cutiSubmitted.jenis}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Durasi</span>
                                            <span className="flex items-center gap-1 text-sm font-semibold">
                                                <Timer size={14} /> {cutiSubmitted.jumlah_hari} hari
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Periode</span>
                                            <span className="flex items-center gap-1 text-sm font-semibold">
                                                <CalendarDays size={14} />
                                                {formatCutiDate(cutiSubmitted.tanggal_mulai)} - {formatCutiDate(cutiSubmitted.tanggal_selesai)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl bg-blue-50 p-4">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                                        <AlertCircle size={14} className="text-blue-600" />
                                    </div>
                                    <p className="text-xs leading-relaxed text-blue-700">
                                        Anda akan menerima notifikasi setelah pengajuan Anda ditinjau oleh admin.
                                    </p>
                                </div>

                                <div className="px-5 py-5">
                                    <button
                                        onClick={closeCutiModal}
                                        className="w-full rounded-xl py-3 text-sm font-semibold text-white hover:opacity-90"
                                        style={{ backgroundColor: '#1a3a2a' }}
                                    >
                                        Mengerti
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                            <CalendarDays size={18} className="text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold">Ajukan Cuti</h3>
                                            <p className="text-xs text-muted-foreground">Kirim pengajuan cuti untuk persetujuan</p>
                                        </div>
                                    </div>
                                    <button onClick={closeCutiModal} className="rounded-full p-1.5 hover:bg-muted">
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="space-y-4 px-5 py-5">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium">
                                            Jenis Cuti <span className="text-destructive">*</span>
                                        </label>
                                        <select
                                            value={cutiForm.jenis}
                                            onChange={(e) => setCutiForm({ ...cutiForm, jenis: e.target.value })}
                                            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                                        >
                                            <option value="">Pilih jenis cuti</option>
                                            <option value="tahunan">Cuti Tahunan</option>
                                            <option value="sakit">Cuti Sakit</option>
                                            <option value="melahirkan">Cuti Melahirkan</option>
                                            <option value="besar">Cuti Besar</option>
                                            <option value="alasan_penting">Alasan Penting</option>
                                        </select>
                                        {cutiErrors.jenis && <p className="mt-1 text-xs text-destructive">{cutiErrors.jenis}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium">
                                                Tanggal Mulai <span className="text-destructive">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={cutiForm.tanggal_mulai}
                                                onChange={(e) => setCutiForm({ ...cutiForm, tanggal_mulai: e.target.value })}
                                                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                                            />
                                            {cutiErrors.tanggal_mulai && <p className="mt-1 text-xs text-destructive">{cutiErrors.tanggal_mulai}</p>}
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium">
                                                Tanggal Selesai <span className="text-destructive">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={cutiForm.tanggal_selesai}
                                                onChange={(e) => setCutiForm({ ...cutiForm, tanggal_selesai: e.target.value })}
                                                min={cutiForm.tanggal_mulai || undefined}
                                                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                                            />
                                            {cutiErrors.tanggal_selesai && <p className="mt-1 text-xs text-destructive">{cutiErrors.tanggal_selesai}</p>}
                                        </div>
                                    </div>

                                    {cutiForm.tanggal_mulai && cutiForm.tanggal_selesai && (
                                        <div className="rounded-xl bg-primary/5 p-4">
                                            <div className="flex items-center gap-2">
                                                <Timer size={14} className="text-primary" />
                                                <span className="text-sm font-medium text-primary">
                                                    {(() => {
                                                        const start = new Date(cutiForm.tanggal_mulai);
                                                        const end = new Date(cutiForm.tanggal_selesai);
                                                        const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
                                                        return diff > 0 ? `${diff} hari` : '-';
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium">
                                            Alasan Cuti <span className="text-destructive">*</span>
                                        </label>
                                        <textarea
                                            value={cutiForm.alasan}
                                            onChange={(e) => setCutiForm({ ...cutiForm, alasan: e.target.value })}
                                            rows={3}
                                            placeholder="Jelaskan alasan pengajuan cuti..."
                                            className="w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm"
                                        />
                                        {cutiErrors.alasan && <p className="mt-1 text-xs text-destructive">{cutiErrors.alasan}</p>}
                                    </div>
                                </div>

                                <div className="sticky bottom-0 flex gap-3 border-t bg-white px-5 py-3">
                                    <button
                                        onClick={closeCutiModal}
                                        className="flex-1 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={submitCuti}
                                        disabled={cutiProcessing || !currentPegawai}
                                        className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                                        style={{ backgroundColor: '#1a3a2a' }}
                                    >
                                        {cutiProcessing ? 'Mengirim...' : 'Kirim Pengajuan'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </AppLayout>
    );
}