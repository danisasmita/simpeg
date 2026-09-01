import Head from '@/Components/Head';
import AppLayout from '@/Layouts/AppLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import Card3D from '@/Components/ui/card-3d';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Download, FileText, Users } from 'lucide-react';
import { useAuth } from '@/Contexts/AuthContext';
import { api, errorMessage } from '@/lib/api';
import { useEffect, useState } from 'react';
import type { LaporanPegawai, LaporanPegawaiSummary, MasterItem } from '@/types';

const statusBadge = (status: string) => (
    <Badge variant={status === 'aktif' ? 'default' : 'secondary'}>{status}</Badge>
);

const statusOptions = ['aktif', 'nonaktif', 'pensiun', 'meninggal'];

export default function LaporanIndex() {
    const { can } = useAuth();
    const [rows, setRows] = useState<LaporanPegawai[]>([]);
    const [summary, setSummary] = useState<LaporanPegawaiSummary | null>(null);
    const [units, setUnits] = useState<MasterItem[]>([]);
    const [statusAktif, setStatusAktif] = useState('');
    const [unitKerjaID, setUnitKerjaID] = useState('');
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [laporanRes, unitsRes] = await Promise.all([
                api.get('/laporan/pegawai', {
                    params: {
                        status_aktif: statusAktif || undefined,
                        unit_kerja_id: unitKerjaID || undefined,
                    },
                }),
                api.get('/unit-kerja'),
            ]);
            setRows(laporanRes.data?.data ?? []);
            setSummary(laporanRes.data?.summary ?? null);
            setUnits(unitsRes.data?.data ?? []);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const downloadCsv = async () => {
        if (!can('laporan.export')) return;
        setExporting(true);
        try {
            const res = await api.get('/laporan/pegawai/export', {
                params: {
                    status_aktif: statusAktif || undefined,
                    unit_kerja_id: unitKerjaID || undefined,
                },
                responseType: 'blob',
            });
            const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `laporan-pegawai-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setExporting(false);
        }
    };

    const selectedUnit = units.find((unit) => unit.id === Number(unitKerjaID));

    return (
        <AppLayout title="Laporan">
            <Head title="Laporan" />

            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">Data Kepegawaian</p>
                        <h2 className="text-3xl font-extrabold text-foreground">Laporan Kepegawaian</h2>
                        <p className="mt-2 text-muted-foreground">Rekap data pegawai Universitas Muhammadiyah Lampung.</p>
                    </div>
                    {can('laporan.export') && (
                        <Button onClick={downloadCsv} disabled={exporting || loading} className="rounded-xl px-5 shadow-lg shadow-primary/20">
                            <Download size={16} className="mr-2" /> {exporting ? 'Menyiapkan...' : 'Export CSV'}
                        </Button>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Card3D className="p-5" disableHover>
                        <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                                <Users size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Pegawai</p>
                                <p className="text-2xl font-extrabold text-foreground">{summary?.total ?? '-'}</p>
                            </div>
                        </div>
                    </Card3D>
                    <Card3D className="p-5" disableHover>
                        <div className="mb-2 flex items-center gap-2">
                            <p className="text-sm font-bold text-foreground">Status Kepegawaian</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {summary && Object.keys(summary.by_status_kepegawaian).length > 0 ? (
                                Object.entries(summary.by_status_kepegawaian).map(([nama, count]) => (
                                    <Badge key={nama} variant="outline" className="px-2.5 py-1">
                                        {nama}: <span className="font-bold">{count}</span>
                                    </Badge>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">Belum ada data</p>
                            )}
                        </div>
                    </Card3D>
                    <Card3D className="p-5" disableHover>
                        <div className="mb-2 flex items-center gap-2">
                            <p className="text-sm font-bold text-foreground">Status Aktif</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {summary && Object.keys(summary.by_status_aktif).length > 0 ? (
                                Object.entries(summary.by_status_aktif).map(([nama, count]) => (
                                    <Badge key={nama} variant={nama === 'aktif' ? 'default' : 'secondary'} className="px-2.5 py-1">
                                        {nama}: <span className="font-bold">{count}</span>
                                    </Badge>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">Belum ada data</p>
                            )}
                        </div>
                    </Card3D>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_12px_32px_rgba(12,75,49,0.08)]">
                    <div className="flex flex-col gap-3 border-b border-border bg-[linear-gradient(90deg,hsl(var(--secondary)),hsl(var(--card)))] p-5 sm:flex-row">
                        <div className="flex items-center gap-2">
                            <FileText size={16} className="text-muted-foreground" />
                            <span className="text-sm font-bold text-foreground">Filter Laporan</span>
                        </div>
                        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:justify-end">
                            <Select value={statusAktif || 'all'} onValueChange={(value) => setStatusAktif(value === 'all' ? '' : value)}>
                                <SelectTrigger className="w-full sm:w-[190px]">
                                    <SelectValue placeholder="Status Aktif" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Status</SelectItem>
                                    {statusOptions.map((option) => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={unitKerjaID || 'all'} onValueChange={(value) => setUnitKerjaID(value === 'all' ? '' : value)}>
                                <SelectTrigger className="w-full sm:w-[220px]">
                                    <SelectValue placeholder="Unit Kerja">{selectedUnit?.nama ?? 'Semua Unit Kerja'}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Unit Kerja</SelectItem>
                                    {units.map((unit) => (
                                        <SelectItem key={unit.id} value={String(unit.id)}>{unit.nama}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" onClick={load} disabled={loading}>
                                Terapkan
                            </Button>
                        </div>
                    </div>
                    {error && (
                        <div className="border-b border-border bg-red-50 px-5 py-3 text-sm font-medium text-red-600">{error}</div>
                    )}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-bold text-foreground">No</TableHead>
                                    <TableHead className="font-bold text-foreground">NIP</TableHead>
                                    <TableHead className="font-bold text-foreground">Nama Lengkap</TableHead>
                                    <TableHead className="font-bold text-foreground">Unit Kerja</TableHead>
                                    <TableHead className="font-bold text-foreground">Jabatan</TableHead>
                                    <TableHead className="font-bold text-foreground">Golongan</TableHead>
                                    <TableHead className="font-bold text-foreground">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Memuat data...</TableCell>
                                    </TableRow>
                                ) : rows.length ? rows.map((row, index) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell className="font-bold text-primary">{row.nip ?? '-'}</TableCell>
                                        <TableCell>
                                            <div>{row.nama_lengkap}</div>
                                            {row.email_institusi && (
                                                <div className="text-xs text-muted-foreground">{row.email_institusi}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>{row.unit_kerja ?? '-'}</TableCell>
                                        <TableCell>{row.jabatan ?? '-'}</TableCell>
                                        <TableCell>{row.golongan ?? '-'}</TableCell>
                                        <TableCell>{statusBadge(row.status_aktif)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            Belum ada data pegawai.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-5 py-4 text-sm font-medium text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <div>Menampilkan {rows.length} data pegawai</div>
                        {summary && (
                            <div className="flex flex-wrap gap-3">
                                {Object.entries(summary.by_unit_kerja).map(([nama, count]) => (
                                    <span key={nama} className="inline-flex items-center gap-1">
                                        <span className="text-foreground">{count}</span> {nama}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}