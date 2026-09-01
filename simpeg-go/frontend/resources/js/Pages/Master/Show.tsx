import Head from '@/Components/Head';
import AppLayout from '@/Layouts/AppLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useAuth } from '@/Contexts/AuthContext';
import { api, errorMessage } from '@/lib/api';
import { findMasterName, indexPathFor, isMasterType, masterTitle, apiPathForMaster } from '@/lib/master';
import { ChevronRight, Edit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { MasterItem } from '@/types';

export default function MasterShow() {
    const { type, id } = useParams<{ type: string; id: string }>();
    const { can } = useAuth();
    const title = masterTitle(type ?? '');
    const apiPath = apiPathForMaster(type ?? '');
    const [master, setMaster] = useState<MasterItem | null>(null);
    const [units, setUnits] = useState<MasterItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!apiPath || !id) return;
        let cancelled = false;
        const load = async () => {
            try {
                const [masterRes, unitsRes] = await Promise.all([
                    api.get(`${apiPath}/${id}`),
                    type === 'unit-kerja' || type === 'jabatan' ? api.get('/unit-kerja') : Promise.resolve(null),
                ]);
                if (cancelled) return;
                setMaster(masterRes.data?.data ?? null);
                setUnits(unitsRes?.data?.data ?? []);
            } catch (err) {
                if (!cancelled) setError(errorMessage(err));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [apiPath, id, type]);

    const canEdit = can('master.update');

    const rows = master ? [
        ['Kode', master.kode ?? '-'],
        ['Nama', master.nama ?? '-'],
        ...(type === 'unit-kerja' ? [
            ['Singkatan', master.singkatan || '-'],
            ['Induk Unit Kerja', findMasterName(units, master.parent_id)],
            ['Tipe', master.tipe ?? '-'],
        ] : []),
        ...(type === 'jabatan' ? [
            ['Unit Kerja', findMasterName(units, master.unit_kerja_id)],
            ['Jenis', master.jenis ?? '-'],
        ] : []),
        ...(type === 'golongan' ? [['Urutan', String(master.urutan ?? '-')]] : []),
        ...(type !== 'golongan' ? [['Status', master.is_aktif ? 'Aktif' : 'Tidak Aktif']] : []),
    ] : [];

    return (
        <AppLayout title={`Detail ${title}`}>
            <Head title={`Detail ${title}`} />
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link to={indexPathFor(type ?? '')} className="hover:text-foreground">{title}</Link>
                    <ChevronRight size={16} />
                    <span>Detail</span>
                </div>

                {error && (
                    <div className="max-w-3xl rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
                        {error}
                    </div>
                )}

                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold">{master?.nama ?? (loading ? 'Memuat...' : 'Tidak ditemukan')}</h2>
                        <p className="mt-1 text-muted-foreground">Detail {title.toLowerCase()}.</p>
                    </div>
                    {canEdit && master && (
                        <Button asChild>
                            <Link to={`/master/${type}/${master.id}/edit`}>
                                <Edit size={16} className="mr-2" /> Edit
                            </Link>
                        </Button>
                    )}
                </div>

                {!isMasterType(type ?? '') ? (
                    <div className="text-center text-muted-foreground">Jenis master data tidak dikenal.</div>
                ) : (
                    <Card className="max-w-3xl">
                        <CardHeader><CardTitle>Informasi {title}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {rows.length ? rows.map(([label, value]) => (
                                <div key={label} className="grid grid-cols-3 border-b border-border pb-3 text-sm">
                                    <span className="font-medium text-muted-foreground">{label}</span>
                                    <span className="col-span-2">
                                        {label === 'Status'
                                            ? <Badge variant={value === 'Aktif' ? 'default' : 'secondary'}>{value}</Badge>
                                            : <span className="capitalize">{value}</span>}
                                    </span>
                                </div>
                            )) : (
                                <div className="text-center text-muted-foreground">Data tidak tersedia.</div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}