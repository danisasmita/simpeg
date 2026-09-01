import Head from '@/Components/Head';
import AppLayout from '@/Layouts/AppLayout';
import { Pegawai } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Badge } from '@/Components/ui/badge';
import { useAuth } from '@/Contexts/AuthContext';
import { api, errorMessage } from '@/lib/api';
import { Search, Plus, Eye, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const LIMIT = 10;

function avatarSrc(p: Pegawai): string {
    if (p.foto_url) return p.foto_url;
    if (p.foto) return `/uploads/${p.foto}`;
    return '/images/avatar-default.png';
}

export default function PegawaiIndex() {
    const { can } = useAuth();
    const [data, setData] = useState<Pegawai[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusAktif, setStatusAktif] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    const fetchPage = useCallback(async (pageNum: number, query: string, status?: string) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: String(pageNum), limit: String(LIMIT) });
            if (query) params.set('search', query);
            if (status) params.set('status_aktif', status);
            const res = await api.get(`/pegawai?${params.toString()}`);
            setData(res.data?.data ?? []);
            setTotal(res.data?.total ?? 0);
            setPage(pageNum);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPage(1, '');
    }, [fetchPage]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchPage(1, search.trim(), statusAktif || undefined);
    };

    return (
        <AppLayout title="Data Pegawai">
            <Head title="Data Pegawai" />

            <div className="space-y-6">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">Direktori Universitas</p>
                        <h2 className="text-3xl font-extrabold text-foreground">Data Pegawai</h2>
                        <p className="mt-2 text-muted-foreground">Kelola data kepegawaian Universitas Muhammadiyah Lampung.</p>
                    </div>
                    {can('pegawai.create') && (
                        <Button asChild className="rounded-xl px-5 shadow-lg shadow-primary/20">
                            <Link to="/pegawai/create">
                                <Plus size={16} className="mr-2" /> Tambah Pegawai
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_12px_32px_rgba(12,75,49,0.08)]">
                    <div className="border-b border-border bg-[linear-gradient(90deg,hsl(var(--secondary)),hsl(var(--card)))] p-5">
                        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
                            <div className="relative flex-1 sm:max-w-md">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari NIP, NIDN, Nama..."
                                    className="pl-9"
                                />
                            </div>
                            <Select value={statusAktif} onValueChange={(v) => { setStatusAktif(v === 'all' ? '' : v); fetchPage(1, search.trim(), v === 'all' ? undefined : v); }}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Status Aktif" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Status</SelectItem>
                                    <SelectItem value="aktif">Aktif</SelectItem>
                                    <SelectItem value="cuti">Cuti</SelectItem>
                                    <SelectItem value="tugas_belajar">Tugas Belajar</SelectItem>
                                    <SelectItem value="pensiun">Pensiun</SelectItem>
                                    <SelectItem value="keluar">Keluar</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button type="submit" variant="secondary" className="font-semibold">Filter</Button>
                        </form>
                    </div>

                    {error && (
                        <div className="border-b border-border bg-red-50 px-5 py-3 text-sm font-medium text-red-600">
                            {error}
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px] font-bold text-foreground">Foto</TableHead>
                                    <TableHead className="font-bold text-foreground">NIP / NIDN</TableHead>
                                    <TableHead className="font-bold text-foreground">Nama Lengkap</TableHead>
                                    <TableHead className="font-bold text-foreground">Unit Kerja</TableHead>
                                    <TableHead className="font-bold text-foreground">Jabatan</TableHead>
                                    <TableHead className="font-bold text-foreground">Status</TableHead>
                                    <TableHead className="text-right font-bold text-foreground">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                                            Memuat data...
                                        </TableCell>
                                    </TableRow>
                                ) : data.length > 0 ? (
                                    data.map((pegawai) => (
                                        <TableRow key={pegawai.id}>
                                            <TableCell>
                                                <img
                                                    src={avatarSrc(pegawai)}
                                                    alt={pegawai.nama_lengkap}
                                                    className="w-10 h-10 rounded-full object-cover border border-border"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{pegawai.nip ?? '-'}</div>
                                                <div className="text-xs text-muted-foreground">{pegawai.nidn || '-'}</div>
                                            </TableCell>
                                            <TableCell>{pegawai.nama_lengkap}</TableCell>
                                            <TableCell>{pegawai.unit_kerja?.nama || '-'}</TableCell>
                                            <TableCell>{pegawai.jabatan?.nama || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant={pegawai.status_aktif === 'aktif' ? 'default' : 'secondary'}>
                                                    {pegawai.status_aktif}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {can('pegawai.view') && (
                                                        <Button variant="ghost" size="icon" asChild>
                                                            <Link to={`/pegawai/${pegawai.id}`}>
                                                                <Eye size={17} className="text-primary" />
                                                            </Link>
                                                        </Button>
                                                    )}
                                                    {can('pegawai.update') && (
                                                        <Button variant="ghost" size="icon" asChild>
                                                            <Link to={`/pegawai/${pegawai.id}/edit`}>
                                                                <Edit size={17} className="text-primary" />
                                                            </Link>
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                                            Tidak ada data pegawai yang ditemukan.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-5 py-4 text-sm font-medium text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            Menampilkan halaman {page} dari {totalPages} — {total} data
                        </div>
                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1 || loading}
                                onClick={() => fetchPage(page - 1, search.trim(), statusAktif || undefined)}
                            >
                                <ChevronLeft size={16} /> Sebelumnya
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages || loading}
                                onClick={() => fetchPage(page + 1, search.trim(), statusAktif || undefined)}
                            >
                                Berikutnya <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}