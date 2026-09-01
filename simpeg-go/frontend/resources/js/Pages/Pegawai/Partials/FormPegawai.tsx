import { Pegawai } from '@/types';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Button } from '@/Components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { api, errorMessage } from '@/lib/api';
import { useState } from 'react';
import type { MasterItem } from '@/types';

interface Props {
    pegawai?: Pegawai;
    unitKerjas: MasterItem[];
    jabatans: MasterItem[];
    golongans: MasterItem[];
    statusKepegawaians: MasterItem[];
    submitLabel: string;
    onSaved?: () => void;
}

interface State {
    nip: string;
    nidn: string;
    nama_lengkap: string;
    nama_panggilan: string;
    jenis_kelamin: string;
    tempat_lahir: string;
    tanggal_lahir: string;
    agama: string;
    status_pernikahan: string;
    kewarganegaraan: string;
    nik: string;
    npwp: string;
    nomor_bpjs_kesehatan: string;
    nomor_bpjs_ketenagakerjaan: string;
    email_pribadi: string;
    email_institusi: string;
    nomor_hp: string;
    nomor_telp_darurat: string;
    nama_kontak_darurat: string;
    hubungan_kontak_darurat: string;
    alamat_ktp: string;
    alamat_domisili: string;
    status_kepegawaian_id: string;
    unit_kerja_id: string;
    jabatan_id: string;
    golongan_id: string;
    tanggal_masuk: string;
    tanggal_tmt_pns: string;
    tanggal_pensiun: string;
    status_aktif: string;
}

const str = (v: string) => (v.trim() === '' ? null : v.trim());
const toNum = (v: string) => (v ? Number(v) : null);
const dateToRFC = (v: string) => (v ? `${v}T00:00:00Z` : null);

export default function FormPegawai({
    pegawai,
    unitKerjas,
    jabatans,
    golongans,
    statusKepegawaians,
    submitLabel,
    onSaved,
}: Props) {
    const [data, setData] = useState<State>({
        nip: pegawai?.nip || '',
        nidn: pegawai?.nidn || '',
        nama_lengkap: pegawai?.nama_lengkap || '',
        nama_panggilan: pegawai?.nama_panggilan || '',
        jenis_kelamin: pegawai?.jenis_kelamin || '',
        tempat_lahir: pegawai?.tempat_lahir || '',
        tanggal_lahir: pegawai?.tanggal_lahir || '',
        agama: pegawai?.agama || '',
        status_pernikahan: pegawai?.status_pernikahan || '',
        kewarganegaraan: pegawai?.kewarganegaraan || 'WNI',
        nik: pegawai?.nik || '',
        npwp: pegawai?.npwp || '',
        nomor_bpjs_kesehatan: pegawai?.nomor_bpjs_kesehatan || '',
        nomor_bpjs_ketenagakerjaan: pegawai?.nomor_bpjs_ketenagakerjaan || '',
        email_pribadi: pegawai?.email_pribadi || '',
        email_institusi: pegawai?.email_institusi || '',
        nomor_hp: pegawai?.nomor_hp || '',
        nomor_telp_darurat: pegawai?.nomor_telp_darurat || '',
        nama_kontak_darurat: pegawai?.nama_kontak_darurat || '',
        hubungan_kontak_darurat: pegawai?.hubungan_kontak_darurat || '',
        alamat_ktp: pegawai?.alamat_ktp || '',
        alamat_domisili: pegawai?.alamat_domisili || '',
        status_kepegawaian_id: pegawai?.status_kepegawaian_id ? String(pegawai.status_kepegawaian_id) : '',
        unit_kerja_id: pegawai?.unit_kerja_id ? String(pegawai.unit_kerja_id) : '',
        jabatan_id: pegawai?.jabatan_id ? String(pegawai.jabatan_id) : '',
        golongan_id: pegawai?.golongan_id ? String(pegawai.golongan_id) : '',
        tanggal_masuk: pegawai?.tanggal_masuk || '',
        tanggal_tmt_pns: pegawai?.tanggal_tmt_pns || '',
        tanggal_pensiun: pegawai?.tanggal_pensiun || '',
        status_aktif: pegawai?.status_aktif || 'aktif',
    });
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createAccount, setCreateAccount] = useState(false);
    const [createRole, setCreateRole] = useState('pegawai');
    const [fotoFile, setFotoFile] = useState<File | null>(null);
    const [fotoPreview, setFotoPreview] = useState<string>(pegawai?.foto_url || '');

    const set = <K extends keyof State>(key: K, value: State[K]) =>
        setData((prev) => ({ ...prev, [key]: value }));

    const onFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setFotoFile(file);
        if (file) {
            setFotoPreview(URL.createObjectURL(file));
        } else {
            setFotoPreview(pegawai?.foto_url || '');
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setError(null);
        const payload: Record<string, unknown> = {
            nip: str(data.nip),
            nidn: str(data.nidn),
            nama_lengkap: data.nama_lengkap,
            nama_panggilan: str(data.nama_panggilan),
            jenis_kelamin: data.jenis_kelamin,
            tempat_lahir: str(data.tempat_lahir),
            tanggal_lahir: dateToRFC(data.tanggal_lahir),
            agama: str(data.agama),
            status_pernikahan: str(data.status_pernikahan),
            kewarganegaraan: str(data.kewarganegaraan),
            nik: str(data.nik),
            npwp: str(data.npwp),
            nomor_bpjs_kesehatan: str(data.nomor_bpjs_kesehatan),
            nomor_bpjs_ketenagakerjaan: str(data.nomor_bpjs_ketenagakerjaan),
            email_pribadi: str(data.email_pribadi),
            email_institusi: str(data.email_institusi),
            nomor_hp: str(data.nomor_hp),
            nomor_telp_darurat: str(data.nomor_telp_darurat),
            nama_kontak_darurat: str(data.nama_kontak_darurat),
            hubungan_kontak_darurat: str(data.hubungan_kontak_darurat),
            alamat_ktp: str(data.alamat_ktp),
            alamat_domisili: str(data.alamat_domisili),
            status_kepegawaian_id: toNum(data.status_kepegawaian_id),
            unit_kerja_id: toNum(data.unit_kerja_id),
            jabatan_id: toNum(data.jabatan_id),
            golongan_id: toNum(data.golongan_id),
            tanggal_masuk: dateToRFC(data.tanggal_masuk),
            tanggal_tmt_pns: dateToRFC(data.tanggal_tmt_pns),
            tanggal_pensiun: dateToRFC(data.tanggal_pensiun),
            status_aktif: data.status_aktif,
        };
        if (!pegawai) {
            payload.create_account = createAccount;
            if (createAccount) payload.role = createRole;
        }
        try {
            if (fotoFile) {
                const formData = new FormData();
                formData.append('data', JSON.stringify(payload));
                formData.append('foto', fotoFile);
                if (pegawai) {
                    await api.put(`/pegawai/${pegawai.id}`, formData);
                } else {
                    await api.post('/pegawai', formData);
                }
            } else if (pegawai) {
                await api.put(`/pegawai/${pegawai.id}`, payload);
            } else {
                await api.post('/pegawai', payload);
            }
            onSaved?.();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
                    {error}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Data Pribadi</CardTitle>
                    <CardDescription>Informasi dasar dan kontak pegawai.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
                        <Input id="nama_lengkap" value={data.nama_lengkap} onChange={e => set('nama_lengkap', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="nama_panggilan">Nama Panggilan</Label>
                        <Input id="nama_panggilan" value={data.nama_panggilan} onChange={e => set('nama_panggilan', e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>Jenis Kelamin</Label>
                        <Select value={data.jenis_kelamin} onValueChange={v => set('jenis_kelamin', v)}>
                            <SelectTrigger><SelectValue placeholder="Pilih Jenis Kelamin" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="L">Laki-laki</SelectItem>
                                <SelectItem value="P">Perempuan</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                            <Label htmlFor="tempat_lahir">Tempat Lahir</Label>
                            <Input id="tempat_lahir" value={data.tempat_lahir} onChange={e => set('tempat_lahir', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tanggal_lahir">Tanggal Lahir</Label>
                            <Input id="tanggal_lahir" type="date" value={data.tanggal_lahir} onChange={e => set('tanggal_lahir', e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Agama</Label>
                        <Select value={data.agama} onValueChange={v => set('agama', v)}>
                            <SelectTrigger><SelectValue placeholder="Pilih Agama" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Islam">Islam</SelectItem>
                                <SelectItem value="Kristen">Kristen</SelectItem>
                                <SelectItem value="Katolik">Katolik</SelectItem>
                                <SelectItem value="Hindu">Hindu</SelectItem>
                                <SelectItem value="Buddha">Buddha</SelectItem>
                                <SelectItem value="Konghucu">Konghucu</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Status Pernikahan</Label>
                        <Select value={data.status_pernikahan} onValueChange={v => set('status_pernikahan', v)}>
                            <SelectTrigger><SelectValue placeholder="Pilih Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Belum Menikah">Belum Menikah</SelectItem>
                                <SelectItem value="Menikah">Menikah</SelectItem>
                                <SelectItem value="Cerai Hidup">Cerai Hidup</SelectItem>
                                <SelectItem value="Cerai Mati">Cerai Mati</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="alamat_ktp">Alamat KTP</Label>
                        <Input id="alamat_ktp" value={data.alamat_ktp} onChange={e => set('alamat_ktp', e.target.value)} />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="alamat_domisili">Alamat Domisili</Label>
                        <Input id="alamat_domisili" value={data.alamat_domisili} onChange={e => set('alamat_domisili', e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email_pribadi">Email Pribadi</Label>
                        <Input id="email_pribadi" type="email" value={data.email_pribadi} onChange={e => set('email_pribadi', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="nomor_hp">Nomor HP</Label>
                        <Input id="nomor_hp" value={data.nomor_hp} onChange={e => set('nomor_hp', e.target.value)} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Foto</CardTitle>
                    <CardDescription>Foto pegawai (JPG/PNG, maksimal 2 MB).</CardDescription>
                </CardHeader>
                <CardContent className="flex items-start gap-4">
                    {fotoPreview && (
                        <img
                            src={fotoPreview}
                            alt="Pratinjau foto"
                            className="h-24 w-24 rounded-full border object-cover"
                        />
                    )}
                    <div className="space-y-2">
                        <input
                            id="foto"
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={onFotoChange}
                            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
                        />
                        <p className="text-xs text-muted-foreground">
                            Kosongkan jika tidak ingin mengubah foto.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Data Kepegawaian</CardTitle>
                    <CardDescription>Informasi penempatan dan jabatan.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="nip">NIP (Nomor Induk Pegawai)</Label>
                        <Input id="nip" value={data.nip} onChange={e => set('nip', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="nidn">NIDN (Opsional untuk Dosen)</Label>
                        <Input id="nidn" value={data.nidn} onChange={e => set('nidn', e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>Status Kepegawaian</Label>
                        <Select value={data.status_kepegawaian_id} onValueChange={v => set('status_kepegawaian_id', v)}>
                            <SelectTrigger><SelectValue placeholder="Pilih Status" /></SelectTrigger>
                            <SelectContent>
                                {statusKepegawaians.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.nama}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Unit Kerja</Label>
                        <Select value={data.unit_kerja_id} onValueChange={v => set('unit_kerja_id', v)}>
                            <SelectTrigger><SelectValue placeholder="Pilih Unit Kerja" /></SelectTrigger>
                            <SelectContent>
                                {unitKerjas.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.nama}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Jabatan</Label>
                        <Select value={data.jabatan_id} onValueChange={v => set('jabatan_id', v)}>
                            <SelectTrigger><SelectValue placeholder="Pilih Jabatan" /></SelectTrigger>
                            <SelectContent>
                                {jabatans.map(j => <SelectItem key={j.id} value={String(j.id)}>{j.nama}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Golongan</Label>
                        <Select value={data.golongan_id} onValueChange={v => set('golongan_id', v)}>
                            <SelectTrigger><SelectValue placeholder="Pilih Golongan" /></SelectTrigger>
                            <SelectContent>
                                {golongans.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.nama}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tanggal_masuk">Tanggal Masuk</Label>
                        <Input id="tanggal_masuk" type="date" value={data.tanggal_masuk} onChange={e => set('tanggal_masuk', e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>Status Aktif</Label>
                        <Select value={data.status_aktif} onValueChange={v => set('status_aktif', v)}>
                            <SelectTrigger><SelectValue placeholder="Pilih Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="aktif">Aktif</SelectItem>
                                <SelectItem value="nonaktif">Nonaktif</SelectItem>
                                <SelectItem value="pensiun">Pensiun</SelectItem>
                                <SelectItem value="meninggal">Meninggal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="email_institusi">Email Institusi</Label>
                        <Input id="email_institusi" type="email" value={data.email_institusi} onChange={e => set('email_institusi', e.target.value)} />
                    </div>
                </CardContent>
            </Card>

            {!pegawai && (
                <Card>
                    <CardHeader>
                        <CardTitle>Akun Login</CardTitle>
                        <CardDescription>Opsional: buat akun login untuk pegawai baru ini.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                            <input
                                type="checkbox"
                                checked={createAccount}
                                onChange={(e) => setCreateAccount(e.target.checked)}
                                className="h-4 w-4 rounded border-input accent-primary"
                            />
                            Buat akun login menggunakan email institusi
                        </label>
                        {createAccount && (
                            <div className="space-y-2 rounded-lg border p-4">
                                <Label>Peran</Label>
                                <Select value={createRole} onValueChange={setCreateRole}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pegawai">Pegawai</SelectItem>
                                        <SelectItem value="dosen">Dosen</SelectItem>
                                        <SelectItem value="operator">Operator</SelectItem>
                                        <SelectItem value="operator_bsdm">Operator BSDM</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Password awal <strong>password</strong> — pegawai dapat mengubahnya setelah masuk.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => window.history.back()}>Batal</Button>
                <Button type="submit" disabled={processing}>{processing ? 'Menyimpan...' : submitLabel}</Button>
            </div>
        </form>
    );
}