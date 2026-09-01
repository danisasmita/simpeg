import AppLayout from '@/Layouts/AppLayout';
import Head from '@/Components/Head';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Briefcase, Building2, TrendingUp, ArrowUpRight, Clock, UserCheck } from 'lucide-react';
import Card3D from '@/Components/ui/card-3d';
import AnimatedCounter from '@/Components/AnimatedCounter';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { api } from '@/lib/api';

interface Stats {
    total_pegawai: number;
    pegawai_aktif: number;
    total_unit_kerja: number;
    total_jabatan: number;
    cuti_menunggu: number;
    absensi_hari_ini: number;
}

export default function Dashboard() {
    const [stats, setStats] = useState<Stats>({
        total_pegawai: 0,
        pegawai_aktif: 0,
        total_unit_kerja: 0,
        total_jabatan: 0,
        cuti_menunggu: 0,
        absensi_hari_ini: 0,
    });

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get('/dashboard/stats');
                const s = res.data?.data ?? {};
                setStats({
                    total_pegawai: s.total_pegawai ?? 0,
                    pegawai_aktif: s.pegawai_aktif ?? 0,
                    total_unit_kerja: s.total_unit_kerja ?? 0,
                    total_jabatan: s.total_jabatan ?? 0,
                    cuti_menunggu: s.cuti_menunggu ?? 0,
                    absensi_hari_ini: s.absensi_hari_ini ?? 0,
                });
            } catch {
                // biarkan nol; error interceptor sudah menangani 401
            }
        };
        load();
    }, []);

    const cards = [
        {
            label: 'Total Pegawai',
            value: stats.total_pegawai,
            icon: <Users size={20} />,
            color: 'bg-blue-500/10 text-blue-600',
            iconBg: 'bg-blue-500/15',
            trend: 'Seluruh pegawai',
        },
        {
            label: 'Pegawai Aktif',
            value: stats.pegawai_aktif,
            icon: <TrendingUp size={20} />,
            color: 'bg-green-500/10 text-green-600',
            iconBg: 'bg-green-500/15',
            trend: 'Status aktif',
        },
        {
            label: 'Absensi Hari Ini',
            value: stats.absensi_hari_ini,
            icon: <UserCheck size={20} />,
            color: 'bg-cyan-500/10 text-cyan-600',
            iconBg: 'bg-cyan-500/15',
            trend: 'Check-in hari ini',
        },
        {
            label: 'Cuti Menunggu',
            value: stats.cuti_menunggu,
            icon: <Clock size={20} />,
            color: 'bg-orange-500/10 text-orange-600',
            iconBg: 'bg-orange-500/15',
            trend: 'Perlu persetujuan',
        },
        {
            label: 'Unit Kerja',
            value: stats.total_unit_kerja,
            icon: <Building2 size={20} />,
            color: 'bg-purple-500/10 text-purple-600',
            iconBg: 'bg-purple-500/15',
            trend: 'Fakultas & biro',
        },
        {
            label: 'Jabatan',
            value: stats.total_jabatan,
            icon: <Briefcase size={20} />,
            color: 'bg-slate-500/10 text-slate-600',
            iconBg: 'bg-slate-500/15',
            trend: 'Struktural & akademik',
        },
    ];

    return (
        <AppLayout title="Dashboard">
            <Head title="Dashboard — SIMPEG UML" />

            <div className="space-y-6">
                {/* Welcome */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                    <h2 className="text-2xl font-bold text-foreground">Selamat Datang</h2>
                    <p className="text-muted-foreground mt-1">
                        Sistem Informasi Manajemen Kepegawaian — Universitas Muhammadiyah Lampung
                    </p>
                </motion.div>

                {/* Stats cards with 3D effects */}
                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                >
                    {cards.map((card) => (
                        <motion.div key={card.label} variants={staggerItem}>
                            <Card3D className="p-5 cursor-default">
                                <div className="flex items-start justify-between">
                                    <div className={`p-2.5 rounded-lg ${card.iconBg} ${card.color}`}>
                                        {card.icon}
                                    </div>
                                    <motion.div
                                        whileHover={{ x: 2, y: -2 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ArrowUpRight size={16} className="text-muted-foreground" />
                                    </motion.div>
                                </div>
                                <div className="mt-4">
                                    <AnimatedCounter
                                        value={card.value}
                                        className="text-3xl font-bold text-foreground"
                                    />
                                    <p className="text-sm font-medium text-foreground mt-0.5">{card.label}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{card.trend}</p>
                                </div>
                            </Card3D>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Placeholder for recent activity */}
                <motion.div
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    <Card3D disableHover className="p-5">
                        <h3 className="text-base font-semibold text-foreground mb-4">Pegawai Terbaru</h3>
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                            >
                                <Users size={32} className="mx-auto mb-2 opacity-30" />
                            </motion.div>
                            <p>Belum ada data pegawai</p>
                        </div>
                    </Card3D>
                    <Card3D disableHover className="p-5">
                        <h3 className="text-base font-semibold text-foreground mb-4">Aktivitas Terkini</h3>
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut', delay: 0.3 }}
                            >
                                <TrendingUp size={32} className="mx-auto mb-2 opacity-30" />
                            </motion.div>
                            <p>Belum ada aktivitas</p>
                        </div>
                    </Card3D>
                </motion.div>
            </div>
        </AppLayout>
    );
}