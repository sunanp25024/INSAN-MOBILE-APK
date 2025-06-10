
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export default function ApprovalsPage() {
  // TODO: Fetch current user role and verify access (MasterAdmin)
  // For now, assume access is granted if page is reached

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <ShieldCheck className="mr-3 h-7 w-7" />
            Persetujuan Perubahan Data
          </CardTitle>
          <CardDescription>
            Tinjau dan setujui atau tolak permintaan perubahan data yang diajukan oleh Admin atau PIC.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for approvals UI */}
          <p className="text-muted-foreground">
            Daftar permintaan persetujuan akan ditampilkan di sini. Setiap permintaan akan mencakup detail perubahan, siapa yang mengajukan, dan opsi untuk Menyetujui atau Menolak.
          </p>
          <div className="mt-6 p-6 border border-dashed rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Contoh Permintaan Persetujuan:</h3>
            <div className="p-4 border rounded-md bg-card-foreground/5">
                <p><strong>Jenis:</strong> Perubahan Data Kurir</p>
                <p><strong>Kurir ID:</strong> PISTEST2025</p>
                <p><strong>Diajukan oleh:</strong> Admin001</p>
                <p><strong>Perubahan:</strong> Nomor Telepon dari 0812xxxx menjadi 0813yyyy</p>
                <p><strong>Tanggal Diajukan:</strong> {new Date().toLocaleDateString('id-ID')}</p>
                <div className="mt-3 space-x-2">
                    <button className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">Setujui</button>
                    <button className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">Tolak</button>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
