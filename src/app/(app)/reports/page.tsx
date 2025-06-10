
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, Filter as FilterIcon, Search, Users, CalendarClock, CalendarCheck, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export default function ReportsPage() {
  // TODO: Fetch current user role and verify access (PIC)
  // For now, assume access is granted if page is reached

  const handleDownloadReport = (reportType: string) => {
    // Placeholder for download logic
    alert(`Mendownload laporan ${reportType}... (Fitur ini belum diimplementasikan)`);
  };

  const handleApplyFilters = () => {
    // Placeholder for filter logic
    alert("Menerapkan filter... (Fitur ini belum diimplementasikan)");
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
            Filter Laporan
          </CardTitle>
          <CardDescription>
            Saring laporan berdasarkan kriteria tertentu untuk mendapatkan data yang lebih spesifik.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="wilayah">Wilayah</Label>
              <Select>
                <SelectTrigger id="wilayah">
                  <SelectValue placeholder="Pilih Wilayah" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jabodetabek">Jabodetabek</SelectItem>
                  <SelectItem value="jawa-barat">Jawa Barat</SelectItem>
                  <SelectItem value="jawa-tengah">Jawa Tengah</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="area">Area Operasional</Label>
              <Select>
                <SelectTrigger id="area">
                  <SelectValue placeholder="Pilih Area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jakarta-pusat">Jakarta Pusat</SelectItem>
                  <SelectItem value="bandung-kota">Bandung Kota</SelectItem>
                  <SelectItem value="surabaya-timur">Surabaya Timur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="lokasi-kerja">Lokasi Kerja (Hub)</Label>
              <Select>
                <SelectTrigger id="lokasi-kerja">
                  <SelectValue placeholder="Pilih Lokasi Kerja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hub-a">Hub A (Jakarta)</SelectItem>
                  <SelectItem value="hub-b">Hub B (Bandung)</SelectItem>
                  <SelectItem value="hub-c">Hub C (Surabaya)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Label htmlFor="search-kurir">Cari Kurir (Nama/ID)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="search-kurir" type="search" placeholder="Masukkan Nama atau ID Kurir..." className="pl-8" />
              </div>
            </div>
            <Button onClick={handleApplyFilters} className="w-full lg:w-auto self-end">
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
              <Button onClick={() => handleDownloadReport('Kehadiran Kurir')} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Unduh Laporan
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
             <CardTitle className="flex items-center text-lg"><Users className="mr-2 h-5 w-5 text-primary"/>Laporan Performa Pengiriman</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground mb-3">Ringkasan performa pengiriman, tingkat keberhasilan, dan paket pending/retur. Termasuk detail lokasi kerja kurir.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleDownloadReport('Performa Pengiriman')} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Unduh Laporan
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center text-lg"><CalendarCheck className="mr-2 h-5 w-5 text-primary"/>Laporan Aktivitas Harian</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground mb-3">Ringkasan aktivitas dan penyelesaian pekerjaan kurir per hari.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleDownloadReport('Aktivitas Harian')} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Unduh Laporan
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center text-lg"><FileText className="mr-2 h-5 w-5 text-primary"/>Laporan Ringkasan Mingguan</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground mb-3">Laporan komprehensif semua aktivitas dan performa selama satu minggu.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleDownloadReport('Ringkasan Mingguan')} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Unduh Laporan
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center text-lg"><FileText className="mr-2 h-5 w-5 text-primary"/>Laporan Ringkasan Bulanan</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground mb-3">Laporan komprehensif semua aktivitas dan performa selama satu bulan.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleDownloadReport('Ringkasan Bulanan')} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Unduh Laporan
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center text-lg"><FileText className="mr-2 h-5 w-5 text-primary"/>Laporan Paket COD</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground mb-3">Detail transaksi paket Cash on Delivery, status pembayaran, dan rekapitulasi.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleDownloadReport('Paket COD')} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Unduh Laporan
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

    