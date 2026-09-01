import axios, { AxiosError } from 'axios';

export const api = axios.create({
    baseURL: '/api/v1',
    headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
});

export const TOKEN_KEY = 'simpeg_token';

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            clearToken();
        }
        return Promise.reject(error);
    },
);

export function errorMessage(err: unknown): string {
    if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string; message?: string } | undefined;
        return data?.error ?? data?.message ?? 'Terjadi kesalahan. Silakan coba lagi.';
    }
    if (err instanceof Error) {
        return err.message;
    }
    return 'Terjadi kesalahan. Silakan coba lagi.';
}