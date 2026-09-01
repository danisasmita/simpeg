import Head from '@/Components/Head';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertCircle,
    Camera,
    CheckCircle2,
    Clock,
    LogIn,
    LogOut,
    MapPin,
    RefreshCw,
    RotateCcw,
    User,
} from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import { useAuth } from '@/Contexts/AuthContext';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Absensi } from '@/types';

type PegawaiLite = {
    id: number;
    user_id: number | null;
    nip: string | null;
    nama_lengkap: string;
};

const formatTime = (value: string | null) =>
    value
        ? new Intl.DateTimeFormat('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
          }).format(new Date(value))
        : '--:--';

const duration = (masuk: string | null, pulang: string | null) => {
    if (!masuk) return '--';
    const end = pulang ? new Date(pulang) : new Date();
    const minutes = Math.max(
        0,
        Math.floor((end.getTime() - new Date(masuk).getTime()) / 60000)
    );
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;
};

const todayStr = () => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
};

export default function Index() {
    const { user, hasRole } = useAuth();
    const isAdmin = hasRole('admin', 'operator');
    const [now, setNow] = useState(() => new Date());
    const [location, setLocation] = useState<{
        address: string;
        coords: string;
        detail: {
            road?: string;
            village?: string;
            city?: string;
            county?: string;
            state?: string;
            country?: string;
        };
    } | null>(null);
    const [locating, setLocating] = useState(false);
    const [pegawais, setPegawais] = useState<PegawaiLite[]>([]);
    const [selectedPegawai, setSelectedPegawai] = useState('');
    const [todayRecords, setTodayRecords] = useState<Absensi[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // ── Camera ───────────────────────────────────────────────────
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 320, height: 240 },
            });
            streamRef.current = stream;
            setCameraActive(true);
        } catch {
            setCameraActive(false);
        }
    }, []);

    const attachStream = useCallback(() => {
        if (videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => {});
        }
    }, []);

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setCameraActive(false);
    }, []);

    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return null;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.8);
    }, []);

    useEffect(() => {
        return () => stopCamera();
    }, [stopCamera]);

    // ── Timer ────────────────────────────────────────────────────
    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    // ── Pegawai list (admin dropdown + user_id lookup) ───────────
    useEffect(() => {
        api.get('/pegawai?limit=100')
            .then(({ data }) => setPegawais(data?.data ?? []))
            .catch((err) => setMessage({ type: 'error', text: errorMessage(err) }));
    }, []);

    const targetPegawaiId = useMemo(() => {
        if (isAdmin) return Number(selectedPegawai) || null;
        if (user?.pegawai_id) return user.pegawai_id;
        return pegawais.find((p) => p.user_id === user?.id)?.id ?? null;
    }, [isAdmin, selectedPegawai, user, pegawais]);

    // ── Active record ────────────────────────────────────────────
    const loadToday = useCallback(async (pegawaiId: number) => {
        try {
            const from = todayStr();
            const { data } = await api.get(`/absensi/${pegawaiId}/history?from=${from}&to=${from}`);
            setTodayRecords(data?.data ?? []);
        } catch (err) {
            setTodayRecords([]);
        }
    }, []);

    useEffect(() => {
        if (!targetPegawaiId) return;
        loadToday(targetPegawaiId);
    }, [targetPegawaiId, loadToday]);

    const activeRecord = todayRecords.find((r) => r.pegawai_id === targetPegawaiId) ?? null;
    const checkedIn = Boolean(activeRecord?.check_in_at);
    const checkedOut = Boolean(activeRecord?.check_out_at);

    // ── Geolocation ──────────────────────────────────────────────
    const refreshLocation = () => {
        if (!navigator.geolocation) {
            setLocation({
                address: 'Geolocation tidak didukung oleh browser ini.',
                coords: '',
                detail: {},
            });
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                const lat = coords.latitude.toFixed(5);
                const lng = coords.longitude.toFixed(5);
                const coordsStr = `${lat}, ${lng}`;

                try {
                    const res = await fetch(
                        `/api/geocode/reverse?lat=${lat}&lon=${lng}`,
                        { headers: { 'Accept': 'application/json' } }
                    );
                    if (!res.ok) {
                        setLocation({ address: coordsStr, coords: coordsStr, detail: {} });
                        setLocating(false);
                        return;
                    }
                    const data = await res.json();
                    const addr = data.detail ?? {};

                    setLocation({
                        address: data.address || coordsStr,
                        coords: coordsStr,
                        detail: {
                            road: addr.road,
                            village: addr.village,
                            city: addr.city,
                            state: addr.state,
                            country: addr.country,
                        },
                    });
                } catch {
                    setLocation({
                        address: coordsStr,
                        coords: coordsStr,
                        detail: {},
                    });
                }
                setLocating(false);
            },
            () => {
                setLocation({
                    address: 'Lokasi tidak terdeteksi. Silakan izinkan akses lokasi di browser.',
                    coords: '',
                    detail: {},
                });
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // ── Submit ───────────────────────────────────────────────────
    const submit = async () => {
        if (!targetPegawaiId) return;

        const photo = capturePhoto();
        if (photo) {
            setCapturedPhoto(photo);
            stopCamera();
        }

        const locationStr = location
            ? `${location.address} | ${location.coords}`
            : '';

        setSubmitting(true);
        setMessage(null);
        try {
            if (!checkedIn) {
                await api.post('/absensi/check-in', {
                    pegawai_id: targetPegawaiId,
                    photo: photo ?? '',
                    location: locationStr,
                });
                setMessage({ type: 'success', text: 'Check-in berhasil dicatat.' });
            } else {
                await api.post('/absensi/check-out', {
                    pegawai_id: targetPegawaiId,
                    photo: photo ?? '',
                    location: locationStr,
                });
                setMessage({ type: 'success', text: 'Check-out berhasil dicatat.' });
            }
            setCapturedPhoto(null);
            await loadToday(targetPegawaiId);
        } catch (err) {
            setMessage({ type: 'error', text: errorMessage(err) });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Clock ────────────────────────────────────────────────────
    const clock = new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(now);

    const dateLabel = new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(now);

    const statusLabel = checkedOut
        ? 'Sudah Pulang'
        : checkedIn
          ? 'Sudah Masuk'
          : 'Belum Mulai';

    const statusColor = checkedOut
        ? 'bg-slate-100 text-slate-700'
        : checkedIn
          ? 'bg-green-100 text-green-700'
          : 'bg-orange-100 text-orange-700';

    return (
        <AppLayout title="Presensi">
            <Head title="Presensi" />

            <div className="mx-auto max-w-6xl space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            Presensi Hari Ini
                        </h2>
                        <p className="text-muted-foreground">
                            Catat waktu kerja Anda
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                        >
                            <Clock size={20} />
                        </button>
                        <button
                            type="button"
                            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                        >
                            <User size={20} />
                        </button>
                    </div>
                </div>

                {/* Admin: Select Pegawai */}
                {isAdmin && (
                    <div className="rounded-xl border bg-card p-4">
                        <label className="mb-2 block text-sm font-medium">
                            Pilih Pegawai
                        </label>
                        <select
                            value={selectedPegawai}
                            onChange={(e) => setSelectedPegawai(e.target.value)}
                            className="w-full rounded-lg border bg-background px-3 py-2.5 md:max-w-md"
                        >
                            <option value="">Pilih pegawai untuk presensi</option>
                            {pegawais.map((pegawai) => (
                                <option key={pegawai.id} value={pegawai.id}>
                                    {pegawai.nama_lengkap} — {pegawai.nip}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {!isAdmin && !targetPegawaiId && (
                    <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-800">
                        <AlertCircle size={18} className="shrink-0" />
                        Akun Anda belum terhubung dengan data pegawai.
                    </div>
                )}

                {/* Messages */}
                {message?.type === 'success' && (
                    <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
                        <CheckCircle2 size={18} className="shrink-0" />
                        {message.text}
                    </div>
                )}
                {message?.type === 'error' && (
                    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                        <AlertCircle size={18} className="shrink-0" />
                        {message.text}
                    </div>
                )}

                {/* Main Grid */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Waktu Sekarang */}
                    <section className="rounded-2xl border bg-card p-6 shadow-sm">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="rounded-full p-3" style={{ backgroundColor: 'rgba(26,58,42,0.1)' }}>
                                <Clock size={20} className="text-[#1a3a2a]" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">
                                    Waktu Sekarang
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Jakarta, Indonesia
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl px-6 py-8 text-center text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #1a3a2a, #2d5a42)' }}>
                            <p className="text-5xl font-bold tracking-tight sm:text-6xl">
                                {clock}
                            </p>
                            <p className="mt-3 text-lg font-medium opacity-90">
                                {dateLabel}
                            </p>
                        </div>

                        <p className="mt-4 text-center text-sm text-muted-foreground">
                            GMT+7 (Waktu Indonesia Barat)
                        </p>
                    </section>

                    {/* Status Hari Ini */}
                    <section className="rounded-2xl border bg-card p-6 shadow-sm">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="rounded-full p-3" style={{ backgroundColor: 'rgba(26,58,42,0.1)' }}>
                                <User size={20} className="text-[#1a3a2a]" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">
                                    Status Hari Ini
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Kehadiran Anda hari ini
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-5 py-4">
                                <span className="font-medium">Status</span>
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                                        statusColor
                                    )}
                                >
                                    <CheckCircle2 size={14} />
                                    {statusLabel}
                                </span>
                            </div>

                            <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-5 py-4">
                                <span className="font-medium">Jam Masuk</span>
                                <b className="text-lg">
                                    {formatTime(activeRecord?.check_in_at ?? null)}
                                </b>
                            </div>

                            <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-5 py-4">
                                <span className="font-medium">Jam Pulang</span>
                                <b className="text-lg">
                                    {formatTime(activeRecord?.check_out_at ?? null)}
                                </b>
                            </div>

                            <div className="flex items-center justify-between rounded-xl px-5 py-4" style={{ backgroundColor: 'rgba(26,58,42,0.05)' }}>
                                <span className="font-semibold" style={{ color: '#1a3a2a' }}>Lama Kerja</span>
                                <b className="text-lg" style={{ color: '#1a3a2a' }}>
                                    {duration(
                                        activeRecord?.check_in_at ?? null,
                                        activeRecord?.check_out_at ?? null
                                    )}
                                </b>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Bottom Grid */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Lokasi & Foto */}
                    <section className="rounded-2xl border bg-card p-6 shadow-sm">
                        <div className="flex gap-3">
                            <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(26,58,42,0.1)' }}>
                                <MapPin size={22} className="text-[#1a3a2a]" />
                            </div>
                            <div>
                                <h3 className="font-semibold">
                                    Lokasi & Foto
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Ambil lokasi dan foto kerja Anda
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 space-y-3">
                            <div className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 p-4">
                                <div className="flex items-start gap-3">
                                    <MapPin
                                        size={18}
                                        className="mt-0.5 shrink-0 text-muted-foreground"
                                    />
                                    <div className="flex-1">
                                        <p className="font-medium">
                                            {location
                                                ? 'Lokasi terdeteksi'
                                                : 'Lokasi belum terdeteksi'}
                                        </p>
                                        {location && (
                                            <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                                                {location.detail.road && (
                                                    <p><span className="font-medium text-foreground">Jalan:</span> {location.detail.road}</p>
                                                )}
                                                {location.detail.village && (
                                                    <p><span className="font-medium text-foreground">Desa/Kel:</span> {location.detail.village}</p>
                                                )}
                                                {location.detail.city && (
                                                    <p><span className="font-medium text-foreground">Kecamatan:</span> {location.detail.city}</p>
                                                )}
                                                {location.detail.state && (
                                                    <p><span className="font-medium text-foreground">Provinsi:</span> {location.detail.state}</p>
                                                )}
                                                {location.detail.country && (
                                                    <p><span className="font-medium text-foreground">Negara:</span> {location.detail.country}</p>
                                                )}
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {location.address}
                                                </p>
                                            </div>
                                        )}
                                        {!location && (
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Klik "Perbarui Lokasi" untuk mendeteksi posisi Anda
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={refreshLocation}
                                disabled={locating}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-60"
                            >
                                <RefreshCw
                                    size={16}
                                    className={locating ? 'animate-spin' : ''}
                                />
                                {locating
                                    ? 'Mendeteksi lokasi...'
                                    : 'Perbarui Lokasi'}
                            </button>

                            <div className="rounded-xl border p-4" style={{ borderColor: 'rgba(26,58,42,0.2)', backgroundColor: 'rgba(26,58,42,0.03)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg p-2" style={{ backgroundColor: 'rgba(26,58,42,0.1)' }}>
                                        <MapPin size={16} className="text-[#1a3a2a]" />
                                    </div>
                                    <div>
                                        <p className="font-medium" style={{ color: '#1a3a2a' }}>
                                            Kantor Pusat
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Universitas Muhammadiyah
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 p-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <Camera size={16} className="text-muted-foreground" />
                                    <p className="text-sm font-medium">Verifikasi Foto</p>
                                </div>

                                {capturedPhoto ? (
                                    <div className="space-y-3">
                                        <img
                                            src={capturedPhoto}
                                            alt="Tertangkap"
                                            className="w-full rounded-lg object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCapturedPhoto(null);
                                                startCamera();
                                            }}
                                            className="flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
                                        >
                                            <RotateCcw size={14} />
                                            Ambil Ulang Foto
                                        </button>
                                    </div>
                                ) : cameraActive ? (
                                    <div className="space-y-3">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            onLoadedMetadata={attachStream}
                                            className="w-full rounded-lg bg-black"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const photo = capturePhoto();
                                                if (photo) setCapturedPhoto(photo);
                                                stopCamera();
                                            }}
                                            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                                            style={{ backgroundColor: '#1a3a2a' }}
                                        >
                                            <Camera size={14} />
                                            Ambil Foto
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={startCamera}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/25 px-3 py-6 text-sm text-muted-foreground hover:bg-muted"
                                    >
                                        <Camera size={16} />
                                        Kamera akan muncul di sini
                                    </button>
                                )}

                                <canvas ref={canvasRef} className="hidden" />
                            </div>
                        </div>
                    </section>

                    {/* Aksi Presensi */}
                    <section className="flex flex-col items-center justify-center rounded-2xl border bg-card p-8 text-center shadow-sm">
                        <div
                            className="flex h-20 w-20 items-center justify-center rounded-full text-white"
                            style={{ backgroundColor: '#1a3a2a' }}
                        >
                            {checkedIn && !checkedOut ? (
                                <LogOut size={36} />
                            ) : (
                                <LogIn size={36} />
                            )}
                        </div>

                        <h3 className="mt-6 text-2xl font-bold">
                            {checkedOut
                                ? 'Presensi Selesai'
                                : checkedIn
                                  ? 'Siap Pulang?'
                                  : 'Siap Masuk?'}
                        </h3>
                        <p className="mt-2 text-muted-foreground">
                            {checkedOut
                                ? 'Presensi hari ini sudah tercatat.'
                                : checkedIn
                                  ? 'Catat kepulangan dengan lokasi'
                                  : 'Catat kedatangan untuk memulai jam kerja.'}
                        </p>

                        <button
                            type="button"
                            onClick={submit}
                            disabled={
                                checkedOut ||
                                submitting ||
                                (isAdmin && !selectedPegawai) ||
                                (!isAdmin && !targetPegawaiId)
                            }
                            className={cn(
                                'mt-6 inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
                                checkedIn && !checkedOut
                                    ? 'bg-slate-600 hover:bg-slate-700'
                                    : 'text-white hover:opacity-90'
                            )}
                            style={!(checkedIn && !checkedOut) ? { backgroundColor: '#1a3a2a' } : undefined}
                        >
                            {submitting ? (
                                <RefreshCw size={19} className="animate-spin" />
                            ) : checkedIn && !checkedOut ? (
                                <LogOut size={19} />
                            ) : (
                                <LogIn size={19} />
                            )}
                            {checkedOut
                                ? 'Selesai'
                                : submitting
                                  ? 'Menyimpan...'
                                  : checkedIn
                                    ? 'Clock Out'
                                    : 'Clock In'}
                        </button>

                        <p className="mt-3 text-xs text-muted-foreground">
                            Pastikan lokasi Anda benar sebelum mencatat
                        </p>
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}