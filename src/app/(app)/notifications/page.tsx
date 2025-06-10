
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  // TODO: Fetch current user role and verify access (MasterAdmin)
  // For now, assume access is granted if page is reached

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <Bell className="mr-3 h-7 w-7" />
            Notifikasi Sistem
          </CardTitle>
          <CardDescription>
            Pusat notifikasi untuk aktivitas penting dalam sistem, seperti penambahan pengguna baru oleh Admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for notifications UI */}
          <p className="text-muted-foreground">
            Daftar notifikasi sistem akan ditampilkan di sini.
          </p>
           <div className="mt-6 p-6 border border-dashed rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Contoh Notifikasi:</h3>
            <div className="p-4 border rounded-md bg-card-foreground/5 mb-2">
                <p><strong>Jenis:</strong> Akun PIC Baru Ditambahkan</p>
                <p><strong>Detail:</strong> Admin 'Admin001' telah menambahkan akun PIC baru dengan ID 'PIC002' (Siti Aminah).</p>
                <p><strong>Waktu:</strong> {new Date().toLocaleString('id-ID')}</p>
            </div>
             <div className="p-4 border rounded-md bg-card-foreground/5">
                <p><strong>Jenis:</strong> Akun Kurir Baru Ditambahkan</p>
                <p><strong>Detail:</strong> Admin 'Admin001' telah menambahkan akun Kurir baru dengan ID 'KURIR007' (Rahmat Hidayat).</p>
                <p><strong>Waktu:</strong> {new Date(Date.now() - 3600000).toLocaleString('id-ID')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
