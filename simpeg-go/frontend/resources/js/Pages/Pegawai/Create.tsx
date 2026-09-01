import AppLayout from '@/Layouts/AppLayout';
import Head from '@/Components/Head';
import FormPegawai from './Partials/FormPegawai';
import { api, errorMessage } from '@/lib/api';
import { ChevronRight, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { MasterItem } from '@/types';

export default function Create() {
    const navigate = useNavigate();
    const [unitKerjas, setUnitKerjas] = useState<MasterItem[]>([]);
    const [jabatans, setJabatans] = useState<MasterItem[]>([]);
    const [golongans, setGolongans] = useState<MasterItem[]>([]);
    const [statusKepegawaians, setStatusKepegawaians] = useState<MasterItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [u, j, g, s] = await Promise.all([
                    api.get('/unit-kerja'),
                    api.get('/jabatan'),
                    api.get('/golongan'),
                    api.get('/status-kepegawaian'),
                ]);
                if (cancelled) return;
                setUnitKerjas(u.data?.data ?? []);
                setJabatans(j.data?.data ?? []);
                setGolongans(g.data?.data ?? []);
                setStatusKepegawaians(s.data?.data ?? []);
            } catch (err) {
                if (!cancelled) setError(errorMessage(err));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    return (
        <AppLayout title="Tambah Pegawai">
            <Head title="Tambah Pegawai" />

            <div className="space-y-6">
                <div className="flex items-center text-sm text-muted-foreground space-x-2">
                    <Link to="/pegawai" className="hover:text-foreground flex items-center">
                        <Users size={16} className="mr-1" />
                        Data Pegawai
                    </Link>
                    <ChevronRight size={16} />
                    <span className="text-foreground font-medium">Tambah Baru</span>
                </div>

                <div>
                    <h2 className="text-2xl font-bold text-foreground">Tambah Pegawai Baru</h2>
                    <p className="text-muted-foreground mt-1">
                        Masukkan informasi detail pegawai ke dalam sistem.
                    </p>
                </div>

                {error && (
                    <div className="max-w-4xl rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
                        {error}
                    </div>
                )}

                <div className="max-w-4xl">
                    {!loading && (
                        <FormPegawai
                            unitKerjas={unitKerjas}
                            jabatans={jabatans}
                            golongans={golongans}
                            statusKepegawaians={statusKepegawaians}
                            submitLabel="Simpan Pegawai"
                            onSaved={() => navigate('/pegawai')}
                        />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}