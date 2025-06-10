
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Mock data for courier list - replace with actual data fetching
const mockCouriers = [
  { id: 'PISTEST2025', name: 'Budi Santoso', status: 'Aktif', location: 'Jakarta Pusat', totalPackagesToday: 35, onTimeRate: '95%' },
  { id: 'KURIR002', name: 'Ani Yudhoyono', status: 'Aktif', location: 'Bandung Kota', totalPackagesToday: 42, onTimeRate: '92%' },
  { id: 'KURIR003', name: 'Charlie Van Houten', status: 'Nonaktif', location: 'Surabaya Timur', totalPackagesToday: 0, onTimeRate: 'N/A' },
  { id: 'KURIR004', name: 'Dewi Persik', status: 'Aktif', location: 'Medan Barat', totalPackagesToday: 30, onTimeRate: '98%' },
];


export default function CourierManagementPage() {
  // TODO: Fetch current user role and verify access (PIC)
  // For now, assume access is granted if page is reached

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <ClipboardList className="mr-3 h-7 w-7" />
            Manajemen & Monitoring Kurir (View Only)
          </CardTitle>
          <CardDescription>
            Pantau aktivitas dan performa kurir. Sebagai PIC, Anda memiliki akses lihat saja ke data kurir.
            Perubahan data dilakukan oleh Admin atau MasterAdmin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <div className="relative flex-grow w-full sm:w-auto">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" placeholder="Cari kurir (ID atau Nama)..." className="pl-8 w-full" />
            </div>
            <Button variant="outline" className="w-full sm:w-auto">Filter Status</Button> {/* Placeholder for filter */}
          </div>

          <Card className="border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Kurir</TableHead>
                  <TableHead>Nama Kurir</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead className="text-right">Paket Hari Ini</TableHead>
                  <TableHead className="text-right">Rate Tepat Waktu</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockCouriers.map((kurir) => (
                  <TableRow key={kurir.id}>
                    <TableCell className="font-medium">{kurir.id}</TableCell>
                    <TableCell>{kurir.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${kurir.status === 'Aktif' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {kurir.status}
                      </span>
                    </TableCell>
                    <TableCell>{kurir.location}</TableCell>
                    <TableCell className="text-right">{kurir.totalPackagesToday}</TableCell>
                    <TableCell className="text-right">{kurir.onTimeRate}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="outline" size="sm">Lihat Detail</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <p className="text-xs text-muted-foreground text-center">
            Menampilkan {mockCouriers.length} dari {mockCouriers.length} kurir.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
