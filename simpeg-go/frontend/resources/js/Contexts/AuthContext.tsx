import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    PropsWithChildren,
} from 'react';

import { api, clearToken, errorMessage, getToken, setToken } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import type { LoginResponse, User } from '@/types/auth';

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    permissions: Permission[];
    can: (permission: Permission | string) => boolean;
    hasRole: (...roles: string[]) => boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applyPermissions(user: User | null, permissions?: string[]): User | null {
    if (!user) return null;
    return {
        ...user,
        roles: user.roles?.length ? user.roles : user.role ? [user.role] : [],
        permissions: (permissions ?? user.permissions ?? []) as Permission[],
    };
}

export function AuthProvider({ children }: PropsWithChildren) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        const token = getToken();
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }
        try {
            const { data } = await api.get('/auth/profile');
            const normalized = data?.user ? data.user : data;
            const perms = Array.isArray(data?.permissions) ? data.permissions : [];
            setUser(applyPermissions(normalized, perms));
        } catch {
            clearToken();
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const loadUserPermissions = useCallback(async (loggedInUser: User) => {
        try {
            const { data } = await api.get('/auth/profile');
            const normalized = data?.user ? data.user : data;
            const perms = Array.isArray(data?.permissions) ? data.permissions : [];
            setUser(applyPermissions(normalized, perms));
        } catch {
            setUser(applyPermissions(loggedInUser));
        }
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
        setToken(data.token);
        setUser(applyPermissions(data.user));
        await loadUserPermissions(data.user);
    }, [loadUserPermissions]);

    const register = useCallback(async (name: string, email: string, password: string) => {
        const { data } = await api.post<LoginResponse>('/auth/register', {
            name,
            email,
            password,
            password_confirmation: password,
        });
        setToken(data.token);
        setUser(applyPermissions(data.user));
        await loadUserPermissions(data.user);
    }, [loadUserPermissions]);

    const logout = useCallback(() => {
        clearToken();
        setUser(null);
    }, []);

    const can = useCallback(
        (permission: Permission | string) => {
            if (!user) return false;
            if (user.role?.toLowerCase() === 'admin') return true;
            return (user.permissions ?? []).includes(permission as Permission);
        },
        [user],
    );

    const hasRole = useCallback(
        (...roles: string[]) => {
            if (!user) return false;
            const userRoles = (user.roles ?? []).map((r) => r.toLowerCase());
            return roles.some((r) => userRoles.includes(r.toLowerCase()));
        },
        [user],
    );

    const value = useMemo(
        () => ({ user, loading, permissions: user?.permissions ?? [], can, hasRole, login, register, logout, refresh }),
        [user, loading, can, hasRole, login, register, logout, refresh],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
}

export { errorMessage };