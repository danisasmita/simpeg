import { setToken } from '@/lib/api';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function GoogleCallback() {
    const navigate = useNavigate();
    const [params] = useSearchParams();

    useEffect(() => {
        const token = params.get('token');
        const error = params.get('error');
        if (token) {
            setToken(token);
            navigate('/dashboard', { replace: true });
        } else {
            navigate('/login', { replace: true, state: { authError: error ?? 'Gagal masuk dengan Google.' } });
        }
    }, [params, navigate]);

    return null;
}