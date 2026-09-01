import AppLayout from '@/Layouts/AppLayout';
import Head from '@/Components/Head';
import { Link } from 'react-router-dom';
import FormRole from './FormRole';
import { ChevronRight, Settings } from 'lucide-react';

export default function Create() {
    return (
        <AppLayout title="Tambah Role">
            <Head title="Tambah Role" />

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
                    <span className="text-foreground font-medium">Tambah Baru</span>
                </div>

                <div>
                    <h2 className="text-2xl font-bold text-foreground">Tambah Role Baru</h2>
                    <p className="text-muted-foreground mt-1">
                        Buat role baru dan tentukan hak akses (permissions) yang dimiliki.
                    </p>
                </div>

                <FormRole submitLabel="Simpan Role" />
            </div>
        </AppLayout>
    );
}