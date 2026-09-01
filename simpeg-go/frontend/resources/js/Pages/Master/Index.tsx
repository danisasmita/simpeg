import Head from '@/Components/Head';
import AppLayout from '@/Layouts/AppLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Edit, Eye, Plus, Search } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/Contexts/AuthContext';
import { api, errorMessage } from '@/lib/api';
import { findMasterName, masterTitle, apiPathForMaster, isMasterType } from '@/lib/master';
import { useEffect, useMemo, useState } from 'react';
import type { MasterItem } from '@/types';

const statusBadge = (aktif?: boolean) => (
    <Badge variant={aktif === false ? 'secondary' : 'default'}>
        {aktif === false ? 'Tidak Aktif' : 'Aktif'}
    </Badge>
);

export default function MasterIndex() {
    const { type } = useParams<{ type: string }>();
    const { can } = useAuth();
    const title = masterTitle(type ?? '');
    const apiPath = apiPathForMaster(type ?? '');
    const [items, setItems] = useState<MasterItem[]>([]);
    const [units, setUnits] = useState<MasterItem[]>([]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const hasStatus = type !== 'golongan';
    const needsUnits = type === 'unit-kerja' || type === 'jabatan';

    useEffect(() => {
        if (!apiPath || !isMasterType(type ?? '')) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        const fetchAll = async () => {
            try {
                const [main, unitsRes] = await Promise.all([
                    api.get(apiPath),
                    needsUnits ? api.get('/unit-kerja') : Promise.resolve(null),
                ]);
                if (cancelled) return;
                setItems(main.data?.data ?? []);
                setUnits(unitsRes?.data?.data ?? []);
            } catch (err) {
                if (!cancelled) setError(errorMessage(err));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchAll();
        return () => { cancelled = true; };
    }, [apiPath, needsUnits]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return items.filter((item) => {
            const matchSearch = !query ||
                (item.kode ?? '').toLowerCase().includes(query) ||
                (item.nama ?? '').toLowerCase().includes(query);
            const matchStatus = !hasStatus || !status ||
                (status === 'aktif' ? item.is_aktif !== false : item.is_aktif === false);
            return matchSearch && matchStatus;
        });
    }, [items, search, status, hasStatus]);

    if (!isMasterType(type ?? '')) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <AppLayout title={title}>
            <Head title={title} />

            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">Direktori Universitas</p>
                        <h2 className="text-3xl font-extrabold text-foreground">{title}</h2>
                        <p className="mt-2 text-muted-foreground">Kelola referensi {title.toLowerCase()} Universitas Muhammadiyah Lampung.</p>
                    </div>
                    {can('master.create') && (
                        <Button asChild className="rounded-xl px-5 shadow-lg shadow-primary/20">
                            <Link to={`/master/${type}/create`}>
                                <Plus size={16} className="mr-2" /> Tambah {title}
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_12px_32px_rgba(12,75,49,0.08)]">
                    <div className="border-b border-border bg-[linear-gradient(90deg,hsl(var(--secondary)),hsl(var(--card)))] p-5">
                        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3 sm:flex-row">
                            <div className="relative flex-1 sm:max-w-md">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder={`Cari kode atau nama ${title.toLowerCase()}...`}
                                    className="pl-9"
                                />
                            </div>
                            {hasStatus && (
                                <Select value={status || 'all'} onValueChange={(value) => setStatus(value === 'all' ? '' : value)}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Status</SelectItem>
                                        <SelectItem value="aktif">Aktif</SelectItem>
                                        <SelectItem value="tidak_aktif">Tidak Aktif</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
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
                                    <TableHead className="font-bold text-foreground">Kode</TableHead>
                                    <TableHead className="font-bold text-foreground">Nama</TableHead>
                                    {type === 'unit-kerja' && <TableHead className="font-bold text-foreground">Induk / Tipe</TableHead>}
                                    {type === 'jabatan' && <TableHead className="font-bold text-foreground">Unit Kerja</TableHead>}
                                    {type === 'jabatan' && <TableHead className="font-bold text-foreground">Jenis</TableHead>}
                                    {type === 'golongan' && <TableHead className="font-bold text-foreground">Urutan</TableHead>}
                                    {type !== 'golongan' && <TableHead className="font-bold text-foreground">Status</TableHead>}
                                    <TableHead className="text-right font-bold text-foreground">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={type === 'jabatan' ? 6 : type === 'unit-kerja' ? 5 : 4} className="h-32 text-center text-muted-foreground">
                                            Memuat data...
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length ? filtered.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-bold text-primary">{item.kode}</TableCell>
                                        <TableCell>
                                            <div>{item.nama}</div>
                                            {type === 'unit-kerja' && item.singkatan && (
                                                <div className="text-xs text-muted-foreground">{item.singkatan}</div>
                                            )}
                                        </TableCell>
                                        {type === 'unit-kerja' && (
                                            <TableCell>
                                                <div>{findMasterName(units, item.parent_id)}</div>
                                                <div className="text-xs capitalize text-muted-foreground">{item.tipe ?? '-'}</div>
                                            </TableCell>
                                        )}
                                        {type === 'jabatan' && <TableCell>{findMasterName(units, item.unit_kerja_id)}</TableCell>}
                                        {type === 'jabatan' && <TableCell className="capitalize">{item.jenis ?? '-'}</TableCell>}
                                        {type === 'golongan' && <TableCell>{item.urutan ?? '-'}</TableCell>}
                                        {type !== 'golongan' && <TableCell>{statusBadge(item.is_aktif)}</TableCell>}
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link to={`/master/${type}/${item.id}`} aria-label={`Lihat ${item.nama}`}>
                                                        <Eye size={17} className="text-primary" />
                                                    </Link>
                                                </Button>
                                                {can('master.update') && (
                                                    <Button variant="ghost" size="icon" asChild>
                                                        <Link to={`/master/${type}/${item.id}/edit`} aria-label={`Edit ${item.nama}`}>
                                                            <Edit size={17} className="text-primary" />
                                                        </Link>
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={type === 'jabatan' ? 6 : type === 'unit-kerja' ? 5 : 4} className="h-32 text-center text-muted-foreground">
                                            Belum ada data {title.toLowerCase()}.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-5 py-4 text-sm font-medium text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <div>Menampilkan {filtered.length} dari {items.length} data</div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}