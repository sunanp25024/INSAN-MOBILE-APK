
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase } from 'lucide-react';

export default function ManagePICsPage() {
  // TODO: Fetch current user role and verify access
  // For now, assume access is granted if page is reached

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <Briefcase className="mr-3 h-7 w-7" />
            Manajemen Akun PIC
          </CardTitle>
          <CardDescription>
            Kelola akun pengguna dengan peran PIC (Person In Charge). Anda dapat menambahkan, mengedit, menonaktifkan, atau menghapus akun PIC.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for PIC management UI */}
          <p className="text-muted-foreground">
            Fitur manajemen akun PIC akan tersedia di sini. Ini akan mencakup tabel daftar PIC, tombol untuk menambah PIC baru, dan opsi untuk setiap PIC (edit, hapus, nonaktifkan).
          </p>
           <div className="mt-6 p-6 border border-dashed rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Fitur yang Direncanakan:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Daftar PIC dengan status (Aktif/Nonaktif) dan area tanggung jawab (jika ada)</li>
              <li>Tombol Tambah PIC Baru (Formulir)</li>
              <li>Aksi per PIC: Edit Detail, Ubah Password, Nonaktifkan/Aktifkan, Hapus Akun</li>
              <li>Pencarian dan Filter PIC</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
