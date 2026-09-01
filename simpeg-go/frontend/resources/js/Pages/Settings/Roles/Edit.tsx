import AppLayout from '@/Layouts/AppLayout';
import Head from '@/Components/Head';
import { Link, useParams, Navigate } from 'react-router-dom';
import FormRole from './FormRole';
import { ChevronRight, Settings } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface Role {
    id?: number;
    name: string;
    permissions?: string[];
}

export default function Edit() {
    const { id } = useParams<{ id: string }>();
    const roleName = (id ?? '').toLowerCase();

    const [role, setRole] = useState<Role | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!roleName) return;
        let cancelled = false;
        api.get(`/roles/${encodeURIComponent(roleName)}`)
            .then(({ data }) => {
                if (cancelled) return;
                const r = data?.data;
                if (r) {
                    setRole({ id: r.id, name: r.name, permissions: Array.isArray(r.permissions) ? r.permissions : [] });
                } else {
                    setError('Role tidak ditemukan.');
                }
            })
            .catch((err) => {
                if (cancelled) return;
                setError(errorMessage(err));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [roleName]);

    if (!roleName) {
        return <Navigate to="/settings/roles" replace />;
    }

    return (
        <AppLayout title="Edit Role">
            <Head title="Edit Role" />

            <div className="space-y-6 max-w-5xl">
                <div className="flex items-center text-sm text-muted-foreground space-x-2">
                    <Link to="/settings" className="hover:text-foreground flex items-center">
                        <Settings size={16} className="mr-1" />
                        Pengaturan
                    </Link>
                    <ChevronRight size={16} />
                    <Link to="/settings/roles" className="hover:text-foreground">
                        Manajemen Role
                    </Link>
                    <ChevronRight size={16} />
                    <span className="text-foreground font-medium">Edit: {roleName}</span>
                </div>

                <div>
                    <h2 className="text-2xl font-bold text-foreground">Edit Role: {roleName}</h2>
                    <p className="text-muted-foreground mt-1">
                        Ubah daftar hak akses (permissions) untuk role ini.
                    </p>
                </div>

                {loading && (
                    <div className="flex h-40 items-center justify-center text-muted-foreground">
                        Memuat data role...
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                {!loading && !error && role && <FormRole role={role} submitLabel="Perbarui Role" />}
            </div>
        </AppLayout>
    );
}