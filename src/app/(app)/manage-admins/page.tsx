
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function ManageAdminsPage() {
  // TODO: Fetch current user role and verify access
  // For now, assume access is granted if page is reached

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <Users className="mr-3 h-7 w-7" />
            Manajemen Akun Admin
          </CardTitle>
          <CardDescription>
            Kelola akun pengguna dengan peran Admin. Anda dapat menambahkan, mengedit, menonaktifkan, atau menghapus akun Admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for admin management UI */}
          <p className="text-muted-foreground">
            Fitur manajemen akun Admin akan tersedia di sini. Ini akan mencakup tabel daftar Admin, tombol untuk menambah Admin baru, dan opsi untuk setiap Admin (edit, hapus, nonaktifkan).
          </p>
          <div className="mt-6 p-6 border border-dashed rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Fitur yang Direncanakan:</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Daftar Admin dengan status (Aktif/Nonaktif)</li>
              <li>Tombol Tambah Admin Baru (Formulir)</li>
              <li>Aksi per Admin: Edit Detail, Ubah Password, Nonaktifkan/Aktifkan, Hapus Akun</li>
              <li>Pencarian dan Filter Admin</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
