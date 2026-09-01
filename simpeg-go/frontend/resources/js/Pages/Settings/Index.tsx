import AppLayout from '@/Layouts/AppLayout';
import Head from '@/Components/Head';

export default function Index() {
    return (
        <AppLayout title="Pengaturan Umum">
            <Head title="Pengaturan Umum" />

            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Pengaturan Sistem</h2>
                    <p className="text-muted-foreground mt-1">
                        Konfigurasi umum aplikasi SIMPEG.
                    </p>
                </div>

                <div className="bg-card border border-border rounded-xl shadow-sm p-8 text-center text-muted-foreground">
                    Fitur pengaturan umum (seperti logo, nama institusi, dll) akan segera hadir di fase berikutnya.
                </div>
            </div>
        </AppLayout>
    );
}