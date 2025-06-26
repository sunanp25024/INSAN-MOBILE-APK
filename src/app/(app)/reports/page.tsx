
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
import { collection, query, getDocs } from 'firebase/firestore';
import type { AttendanceRecord } from '@/types';
import * as XLSX from 'xlsx';

export default function ReportsPage() {
  const { toast } = useToast(); 
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadReport = async (reportType: string) => {
    if (isDownloading) return;

    // For now, we only implement the 'Kehadiran Kurir' report
    if (reportType !== 'Kehadiran Kurir') {
        toast({ 
            title: `Fitur Belum Tersedia`, 
            description: `Fungsionalitas unduh untuk "${reportType}" akan segera hadir.`,
            variant: "default"
        });
        return;
    }

    setIsDownloading(true);
    toast({ title: 'Mempersiapkan Laporan...', description: 'Mengambil data kehadiran dari database.' });

    try {
        // 1. Fetch data from Firestore
        const attendanceQuery = query(collection(db, "attendance"));
        const querySnapshot = await getDocs(attendanceQuery);
        const attendanceData = querySnapshot.docs.map(doc => doc.data() as AttendanceRecord);

        if (attendanceData.length === 0) {
            toast({ title: 'Tidak Ada Data', description: 'Tidak ada data kehadiran yang bisa diunduh.', variant: 'destructive' });
            return;
        }

        // 2. Format data for Excel
        const formattedData = attendanceData.map(record => ({
            'Tanggal': record.date,
            'ID Kurir': record.kurirId,
            'Nama Kurir': record.kurirName,
            'Waktu Check-In': record.checkInTime || '-',
            'Waktu Check-Out': record.checkOutTime || '-',
            'Status Kehadiran': record.status,
            'Lokasi Kerja (Hub)': record.workLocation || 'N/A',
        }));
        
        // 3. Create Excel file and trigger download
        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Kehadiran");
        
        // Set column widths for better readability
        worksheet['!cols'] = [
            { wch: 12 }, // Tanggal
            { wch: 15 }, // ID Kurir
            { wch: 25 }, // Nama Kurir
            { wch: 15 }, // Waktu Check-In
            { wch: 15 }, // Waktu Check-Out
            { wch: 20 }, // Status Kehadiran
            { wch: 25 }, // Lokasi Kerja (Hub)
        ];

        XLSX.writeFile(workbook, "Laporan_Kehadiran_Kurir.xlsx");

        toast({ title: 'Unduhan Berhasil', description: 'Laporan kehadiran kurir telah diunduh.' });

    } catch (error) {
        console.error("Error downloading report: ", error);
        toast({ title: 'Gagal Mengunduh', description: 'Terjadi kesalahan saat membuat laporan.', variant: 'destructive' });
    } finally {
        setIsDownloading(false);
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
                <Download className="mr-2 h-4 w-4" /> {isDownloading ? 'Memproses...' : 'Unduh Laporan'}
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
             <CardTitle className="flex items-center text-lg"><Users className="mr-2 h-5 w-5 text-primary"/>Laporan Performa Pengiriman</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground mb-3">Ringkasan performa pengiriman, tingkat keberhasilan, dan paket pending/retur. (Segera Hadir)</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleDownloadReport('Performa Pengiriman')} className="w-full sm:w-auto" variant="secondary">
                <Download className="mr-2 h-4 w-4" /> Unduh Laporan
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
              <Button onClick={() => handleDownloadReport('Aktivitas Harian')} className="w-full sm:w-auto" variant="secondary">
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
              <Button onClick={() => handleDownloadReport('Ringkasan Mingguan')} className="w-full sm:w-auto" variant="secondary">
                <Download className="mr-2 h-4 w-4" /> Unduh Laporan
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
