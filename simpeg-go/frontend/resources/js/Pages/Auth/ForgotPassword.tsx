import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import Head from '@/Components/Head';
import { api, errorMessage } from '@/lib/api';
import { FormEventHandler, useState } from 'react';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [resetToken, setResetToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const submit: FormEventHandler = async (e) => {
        e.preventDefault();
        setProcessing(true);
        setError(null);
        setStatus(null);
        setResetToken(null);
        try {
            const { data } = await api.post('/auth/forgot-password', { email });
            setStatus(data?.message ?? 'Link reset password telah dikirim ke email Anda.');
            if (data?.token) setResetToken(data.token as string);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <GuestLayout>
            <Head title="Forgot Password" />

            <div className="mb-4 text-sm text-gray-600">
                Forgot your password? No problem. Just let us know your email
                address and we will email you a password reset link that will
                allow you to choose a new one.
            </div>

            {status && (
                <div className="mb-4 text-sm font-medium text-green-600">
                    {status}
                </div>
            )}

            {resetToken && (
                <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                    <p className="mb-1 font-semibold">Mode pengembangan (tanpa mailer)</p>
                    <p className="mb-1">Gunakan token berikut pada halaman Reset Password:</p>
                    <code className="break-all rounded bg-white px-2 py-1 font-mono text-xs">
                        {resetToken}
                    </code>
                </div>
            )}

            {error && (
                <div className="mb-4 text-sm font-medium text-red-600">
                    {error}
                </div>
            )}

            <form onSubmit={submit}>
                <TextInput
                    id="email"
                    type="email"
                    name="email"
                    value={email}
                    className="mt-1 block w-full"
                    isFocused={true}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <div className="mt-4 flex items-center justify-end">
                    <PrimaryButton className="ms-4" disabled={processing}>
                        {processing ? 'Mengirim...' : 'Email Password Reset Link'}
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}