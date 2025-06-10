
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { FileText, Download, Filter as FilterIcon, Search, Users, CalendarClock, CalendarCheck, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast'; 

export default function ReportsPage() {
  const { toast } = useToast(); 

  const handleDownloadReport = (reportType: string) => {
    
    const activeFilters = {
        wilayah: (document.getElementById('wilayah-report') as HTMLSelectElement)?.value || 'Semua Wilayah',
        area: (document.getElementById('area-report') as HTMLSelectElement)?.value || 'Semua Area',
        hub: (document.getElementById('lokasi-kerja-report') as HTMLSelectElement)?.value || 'Semua Hub',
        kurir: (document.getElementById('search-kurir-report') as HTMLInputElement)?.value || 'Semua Kurir',
    };
    
    let description = `Data akan disesuaikan dengan filter aktif: Wilayah (${activeFilters.wilayah}), Area (${activeFilters.area}), Hub (${activeFilters.hub}), Kurir (${activeFilters.kurir}).`;
    let title = `Simulasi Unduh ${reportType} (Excel)`;
    let exampleColumns = "";

    switch (reportType) {
      case 'Kehadiran Kurir':
        exampleColumns = "Contoh Kolom: Tanggal, ID Kurir, Nama Kurir, NIK, Jabatan, Wilayah, Area, Lokasi Kerja (Hub), Waktu Check-In, Waktu Check-Out, Durasi Kerja, Status Kehadiran.";
        break;
      case 'Performa Pengiriman':
        exampleColumns = "Contoh Kolom: Periode, ID Kurir, Nama Kurir, Lokasi Kerja (Hub), Total Paket Dibawa, Terkirim, Pending/Retur, Rate Sukses.";
        break;
      case 'Aktivitas Harian':
        exampleColumns = "Contoh Kolom: Tanggal Selesai, ID Kurir, Nama Kurir, Lokasi Hub, Total Paket Dibawa, Terkirim Sukses, Total COD, Total Non-COD, Total Pending/Retur.";
        break;
      case 'Ringkasan Mingguan':
        exampleColumns = "Contoh Kolom: Periode Minggu, ID Kurir/Agregat, Nama Kurir/Semua, Wilayah, Area, Hub, Total Paket, Terkirim, Pending, Rate Sukses, Rata-rata Kehadiran.";
        break;
      case 'Ringkasan Bulanan':
        exampleColumns = "Contoh Kolom: Periode Bulan, ID Kurir/Agregat, Nama Kurir/Semua, Wilayah, Area, Hub, Total Paket, Terkirim, Pending, Rate Sukses, Rata-rata Kehadiran.";
        break;
      case 'Paket COD':
        exampleColumns = "Contoh Kolom: Tanggal Transaksi, ID Paket, No. Resi, ID Kurir, Nama Kurir, Nominal COD, Status Pembayaran, Waktu Pembayaran.";
        break;
      default:
        title = "Simulasi Unduh Laporan (Excel)";
    }
    
    toast({ 
      title: title, 
      description: `${exampleColumns} ${description}`,
      duration: 9000 
    });
  };

  const handleApplyFilters = () => {
    const activeFilters = {
        wilayah: (document.getElementById('wilayah-report') as HTMLSelectElement)?.value || 'Semua Wilayah',
        area: (document.getElementById('area-report') as HTMLSelectElement)?.value || 'Semua Area',
        hub: (document.getElementById('lokasi-kerja-report') as HTMLSelectElement)?.value || 'Semua Hub',
        kurir: (document.getElementById('search-kurir-report') as HTMLInputElement)?.value || 'Semua Kurir',
    };
    toast({ 
        title: "Filter Diterapkan (Simulasi)", 
        description: `Laporan akan disesuaikan berdasarkan filter: Wilayah (${activeFilters.wilayah}), Area (${activeFilters.area}), Hub (${activeFilters.hub}), Kurir (${activeFilters.kurir}).` 
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
              <Label htmlFor="wilayah-report">Wilayah</Label>
              <Select>
                <SelectTrigger id="wilayah-report">
                  <SelectValue placeholder="Pilih Wilayah" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua Wilayah">Semua Wilayah</SelectItem>
                  <SelectItem value="Jabodetabek-Banten">Jabodetabek-Banten</SelectItem>
                  <SelectItem value="Jawa Barat">Jawa Barat</SelectItem>
                  <SelectItem value="Jawa Tengah">Jawa Tengah</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="area-report">Area Operasional</Label>
              <Select>
                <SelectTrigger id="area-report">
                  <SelectValue placeholder="Pilih Area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua Area">Semua Area</SelectItem>
                  <SelectItem value="Jakarta Pusat">Jakarta Pusat</SelectItem>
                  <SelectItem value="Bandung Kota">Bandung Kota</SelectItem>
                  <SelectItem value="Surabaya Timur">Surabaya Timur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="lokasi-kerja-report">Lokasi Kerja (Hub)</Label>
              <Select>
                <SelectTrigger id="lokasi-kerja-report">
                  <SelectValue placeholder="Pilih Lokasi Kerja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua Hub">Semua Hub</SelectItem>
                  <SelectItem value="Hub Thamrin (Jakarta Pusat)">Hub Thamrin (Jakarta Pusat)</SelectItem>
                  <SelectItem value="Hub Bandung Kota">Hub Bandung Kota</SelectItem>
                  <SelectItem value="Hub Cawang (Jakarta Timur)">Hub Cawang (Jakarta Timur)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Label htmlFor="search-kurir-report">Cari Kurir (Nama/ID)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="search-kurir-report" type="search" placeholder="Masukkan Nama atau ID Kurir..." className="pl-8" />
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
