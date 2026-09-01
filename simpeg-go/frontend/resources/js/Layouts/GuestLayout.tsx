import ApplicationLogo from '@/Components/ApplicationLogo';
import { PropsWithChildren } from 'react';
import { SunMedium } from 'lucide-react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen">
            {/* Left panel - branding */}
            <div className="hidden w-1/2 items-center justify-center lg:flex" style={{ backgroundColor: '#1a3a2a' }}>
                <div className="max-w-md px-8 text-center text-white">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-sm">
                        <SunMedium size={40} className="text-[#dfb23c]" />
                    </div>
                    <h1 className="text-3xl font-bold">SIMPEG</h1>
                    <p className="mt-1 text-sm font-medium uppercase tracking-widest text-[#dfb23c]">Universitas Muhammadiyah</p>
                    <p className="mt-4 text-sm text-white/70">
                        Sistem Informasi Manajemen Kepegawaian untuk mengelola data pegawai, kehadiran, dan cuti secara terintegrasi.
                    </p>
                </div>
            </div>

            {/* Right panel - form */}
            <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: '#1a3a2a' }}>
                            <SunMedium size={23} className="text-[#dfb23c]" />
                        </div>
                        <div>
                            <p className="font-display text-sm font-extrabold tracking-wide">SIMPEG</p>
                            <p className="text-[9px] font-bold uppercase tracking-[.12em]" style={{ color: '#dfb23c' }}>Univ. Muhammadiyah</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border bg-white p-8 shadow-sm">
                        {children}
                    </div>

                    <p className="mt-6 text-center text-xs text-muted-foreground">
                        &copy; {new Date().getFullYear()} SIMPEG UML. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
