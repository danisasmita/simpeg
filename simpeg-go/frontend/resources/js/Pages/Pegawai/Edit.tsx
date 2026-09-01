import AppLayout from '@/Layouts/AppLayout';
import Head from '@/Components/Head';
import FormPegawai from './Partials/FormPegawai';
import { api, errorMessage } from '@/lib/api';
import { ChevronRight, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { MasterItem, Pegawai } from '@/types';

export default function Edit() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [pegawai, setPegawai] = useState<Pegawai | null>(null);
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
                const [p, u, j, g, s] = await Promise.all([
                    api.get(`/pegawai/${id}`),
                    api.get('/unit-kerja'),
                    api.get('/jabatan'),
                    api.get('/golongan'),
                    api.get('/status-kepegawaian'),
                ]);
                if (cancelled) return;
                setPegawai(p.data?.data ?? null);
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
    }, [id]);

    return (
        <AppLayout title={pegawai ? `Edit Pegawai - ${pegawai.nama_lengkap}` : 'Edit Pegawai'}>
            <Head title={pegawai ? `Edit ${pegawai.nama_lengkap}` : 'Edit Pegawai'} />

            <div className="space-y-6">
                <div className="flex items-center text-sm text-muted-foreground space-x-2">
                    <Link to="/pegawai" className="hover:text-foreground flex items-center">
                        <Users size={16} className="mr-1" />
                        Data Pegawai
                    </Link>
                    <ChevronRight size={16} />
                    {pegawai && (
                        <>
                            <Link to={`/pegawai/${pegawai.id}`} className="hover:text-foreground">
                                {pegawai.nama_lengkap}
                            </Link>
                            <ChevronRight size={16} />
                        </>
                    )}
                    <span className="text-foreground font-medium">Edit Profil</span>
                </div>

                <div>
                    <h2 className="text-2xl font-bold text-foreground">Edit Profil Pegawai</h2>
                    <p className="text-muted-foreground mt-1">
                        Perbarui informasi detail untuk pegawai ini.
                    </p>
                </div>

                {error && (
                    <div className="max-w-4xl rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
                        {error}
                    </div>
                )}

                <div className="max-w-4xl">
                    {!loading && pegawai && (
                        <FormPegawai
                            pegawai={pegawai}
                            unitKerjas={unitKerjas}
                            jabatans={jabatans}
                            golongans={golongans}
                            statusKepegawaians={statusKepegawaians}
                            submitLabel="Simpan Perubahan"
                            onSaved={() => navigate('/pegawai')}
                        />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}