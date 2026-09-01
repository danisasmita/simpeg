import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { sidebarSlide } from '@/lib/animations';
import { useAuth } from '@/Contexts/AuthContext';
import {
    Users,
    LayoutDashboard,
    Building2,
    FileText,
    Settings,
    ChevronDown,
    Menu,
    X,
    Bell,
    LogOut,
    User,
    Briefcase,
    SunMedium,
    CalendarCheck,
    CalendarDays,
} from 'lucide-react';

interface NavItem {
    label: string;
    href?: string;
    icon: ReactNode;
    children?: NavItem[];
    permission?: string;
}

const navItems: NavItem[] = [
    {
        label: 'Dashboard',
        href: '/dashboard',
        icon: <LayoutDashboard size={18} />,
    },
    {
        label: 'Pegawai',
        icon: <Users size={18} />,
        children: [
            { label: 'Data Pegawai', href: '/pegawai', icon: <Users size={16} />, permission: 'pegawai.view' },
        ],
    },
    {
        label: 'Master Data',
        icon: <Building2 size={18} />,
        children: [
            { label: 'Unit Kerja', href: '/master/unit-kerja', icon: <Building2 size={16} />, permission: 'master.view' },
            { label: 'Jabatan', href: '/master/jabatan', icon: <Briefcase size={16} />, permission: 'master.view' },
            { label: 'Golongan', href: '/master/golongan', icon: <FileText size={16} />, permission: 'master.view' },
            { label: 'Status Kepegawaian', href: '/master/status-kepegawaian', icon: <FileText size={16} />, permission: 'master.view' },
        ],
    },
    {
        label: 'Laporan',
        icon: <FileText size={18} />,
        href: '/laporan',
        permission: 'laporan.view',
    },
    { label: 'Presensi', href: '/absensi', icon: <CalendarCheck size={18} />, permission: 'absensi.view' },
    { label: 'Kehadiran Saya', href: '/absensi/riwayat', icon: <CalendarDays size={18} />, permission: 'absensi.view' },
    { label: 'Cuti', href: '/cuti', icon: <CalendarDays size={18} />, permission: 'cuti.view' },
    {
        label: 'Pengaturan',
        icon: <Settings size={18} />,
        children: [
            { label: 'Pengaturan Umum', href: '/settings', icon: <Settings size={16} />, permission: 'settings.view' },
            { label: 'Manajemen Role', href: '/settings/roles', icon: <Users size={16} />, permission: 'settings.update' },
            { label: 'Audit Log', href: '/audit-logs', icon: <FileText size={16} />, permission: 'audit.view' },
        ],
    },
];

interface Props {
    children: ReactNode;
    title?: string;
}

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    return isMobile;
}

export default function AppLayout({ children, title }: Props) {
    const { user, permissions, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useIsMobile();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const sidebarTextStyle = { color: '#ffffff' };

    useEffect(() => {
        setExpandedMenus([]);
    }, [location.pathname]);

    useEffect(() => {
        if (isMobile && mobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobile, mobileOpen]);

    useEffect(() => {
        if (userMenuOpen) {
            const close = () => setUserMenuOpen(false);
            window.addEventListener('click', close);
            return () => window.removeEventListener('click', close);
        }
    }, [userMenuOpen]);

    const toggleMenu = (label: string) => {
        setExpandedMenus(prev =>
            prev.includes(label) ? prev.filter(m => m !== label) : [...prev, label]
        );
    };

    const isActive = (href?: string) => {
        if (!href) return false;
        return location.pathname === href || location.pathname.startsWith(href + '/');
    };

    const isMenuExpanded = (item: NavItem) =>
        expandedMenus.includes(item.label) || item.children?.some((child) => isActive(child.href));

    const closeSidebarOnMobile = () => {
        if (isMobile) setMobileOpen(false);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const sidebarContent = (
        <>
            {/* Logo */}
            <div className="flex h-16 items-center border-b border-sidebar-border px-4 md:h-20">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--sidebar-accent))]">
                        <SunMedium size={23} className="text-[#dfb23c]" />
                    </div>
                    <div className="overflow-hidden">
                        <p style={sidebarTextStyle} className="truncate font-display text-sm font-extrabold tracking-wide">SIMPEG</p>
                        <p className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[.12em] text-[#dfb23c]">Univ. Muhammadiyah</p>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
                <p style={sidebarTextStyle} className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em]">Menu Utama</p>
                {navItems.map((item) => {
                    if (item.permission && !permissions.includes(item.permission as never)) return null;

                    const allowedChildren = item.children?.filter(child =>
                        !child.permission || permissions.includes(child.permission as never)
                    );

                    if (item.children && (!allowedChildren || allowedChildren.length === 0)) return null;

                    return (
                        <div key={item.label}>
                            {item.href ? (
                                <Link
                                    to={item.href}
                                    style={sidebarTextStyle}
                                    onClick={closeSidebarOnMobile}
                                    className={cn(
                                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                                        isActive(item.href)
                                            ? 'border-l-4 border-[#dfb23c] bg-sidebar-primary pl-2 text-white shadow-sm'
                                            : 'text-white hover:bg-sidebar-accent'
                                    )}
                                >
                                    <span className="shrink-0">{item.icon}</span>
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            ) : (
                                <div>
                                    <button
                                        onClick={() => toggleMenu(item.label)}
                                        style={sidebarTextStyle}
                                        className={cn(
                                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                                            'text-white hover:bg-sidebar-accent'
                                        )}
                                    >
                                        <span className="shrink-0">{item.icon}</span>
                                        <span className="flex-1 text-left truncate">{item.label}</span>
                                        <ChevronDown
                                            size={14}
                                            className={cn(
                                                'shrink-0 transition-transform',
                                                isMenuExpanded(item) && 'rotate-180'
                                            )}
                                        />
                                    </button>
                                    {isMenuExpanded(item) && allowedChildren && (
                                        <div className="ml-5 mt-1 space-y-1 border-l border-sidebar-border/70 pl-3">
                                            {allowedChildren.map((child) => (
                                                <Link
                                                    key={child.label}
                                                    to={child.href ?? '#'}
                                                    style={sidebarTextStyle}
                                                    onClick={closeSidebarOnMobile}
                                                    className={cn(
                                                        'flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors',
                                                        isActive(child.href)
                                                            ? 'border-l-4 border-[#dfb23c] bg-sidebar-primary pl-1 font-bold text-white shadow-sm'
                                                            : 'text-white hover:bg-sidebar-accent'
                                                    )}
                                                >
                                                    {child.icon}
                                                    <span className="truncate">{child.label}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* User section */}
            <div className="border-t border-sidebar-border bg-black/10 p-4" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                    <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        style={sidebarTextStyle}
                        className="flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent"
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dfb23c]">
                            <User size={16} className="text-[hsl(var(--sidebar-background))]" />
                        </div>
                        <div className="flex-1 overflow-hidden text-left">
                            <p style={sidebarTextStyle} className="truncate text-xs font-medium">{user?.name}</p>
                            <p style={sidebarTextStyle} className="truncate text-xs">{user?.email}</p>
                        </div>
                        <ChevronDown size={14} className={cn('shrink-0 text-white transition-transform', userMenuOpen && 'rotate-180')} />
                    </button>
                    {userMenuOpen && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-border bg-popover py-1 shadow-lg">
                            <Link
                                to="/profile"
                                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                            >
                                <User size={14} /> Profil Saya
                            </Link>
                            <hr className="my-1 border-border" />
                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                            >
                                <LogOut size={14} /> Keluar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-background flex">
            {/* ── Desktop sidebar (always visible) ────────────── */}
            {!isMobile && (
                <aside
                    style={sidebarTextStyle}
                    className="app-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-[hsl(var(--sidebar-background))] shadow-[10px_0_30px_rgba(4,52,37,0.16)]"
                >
                    {sidebarContent}
                </aside>
            )}

            {/* ── Mobile sidebar overlay ───────────────────────── */}
            {isMobile && mobileOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 z-40 bg-black/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setMobileOpen(false)}
                    />
                    <motion.aside
                        style={sidebarTextStyle}
                        className="app-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-[hsl(var(--sidebar-background))] shadow-xl"
                        variants={sidebarSlide}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="absolute right-2 top-2 z-10 rounded-lg p-1.5 text-white/70 hover:bg-white/10"
                        >
                            <X size={18} />
                        </button>
                        {sidebarContent}
                    </motion.aside>
                </>
            )}

            {/* ── Main content ─────────────────────────────────── */}
            <div className={cn(
                'flex min-h-screen flex-1 flex-col transition-all duration-300',
                !isMobile && 'ml-64'
            )}>
                {/* Header */}
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/90 px-4 backdrop-blur-xl md:h-20 md:px-6">
                    {isMobile && (
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="rounded-xl p-2 transition-colors hover:bg-accent"
                            aria-label="Open sidebar"
                        >
                            <Menu size={18} />
                        </button>
                    )}

                    {title && (
                        <h1 className="text-sm font-bold text-foreground md:text-base">{title}</h1>
                    )}

                    <div className="ml-auto flex items-center gap-2">
                        <button className="relative rounded-lg p-2 transition-colors hover:bg-accent" aria-label="Notifikasi">
                            <Bell size={18} />
                            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                        </button>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 md:p-6">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                        {children}
                    </motion.div>
                </main>
            </div>
        </div>
    );
}