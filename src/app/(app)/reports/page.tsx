
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { FileText, Download, Filter as FilterIcon, Search, Users, CalendarClock, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { AttendanceRecord, KurirDailyTaskDoc, UserProfile, Wilayah, Area, Hub } from '@/types';
import { mockLocationsData } from '@/types';
import * as XLSX from 'xlsx';
import { format, subDays, parseISO, startOfWeek, endOfWeek } from 'date-fns';

export default function ReportsPage() {
  const { toast } = useToast(); 
  const [isDownloading, setIsDownloading] = useState(false);
  const [reportTypeDownloading, setReportTypeDownloading] = useState<string | null>(null);

  // Filter states
  const [allKurirs, setAllKurirs] = useState<UserProfile[]>([]);
  const [selectedWilayah, setSelectedWilayah] = useState<string>('all-wilayah');
  const [selectedArea, setSelectedArea] = useState<string>('all-area');
  const [selectedHub, setSelectedHub] = useState<string>('all-hub');
  const [searchKurir, setSearchKurir] = useState<string>('');
  
  const [areaOptions, setAreaOptions] = useState<Area[]>([]);
  const [hubOptions, setHubOptions] = useState<Hub[]>([]);

  // Fetch all kurir profiles once for filtering
  useEffect(() => {
    const fetchKurirs = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "Kurir"));
        const querySnapshot = await getDocs(q);
        const fetchedKurirs = querySnapshot.docs.map(doc => doc.data() as UserProfile);
        setAllKurirs(fetchedKurirs);
      } catch (error) {
        console.error("Error fetching kurir profiles for filters:", error);
        toast({ title: "Gagal memuat data kurir", variant: "destructive" });
      }
    };
    fetchKurirs();
  }, [toast]);
  
  // Effects for cascading dropdowns
  useEffect(() => {
    const allAreas = mockLocationsData.flatMap(w => w.areas);
    setAreaOptions(allAreas);
  }, []);
  
  useEffect(() => {
    if (selectedWilayah === 'all-wilayah') {
      const allAreas = mockLocationsData.flatMap(w => w.areas);
      setAreaOptions(allAreas);
    } else {
      const wilayah = mockLocationsData.find(w => w.id === selectedWilayah);
      setAreaOptions(wilayah ? wilayah.areas : []);
    }
    setSelectedArea('all-area');
  }, [selectedWilayah]);

  useEffect(() => {
    if (selectedArea === 'all-area') {
      const allHubsInWilayah = areaOptions.flatMap(a => a.hubs);
      setHubOptions(allHubsInWilayah);
    } else {
      const wilayah = mockLocationsData.find(w => w.areas.some(a => a.id === selectedArea));
      const area = wilayah?.areas.find(a => a.id === selectedArea);
      setHubOptions(area ? area.hubs : []);
    }
    setSelectedHub('all-hub');
  }, [selectedArea, areaOptions]);


  const getFilteredKurirUids = (): string[] => {
    const wilayahName = mockLocationsData.find(w => w.id === selectedWilayah)?.name;
    const areaName = areaOptions.find(a => a.id === selectedArea)?.name;
    const hubName = hubOptions.find(h => h.id === selectedHub)?.name;

    return allKurirs
      .filter(kurir => {
        const matchesWilayah = selectedWilayah === 'all-wilayah' || kurir.wilayah === wilayahName;
        const matchesArea = selectedArea === 'all-area' || !areaName || kurir.area === areaName;
        const matchesHub = selectedHub === 'all-hub' || !hubName || kurir.workLocation === hubName;
        const matchesSearch = searchKurir === '' || kurir.fullName.toLowerCase().includes(searchKurir.toLowerCase()) || kurir.id.toLowerCase().includes(searchKurir.toLowerCase());
        
        return matchesWilayah && matchesArea && matchesHub && matchesSearch;
      })
      .map(kurir => kurir.uid);
  };

  const handleDownloadReport = async (reportType: 'Kehadiran Kurir' | 'Performa Pengiriman' | 'Laporan Aktivitas Harian' | 'Laporan Ringkasan Mingguan') => {
    if (isDownloading) return;
    
    setReportTypeDownloading(reportType);
    setIsDownloading(true);
    toast({ title: 'Mempersiapkan Laporan...', description: `Mengambil dan memfilter data untuk ${reportType}.` });

    try {
      const filteredUids = getFilteredKurirUids();

      if (filteredUids.length === 0 && (selectedWilayah !== 'all-wilayah' || selectedArea !== 'all-area' || selectedHub !== 'all-hub' || searchKurir !== '')) {
         toast({ title: 'Tidak Ada Data', description: 'Tidak ada kurir yang cocok dengan filter yang dipilih.', variant: 'destructive' });
         setIsDownloading(false);
         setReportTypeDownloading(null);
         return;
      }
      
      let fileName = "Laporan.xlsx";
      let worksheetData: any[] = [];
      let columnWidths: { wch: number }[] = [];

      if (reportType === 'Kehadiran Kurir') {
        const attendanceQuery = query(collection(db, "attendance"), orderBy("date", "desc"));
        const querySnapshot = await getDocs(attendanceQuery);
        let records = querySnapshot.docs.map(doc => doc.data() as AttendanceRecord);

        if (filteredUids.length > 0) {
          const uidsSet = new Set(filteredUids);
          records = records.filter(record => uidsSet.has(record.kurirUid));
        }
        
        if (records.length === 0) {
            toast({ title: 'Tidak Ada Data', description: 'Tidak ada data kehadiran yang bisa diunduh untuk filter ini.', variant: 'destructive' });
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
        let records = querySnapshot.docs.map(doc => doc.data() as KurirDailyTaskDoc);
        
        if (filteredUids.length > 0) {
            const uidsSet = new Set(filteredUids);
            records = records.filter(record => uidsSet.has(record.kurirUid));
        }

        if (records.length === 0) {
            toast({ title: 'Tidak Ada Data', description: 'Tidak ada data performa yang bisa diunduh untuk filter ini.', variant: 'destructive' });
            setIsDownloading(false);
            setReportTypeDownloading(null);
            return;
        }

        worksheetData = records.map(task => {
            const successRate = task.totalPackages > 0 ? ((task.finalDeliveredCount || 0) / task.totalPackages * 100) : 0;
            return {
                'Tanggal': task.date,
                'ID Kurir': allKurirs.find(k => k.uid === task.kurirUid)?.id || task.kurirUid,
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
      
      } else if (reportType === 'Laporan Aktivitas Harian') {
        const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
        const attendanceQuery = query(collection(db, "attendance"), where("date", ">=", thirtyDaysAgo), orderBy("date", "desc"));
        const tasksQuery = query(collection(db, "kurir_daily_tasks"), where("date", ">=", thirtyDaysAgo), orderBy("date", "desc"));
        
        const [attendanceSnapshot, tasksSnapshot] = await Promise.all([getDocs(attendanceQuery), getDocs(tasksQuery)]);
        
        let attendanceRecords = attendanceSnapshot.docs.map(doc => doc.data() as AttendanceRecord);
        let taskRecords = tasksSnapshot.docs.map(doc => doc.data() as KurirDailyTaskDoc);

        if (filteredUids.length > 0) {
          const uidsSet = new Set(filteredUids);
          attendanceRecords = attendanceRecords.filter(record => uidsSet.has(record.kurirUid));
          taskRecords = taskRecords.filter(record => uidsSet.has(record.kurirUid));
        }
        
        if (attendanceRecords.length === 0 && taskRecords.length === 0) {
            toast({ title: 'Tidak Ada Data', description: 'Tidak ada data aktivitas untuk diunduh pada filter ini.', variant: 'destructive' });
            setIsDownloading(false); setReportTypeDownloading(null); return;
        }

        const dailyActivities: any[] = [];

        attendanceRecords.forEach(record => {
            dailyActivities.push({
                'Tanggal': record.date,
                'ID Kurir': record.kurirId,
                'Nama Kurir': record.kurirName,
                'Aktivitas': 'Absensi',
                'Detail': `Check-In: ${record.checkInTime || '-'}, Check-Out: ${record.checkOutTime || '-'}, Status: ${record.status}`,
                'Hub': record.workLocation || 'N/A'
            });
        });

        taskRecords.forEach(task => {
            dailyActivities.push({
                'Tanggal': task.date,
                'ID Kurir': allKurirs.find(k => k.uid === task.kurirUid)?.id || task.kurirUid,
                'Nama Kurir': task.kurirFullName,
                'Aktivitas': 'Penyelesaian Kerja',
                'Detail': `Paket: ${task.totalPackages}, Terkirim: ${task.finalDeliveredCount || 0}, Pending: ${task.finalPendingReturnCount || 0}`,
                'Hub': allKurirs.find(k => k.uid === task.kurirUid)?.workLocation || 'N/A'
            });
        });
        
        dailyActivities.sort((a, b) => b.Tanggal.localeCompare(a.Tanggal) || a['Nama Kurir'].localeCompare(b['Nama Kurir']));

        worksheetData = dailyActivities;
        columnWidths = [ { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 60 }, { wch: 25 }];
        fileName = `Laporan_Aktivitas_Harian_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      
      } else if (reportType === 'Laporan Ringkasan Mingguan') {
        const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd');
        const attendanceQuery = query(collection(db, "attendance"), where("date", ">=", ninetyDaysAgo));
        const tasksQuery = query(collection(db, "kurir_daily_tasks"), where("date", ">=", ninetyDaysAgo));
        
        const [attendanceSnapshot, tasksSnapshot] = await Promise.all([getDocs(attendanceQuery), getDocs(tasksQuery)]);
        
        let attendanceRecords = attendanceSnapshot.docs.map(doc => doc.data() as AttendanceRecord);
        let taskRecords = tasksSnapshot.docs.map(doc => doc.data() as KurirDailyTaskDoc);

        if (filteredUids.length > 0) {
          const uidsSet = new Set(filteredUids);
          attendanceRecords = attendanceRecords.filter(record => uidsSet.has(record.kurirUid));
          taskRecords = taskRecords.filter(record => uidsSet.has(record.kurirUid));
        }

        if (attendanceRecords.length === 0 && taskRecords.length === 0) {
            toast({ title: 'Tidak Ada Data', description: 'Tidak ada data untuk laporan mingguan pada filter ini.', variant: 'destructive' });
            setIsDownloading(false); setReportTypeDownloading(null); return;
        }
        
        const getWeekLabel = (date: Date) => {
            const weekStart = startOfWeek(date, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
            return `${format(weekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM yyyy')}`;
        };

        const weeklySummary: Record<string, any> = {};

        for (const task of taskRecords) {
          try {
            const date = parseISO(task.date);
            const week = getWeekLabel(date);
            const key = `${task.kurirUid}-${week}`;
            if (!weeklySummary[key]) {
              weeklySummary[key] = {
                'Minggu': week,
                'ID Kurir': allKurirs.find(k => k.uid === task.kurirUid)?.id || task.kurirUid,
                'Nama Kurir': task.kurirFullName,
                'Total Paket': 0,
                'Total Terkirim': 0,
                'Total Pending': 0,
                'Hari Kerja': 0,
                'Hari Hadir': 0,
              };
            }
            weeklySummary[key]['Total Paket'] += task.totalPackages || 0;
            weeklySummary[key]['Total Terkirim'] += task.finalDeliveredCount || 0;
            weeklySummary[key]['Total Pending'] += task.finalPendingReturnCount || 0;
            weeklySummary[key]['Hari Kerja'] += 1;
          } catch(e) { console.error("Error parsing task date", e) }
        }

        for (const att of attendanceRecords) {
          try {
            if (att.status === 'Present' || att.status === 'Late') {
                 const date = parseISO(att.date);
                 const week = getWeekLabel(date);
                 const key = `${att.kurirUid}-${week}`;
                 if (weeklySummary[key]) {
                     weeklySummary[key]['Hari Hadir'] += 1;
                 } else {
                    // Handle case where a courier has attendance but no tasks in a week
                    weeklySummary[key] = {
                        'Minggu': week,
                        'ID Kurir': att.kurirId,
                        'Nama Kurir': att.kurirName,
                        'Total Paket': 0, 'Total Terkirim': 0, 'Total Pending': 0,
                        'Hari Kerja': 0, 'Hari Hadir': 1,
                    };
                 }
            }
          } catch(e) { console.error("Error parsing attendance date", e) }
        }
        
        worksheetData = Object.values(weeklySummary).map(summary => ({
            ...summary,
            'Rate Sukses (%)': (summary['Total Paket'] > 0 ? (summary['Total Terkirim'] / summary['Total Paket']) * 100 : 0).toFixed(1),
            'Rate Kehadiran (%)': (summary['Hari Kerja'] > 0 ? (summary['Hari Hadir'] / summary['Hari Kerja']) * 100 : 0).toFixed(1)
        }));
        
        worksheetData.sort((a,b) => b.Minggu.localeCompare(a.Minggu) || a['Nama Kurir'].localeCompare(b['Nama Kurir']));
        
        columnWidths = [ { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 18 }];
        fileName = `Laporan_Ringkasan_Mingguan_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      }


      if (worksheetData.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, reportType);
        worksheet['!cols'] = columnWidths;
        XLSX.writeFile(workbook, fileName);
        toast({ title: 'Unduhan Berhasil', description: `${reportType} telah diunduh.` });
      } else {
        toast({ title: 'Tidak Ada Data', description: `Tidak ada data yang ditemukan untuk ${reportType} dengan filter ini.`, variant: 'destructive' });
      }


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
              <Select value={selectedWilayah} onValueChange={setSelectedWilayah}>
                <SelectTrigger id="wilayah-report">
                  <SelectValue placeholder="Pilih Wilayah" />
                </SelectTrigger>
                <SelectContent>
                  {mockLocationsData.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="area-report">Area Operasional</Label>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger id="area-report">
                  <SelectValue placeholder="Pilih Area" />
                </SelectTrigger>
                <SelectContent>
                   {areaOptions.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="lokasi-kerja-report">Lokasi Kerja (Hub)</Label>
              <Select value={selectedHub} onValueChange={setSelectedHub}>
                <SelectTrigger id="lokasi-kerja-report">
                  <SelectValue placeholder="Pilih Lokasi Kerja" />
                </SelectTrigger>
                <SelectContent>
                   {hubOptions.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-3">
              <Label htmlFor="search-kurir-report">Cari Kurir (Nama/ID)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  id="search-kurir-report" 
                  type="search" 
                  placeholder="Masukkan Nama atau ID Kurir..." 
                  className="pl-8"
                  value={searchKurir}
                  onChange={(e) => setSearchKurir(e.target.value)}
                />
              </div>
            </div>
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
              <p className="text-sm text-muted-foreground mb-3">Laporan detail kehadiran (check-in, check-out, keterlambatan) semua kurir.</p>
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
              <p className="text-sm text-muted-foreground mb-3">Laporan detail log aktivitas absensi dan penyelesaian pekerjaan kurir per hari.</p>
            </CardContent>
            <CardFooter>
               <Button onClick={() => handleDownloadReport('Laporan Aktivitas Harian')} className="w-full sm:w-auto" disabled={isDownloading}>
                <Download className="mr-2 h-4 w-4" /> {reportTypeDownloading === 'Laporan Aktivitas Harian' ? 'Memproses...' : 'Unduh Laporan'}
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center text-lg"><FileText className="mr-2 h-5 w-5 text-primary"/>Laporan Ringkasan Mingguan</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground mb-3">Laporan agregat performa dan kehadiran kurir yang dikelompokkan per minggu.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleDownloadReport('Laporan Ringkasan Mingguan')} className="w-full sm:w-auto" disabled={isDownloading}>
                <Download className="mr-2 h-4 w-4" /> {reportTypeDownloading === 'Laporan Ringkasan Mingguan' ? 'Memproses...' : 'Unduh Laporan'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
