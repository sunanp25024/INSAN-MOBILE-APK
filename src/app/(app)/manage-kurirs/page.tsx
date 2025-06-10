
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ManageKurirsPage() {
  // TODO: Fetch current user role and verify access
  // For now, assume access is granted if page is reached

  const handleImportKurirs = () => {
    // Placeholder for Excel import logic
    alert("Fitur impor Kurir dari Excel belum diimplementasikan.");
  };

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <FileUp className="mr-2 h-5 w-5 text-primary" />
            Impor Kurir dari Excel
          </CardTitle>
          <CardDescription>
            Tambahkan beberapa akun kurir sekaligus menggunakan file Excel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="excel-file-kurir">Pilih File Excel (.xlsx)</Label>
            <Input id="excel-file-kurir" type="file" accept=".xlsx, .xls" className="mt-1" />
          </div>
          <p className="text-xs text-muted-foreground">
            Format kolom yang diharapkan: ID Kurir (opsional, akan digenerate jika kosong), Nama Lengkap, Email, Password Awal, Lokasi Kerja, No Telepon, dll.
          </p>
          <Button onClick={handleImportKurirs} className="w-full sm:w-auto">
            <FileUp className="mr-2 h-4 w-4" /> Impor Data Kurir
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

    