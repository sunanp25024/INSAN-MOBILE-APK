
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { FileText, Download, Filter as FilterIcon, Search, Users, CalendarClock, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import type { AttendanceRecord, KurirDailyTaskDoc } from '@/types';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export default function ReportsPage() {
  const { toast } = useToast(); 
  const [isDownloading, setIsDownloading] = useState(false);
  const [reportTypeDownloading, setReportTypeDownloading] = useState<string | null>(null);

  const handleDownloadReport = async (reportType: 'Kehadiran Kurir' | 'Performa Pengiriman') => {
    if (isDownloading) return;
    
    setReportTypeDownloading(reportType);
    setIsDownloading(true);
    toast({ title: 'Mempersiapkan Laporan...', description: `Mengambil data untuk ${reportType} dari database.` });

    try {
      let fileName = "Laporan.xlsx";
      let worksheetData: any[] = [];
      let columnWidths: { wch: number }[] = [];

      if (reportType === 'Kehadiran Kurir') {
        const attendanceQuery = query(collection(db, "attendance"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(attendanceQuery);
        const records = querySnapshot.docs.map(doc => doc.data() as AttendanceRecord);

        if (records.length === 0) {
            toast({ title: 'Tidak Ada Data', description: 'Tidak ada data kehadiran yang bisa diunduh.', variant: 'destructive' });
            setIsDownloading(false);
            setReportTypeDownloading(null);
            return;
        }

        worksheetData = records.map(record => ({
            'Tanggal': record.date,
            'ID Kurir': record.kurirId,
            'Nama Kurir': record.kurirName,
            'Waktu Check-In': record.checkInTime || '-',
            'Waktu Check-Out': record.checkOutTime || '-',
            'Status Kehadiran': record.status,
            'Lokasi Kerja (Hub)': record.workLocation || 'N/A',
        }));
        
        columnWidths = [ { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 25 }];
        fileName = `Laporan_Kehadiran_Kurir_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      } else if (reportType === 'Performa Pengiriman') {
        const tasksQuery = query(collection(db, "kurir_daily_tasks"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(tasksQuery);
        const records = querySnapshot.docs.map(doc => doc.data() as KurirDailyTaskDoc);

        if (records.length === 0) {
            toast({ title: 'Tidak Ada Data', description: 'Tidak ada data performa yang bisa diunduh.', variant: 'destructive' });
            setIsDownloading(false);
            setReportTypeDownloading(null);
            return;
        }

        worksheetData = records.map(task => {
            const successRate = task.totalPackages > 0 ? ((task.finalDeliveredCount || 0) / task.totalPackages * 100) : 0;
            return {
                'Tanggal': task.date,
                'ID Kurir': task.kurirUid, // Consistent ID
                'Nama Kurir': task.kurirFullName,
                'Status Tugas': task.taskStatus,
                'Total Paket': task.totalPackages,
                'Paket Terkirim': task.finalDeliveredCount || 0,
                'Paket Pending/Retur': task.finalPendingReturnCount || 0,
                'Rate Sukses (%)': successRate.toFixed(1),
            };
        });

        columnWidths = [ { wch: 12 }, { wch: 28 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
        fileName = `Laporan_Performa_Pengiriman_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      
      } else {
        toast({ 
            title: `Fitur Belum Tersedia`, 
            description: `Fungsionalitas unduh untuk "${reportType}" akan segera hadir.`,
            variant: "default"
        });
        setIsDownloading(false);
        setReportTypeDownloading(null);
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, reportType);
      worksheet['!cols'] = columnWidths;
      XLSX.writeFile(workbook, fileName);

      toast({ title: 'Unduhan Berhasil', description: `${reportType} telah diunduh.` });

    } catch (error: any) {
        console.error("Error downloading report: ", error);
        let message = 'Terjadi kesalahan saat membuat laporan.';
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
            message = 'Query memerlukan indeks. Silakan periksa log Firebase untuk membuat indeks yang diperlukan.';
        }
        toast({ title: 'Gagal Mengunduh', description: message, variant: 'destructive' });
    } finally {
        setIsDownloading(false);
        setReportTypeDownloading(null);
    }
  };

  const handleApplyFilters = () => {
    toast({ 
        title: "Filter Diterapkan (Simulasi)", 
        description: `Fitur filter akan diimplementasikan selanjutnya.` 
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <FileText className="mr-3 h-7 w-7" />
            Pusat Laporan
          </CardTitle>
          <CardDescription>
            Akses, filter, dan unduh berbagai laporan terkait operasional dan performa kurir.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <FilterIcon className="mr-2 h-5 w-5 text-primary" />
            Filter Laporan (Segera Hadir)
          </CardTitle>
          <CardDescription>
            Saring laporan berdasarkan kriteria tertentu untuk mendapatkan data yang lebih spesifik.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="wilayah-report">Wilayah</Label>
              <Select disabled>
                <SelectTrigger id="wilayah-report">
                  <SelectValue placeholder="Pilih Wilayah" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua Wilayah">Semua Wilayah</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="area-report">Area Operasional</Label>
              <Select disabled>
                <SelectTrigger id="area-report">
                  <SelectValue placeholder="Pilih Area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua Area">Semua Area</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="lokasi-kerja-report">Lokasi Kerja (Hub)</Label>
              <Select disabled>
                <SelectTrigger id="lokasi-kerja-report">
                  <SelectValue placeholder="Pilih Lokasi Kerja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua Hub">Semua Hub</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Label htmlFor="search-kurir-report">Cari Kurir (Nama/ID)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="search-kurir-report" type="search" placeholder="Masukkan Nama atau ID Kurir..." className="pl-8" disabled />
              </div>
            </div>
            <Button onClick={handleApplyFilters} className="w-full lg:w-auto self-end" disabled>
              <FilterIcon className="mr-2 h-4 w-4" /> Terapkan Filter
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Separator />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Jenis Laporan Tersedia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center text-lg"><CalendarClock className="mr-2 h-5 w-5 text-primary"/>Laporan Kehadiran Kurir</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground mb-3">Laporan detail kehadiran (check-in, check-out, keterlambatan) semua kurir. Termasuk detail lokasi kerja kurir.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleDownloadReport('Kehadiran Kurir')} className="w-full sm:w-auto" disabled={isDownloading}>
                <Download className="mr-2 h-4 w-4" /> {reportTypeDownloading === 'Kehadiran Kurir' ? 'Memproses...' : 'Unduh Laporan'}
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
             <CardTitle className="flex items-center text-lg"><Users className="mr-2 h-5 w-5 text-primary"/>Laporan Performa Pengiriman</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground mb-3">Ringkasan performa pengiriman, tingkat keberhasilan, dan paket pending/retur.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleDownloadReport('Performa Pengiriman')} className="w-full sm:w-auto" disabled={isDownloading}>
                <Download className="mr-2 h-4 w-4" /> {reportTypeDownloading === 'Performa Pengiriman' ? 'Memproses...' : 'Unduh Laporan'}
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center text-lg"><CalendarCheck className="mr-2 h-5 w-5 text-primary"/>Laporan Aktivitas Harian</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground mb-3">Ringkasan aktivitas dan penyelesaian pekerjaan kurir per hari. (Segera Hadir)</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => {}} className="w-full sm:w-auto" variant="secondary" disabled>
                <Download className="mr-2 h-4 w-4" /> Unduh Laporan
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center text-lg"><FileText className="mr-2 h-5 w-5 text-primary"/>Laporan Ringkasan Mingguan</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground mb-3">Laporan komprehensif semua aktivitas dan performa selama satu minggu. (Segera Hadir)</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => {}} className="w-full sm:w-auto" variant="secondary" disabled>
                <Download className="mr-2 h-4 w-4" /> Unduh Laporan
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
