
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReportsPage() {
  // TODO: Fetch current user role and verify access (PIC)
  // For now, assume access is granted if page is reached

  const handleDownloadReport = (reportType: string) => {
    // Placeholder for download logic
    alert(`Mendownload laporan ${reportType}... (Fitur ini belum diimplementasikan)`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <FileText className="mr-3 h-7 w-7" />
            Pusat Laporan
          </CardTitle>
          <CardDescription>
            Akses dan unduh berbagai laporan terkait operasional dan performa kurir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Pilih jenis laporan yang ingin Anda lihat atau unduh.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-2">Laporan Kehadiran Kurir</h3>
              <p className="text-sm text-muted-foreground mb-3">Laporan detail kehadiran semua kurir dalam rentang waktu tertentu.</p>
              <Button onClick={() => handleDownloadReport('Kehadiran Kurir')} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Unduh Laporan
              </Button>
            </Card>
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-2">Laporan Performa Pengiriman</h3>
              <p className="text-sm text-muted-foreground mb-3">Ringkasan performa pengiriman, tingkat keberhasilan, dan paket pending.</p>
              <Button onClick={() => handleDownloadReport('Performa Pengiriman')} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Unduh Laporan
              </Button>
            </Card>
             <Card className="p-4">
              <h3 className="text-lg font-semibold mb-2">Laporan Paket COD</h3>
              <p className="text-sm text-muted-foreground mb-3">Detail transaksi paket Cash on Delivery.</p>
              <Button onClick={() => handleDownloadReport('Paket COD')} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Unduh Laporan
              </Button>
            </Card>
             <Card className="p-4">
              <h3 className="text-lg font-semibold mb-2">Laporan Ringkasan Bulanan</h3>
              <p className="text-sm text-muted-foreground mb-3">Laporan komprehensif semua aktivitas selama satu bulan.</p>
              <Button onClick={() => handleDownloadReport('Ringkasan Bulanan')} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Unduh Laporan
              </Button>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
