import AppLayout from '@/Layouts/AppLayout';
import Head from '@/Components/Head';
import { useAuth } from '@/Contexts/AuthContext';
import { api, errorMessage } from '@/lib/api';
import { useState, useEffect, useMemo } from 'react';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import {
    User,
    Mail,
    Lock,
    Save,
    AlertTriangle,
    CheckCircle,
    Briefcase,
    MapPin,
    Award,
    Calendar,
    Eye,
    EyeOff,
    Trash2,
    Shield,
} from 'lucide-react';
import type { Pegawai, MasterItem } from '@/types';

type Msg = { type: 'success' | 'error'; text: string } | null;

export default function ProfileEdit() {
    const { user, refresh, logout } = useAuth();
    const [pegawai, setPegawai] = useState<Pegawai | null>(null);
    const [jabatans, setJabatans] = useState<MasterItem[]>([]);
    const [units, setUnits] = useState<MasterItem[]>([]);
    const [golongan, setGolongan] = useState<MasterItem[]>([]);
    const [statuses, setStatuses] = useState<MasterItem[]>([]);

    // ── Profile form ──────────────────────────────────────────────
    const [name, setName] = useState(user?.name ?? '');
    const [email, setEmail] = useState(user?.email ?? '');
    const [profileMsg, setProfileMsg] = useState<Msg>(null);
    const [profileProcessing, setProfileProcessing] = useState(false);

    // ── Password form ─────────────────────────────────────────────
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMsg, setPasswordMsg] = useState<Msg>(null);
    const [passwordProcessing, setPasswordProcessing] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // ── Delete form ───────────────────────────────────────────────
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteMsg, setDeleteMsg] = useState<Msg>(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        if (!user?.pegawai_id) return;
        let cancelled = false;
        Promise.all([
            api.get(`/pegawai/${user.pegawai_id}`),
            api.get('/jabatan'),
            api.get('/unit-kerja'),
            api.get('/golongan'),
            api.get('/status-kepegawaian'),
        ])
            .then(([p, j, u, g, s]) => {
                if (cancelled) return;
                setPegawai(p.data?.data ?? null);
                setJabatans(j.data?.data ?? []);
                setUnits(u.data?.data ?? []);
                setGolongan(g.data?.data ?? []);
                setStatuses(s.data?.data ?? []);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [user?.pegawai_id]);

    const nameOf = (items: MasterItem[], id?: number | null) => items.find((i) => i.id === id)?.nama ?? null;
    const roleNames = useMemo(() => {
        const roles = user?.roles?.length ? user.roles : user?.role ? [user.role] : [];
        return roles;
    }, [user]);

    const submitProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileProcessing(true);
        setProfileMsg(null);
        try {
            await api.put('/auth/profile', { name, email });
            setProfileMsg({ type: 'success', text: 'Profil berhasil diperbarui.' });
            await refresh();
        } catch (err) {
            setProfileMsg({ type: 'error', text: errorMessage(err) });
        } finally {
            setProfileProcessing(false);
        }
    };

    const submitPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordProcessing(true);
        setPasswordMsg(null);
        try {
            await api.put('/auth/password', {
                current_password: currentPassword,
                password: newPassword,
                password_confirmation: confirmPassword,
            });
            setPasswordMsg({ type: 'success', text: 'Password berhasil diubah.' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setPasswordMsg({ type: 'error', text: errorMessage(err) });
        } finally {
            setPasswordProcessing(false);
        }
    };

    const submitDelete = async (e: React.FormEvent) => {
        e.preventDefault();
        setDeleteProcessing(true);
        setDeleteMsg(null);
        try {
            await api.delete('/auth/profile', { data: { password: deletePassword } });
            logout();
        } catch (err) {
            setDeleteMsg({ type: 'error', text: errorMessage(err) });
            setDeleteProcessing(false);
        }
    };

    return (
        <AppLayout title="Profil Saya">
            <Head title="Profil Saya" />

            <div className="space-y-6">
                {/* Header */}
                <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">Pengaturan Akun</p>
                    <h2 className="text-3xl font-extrabold text-foreground">Profil Saya</h2>
                    <p className="mt-2 text-muted-foreground">Kelola informasi profil dan keamanan akun Anda.</p>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* ── Kolom Kiri: Foto & Info Singkat ────────── */}
                    <div className="space-y-6">
                        {/* Foto Profil */}
                        <Card className="overflow-hidden">
                            <div className="bg-gradient-to-br from-[#1a3a2a] to-[#2d5a42] p-6 text-center">
                                <div className="relative mx-auto h-28 w-28">
                                    <div className="flex h-full w-full items-center justify-center rounded-full border-4 border-white/30 bg-white/20 text-4xl font-bold text-white shadow-lg">
                                        {(user?.name ?? '?').charAt(0)?.toUpperCase()}
                                    </div>
                                </div>
                                <h3 className="mt-4 text-lg font-bold text-white">{user?.name}</h3>
                                <p className="text-sm text-white/70">{user?.email}</p>
                                {roleNames.length > 0 && (
                                    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                                        {roleNames.map((role) => (
                                            <Badge key={role} className="bg-[#dfb23c] text-[#1a3a2a] text-xs">
                                                {role}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <CardContent className="p-4">
                                {pegawai ? (
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Award size={14} />
                                            <span>NIP: {pegawai.nip}</span>
                                        </div>
                                        {pegawai.jabatan_id && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Briefcase size={14} />
                                                <span>{nameOf(jabatans, pegawai.jabatan_id) || '-'}</span>
                                            </div>
                                        )}
                                        {pegawai.unit_kerja_id && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <MapPin size={14} />
                                                <span>{nameOf(units, pegawai.unit_kerja_id) || '-'}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="py-2 text-center text-xs text-muted-foreground">
                                        Akun belum terhubung dengan data pegawai.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Info Pegawai (Read-only) */}
                        {pegawai && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Data Kepegawaian</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Status</span>
                                        <Badge variant={pegawai.status_aktif === 'aktif' ? 'default' : 'secondary'}>
                                            {pegawai.status_aktif}
                                        </Badge>
                                    </div>
                                    {pegawai.golongan_id && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Golongan</span>
                                            <span className="font-medium">{nameOf(golongan, pegawai.golongan_id)}</span>
                                        </div>
                                    )}
                                    {pegawai.status_kepegawaian_id && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Status Kepegawaian</span>
                                            <span className="font-medium">{nameOf(statuses, pegawai.status_kepegawaian_id)}</span>
                                        </div>
                                    )}
                                    {pegawai.tanggal_masuk && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Tanggal Masuk</span>
                                            <span className="font-medium">
                                                {new Date(pegawai.tanggal_masuk + 'T00:00:00').toLocaleDateString('id-ID')}
                                            </span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* ── Kolom Kanan: Form Edit ──────────────────── */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Edit Profil */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <User size={20} /> Informasi Profil
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={submitProfile} className="space-y-5">
                                    <div>
                                        <InputLabel htmlFor="name" value="Nama Lengkap" />
                                        <TextInput
                                            id="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            icon={<User size={16} />}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="email" value="Email" />
                                        <TextInput
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            icon={<Mail size={16} />}
                                            required
                                        />
                                    </div>

                                    {profileMsg?.type === 'success' && (
                                        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm font-medium text-green-800">
                                            <CheckCircle size={16} /> {profileMsg.text}
                                        </div>
                                    )}
                                    {profileMsg?.type === 'error' && (
                                        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800">
                                            <AlertTriangle size={16} /> {profileMsg.text}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3">
                                        <Button
                                            type="submit"
                                            disabled={profileProcessing}
                                            className="rounded-xl bg-[#1a3a2a] hover:bg-[#14302a]"
                                        >
                                            <Save size={16} className="mr-2" />
                                            {profileProcessing ? 'Menyimpan...' : 'Simpan Perubahan'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Ubah Password */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Lock size={20} /> Ubah Password
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={submitPassword} className="space-y-5">
                                    <div>
                                        <InputLabel htmlFor="current_password" value="Password Saat Ini" />
                                        <div className="relative">
                                            <TextInput
                                                id="current_password"
                                                type={showCurrentPassword ? 'text' : 'password'}
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                icon={<Lock size={16} />}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="password" value="Password Baru" />
                                        <div className="relative">
                                            <TextInput
                                                id="password"
                                                type={showNewPassword ? 'text' : 'password'}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                icon={<Lock size={16} />}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="password_confirmation" value="Konfirmasi Password" />
                                        <div className="relative">
                                            <TextInput
                                                id="password_confirmation"
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                icon={<Lock size={16} />}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {passwordMsg?.type === 'success' && (
                                        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm font-medium text-green-800">
                                            <CheckCircle size={16} /> {passwordMsg.text}
                                        </div>
                                    )}
                                    {passwordMsg?.type === 'error' && (
                                        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800">
                                            <AlertTriangle size={16} /> {passwordMsg.text}
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={passwordProcessing}
                                        className="rounded-xl bg-[#1a3a2a] hover:bg-[#14302a]"
                                    >
                                        <Shield size={16} className="mr-2" />
                                        {passwordProcessing ? 'Menyimpan...' : 'Ubah Password'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Hapus Akun */}
                        <Card className="border-red-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg text-red-600">
                                    <AlertTriangle size={20} /> Hapus Akun
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="mb-4 text-sm text-muted-foreground">
                                    Setelah akun dihapus, semua data dan sumber daya akan dihapus secara permanen. Pastikan Anda telah mencadangkan data yang diperlukan.
                                </p>
                                <Button
                                    variant="destructive"
                                    onClick={() => setShowDeleteModal(true)}
                                    className="rounded-xl"
                                >
                                    <Trash2 size={16} className="mr-2" /> Hapus Akun
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* ── Modal Konfirmasi Hapus ───────────────────────────── */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center gap-3 text-red-600">
                            <AlertTriangle size={24} />
                            <h3 className="text-lg font-bold">Hapus Akun?</h3>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                            Masukkan password Anda untuk mengonfirmasi penghapusan akun secara permanen.
                        </p>
                        <form onSubmit={submitDelete} className="mt-5 space-y-4">
                            <div>
                                <TextInput
                                    type="password"
                                    placeholder="Masukkan password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    icon={<Lock size={16} />}
                                />
                            </div>
                            {deleteMsg && (
                                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                                    deleteMsg.type === 'success'
                                        ? 'border-green-200 bg-green-50 text-green-800'
                                        : 'border-red-200 bg-red-50 text-red-800'
                                }`}>
                                    {deleteMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                    {deleteMsg.text}
                                </div>
                            )}
                            <div className="flex justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteMsg(null); }}
                                    className="rounded-xl"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={deleteProcessing}
                                    className="rounded-xl"
                                >
                                    {deleteProcessing ? 'Menghapus...' : 'Ya, Hapus'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}