
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MailCheck } from 'lucide-react';

export default function PendingApprovalsPage() {
  // TODO: Fetch current user role and verify access (Admin)
  // For now, assume access is granted if page is reached

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <MailCheck className="mr-3 h-7 w-7" />
            Status Persetujuan Saya
          </CardTitle>
          <CardDescription>
            Lihat status permintaan perubahan data yang telah Anda ajukan kepada MasterAdmin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for pending approvals UI */}
          <p className="text-muted-foreground">
            Daftar permintaan perubahan yang Anda ajukan akan ditampilkan di sini beserta statusnya (Menunggu Persetujuan, Disetujui, Ditolak).
          </p>
          <div className="mt-6 p-6 border border-dashed rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Contoh Daftar Permintaan:</h3>
            <div className="p-4 border rounded-md bg-card-foreground/5 mb-2">
                <p><strong>Jenis:</strong> Perubahan Data Kurir</p>
                <p><strong>Kurir ID:</strong> PISTEST2025</p>
                <p><strong>Perubahan:</strong> Nomor Telepon dari 0812xxxx menjadi 0813yyyy</p>
                <p><strong>Tanggal Diajukan:</strong> {new Date(Date.now() - 86400000).toLocaleDateString('id-ID')}</p>
                <p><strong>Status:</strong> <span className="text-yellow-500 font-semibold">Menunggu Persetujuan</span></p>
            </div>
            <div className="p-4 border rounded-md bg-card-foreground/5">
                <p><strong>Jenis:</strong> Penambahan PIC Baru</p>
                <p><strong>Nama PIC:</strong> Citra Dewi</p>
                <p><strong>Tanggal Diajukan:</strong> {new Date(Date.now() - 86400000*2).toLocaleDateString('id-ID')}</p>
                <p><strong>Status:</strong> <span className="text-green-500 font-semibold">Disetujui</span></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
