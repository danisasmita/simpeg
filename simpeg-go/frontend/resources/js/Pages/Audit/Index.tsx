import AppLayout from '@/Layouts/AppLayout';
import Head from '@/Components/Head';
import { useEffect, useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { api, errorMessage } from '@/lib/api';
import { Info, RefreshCw } from 'lucide-react';

interface AuditAction {
    label: string;
    variant?: 'secondary' | 'destructive' | 'outline';
}

const ACTION_META: Record<string, AuditAction> = {
    AUTH_LOGIN: { label: 'Login' },
    AUTH_LOGIN_FAILED: { label: 'Login Gagal', variant: 'destructive' },
    AUTH_REGISTER: { label: 'Registrasi', variant: 'outline' },
    AUTH_VERIFY_EMAIL: { label: 'Verifikasi Email', variant: 'outline' },
    AUTH_FORGOT_PASSWORD: { label: 'Lupa Password', variant: 'outline' },
    AUTH_RESET_PASSWORD: { label: 'Reset Password', variant: 'outline' },
};

const KNOWN_MODULES = ['PEGAWAI', 'CUTI', 'ABSENSI', 'UNIT_KERJA', 'JABATAN', 'GOLONGAN', 'STATUS_KEPEGAWAIAN', 'DOKUMEN', 'RIWAYAT', 'AUTH', 'ROLES', 'SETTINGS'];

interface AuditEntry {
    id: number;
    user_id: number | null;
    actor: string;
    module: string;
    action: string;
    resource_id: string;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    ip_address: string;
    created_at: string;
}

const pageSize = 20;

export default function Index() {
    const [entries, setEntries] = useState<AuditEntry[] | null>(null);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [module, setModule] = useState('all');
    const [action, setAction] = useState('all');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [page, setPage] = useState(1);

    const modules = useMemo(() => {
        const seen = new Set(KNOWN_MODULES);
        entries?.forEach((e) => seen.add(e.module));
        return [...seen].sort();
    }, [entries]);

    const actions = useMemo(() => {
        const seen = new Set<string>();
        entries?.forEach((e) => seen.add(e.action));
        return [...seen].sort();
    }, [entries]);

    const fetchData = () => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(pageSize));
        if (module !== 'all') params.set('module', module);
        if (action !== 'all') params.set('action', action);
        if (from) params.set('from', from);
        if (to) params.set('to', to);

        setLoading(true);
        api.get(`/audit-logs?${params.toString()}`)
            .then(({ data }) => {
                setEntries(data?.data ?? []);
                setTotal(data?.total ?? 0);
                setError(null);
            })
            .catch((err) => setError(errorMessage(err)))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, [page]);

    const applyFilters = () => { setPage(1); fetchData(); };
    const resetFilters = () => {
        setModule('all');
        setAction('all');
        setFrom('');
        setTo('');
        setPage(1);
    };

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const actionMeta = (action: string): AuditAction =>
        ACTION_META[action] ?? { label: action.replace(/_/g, ' ') };

    const formatTime = (iso: string) =>
        new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

    const renderDiff = (values: Record<string, unknown> | null) => {
        if (!values || Object.keys(values).length === 0) return null;
        return (
            <pre className="whitespace-pre-wrap rounded-md bg-muted/60 px-2 py-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {JSON.stringify(values, null, 2)}
            </pre>
        );
    };

    return (
        <AppLayout title="Audit Log">
            <Head title="Audit Log" />

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Audit Log</h2>
                        <p className="text-muted-foreground mt-1">
                            Jejak transaksi bisnis pengguna: siapa, kapan, dari mana, dan data apa yang diubah.
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                        <div className="col-span-2 space-y-1.5 md:col-span-1">
                            <label className="text-xs font-medium text-muted-foreground">Modul</label>
                            <Select value={module} onValueChange={setModule}>
                                <SelectTrigger><SelectValue placeholder="Semua modul" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua modul</SelectItem>
                                    {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2 space-y-1.5 md:col-span-1">
                            <label className="text-xs font-medium text-muted-foreground">Aksi</label>
                            <Select value={action} onValueChange={setAction}>
                                <SelectTrigger><SelectValue placeholder="Semua aksi" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua aksi</SelectItem>
                                    {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Dari</label>
                            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Sampai</label>
                            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                        </div>
                        <div className="col-span-2 flex items-end gap-2 md:col-span-1">
                            <Button onClick={applyFilters} className="flex-1">Filter</Button>
                            <Button variant="outline" onClick={resetFilters} aria-label="Reset filter">
                                <RefreshCw size={15} />
                            </Button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <Info size={18} className="mt-0.5 shrink-0" />
                        <p>Gagal memuat audit log: {error}.</p>
                    </div>
                )}

                {loading && (
                    <div className="flex h-40 items-center justify-center text-muted-foreground">Memuat audit log...</div>
                )}

                {!loading && !error && (
                    <>
                        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Waktu</TableHead>
                                            <TableHead>Modul / Aksi</TableHead>
                                            <TableHead>Pengguna</TableHead>
                                            <TableHead>Resource</TableHead>
                                            <TableHead>Perubahan Data</TableHead>
                                            <TableHead>IP</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(entries ?? []).map((e) => {
                                            const meta = actionMeta(e.action);
                                            return (
                                                <TableRow key={e.id} className="align-top">
                                                    <TableCell className="whitespace-nowrap text-sm">{formatTime(e.created_at)}</TableCell>
                                                    <TableCell className="w-40">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <Badge variant="outline">{e.module}</Badge>
                                                            <Badge variant={meta.variant ?? 'secondary'}>{meta.label}</Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm font-medium">{e.actor || '—'}</div>
                                                        {e.user_id != null && (
                                                            <div className="text-xs text-muted-foreground">ID: {e.user_id}</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                                        {e.resource_id || '—'}
                                                    </TableCell>
                                                    <TableCell className="max-w-xs">
                                                        {renderDiff(e.old_values) ? (
                                                            <div className="space-y-1">
                                                                <div className="text-[10px] font-bold uppercase tracking-wider text-destructive">Sebelum</div>
                                                                {renderDiff(e.old_values)}
                                                            </div>
                                                        ) : null}
                                                        {renderDiff(e.new_values) ? (
                                                            <div className="space-y-1">
                                                                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Sesudah</div>
                                                                {renderDiff(e.new_values)}
                                                            </div>
                                                        ) : null}
                                                        {!e.old_values && !e.new_values && (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{e.ip_address || '—'}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {(entries ?? []).length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                                                    Tidak ada data audit log.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
                            <span>Total {total} catatan</span>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                                    Sebelumnya
                                </Button>
                                <span>Halaman {page} / {totalPages}</span>
                                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                                    Berikutnya
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}