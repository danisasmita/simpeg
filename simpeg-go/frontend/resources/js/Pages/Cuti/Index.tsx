import Head from '@/Components/Head';
import AppLayout from '@/Layouts/AppLayout';
import { useAuth } from '@/Contexts/AuthContext';
import { api, errorMessage } from '@/lib/api';
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    CalendarDays,
    CheckCircle2,
    XCircle,
    Clock,
    FileText,
    X,
} from 'lucide-react';
import type { Cuti } from '@/types';

type PegawaiLite = { id: number; user_id: number | null; nip: string | null; nama_lengkap: string };
type Row = Cuti & { pegawai: PegawaiLite };

export default function Index() {
    const { user, hasRole, can } = useAuth();
    const isPimpinan = hasRole('pimpinan');
    const canApprove = can('cuti.approve');
    const isManager = hasRole('admin', 'operator', 'pimpinan');
    const canSubmitFor = hasRole('admin', 'operator', 'operator_bsdm');

    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'semua' | 'menunggu' | 'disetujui' | 'ditolak'>('semua');
    const [search, setSearch] = useState('');
    const [detail, setDetail] = useState<Row | null>(null);
    const [approveModal, setApproveModal] = useState<{ cuti: Row; action: 'disetujui' | 'ditolak' } | null>(null);
    const [catatan, setCatatan] = useState('');
    const [processing, setProcessing] = useState(false);

    const [createModal, setCreateModal] = useState(false);
    const [pegawaiList, setPegawaiList] = useState<PegawaiLite[]>([]);
    const [createForm, setCreateForm] = useState({
        pegawai_id: '',
        jenis: '',
        tanggal_mulai: '',
        tanggal_selesai: '',
        alasan: '',
    });
    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
    const [createProcessing, setCreateProcessing] = useState(false);

    useEffect(() => {
        if (!canSubmitFor) return;
        api.get('/pegawai?limit=100')
            .then(({ data }) => setPegawaiList((data?.data ?? []) as PegawaiLite[]))
            .catch(() => setPegawaiList([]));
    }, [canSubmitFor]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let list: Cuti[];
            let pegawais: Record<number, PegawaiLite> = {};
            if (isManager) {
                const res = await api.get('/cuti?limit=100');
                list = (res.data?.data ?? []) as Cuti[];
            } else {
                const { data } = await api.get('/pegawai?limit=100');
                const pegawaiList: PegawaiLite[] = data?.data ?? [];
                pegawais = Object.fromEntries(pegawaiList.map((p) => [p.id, p]));
                const mine = user?.pegawai_id ?? pegawaiList.find((p) => p.user_id === user?.id)?.id ?? null;
                if (!mine) {
                    setRows([]);
                    return;
                }
                const res = await api.get(`/cuti?pegawai_id=${mine}`);
                list = (res.data?.data ?? []) as Cuti[];
            }
            setRows(
                list.map((c) => ({
                    ...c,
                    pegawai:
                        (c.pegawai as PegawaiLite) ??
                        pegawais[c.pegawai_id] ?? {
                            id: c.pegawai_id,
                            user_id: null,
                            nip: null,
                            nama_lengkap: '?',
                        },
                }))
            );
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [isManager, user]);

    useEffect(() => {
        load();
    }, [load]);

    const stats = useMemo(() => {
        return {
            total: rows.length,
            menunggu: rows.filter((c) => c.status === 'menunggu').length,
            disetujui: rows.filter((c) => c.status === 'disetujui').length,
            ditolak: rows.filter((c) => c.status === 'ditolak').length,
        };
    }, [rows]);

    const filtered = useMemo(() => {
        let data = [...rows];
        if (filter !== 'semua') {
            data = data.filter((c) => c.status === filter);
        }
        if (search) {
            const q = search.toLowerCase();
            data = data.filter(
                (c) =>
                    c.pegawai.nama_lengkap.toLowerCase().includes(q) ||
                    (c.pegawai.nip ?? '').toLowerCase().includes(q) ||
                    c.jenis.toLowerCase().includes(q) ||
                    c.alasan.toLowerCase().includes(q)
            );
        }
        return data;
    }, [rows, filter, search]);

    const parseDate = (val?: string | null) => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    };

    const formatDate = (val: string) => {
        const d = parseDate(val);
        if (!d) return val;
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatDateTime = (val?: string | null) => {
        const d = parseDate(val);
        if (!d) return val ?? '-';
        return d.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const submitCutiFor = async () => {
        setCreateProcessing(true);
        setCreateErrors({});
        try {
            const pegawaiId = Number(createForm.pegawai_id);
            if (!pegawaiId) {
                setCreateErrors({ pegawai_id: 'Pilih pegawai terlebih dahulu.' });
                return;
            }
            if (!createForm.jenis || !createForm.alasan) {
                setCreateErrors({ form: 'Jenis cuti dan alasan wajib diisi.' });
                return;
            }
            const start = new Date(createForm.tanggal_mulai);
            const end = new Date(createForm.tanggal_selesai);
            if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
                setCreateErrors({ form: 'Periksa kembali rentang tanggal cuti.' });
                return;
            }
            const jumlah_hari = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
            await api.post('/cuti', {
                pegawai_id: pegawaiId,
                jenis: createForm.jenis,
                tanggal_mulai: createForm.tanggal_mulai,
                tanggal_selesai: createForm.tanggal_selesai,
                jumlah_hari,
                alasan: createForm.alasan,
            });
            setCreateModal(false);
            setCreateForm({ pegawai_id: '', jenis: '', tanggal_mulai: '', tanggal_selesai: '', alasan: '' });
            setError(null);
            load();
        } catch (err) {
            setCreateErrors({ form: errorMessage(err) });
        } finally {
            setCreateProcessing(false);
        }
    };

    const submitApprove = async () => {
        if (!approveModal) return;
        setProcessing(true);
        setError(null);
        try {
            await api.patch(`/cuti/${approveModal.cuti.id}`, {
                status: approveModal.action,
                catatan: catatan || '',
            });
            setRows((prev) =>
                prev.map((c) =>
                    c.id === approveModal.cuti.id
                        ? { ...c, status: approveModal.action, catatan_persetujuan: catatan || null }
                        : c
                )
            );
            setApproveModal(null);
            setCatatan('');
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setProcessing(false);
        }
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case 'disetujui':
                return 'bg-green-100 text-green-700';
            case 'menunggu':
                return 'bg-orange-100 text-orange-700';
            case 'ditolak':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const statusIcon = (status: string) => {
        switch (status) {
            case 'disetujui': return <CheckCircle2 size={14} className="text-green-600" />;
            case 'menunggu': return <Clock size={14} className="text-orange-600" />;
            case 'ditolak': return <XCircle size={14} className="text-red-600" />;
            default: return null;
        }
    };

    const jenisLabel: Record<string, string> = {
        tahunan: 'Tahunan',
        sakit: 'Sakit',
        melahirkan: 'Melahirkan',
        besar: 'Besar',
        alasan_penting: 'Alasan Penting',
    };

    return (
        <AppLayout title="Cuti">
            <Head title="Cuti" />
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="rounded-2xl p-8 text-white" style={{ backgroundColor: '#1a3a2a' }}>
                    <h2 className="text-2xl font-bold md:text-3xl">
                        {isPimpinan ? 'Persetujuan Cuti' : 'Pengajuan Cuti'}
                    </h2>
                    <p className="mt-1 text-white/80">
                        {isPimpinan
                            ? 'Tinjau dan setujui pengajuan cuti pegawai.'
                            : 'Kelola pengajuan dan persetujuan cuti pegawai.'}
                    </p>
                    {canSubmitFor && (
                        <button
                            onClick={() => setCreateModal(true)}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#dfb23c] px-4 py-2 text-sm font-semibold text-[#1a3a2a] hover:bg-[#e8c35b]"
                        >
                            <CalendarDays size={16} /> Ajukan Cuti atas Nama Pegawai
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Total</p>
                                <p className="mt-1 text-2xl font-bold">{stats.total}</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                                <FileText size={18} className="text-gray-600" />
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Menunggu</p>
                                <p className="mt-1 text-2xl font-bold">{stats.menunggu}</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                                <Clock size={18} className="text-orange-600" />
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Disetujui</p>
                                <p className="mt-1 text-2xl font-bold">{stats.disetujui}</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                                <CheckCircle2 size={18} className="text-green-600" />
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Ditolak</p>
                                <p className="mt-1 text-2xl font-bold">{stats.ditolak}</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                                <XCircle size={18} className="text-red-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                        <XCircle size={18} className="shrink-0" />
                        {error}
                    </div>
                )}

                {canApprove && rows.filter((c) => c.status === 'menunggu').length > 0 && (
                    <div className="rounded-xl border bg-card p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold">Pengajuan Terbaru</h3>
                                <p className="text-xs text-muted-foreground">Menunggu persetujuan Anda</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {rows
                                .filter((c) => c.status === 'menunggu')
                                .slice(0, 5)
                                .map((c) => (
                                    <div key={c.id} className="flex items-center gap-4 rounded-xl border border-orange-200 bg-orange-50/50 p-4 transition-colors hover:bg-orange-50">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                            {c.pegawai.nama_lengkap.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold">{c.pegawai.nama_lengkap}</p>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium capitalize shadow-sm">
                                                    {jenisLabel[c.jenis] || c.jenis}
                                                </span>
                                                <span>{formatDate(c.tanggal_mulai)} - {formatDate(c.tanggal_selesai)}</span>
                                                <span className="font-medium text-foreground">({c.jumlah_hari} hari)</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setApproveModal({ cuti: c, action: 'disetujui' })}
                                                className="inline-flex items-center gap-1 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-700 shadow-sm hover:bg-green-50"
                                            >
                                                <CheckCircle2 size={13} /> Setujui
                                            </button>
                                            <button
                                                onClick={() => setApproveModal({ cuti: c, action: 'ditolak' })}
                                                className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm hover:bg-red-50"
                                            >
                                                <XCircle size={13} /> Tolak
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-1 rounded-lg bg-muted p-1">
                        {(['semua', 'menunggu', 'disetujui', 'ditolak'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                                    filter === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {f === 'semua' ? 'Semua' : f}
                                {f === 'menunggu' && stats.menunggu > 0 && (
                                    <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                                        {stats.menunggu}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        placeholder="Cari nama, NIP, jenis..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm sm:w-64"
                    />
                </div>

                <div className="rounded-xl border bg-card">
                    <div className="overflow-x-auto">
                        <table className="min-w-[700px] w-full text-left text-sm">
                            <thead>
                                <tr className="border-b text-muted-foreground">
                                    <th className="p-4">No</th>
                                    <th className="p-4">Pegawai</th>
                                    <th className="p-4">Jenis</th>
                                    <th className="p-4">Periode</th>
                                    <th className="p-4">Hari</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-muted-foreground">
                                            Memuat data...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-muted-foreground">
                                            Tidak ada data ditemukan.
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((c, i) => (
                                        <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                                            <td className="p-4 text-muted-foreground">{i + 1}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                        {c.pegawai.nama_lengkap.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{c.pegawai.nama_lengkap}</p>
                                                        <p className="text-xs text-muted-foreground">{c.pegawai.nip}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 capitalize">{jenisLabel[c.jenis] || c.jenis}</td>
                                            <td className="p-4">
                                                <p>{formatDate(c.tanggal_mulai)}</p>
                                                <p className="text-xs text-muted-foreground">s/d {formatDate(c.tanggal_selesai)}</p>
                                            </td>
                                            <td className="p-4 text-center font-medium">{c.jumlah_hari}</td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(c.status)}`}>
                                                    {statusIcon(c.status)}
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => setDetail(c)}
                                                        className="rounded bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                                                    >
                                                        Detail
                                                    </button>
                                                    {canApprove && c.status === 'menunggu' && (
                                                        <>
                                                            <button
                                                                onClick={() => setApproveModal({ cuti: c, action: 'disetujui' })}
                                                                className="rounded bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
                                                            >
                                                                Setujui
                                                            </button>
                                                            <button
                                                                onClick={() => setApproveModal({ cuti: c, action: 'ditolak' })}
                                                                className="rounded bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                                                            >
                                                                Tolak
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {detail && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setDetail(null)}>
                    <div
                        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
                            <h3 className="font-bold">Detail Pengajuan Cuti</h3>
                            <button onClick={() => setDetail(null)} className="rounded-full p-1.5 hover:bg-muted">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="px-5 pb-5">
                            <div className="flex items-center gap-3 border-b py-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                    {detail.pegawai.nama_lengkap.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-semibold">{detail.pegawai.nama_lengkap}</p>
                                    <p className="text-xs text-muted-foreground">NIP {detail.pegawai.nip}</p>
                                </div>
                                <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(detail.status)}`}>
                                    {detail.status}
                                </span>
                            </div>

                            <div className="space-y-3 border-b py-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Jenis Cuti</span>
                                    <span className="text-sm font-medium capitalize">{jenisLabel[detail.jenis] || detail.jenis}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Periode</span>
                                    <span className="text-sm font-medium">{formatDate(detail.tanggal_mulai)} - {formatDate(detail.tanggal_selesai)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Durasi</span>
                                    <span className="text-sm font-medium">{detail.jumlah_hari} hari</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Diajukan</span>
                                    <span className="text-sm font-medium">{formatDateTime(detail.created_at)}</span>
                                </div>
                            </div>

                            <div className="border-b py-4">
                                <p className="mb-1 text-xs font-medium text-muted-foreground">Alasan</p>
                                <p className="text-sm">{detail.alasan}</p>
                            </div>

                            {detail.catatan_persetujuan && (
                                <div className="py-4">
                                    <p className="mb-1 text-xs font-medium text-muted-foreground">Catatan Persetujuan</p>
                                    <p className="text-sm">{detail.catatan_persetujuan}</p>
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

            {createModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setCreateModal(false)}>
                    <div
                        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                    <CalendarDays size={18} className="text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-bold">Ajukan Cuti (Atas Nama)</h3>
                                    <p className="text-xs text-muted-foreground">HRD / admin mengajukan cuti untuk pegawai</p>
                                </div>
                            </div>
                            <button onClick={() => setCreateModal(false)} className="rounded-full p-1.5 hover:bg-muted">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4 px-5 py-5">
                            {createErrors.form && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                                    {createErrors.form}
                                </div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-sm font-medium">
                                    Pegawai <span className="text-destructive">*</span>
                                </label>
                                <select
                                    value={createForm.pegawai_id}
                                    onChange={(e) => setCreateForm({ ...createForm, pegawai_id: e.target.value })}
                                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                                >
                                    <option value="">Pilih pegawai</option>
                                    {pegawaiList.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.nama_lengkap}{p.nip ? ` — ${p.nip}` : ''}
                                        </option>
                                    ))}
                                </select>
                                {createErrors.pegawai_id && <p className="mt-1 text-xs text-destructive">{createErrors.pegawai_id}</p>}
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium">
                                    Jenis Cuti <span className="text-destructive">*</span>
                                </label>
                                <select
                                    value={createForm.jenis}
                                    onChange={(e) => setCreateForm({ ...createForm, jenis: e.target.value })}
                                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                                >
                                    <option value="">Pilih jenis cuti</option>
                                    <option value="tahunan">Cuti Tahunan</option>
                                    <option value="sakit">Cuti Sakit</option>
                                    <option value="melahirkan">Cuti Melahirkan</option>
                                    <option value="besar">Cuti Besar</option>
                                    <option value="alasan_penting">Alasan Penting</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium">Tanggal Mulai <span className="text-destructive">*</span></label>
                                    <input
                                        type="date"
                                        value={createForm.tanggal_mulai}
                                        onChange={(e) => setCreateForm({ ...createForm, tanggal_mulai: e.target.value })}
                                        className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium">Tanggal Selesai <span className="text-destructive">*</span></label>
                                    <input
                                        type="date"
                                        value={createForm.tanggal_selesai}
                                        onChange={(e) => setCreateForm({ ...createForm, tanggal_selesai: e.target.value })}
                                        min={createForm.tanggal_mulai || undefined}
                                        className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium">Alasan <span className="text-destructive">*</span></label>
                                <textarea
                                    value={createForm.alasan}
                                    onChange={(e) => setCreateForm({ ...createForm, alasan: e.target.value })}
                                    rows={3}
                                    placeholder="Alasan pengajuan cuti..."
                                    className="w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm"
                                />
                            </div>
                        </div>

                        <div className="sticky bottom-0 flex gap-3 border-t bg-white px-5 py-3">
                            <button
                                onClick={() => setCreateModal(false)}
                                className="flex-1 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted"
                            >
                                Batal
                            </button>
                            <button
                                onClick={submitCutiFor}
                                disabled={createProcessing}
                                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: '#1a3a2a' }}
                            >
                                {createProcessing ? 'Mengirim...' : 'Ajukan Cuti'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {approveModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setApproveModal(null)}>
                    <div
                        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
                            <h3 className="font-bold">
                                {approveModal.action === 'disetujui' ? 'Setujui' : 'Tolak'} Pengajuan
                            </h3>
                            <button onClick={() => setApproveModal(null)} className="rounded-full p-1.5 hover:bg-muted">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="px-5 py-5">
                            <div className="mb-4 rounded-lg bg-muted/50 p-4">
                                <p className="text-sm font-medium">{approveModal.cuti.pegawai.nama_lengkap}</p>
                                <p className="text-xs text-muted-foreground">
                                    {jenisLabel[approveModal.cuti.jenis]} · {formatDate(approveModal.cuti.tanggal_mulai)} - {formatDate(approveModal.cuti.tanggal_selesai)} · {approveModal.cuti.jumlah_hari} hari
                                </p>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium">
                                    Catatan {approveModal.action === 'ditolak' ? '(wajib)' : '(opsional)'}
                                </label>
                                <textarea
                                    value={catatan}
                                    onChange={(e) => setCatatan(e.target.value)}
                                    rows={3}
                                    placeholder={approveModal.action === 'disetujui' ? 'Berikan catatan persetujuan...' : 'Berikan alasan penolakan...'}
                                    className="w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm"
                                />
                            </div>
                        </div>
                        <div className="sticky bottom-0 flex gap-3 border-t bg-white px-5 py-3">
                            <button
                                onClick={() => setApproveModal(null)}
                                className="flex-1 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted"
                            >
                                Batal
                            </button>
                            <button
                                onClick={submitApprove}
                                disabled={processing || (approveModal.action === 'ditolak' && !catatan)}
                                className={`flex-1 rounded-xl py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 ${
                                    approveModal.action === 'disetujui' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                {processing ? 'Memproses...' : approveModal.action === 'disetujui' ? 'Setujui' : 'Tolak'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}