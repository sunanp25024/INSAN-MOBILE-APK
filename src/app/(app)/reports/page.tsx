
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, Filter as FilterIcon, Search, Users, CalendarClock, CalendarCheck, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast'; // Import useToast

export default function ReportsPage() {
  const { toast } = useToast(); // Initialize useToast

  const handleDownloadReport = (reportType: string) => {
    let description = "Data akan disesuaikan dengan filter yang aktif di atas (Wilayah, Area, Hub, Kurir).";
    let title = `Simulasi Unduh ${reportType} (Excel)`;

    switch (reportType) {
      case 'Kehadiran Kurir':
        description = `File Excel akan berisi: Tanggal, ID Kurir, Nama Kurir, Lokasi Kerja, Waktu Check-In, Waktu Check-Out, Status Kehadiran. ${description}`;
        break;
      case 'Performa Pengiriman':
        description = `File Excel akan berisi: Periode, ID Kurir, Nama Kurir, Lokasi Kerja, Total Paket Dibawa, Terkirim, Pending/Retur, Rate Sukses. ${description}`;
        break;
      case 'Aktivitas Harian':
        description = `File Excel akan berisi: Tanggal, ID Kurir, Nama Kurir, Lokasi Hub, Total Paket Dibawa, Terkirim, Pending/Retur. ${description}`;
        break;
      case 'Ringkasan Mingguan':
        description = `File Excel akan berisi: Periode Minggu, Agregat data pengiriman, kehadiran, dan performa. ${description}`;
        break;
      case 'Ringkasan Bulanan':
        description = `File Excel akan berisi: Periode Bulan, Agregat data pengiriman, kehadiran, dan performa. ${description}`;
        break;
      case 'Paket COD':
        description = `File Excel akan berisi: Detail transaksi COD, status pembayaran, dan rekapitulasi. ${description}`;
        break;
      default:
        title = "Simulasi Unduh Laporan (Excel)";
    }
    
    toast({ 
      title: title, 
      description: description,
      duration: 7000 // Longer duration for more detailed toast
    });
  };

  const handleApplyFilters = () => {
    // Placeholder for filter logic
    toast({ 
        title: "Filter Diterapkan (Simulasi)", 
        description: "Laporan akan disesuaikan berdasarkan filter Wilayah, Area, Hub, dan Kurir yang Anda pilih." 
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
                  <SelectItem value="all-wilayah">Semua Wilayah</SelectItem>
                  <SelectItem value="jabodetabek">Jabodetabek-Banten</SelectItem>
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
                  <SelectItem value="all-area">Semua Area</SelectItem>
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
                  <SelectItem value="all-hub">Semua Hub</SelectItem>
                  <SelectItem value="jp-hub-thamrin">Hub Thamrin (Jakarta Pusat)</SelectItem>
                  <SelectItem value="bdg-hub-kota">Hub Bandung Kota</SelectItem>
                  <SelectItem value="jt-hub-cawang">Hub Cawang (Jakarta Timur)</SelectItem>
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
              <p className="text-sm text-muted-foreground mb-3">Ringkasan aktivitas dan penyelesaian pekerjaan kurir per hari (total paket, terkirim, retur).</p>
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

    
