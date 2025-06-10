
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ManageAdminsPage() {
  // TODO: Fetch current user role and verify access
  // For now, assume access is granted if page is reached

  const handleImportAdmins = () => {
    // Placeholder for Excel import logic
    alert("Fitur impor Admin dari Excel belum diimplementasikan.");
  };

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <FileUp className="mr-2 h-5 w-5 text-primary" />
            Impor Admin dari Excel
          </CardTitle>
          <CardDescription>
            Tambahkan beberapa akun admin sekaligus menggunakan file Excel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="excel-file-admin">Pilih File Excel (.xlsx)</Label>
            <Input id="excel-file-admin" type="file" accept=".xlsx, .xls" className="mt-1" />
          </div>
          <p className="text-xs text-muted-foreground">
            Format kolom yang diharapkan: ID Admin (opsional), Nama Lengkap, Email, Password Awal, dll.
          </p>
          <Button onClick={handleImportAdmins} className="w-full sm:w-auto">
            <FileUp className="mr-2 h-4 w-4" /> Impor Data Admin
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

    