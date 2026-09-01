import PrimaryButton from '@/Components/PrimaryButton';
import GuestLayout from '@/Layouts/GuestLayout';
import Head from '@/Components/Head';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/Contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FormEventHandler, useEffect, useState } from 'react';

export default function VerifyEmail() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const urlToken = searchParams.get('token');

    useEffect(() => {
        if (!urlToken) return;
        let cancelled = false;
        const verify = async () => {
            setProcessing(true);
            setError(null);
            try {
                const { data } = await api.post('/auth/email/verify', { token: urlToken });
                setStatus(data?.data?.message ?? 'Email berhasil diverifikasi.');
                setSearchParams({}, { replace: true });
            } catch (err) {
                setError(errorMessage(err));
            } finally {
                if (!cancelled) setProcessing(false);
            }
        };
        verify();
        return () => {
            cancelled = true;
        };
    }, [urlToken, setSearchParams]);

    const resend: FormEventHandler = async (e) => {
        e.preventDefault();
        setProcessing(true);
        setError(null);
        try {
            const { data } = await api.post('/auth/email/verification-notification');
            setStatus(data?.message ?? 'Link verifikasi baru telah dikirim.');
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setProcessing(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <GuestLayout>
            <Head title="Email Verification" />

            <div className="mb-4 text-sm text-gray-600">
                Terima kasih telah mendaftar! Klik tautan verifikasi yang kami
                kirim ke alamat email Anda. Jika belum menerima emailnya, kami
                dengan senang hati akan mengirimkannya lagi.
            </div>

            {status && (
                <div className="mb-4 text-sm font-medium text-green-600">
                    {status}
                </div>
            )}

            {error && (
                <div className="mb-4 text-sm font-medium text-red-600">
                    {error}
                </div>
            )}

            <form onSubmit={resend}>
                <div className="mt-4 flex items-center justify-between">
                    {user && (
                        <PrimaryButton disabled={processing}>
                            {processing ? 'Memproses...' : 'Kirim Ulang Email Verifikasi'}
                        </PrimaryButton>
                    )}

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Log Out
                    </button>
                </div>
            </form>
        </GuestLayout>
    );
}