import '../css/app.css';
import './bootstrap';

import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from '@/Contexts/AuthContext';

import Login from '@/Pages/Auth/Login';
import Register from '@/Pages/Auth/Register';
import ForgotPassword from '@/Pages/Auth/ForgotPassword';
import GoogleCallback from '@/Pages/Auth/GoogleCallback';

const ConfirmPassword = lazy(() => import('@/Pages/Auth/ConfirmPassword'));
const VerifyEmail = lazy(() => import('@/Pages/Auth/VerifyEmail'));
const ResetPassword = lazy(() => import('@/Pages/Auth/ResetPassword'));

const Dashboard = lazy(() => import('@/Pages/Dashboard'));
const PegawaiIndex = lazy(() => import('@/Pages/Pegawai/Index'));
const PegawaiCreate = lazy(() => import('@/Pages/Pegawai/Create'));
const PegawaiEdit = lazy(() => import('@/Pages/Pegawai/Edit'));
const PegawaiShow = lazy(() => import('@/Pages/Pegawai/Show'));
const MasterIndex = lazy(() => import('@/Pages/Master/Index'));
const MasterForm = lazy(() => import('@/Pages/Master/Form'));
const MasterShow = lazy(() => import('@/Pages/Master/Show'));
const AbsensiIndex = lazy(() => import('@/Pages/Absensi/Index'));
const AbsensiRiwayat = lazy(() => import('@/Pages/Absensi/Riwayat'));
const CutiIndex = lazy(() => import('@/Pages/Cuti/Index'));
const LaporanIndex = lazy(() => import('@/Pages/Laporan/Index'));
const ProfileEdit = lazy(() => import('@/Pages/Profile/Edit'));
const SettingsIndex = lazy(() => import('@/Pages/Settings/Index'));
const RolesIndex = lazy(() => import('@/Pages/Settings/Roles/Index'));
const RolesCreate = lazy(() => import('@/Pages/Settings/Roles/Create'));
const RolesEdit = lazy(() => import('@/Pages/Settings/Roles/Edit'));
const AuditIndex = lazy(() => import('@/Pages/Audit/Index'));

function LoadingScreen() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
    );
}

function ProtectedRoute() {
    const { user, loading } = useAuth();
    if (loading) return <LoadingScreen />;
    if (!user) return <Navigate to="/login" replace />;
    return <Outlet />;
}

function GuestRoute() {
    const { user, loading } = useAuth();
    if (loading) return <LoadingScreen />;
    if (user) return <Navigate to="/dashboard" replace />;
    return <Outlet />;
}

function AppRoutes() {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Suspense fallback={<LoadingScreen />}>
                <Routes location={location} key={location.pathname}>
                    <Route element={<GuestRoute />}>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/confirm-password" element={<ConfirmPassword />} />
                        <Route path="/reset-password/:token" element={<ResetPassword />} />
                        <Route path="/auth/google/callback" element={<GoogleCallback />} />
                    </Route>

                    <Route path="/verify-email" element={<VerifyEmail />} />

                    <Route element={<ProtectedRoute />}>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/pegawai" element={<PegawaiIndex />} />
                        <Route path="/pegawai/create" element={<PegawaiCreate />} />
                        <Route path="/pegawai/:id" element={<PegawaiShow />} />
                        <Route path="/pegawai/:id/edit" element={<PegawaiEdit />} />
                        <Route path="/master/:type" element={<MasterIndex />} />
                        <Route path="/master/:type/create" element={<MasterForm />} />
                        <Route path="/master/:type/:id" element={<MasterShow />} />
                        <Route path="/master/:type/:id/edit" element={<MasterForm />} />
                        <Route path="/absensi" element={<AbsensiIndex />} />
                        <Route path="/absensi/riwayat" element={<AbsensiRiwayat />} />
                        <Route path="/cuti" element={<CutiIndex />} />
                        <Route path="/laporan" element={<LaporanIndex />} />
                        <Route path="/profile" element={<ProfileEdit />} />
                        <Route path="/settings" element={<SettingsIndex />} />
                        <Route path="/settings/roles" element={<RolesIndex />} />
                        <Route path="/settings/roles/create" element={<RolesCreate />} />
                        <Route path="/settings/roles/:id/edit" element={<RolesEdit />} />
                        <Route path="/audit-logs" element={<AuditIndex />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Route>
                </Routes>
            </Suspense>
        </AnimatePresence>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}

const app = document.getElementById('app');
if (app) {
    createRoot(app).render(<App />);
}