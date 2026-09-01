import AppLayout from '@/Layouts/AppLayout';
import Head from '@/Components/Head';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Badge } from '@/Components/ui/badge';
import { Edit, Info, Plus } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useEffect, useState } from 'react';

interface Role {
    id: number;
    name: string;
    description?: string;
    permissions?: string[];
}

const ROLE_ORDER = ['admin', 'operator', 'pimpinan', 'operator_bsdm', 'pegawai', 'dosen'];

export default function Index() {
    const [roles, setRoles] = useState<Role[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        api.get('/roles')
            .then(({ data }) => {
                if (cancelled) return;
                const list: Role[] = data?.data ?? [];
                const ordered = [...list].sort((a, b) => {
                    const ia = ROLE_ORDER.indexOf(a.name);
                    const ib = ROLE_ORDER.indexOf(b.name);
                    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                });
                setRoles(ordered);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(errorMessage(err));
                setRoles(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    const renderedRoles = roles ?? [
        {
            id: 0,
            name: '—',
            permissions: [],
        },
    ];

    return (
        <AppLayout title="Manajemen Role & Hak Akses">
            <Head title="Manajemen Role" />

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Manajemen Role & Hak Akses</h2>
                        <p className="text-muted-foreground mt-1">
                            Kelola role pengguna dan tentukan hak akses menu untuk masing-masing role.
                        </p>
                    </div>
                    {roles && (
                        <Link
                            to="/settings/roles/create"
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                            <Plus size={16} /> Tambah Role
                        </Link>
                    )}
                </div>

                {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <Info size={18} className="mt-0.5 shrink-0" />
                        <p>Gagal memuat data role dari API: {error}. Hubungi administrator.</p>
                    </div>
                )}

                {loading && (
                    <div className="flex h-40 items-center justify-center text-muted-foreground">
                        Memuat data role...
                    </div>
                )}

                {!loading && !error && (
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama Role</TableHead>
                                        <TableHead>Jumlah Hak Akses</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {renderedRoles.map((role) => (
                                        <TableRow key={role.name}>
                                            <TableCell className="font-medium">
                                                {role.name}
                                                {role.name === 'admin' && (
                                                    <Badge variant="destructive" className="ml-2">System (Locked)</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {Array.isArray(role.permissions) ? role.permissions.length : 0} Permissions
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {role.name !== 'admin' ? (
                                                    <Link
                                                        to={`/settings/roles/${role.name}/edit`}
                                                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
                                                    >
                                                        <Edit size={16} className="mr-1" /> Edit Akses
                                                    </Link>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">Tidak dapat diubah</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {renderedRoles.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-32 text-muted-foreground">
                                                Tidak ada data role.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}