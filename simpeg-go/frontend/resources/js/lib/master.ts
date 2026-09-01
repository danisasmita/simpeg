import type { MasterItem, MasterType } from '@/types';

export const MASTER_PATHS: Record<MasterType, string> = {
    'unit-kerja': '/unit-kerja',
    jabatan: '/jabatan',
    golongan: '/golongan',
    'status-kepegawaian': '/status-kepegawaian',
};

export const MASTER_TITLES: Record<MasterType, string> = {
    'unit-kerja': 'Unit Kerja',
    jabatan: 'Jabatan',
    golongan: 'Golongan',
    'status-kepegawaian': 'Status Kepegawaian',
};

export function isMasterType(value: string): value is MasterType {
    return ['unit-kerja', 'jabatan', 'golongan', 'status-kepegawaian'].includes(value);
}

export function masterTitle(value: string): string {
    if (!isMasterType(value)) return 'Master Data';
    return MASTER_TITLES[value];
}

export function apiPathForMaster(value: string): string {
    if (!isMasterType(value)) return '';
    return MASTER_PATHS[value];
}

export function indexPathFor(value: string): string {
    if (!isMasterType(value)) return '/dashboard';
    return `/master/${value}`;
}

export function findMasterName(items: MasterItem[], id?: number | null): string {
    if (!id) return '-';
    return items.find((item) => item.id === id)?.nama ?? '-';
}