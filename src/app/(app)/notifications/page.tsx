
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, UserPlus, UserCog, AlertTriangle } from 'lucide-react';

interface SystemNotification {
  id: string;
  type: 'User Management' | 'System Alert' | 'Data Change';
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
  icon: React.ElementType;
  iconColor?: string;
}

// Mock data for example notifications
const mockNotifications: SystemNotification[] = [
  {
    id: 'NOTIF001',
    type: 'User Management',
    title: 'Akun PIC Baru Ditambahkan oleh Admin',
    message: "Admin 'Admin001 (Admin Staff)' telah menambahkan akun PIC baru dengan ID 'PIC003' (Nama: Joko Susilo, Area: Surabaya Pusat).",
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(), // 1 hour ago
    read: false,
    icon: UserPlus,
    iconColor: 'text-blue-500'
  },
  {
    id: 'NOTIF002',
    type: 'User Management',
    title: 'Akun Kurir Baru Diajukan oleh Admin',
    message: "Admin 'Admin002 (Admin Staff Dua)' telah mengajukan penambahan akun Kurir baru dengan ID 'KURIR007' (Nama: Rahmat Hidayat) dan sedang menunggu persetujuan Anda.",
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), // 3 hours ago
    read: false,
    icon: UserPlus,
    iconColor: 'text-blue-500'
  },
  {
    id: 'NOTIF003',
    type: 'System Alert',
    title: 'Pembaruan Sistem Terjadwal',
    message: "Akan ada pemeliharaan sistem terjadwal pada tanggal 28 Juli 2024 pukul 02:00 - 04:00 WIB. Aplikasi mungkin tidak dapat diakses sementara.",
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
    read: true,
    icon: AlertTriangle,
    iconColor: 'text-yellow-500'
  },
   {
    id: 'NOTIF004',
    type: 'Data Change',
    title: 'Perubahan Data Admin Disetujui',
    message: "Perubahan data untuk Admin 'ADMIN002' telah disetujui dan diterapkan.",
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    read: true,
    icon: UserCog,
    iconColor: 'text-green-500'
  }
];


export default function NotificationsPage() {
  // TODO: Fetch current user role and verify access (MasterAdmin)
  // For now, assume access is granted if page is reached

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <Bell className="mr-3 h-7 w-7" />
            Notifikasi Sistem
          </CardTitle>
          <CardDescription>
            Pusat notifikasi untuk aktivitas penting dalam sistem, seperti penambahan pengguna baru oleh Admin atau perubahan data yang membutuhkan perhatian.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mockNotifications.length > 0 ? (
            <div className="space-y-4">
              {mockNotifications.map((notif) => (
                <Card key={notif.id} className={`p-4 ${notif.read ? 'bg-card-foreground/5 opacity-70' : 'bg-card-foreground/10 border-primary/30'}`}>
                  <div className="flex items-start space-x-3">
                    <notif.icon className={`mt-1 h-6 w-6 flex-shrink-0 ${notif.iconColor || 'text-primary'}`} />
                    <div className="flex-grow">
                      <div className="flex justify-between items-center">
                        <h3 className={`text-md font-semibold ${notif.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {notif.title}
                        </h3>
                        {!notif.read && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Baru</span>}
                      </div>
                      <p className={`text-sm ${notif.read ? 'text-muted-foreground' : 'text-foreground/90'}`}>{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notif.timestamp).toLocaleString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-lg text-muted-foreground">Tidak ada notifikasi baru.</p>
              <p className="text-sm text-muted-foreground">Semua notifikasi telah dibaca atau belum ada yang masuk.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
