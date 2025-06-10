
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function ManageKurirsPage() {
  // TODO: Fetch current user role and verify access
  // For now, assume access is granted if page is reached

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <Users className="mr-3 h-7 w-7" />
            Manajemen Akun Kurir
          </CardTitle>
          <CardDescription>
            Kelola akun pengguna dengan peran Kurir. Anda dapat menambahkan, mengedit, menonaktifkan, atau menghapus akun Kurir.
            Perubahan data Kurir mungkin memerlukan persetujuan dari MasterAdmin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for Kurir management UI */}
          <p className="text-muted-foreground">
            Fitur manajemen akun Kurir akan tersedia di sini. Ini akan mencakup tabel daftar Kurir, tombol untuk menambah Kurir baru, dan opsi untuk setiap Kurir.
          </p>
           <div className="mt-6 p-6 border border-dashed rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Fitur yang Direncanakan:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Daftar Kurir dengan status (Aktif/Nonaktif), lokasi kerja, dll.</li>
              <li>Tombol Tambah Kurir Baru (Formulir Lengkap)</li>
              <li>Aksi per Kurir: Lihat Detail, Edit Profil (memerlukan persetujuan MasterAdmin), Nonaktifkan/Aktifkan, Reset Password, Hapus Akun (memerlukan persetujuan)</li>
              <li>Integrasi dengan sistem persetujuan untuk perubahan sensitif.</li>
              <li>Pencarian dan Filter Kurir</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
