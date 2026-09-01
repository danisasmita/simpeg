import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { api, errorMessage } from '@/lib/api';
import { permissionList } from '@/lib/permissions';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface Role {
    id?: number;
    name: string;
    permissions?: string[];
}

interface Props {
    role?: Role;
    submitLabel: string;
}

export default function FormRole({ role, submitLabel }: Props) {
    const navigate = useNavigate();
    const [name, setName] = useState(role?.name || '');
    const [selected, setSelected] = useState<string[]>(role?.permissions || []);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [permLoading, setPermLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const locked = role?.name?.toLowerCase() === 'admin' || !!role;

    useEffect(() => {
        let cancelled = false;
        api.get('/roles/permissions')
            .then(({ data }) => {
                if (cancelled) return;
                const list = data?.data ?? [];
                setPermissions(Array.isArray(list) ? list.map((p: { name: string }) => p.name) : [...permissionList]);
            })
            .catch(() => {
                if (!cancelled) setPermissions([...permissionList]);
            })
            .finally(() => {
                if (!cancelled) setPermLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    const togglePermission = (permissionName: string, checked: boolean) => {
        if (checked) {
            setSelected((prev) => [...prev, permissionName]);
        } else {
            setSelected((prev) => prev.filter((p) => p !== permissionName));
        }
    };

    const groupedPermissions = permissions.reduce((acc, curr) => {
        const group = curr.split('.')[0] || 'lainnya';
        if (!acc[group]) acc[group] = [];
        acc[group].push(curr);
        return acc;
    }, {} as Record<string, string[]>);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setMessage(null);
        try {
            const payload = { name, permissions: selected };
            if (role) {
                await api.put(`/roles/${encodeURIComponent(name.toLowerCase())}`, payload);
            } else {
                await api.post('/roles', payload);
            }
            setMessage({ type: 'success', text: 'Role berhasil disimpan.' });
            if (!role) {
                setTimeout(() => navigate('/settings/roles'), 800);
            }
        } catch (err) {
            setMessage({ type: 'error', text: errorMessage(err) });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Detail Role</CardTitle>
                    <CardDescription>Nama grup hak akses yang akan digunakan oleh pengguna.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2 max-w-md">
                        <label className="text-sm font-medium leading-none" htmlFor="name">
                            Nama Role <span className="text-destructive">*</span>
                        </label>
                        <input
                            id="name"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={locked}
                            required
                        />
                        {locked && (
                            <p className="text-xs text-muted-foreground">Nama role tidak dapat diubah setelah dibuat.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Hak Akses (Permissions)</CardTitle>
                    <CardDescription>Tentukan fitur dan menu apa saja yang dapat diakses oleh role ini.</CardDescription>
                </CardHeader>
                <CardContent>
                    {permLoading ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">Memuat daftar permissions...</p>
                    ) : (
                        <>
                            <div className="mb-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                                <Info size={14} className="mt-0.5 shrink-0" />
                                <span>
                                    Perubahan hak akses langsung disimpan ke database dan diterapkan ke semua pengguna
                                    berperan tersebut (dievaluasi saat login/profil dimuat).
                                </span>
                            </div>

                            {message && (
                                <div
                                    className={`mb-4 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${
                                        message.type === 'success'
                                            ? 'border-green-200 bg-green-50 text-green-800'
                                            : 'border-red-200 bg-red-50 text-red-800'
                                    }`}
                                >
                                    {message.type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
                                    {message.text}
                                </div>
                            )}

                            {Object.keys(groupedPermissions).length === 0 && (
                                <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada permission yang tersedia.</p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Object.entries(groupedPermissions).map(([group, perms]) => (
                                    <div key={group} className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
                                        <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">{group}</h3>
                                        <div className="space-y-2">
                                            {perms.map((p) => (
                                                <label key={p} className="flex items-center space-x-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                                                        checked={selected.includes(p)}
                                                        onChange={(e) => togglePermission(p, e.target.checked)}
                                                    />
                                                    <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                        {p.replace(`${group}.`, '')}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate('/settings/roles')}>
                    Batal
                </Button>
                <Button type="submit" disabled={processing || locked && role?.name === 'admin' || !name || permLoading}>
                    {processing ? 'Menyimpan...' : submitLabel}
                </Button>
            </div>
        </form>
    );
}