export const permissionList = [
    'pegawai.view',
    'pegawai.create',
    'pegawai.update',
    'pegawai.delete',
    'pegawai.export',
    'absensi.view',
    'absensi.create',
    'cuti.view',
    'cuti.create',
    'cuti.approve',
    'master.view',
    'master.create',
    'master.update',
    'master.delete',
    'user.view',
    'user.create',
    'user.update',
    'user.delete',
    'laporan.view',
    'laporan.export',
    'settings.view',
    'settings.update',
] as const;

export type Permission = (typeof permissionList)[number];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    admin: [...permissionList],
    operator: [
        'pegawai.view',
        'pegawai.create',
        'pegawai.update',
        'pegawai.export',
        'absensi.view',
        'absensi.create',
        'cuti.view',
        'cuti.create',
        'master.view',
        'laporan.view',
        'laporan.export',
    ],
    pimpinan: [
        'pegawai.view',
        'absensi.view',
        'cuti.view',
        'cuti.approve',
        'laporan.view',
        'laporan.export',
    ],
    pegawai: ['pegawai.view', 'absensi.view', 'absensi.create', 'cuti.view', 'cuti.create'],
    dosen: ['pegawai.view', 'absensi.view', 'absensi.create', 'cuti.view', 'cuti.create'],
    operator_bsdm: [
        'pegawai.view',
        'pegawai.create',
        'pegawai.update',
        'pegawai.export',
        'absensi.view',
        'absensi.create',
        'cuti.view',
        'cuti.create',
        'master.view',
        'laporan.view',
        'laporan.export',
    ],
};

export function getPermissionsForRole(role?: string | null): Permission[] {
    if (!role) return [];
    const key = role.toLowerCase();
    return ROLE_PERMISSIONS[key] ?? [];
}