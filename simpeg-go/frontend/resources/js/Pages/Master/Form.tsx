import Head from '@/Components/Head';
import AppLayout from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { ChevronRight } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '@/lib/api';
import { apiPathForMaster, indexPathFor, isMasterType, masterTitle } from '@/lib/master';
import { FormEvent, useEffect, useState } from 'react';
import type { MasterItem } from '@/types';

interface Fields {
    kode: string;
    nama: string;
    singkatan: string;
    parent_id: string;
    unit_kerja_id: string;
    tipe: string;
    jenis: string;
    urutan: number;
    is_aktif: boolean;
}

export default function MasterForm() {
    const { type, id } = useParams<{ type: string; id?: string }>();
    const navigate = useNavigate();
    const title = masterTitle(type ?? '');
    const apiPath = apiPathForMaster(type ?? '');
    const editing = Boolean(id);

    const [fields, setFields] = useState<Fields>({
        kode: '',
        nama: '',
        singkatan: '',
        parent_id: '',
        unit_kerja_id: '',
        tipe: 'unit',
        jenis: 'struktural',
        urutan: 0,
        is_aktif: true,
    });
    const [units, setUnits] = useState<MasterItem[]>([]);
    const [processing, setProcessing] = useState(false);
    const [loading, setLoading] = useState(editing);
    const [error, setError] = useState<string | null>(null);

    const set = <K extends keyof Fields>(key: K, value: Fields[K]) =>
        setFields((prev) => ({ ...prev, [key]: value }));

    useEffect(() => {
        if (!apiPath || !isMasterType(type ?? '')) return;
        let cancelled = false;
        const load = async () => {
            try {
                const [unitsRes, masterRes] = await Promise.all([
                    api.get('/unit-kerja'),
                    editing ? api.get(`${apiPath}/${id}`) : Promise.resolve(null),
                ]);
                if (cancelled) return;
                setUnits(unitsRes.data?.data ?? []);
                if (masterRes?.data?.data) {
                    const m = masterRes.data.data as MasterItem;
                    setFields((prev) => ({
                        ...prev,
                        kode: m.kode ?? '',
                        nama: m.nama ?? '',
                        singkatan: m.singkatan ?? '',
                        parent_id: m.parent_id ? String(m.parent_id) : '',
                        unit_kerja_id: m.unit_kerja_id ? String(m.unit_kerja_id) : '',
                        tipe: m.tipe ?? 'unit',
                        jenis: m.jenis ?? 'struktural',
                        urutan: m.urutan ?? 0,
                        is_aktif: m.is_aktif ?? true,
                    }));
                }
            } catch (err) {
                if (!cancelled) setError(errorMessage(err));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [apiPath, editing, id]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setProcessing(true);
        setError(null);
        const payload: Record<string, unknown> = {
            kode: fields.kode,
            nama: fields.nama,
            is_aktif: fields.is_aktif,
        };
        if (type === 'unit-kerja') {
            payload.singkatan = fields.singkatan || null;
            payload.parent_id = fields.parent_id ? Number(fields.parent_id) : null;
            payload.tipe = fields.tipe;
        } else if (type === 'jabatan') {
            payload.unit_kerja_id = fields.unit_kerja_id ? Number(fields.unit_kerja_id) : null;
            payload.jenis = fields.jenis;
        } else if (type === 'golongan') {
            payload.urutan = fields.urutan;
            delete payload.is_aktif;
        }
        try {
            if (editing) {
                await api.put(`${apiPath}/${id}`, payload);
            } else {
                await api.post(apiPath, payload);
            }
            navigate(indexPathFor(type ?? ''), { replace: true });
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setProcessing(false);
        }
    };

    if (!isMasterType(type ?? '')) {
        return (
            <AppLayout title="Master Data">
                <div className="text-center text-muted-foreground">Jenis master data tidak dikenal.</div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title={`${editing ? 'Edit' : 'Tambah'} ${title}`}>
            <Head title={`${editing ? 'Edit' : 'Tambah'} ${title}`} />
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link to={indexPathFor(type ?? '')} className="hover:text-foreground">{title}</Link>
                    <ChevronRight size={16} />
                    <span>{editing ? 'Edit' : 'Tambah Baru'}</span>
                </div>
                <div>
                    <h2 className="text-2xl font-bold">{editing ? `Edit ${title}` : `Tambah ${title}`}</h2>
                    <p className="mt-1 text-muted-foreground">Lengkapi data master di bawah ini.</p>
                </div>

                {error && (
                    <div className="max-w-3xl rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
                        {error}
                    </div>
                )}

                <form onSubmit={submit} className="max-w-3xl">
                    <Card>
                        <CardHeader><CardTitle>Informasi {title}</CardTitle></CardHeader>
                        <CardContent className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="kode">Kode</Label>
                                <Input id="kode" value={fields.kode} onChange={(e) => set('kode', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nama">Nama</Label>
                                <Input id="nama" value={fields.nama} onChange={(e) => set('nama', e.target.value)} />
                            </div>
                            {type === 'unit-kerja' && <>
                                <div className="space-y-2">
                                    <Label htmlFor="singkatan">Singkatan</Label>
                                    <Input id="singkatan" value={fields.singkatan} onChange={(e) => set('singkatan', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Induk Unit Kerja</Label>
                                    <Select
                                        value={fields.parent_id || 'none'}
                                        onValueChange={(value) => set('parent_id', value === 'none' ? '' : value)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Tidak ada</SelectItem>
                                            {units.filter((unit) => unit.id !== Number(id)).map((unit) => (
                                                <SelectItem key={unit.id} value={String(unit.id)}>{unit.nama}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipe</Label>
                                    <Select value={fields.tipe} onValueChange={(value) => set('tipe', value)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {['universitas', 'fakultas', 'program_studi', 'lembaga', 'biro', 'unit'].map((value) => (
                                                <SelectItem key={value} value={value}>{value.replace('_', ' ')}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>}
                            {type === 'jabatan' && <>
                                <div className="space-y-2">
                                    <Label>Unit Kerja</Label>
                                    <Select
                                        value={fields.unit_kerja_id || 'none'}
                                        onValueChange={(value) => set('unit_kerja_id', value === 'none' ? '' : value)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Tidak ada</SelectItem>
                                            {units.map((unit) => (
                                                <SelectItem key={unit.id} value={String(unit.id)}>{unit.nama}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Jenis</Label>
                                    <Select value={fields.jenis} onValueChange={(value) => set('jenis', value)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {['struktural', 'fungsional', 'akademik'].map((value) => (
                                                <SelectItem key={value} value={value}>{value}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>}
                            {type === 'golongan' && (
                                <div className="space-y-2">
                                    <Label htmlFor="urutan">Urutan</Label>
                                    <Input
                                        id="urutan"
                                        type="number"
                                        min="0"
                                        value={fields.urutan}
                                        onChange={(e) => set('urutan', Number(e.target.value))}
                                    />
                                </div>
                            )}
                            {type !== 'golongan' && (
                                <label className="flex items-center gap-2 self-end text-sm font-medium">
                                    <input
                                        type="checkbox"
                                        checked={fields.is_aktif}
                                        onChange={(e) => set('is_aktif', e.target.checked)}
                                        className="h-4 w-4"
                                    />
                                    Status aktif
                                </label>
                            )}
                        </CardContent>
                    </Card>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button type="button" variant="outline" asChild>
                            <Link to={indexPathFor(type ?? '')}>Batal</Link>
                        </Button>
                        <Button type="submit" disabled={processing || loading}>
                            {processing ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : `Simpan ${title}`}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}