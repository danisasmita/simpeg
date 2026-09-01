import type { Permission } from '@/lib/permissions';

export interface User {
    id: number;
    name: string;
    email: string;
    role?: string;
    roles?: string[];
    permissions?: Permission[];
    pegawai_id?: number | null;
    email_verified_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface Paginated<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    links?: { url: string | null; label: string; active: boolean }[];
}

export type LoginResponse = {
    token: string;
    user: User;
};