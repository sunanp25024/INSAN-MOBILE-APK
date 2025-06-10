
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ManagePICsPage() {
  // TODO: Fetch current user role and verify access
  // For now, assume access is granted if page is reached

  const handleImportPICs = () => {
    // Placeholder for Excel import logic
    alert("Fitur impor PIC dari Excel belum diimplementasikan.");
  };

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <FileUp className="mr-2 h-5 w-5 text-primary" />
            Impor PIC dari Excel
          </CardTitle>
          <CardDescription>
            Tambahkan beberapa akun PIC sekaligus menggunakan file Excel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="excel-file-pic">Pilih File Excel (.xlsx)</Label>
            <Input id="excel-file-pic" type="file" accept=".xlsx, .xls" className="mt-1" />
          </div>
          <p className="text-xs text-muted-foreground">
            Format kolom yang diharapkan: ID PIC (opsional), Nama Lengkap, Email, Password Awal, Area Tanggung Jawab (opsional), dll.
          </p>
          <Button onClick={handleImportPICs} className="w-full sm:w-auto">
            <FileUp className="mr-2 h-4 w-4" /> Impor Data PIC
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

    