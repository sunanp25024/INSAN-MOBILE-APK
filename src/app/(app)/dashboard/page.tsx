
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Camera, ScanLine, PackagePlus, PackageCheck, PackageX, Upload, Info, Trash2, CheckCircle, XCircle, ChevronsUpDown, Calendar as CalendarIconLucide, AlertCircle, UserCheck as UserCheckIcon, UserCog, Users, Package as PackageIcon, Clock, TrendingUp, BarChart2, Activity, UserRoundCheck, UserRoundX, Truck, ListChecks, ArrowLeftRight, Filter as FilterIcon, Download as DownloadIcon, Search as SearchIcon, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DailyPackageInput, PackageItem, UserProfile, AttendanceActivity, DeliveryActivity, MonthlySummaryData, WeeklyShipmentSummary } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { format, subDays, formatDistanceToNow, startOfWeek, endOfWeek, eachWeekOfInterval, getMonth, getYear } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const mockKurirProfileData: UserProfile = {
  id: 'PISTEST2025',
  fullName: 'Budi Santoso',
  role: 'Kurir',
  workLocation: 'Jakarta Pusat Hub',
  joinDate: new Date().toISOString(),
  position: 'Kurir Senior',
  contractStatus: 'Permanent',
  bankAccountNumber: '1234567890',
  bankName: 'Bank Central Asia',
  bankRecipientName: 'Budi Santoso',
  avatarUrl: 'https://placehold.co/100x100.png',
  photoIdUrl: 'https://placehold.co/300x200.png'
};

const packageInputSchema = z.object({
  totalPackages: z.coerce.number().min(1, "Total paket minimal 1").max(200, "Max 200 paket"),
  codPackages: z.coerce.number().min(0).max(200),
  nonCodPackages: z.coerce.number().min(0).max(200),
}).refine(data => data.codPackages + data.nonCodPackages === data.totalPackages, {
  message: "Jumlah paket COD dan Non-COD harus sama dengan Total Paket",
  path: ["totalPackages"],
});


const MotivationalQuotes = [
  "Setiap paket yang terkirim adalah senyum yang kau antarkan. Semangat!",
  "Hari ini adalah kesempatan baru untuk menjadi kurir terbaik!",
  "Kecepatan dan ketepatan adalah kunci kesuksesanmu. Terus bergerak!",
  "Jangan biarkan rintangan menghentikanmu. Kamu luar biasa!",
  "Terima kasih atas dedikasimu. Setiap langkahmu berarti!"
];

interface DashboardSummaryData {
  activeCouriersToday: number;
  totalPackagesProcessedToday: number;
  totalPackagesDeliveredToday: number;
  onTimeDeliveryRateToday: number; 
  dailyShipmentSummary: { date: string; name: string; terkirim: number; pending: number }[];
  weeklyShipmentSummary: WeeklyShipmentSummary[];
  monthlyPerformanceSummary: MonthlySummaryData[];
}


export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [dailyInput, setDailyInput] = useState<DailyPackageInput | null>(null);
  const [managedPackages, setManagedPackages] = useState<PackageItem[]>([]);
  const [inTransitPackages, setInTransitPackages] = useState<PackageItem[]>([]);
  const [pendingReturnPackages, setPendingReturnPackages] = useState<PackageItem[]>([]);

  const [currentScannedResi, setCurrentScannedResi] = useState('');
  const [isManualCOD, setIsManualCOD] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [deliveryStarted, setDeliveryStarted] = useState(false);
  const [dayFinished, setDayFinished] = useState(false);

  const [motivationalQuote, setMotivationalQuote] = useState('');
  const [returnProofPhoto, setReturnProofPhoto] = useState<File | null>(null);
  const [returnLeadReceiverName, setReturnLeadReceiverName] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [packagePhotoMap, setPackagePhotoMap] = useState<Record<string, string>>({});
  const [capturingForPackageId, setCapturingForPackageId] = useState<string | null>(null);
  const [photoRecipientName, setPhotoRecipientName] = useState('');
  const [isCourierCheckedIn, setIsCourierCheckedIn] = useState<boolean | null>(null);
  const [isScanningForDeliveryUpdate, setIsScanningForDeliveryUpdate] = useState(false);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummaryData | null>(null);
  const [attendanceActivities, setAttendanceActivities] = useState<AttendanceActivity[]>([]);
  const [deliveryActivities, setDeliveryActivities] = useState<DeliveryActivity[]>([]);


  const { toast } = useToast();

  const { register, handleSubmit: handlePackageFormSubmit, watch, formState: { errors }, setValue, reset: resetPackageInputForm } = useForm<DailyPackageInput>({
    resolver: zodResolver(packageInputSchema),
    defaultValues: { totalPackages: 0, codPackages: 0, nonCodPackages: 0 }
  });

  useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
      try {
        const parsedUser = JSON.parse(userDataString) as UserProfile;
        setCurrentUser(parsedUser);

        if (parsedUser.role !== 'Kurir') {
          const today = new Date();
          const dailySummary = Array.from({ length: 7 }).map((_, i) => {
            const day = subDays(today, 6 - i);
            const delivered = Math.floor(Math.random() * 100) + 50;
            const pending = Math.floor(Math.random() * 20) + 5;
            return {
              date: day.toISOString(),
              name: format(day, 'dd/MM', { locale: indonesiaLocale }),
              terkirim: delivered,
              pending: pending,
            };
          });

          const weeklySummary: WeeklyShipmentSummary[] = [];
          const currentMonthWeeks = eachWeekOfInterval({
            start: startOfWeek(new Date(getYear(today), getMonth(today), 1), { weekStartsOn: 1 }),
            end: endOfWeek(new Date(getYear(today), getMonth(today) +1, 0), { weekStartsOn: 1 })
          }, { weekStartsOn: 1 });
          
          currentMonthWeeks.slice(-4).forEach((weekStart, index) => { // Take last 4 weeks
            weeklySummary.push({
              week: `Minggu ${index + 1}`,
              terkirim: Math.floor(Math.random() * 300) + 200,
              pending: Math.floor(Math.random() * 50) + 10,
            });
          });

          const monthlySummary: MonthlySummaryData[] = Array.from({length: 3}).map((_, i) => {
            const monthDate = new Date(today.getFullYear(), today.getMonth() - (2-i), 1);
            const delivered = Math.floor(Math.random() * 1200) + 800;
            const pending = Math.floor(Math.random() * 200) + 50;
            return {
              month: format(monthDate, 'MMM yyyy', {locale: indonesiaLocale}),
              totalDelivered: delivered,
              totalPending: pending,
              successRate: (delivered / (delivered + pending)) * 100,
            };
          });


          const summaryData: DashboardSummaryData = {
            activeCouriersToday: Math.floor(Math.random() * 15) + 5,
            totalPackagesProcessedToday: Math.floor(Math.random() * 200) + 100,
            totalPackagesDeliveredToday: Math.floor(Math.random() * 150) + 80,
            onTimeDeliveryRateToday: Math.floor(Math.random() * 15) + 85,
            dailyShipmentSummary: dailySummary,
            weeklyShipmentSummary: weeklySummary,
            monthlyPerformanceSummary: monthlySummary,
          };
          setDashboardSummary(summaryData);

          const mockAttendance: AttendanceActivity[] = [
            { id: 'att1', kurirName: 'Budi Santoso', kurirId: 'PISTEST2025', action: 'check-in', timestamp: subDays(new Date(), 0).setHours(7, 55, 0, 0).valueOf().toString(), location: 'Jakarta Pusat Hub' },
            { id: 'att2', kurirName: 'Ani Yudhoyono', kurirId: 'KURIR002', action: 'check-in', timestamp: subDays(new Date(), 0).setHours(8, 5, 0, 0).valueOf().toString(), location: 'Bandung Kota Hub' },
            { id: 'att3', kurirName: 'Charlie Van Houten', kurirId: 'KURIR003', action: 'reported-late', timestamp: subDays(new Date(), 0).setHours(9, 15, 0, 0).valueOf().toString(), location: 'Surabaya Timur Hub' },
            { id: 'att4', kurirName: 'Budi Santoso', kurirId: 'PISTEST2025', action: 'check-out', timestamp: subDays(new Date(), 0).setHours(17, 2, 0, 0).valueOf().toString(), location: 'Jakarta Pusat Hub' },
          ].sort((a,b) => parseInt(b.timestamp) - parseInt(a.timestamp));
          setAttendanceActivities(mockAttendance);
          
          const mockDeliveries: DeliveryActivity[] = [
            { id: 'del1', kurirName: 'Budi Santoso', kurirId: 'PISTEST2025', packageId: 'SPX001', action: 'delivered', timestamp: subDays(new Date(), 0).setHours(14, 30, 0, 0).valueOf().toString(), details: 'Diterima Bpk. Agus', location: 'Jakarta Pusat Hub' },
            { id: 'del2', kurirName: 'Ani Yudhoyono', kurirId: 'KURIR002', packageId: 'SPX002', action: 'in-transit', timestamp: subDays(new Date(), 0).setHours(13,0,0,0).valueOf().toString(), location: 'Bandung Kota Hub' },
            { id: 'del3', kurirName: 'Budi Santoso', kurirId: 'PISTEST2025', packageId: 'SPX003', action: 'delivery-failed', timestamp: subDays(new Date(), 0).setHours(11, 45, 0, 0).valueOf().toString(), details: 'Alamat tidak ditemukan', location: 'Jakarta Pusat Hub' },
            { id: 'del4', kurirName: 'Charlie Van Houten', kurirId: 'KURIR003', packageId: 'SPX004', action: 'picked-up', timestamp: subDays(new Date(), 0).setHours(10,0,0,0).valueOf().toString(), location: 'Surabaya Timur Hub' },
            { id: 'del5', kurirName: 'Ani Yudhoyono', kurirId: 'KURIR002', packageId: 'SPX005', action: 'returned-to-hub', timestamp: subDays(new Date(), 0).setHours(17,30,0,0).valueOf().toString(), details: 'Retur dari pengiriman gagal', location: 'Bandung Kota Hub' },
          ].sort((a,b) => parseInt(b.timestamp) - parseInt(a.timestamp));
          setDeliveryActivities(mockDeliveries);

        }

      } catch (error) {
        console.error("Failed to parse user data from localStorage for dashboard", error);
      }
    }
  }, []);


  useEffect(() => {
    if (currentUser?.role !== 'Kurir') return;

    const updateCheckInStatus = () => {
      const checkedInDate = localStorage.getItem('courierCheckedInToday');
      const today = new Date().toISOString().split('T')[0];
      setIsCourierCheckedIn(checkedInDate === today);
    };

    updateCheckInStatus(); 

    window.addEventListener('focus', updateCheckInStatus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        updateCheckInStatus();
      }
    });

    return () => {
      window.removeEventListener('focus', updateCheckInStatus);
      document.removeEventListener('visibilitychange', updateCheckInStatus);
    };
  }, [currentUser]);

  useEffect(() => {
    setMotivationalQuote(MotivationalQuotes[Math.floor(Math.random() * MotivationalQuotes.length)]);
  }, []);

  useEffect(() => {
    if (isScanning || capturingForPackageId || isScanningForDeliveryUpdate) {
      const getCameraStream = async () => {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } } });
        } catch (err) {
          console.warn("Rear camera not accessible, trying default camera:", err);
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (error) {
            console.error('Error accessing any camera:', error);
            setHasCameraPermission(false);
            toast({
              variant: 'destructive',
              title: 'Akses Kamera Gagal',
              description: 'Tidak dapat mengakses kamera. Mohon periksa izin kamera di browser Anda.',
            });
            setIsScanning(false);
            setCapturingForPackageId(null);
            setIsScanningForDeliveryUpdate(false);
            return;
          }
        }

        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      };

      getCameraStream();

      return () => {
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [isScanning, capturingForPackageId, isScanningForDeliveryUpdate, toast]);

  const handleDailyPackageInputSubmit: SubmitHandler<DailyPackageInput> = (data) => {
    setDailyInput(data);
    toast({ title: "Data Paket Harian Disimpan", description: `Total ${data.totalPackages} paket akan diproses.` });
  };

  const handleStartScan = () => {
    if (!dailyInput) {
      toast({ title: "Input Data Paket Dulu", description: "Mohon isi total paket harian terlebih dahulu.", variant: "destructive" });
      return;
    }
    if (managedPackages.length >= dailyInput.totalPackages) {
      toast({ title: "Batas Paket Tercapai", description: "Jumlah paket yang di-scan sudah sesuai total.", variant: "destructive" });
      return;
    }
    setIsScanning(true);
  };

  const capturePhoto = () => {
    if (videoRef.current && photoCanvasRef.current && hasCameraPermission) {
      const video = videoRef.current;
      const canvas = photoCanvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg');
    }
    return null;
  }

  const handleManualResiAdd = () => {
    const resiToAdd = currentScannedResi.trim();
    if (!resiToAdd) {
      toast({ title: "Resi Kosong", description: "Masukkan nomor resi.", variant: "destructive" });
      return;
    }
    if (managedPackages.find(p => p.id === resiToAdd)) {
      toast({ title: "Resi Duplikat", description: "Nomor resi ini sudah ada.", variant: "destructive" });
      setCurrentScannedResi('');
      return;
    }
    if (dailyInput && managedPackages.length < dailyInput.totalPackages) {
      setManagedPackages(prev => [...prev, { id: resiToAdd, status: 'process', isCOD: isManualCOD, lastUpdateTime: new Date().toISOString() }]);
      setCurrentScannedResi('');
      setIsManualCOD(false); 
      toast({ title: "Resi Ditambahkan", description: `${resiToAdd} (${isManualCOD ? "COD" : "Non-COD"}) berhasil ditambahkan.` });
       if (managedPackages.length + 1 === dailyInput.totalPackages) {
        setIsScanning(false);
      }
    } else if (dailyInput) {
        toast({ title: "Batas Paket Tercapai", description: "Jumlah paket yang di-scan sudah sesuai total.", variant: "destructive" });
    }
  };

  const handleSimulateScan = () => {
    const photoDataUrl = capturePhoto();
    if (photoDataUrl) {
        const dummyResi = `SPX${Date.now().toString().slice(-8)}`;
        if (dailyInput && managedPackages.length < dailyInput.totalPackages) {
          const currentCODPackages = managedPackages.filter(p => p.isCOD).length;
          const isCOD = currentCODPackages < dailyInput.codPackages;

          setManagedPackages(prev => [...prev, { id: dummyResi, status: 'process', isCOD, lastUpdateTime: new Date().toISOString() }]);
          toast({ title: "Resi Ter-scan (Simulasi)", description: `${dummyResi} (${isCOD ? "COD" : "Non-COD"}) berhasil ditambahkan.` });
          if (managedPackages.length + 1 === dailyInput.totalPackages) {
            setIsScanning(false);
          }
        } else if (dailyInput) {
            toast({ title: "Batas Paket Tercapai", description: "Jumlah paket yang di-scan sudah sesuai total.", variant: "destructive" });
        }
    } else {
        toast({ title: "Gagal Mengambil Gambar", description: "Tidak bisa mengambil gambar dari kamera. Pastikan kamera berfungsi.", variant: "destructive" });
    }
  };

  const handleDeleteManagedPackage = (resi: string) => {
    setManagedPackages(prev => prev.filter(p => p.id !== resi));
    toast({ title: "Resi Dihapus", description: `${resi} dihapus dari daftar.` });
  };

  const handleStartDelivery = () => {
    if (!dailyInput || managedPackages.length !== dailyInput.totalPackages) {
      toast({ title: "Paket Belum Lengkap", description: "Pastikan semua paket telah di-scan sesuai total harian.", variant: "destructive" });
      return;
    }
    setInTransitPackages(managedPackages.map(p => ({ ...p, status: 'in_transit', lastUpdateTime: new Date().toISOString() })));
    setManagedPackages([]);
    setDeliveryStarted(true);
    toast({ title: "Pengantaran Dimulai", description: "Semangat mengantarkan paket!" });
  };

  const handleOpenPackageCamera = (packageId: string) => {
    setCapturingForPackageId(packageId);
    setPhotoRecipientName('');
  };

  const handleCapturePackagePhoto = () => {
    if (!capturingForPackageId) return;

    if (!photoRecipientName.trim()) {
      toast({ title: "Nama Penerima Kosong", description: "Harap isi nama penerima paket.", variant: "destructive" });
      return;
    }

    const photoDataUrl = capturePhoto();
    if (photoDataUrl) {
      setPackagePhotoMap(prev => ({ ...prev, [capturingForPackageId]: photoDataUrl }));
      setInTransitPackages(prev => prev.map(p =>
        p.id === capturingForPackageId ? { 
            ...p, 
            deliveryProofPhotoUrl: photoDataUrl, 
            status: 'delivered', 
            recipientName: photoRecipientName.trim(),
            lastUpdateTime: new Date().toISOString() 
        } : p
      ));
      toast({ title: "Foto Bukti Terkirim", description: `Foto untuk paket ${capturingForPackageId} disimpan. Penerima: ${photoRecipientName.trim()}.` });
    } else {
      toast({ title: "Gagal Mengambil Foto", variant: "destructive" });
    }
    setCapturingForPackageId(null);
    setPhotoRecipientName('');
  };

  const handleDeletePackagePhoto = (packageId: string) => {
    setPackagePhotoMap(prev => {
      const newState = {...prev};
      delete newState[packageId];
      return newState;
    });
    setInTransitPackages(prev => prev.map(p =>
        p.id === packageId ? { ...p, deliveryProofPhotoUrl: undefined, status: 'in_transit', recipientName: undefined, lastUpdateTime: new Date().toISOString() } : p
    ));
    toast({ title: "Foto Dihapus", description: `Foto untuk paket ${packageId} dihapus.` });
  };

  const handleFinishDay = () => {
    const remainingInTransit = inTransitPackages.filter(p => p.status === 'in_transit');

    if (remainingInTransit.length > 0) {
      if (!returnProofPhoto) {
        toast({ title: "Upload Bukti Paket Pending", description: "Harap upload foto bukti pengembalian paket yang tidak terkirim.", variant: "destructive" });
        setPendingReturnPackages(remainingInTransit.map(p => ({ ...p, status: 'pending_return', lastUpdateTime: new Date().toISOString() })));
        return;
      }
      if (!returnLeadReceiverName.trim()) {
        toast({ title: "Nama Leader Serah Terima Kosong", description: "Harap isi nama leader yang menerima paket retur.", variant: "destructive" });
        setPendingReturnPackages(remainingInTransit.map(p => ({ ...p, status: 'pending_return', lastUpdateTime: new Date().toISOString() })));
        return;
      }
    }

    setPendingReturnPackages(remainingInTransit.map(p => ({ ...p, status: 'pending_return', returnProofPhotoUrl: returnProofPhoto ? URL.createObjectURL(returnProofPhoto) : undefined, returnLeadReceiverName: returnLeadReceiverName.trim(), lastUpdateTime: new Date().toISOString() })));
    setInTransitPackages(prev => prev.filter(p => p.status === 'delivered'));
    setDayFinished(true);
    toast({ title: "Pengantaran Selesai", description: `Terima kasih untuk kerja keras hari ini! Paket retur diserahkan kepada ${returnLeadReceiverName.trim() || 'N/A'}.` });
  };

  const handleReturnProofUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setReturnProofPhoto(event.target.files[0]);
      toast({ title: "Foto Bukti Return Diupload", description: event.target.files[0].name });
    }
  };

  const resetDay = () => {
    setDailyInput(null);
    resetPackageInputForm({ totalPackages: 0, codPackages: 0, nonCodPackages: 0 });
    setManagedPackages([]);
    setInTransitPackages([]);
    setPendingReturnPackages([]);
    setDeliveryStarted(false);
    setDayFinished(false);
    setReturnProofPhoto(null);
    setReturnLeadReceiverName('');
    setPackagePhotoMap({});
    setMotivationalQuote(MotivationalQuotes[Math.floor(Math.random() * MotivationalQuotes.length)]);
    
    if (currentUser?.role === 'Kurir') {
        setIsCourierCheckedIn(false); 
        localStorage.removeItem('courierCheckedInToday'); 
    }
    toast({ title: "Hari Baru Dimulai", description: "Semua data telah direset. Selamat bekerja!" });
  };

  const handleOpenDeliveryScan = () => {
    if (!inTransitPackages.some(p => p.status === 'in_transit')) {
      toast({ title: "Semua Paket Terupdate", description: "Tidak ada paket dalam perjalanan yang menunggu update scan."});
      return;
    }
    setIsScanningForDeliveryUpdate(true);
  };

  const handleSimulateDeliveryScanAndIdentify = () => {
    const photoDataUrl = capturePhoto(); 
    if (!photoDataUrl) {
       toast({ title: "Gagal Mengambil Gambar Awal", description: "Tidak bisa mengambil gambar dari kamera untuk simulasi.", variant: "destructive" });
       setIsScanningForDeliveryUpdate(false);
       return;
    }
  
    if (inTransitPackages.some(p => p.status === 'in_transit') && Math.random() < 0.2) {
      toast({
        variant: 'destructive',
        title: "Resi Tidak Ditemukan (Simulasi)",
        description: "Nomor resi yang di-scan tidak cocok dengan daftar paket yang sedang diantar.",
      });
      setIsScanningForDeliveryUpdate(false);
      return;
    }

    const packageToUpdate = inTransitPackages.find(p => p.status === 'in_transit');
  
    if (packageToUpdate) {
      const nowISO = new Date().toISOString();
      setInTransitPackages(prevPackages =>
        prevPackages.map(pkg =>
          pkg.id === packageToUpdate.id
            ? { ...pkg, lastUpdateTime: nowISO } 
            : pkg
        )
      );
      toast({ title: "Paket Teridentifikasi (Simulasi)", description: `Mempersiapkan update untuk ${packageToUpdate.id}...` });
      handleOpenPackageCamera(packageToUpdate.id); 
      setIsScanningForDeliveryUpdate(false); 
    } else {
      toast({ title: "Tidak Ada Paket In-Transit Lagi", description: "Semua paket tampaknya sudah terkirim atau diproses." });
      setIsScanningForDeliveryUpdate(false);
    }
  };


  const deliveredCount = inTransitPackages.filter(p => p.status === 'delivered').length + pendingReturnPackages.filter(p => p.status === 'returned').length;
  const pendingCountOnFinish = pendingReturnPackages.filter(p => p.status === 'pending_return').length; 
  const dailyTotalForChart = (dailyInput?.totalPackages || 0) === 0 ? 1 : (dailyInput?.totalPackages || 0);

  const performanceData = [
    { name: 'Terkirim', value: deliveredCount, color: 'hsl(var(--chart-1))' },
    { name: 'Pending/Retur', value: pendingCountOnFinish, color: 'hsl(var(--chart-2))' },
  ];

  const formatActivityTimestamp = (timestamp: string): string => {
    const date = new Date(parseInt(timestamp));
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    return formatDistanceToNow(date, { addSuffix: true, locale: indonesiaLocale });
  };

  const getAttendanceActionIcon = (action: AttendanceActivity['action']) => {
    switch (action) {
      case 'check-in': return <UserRoundCheck className="h-5 w-5 text-green-500" />;
      case 'check-out': return <UserRoundX className="h-5 w-5 text-red-500" />;
      case 'reported-late': return <Clock className="h-5 w-5 text-yellow-500" />;
      default: return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getDeliveryActionIcon = (action: DeliveryActivity['action']) => {
    switch(action) {
      case 'picked-up': return <PackagePlus className="h-5 w-5 text-blue-500" />;
      case 'in-transit': return <Truck className="h-5 w-5 text-orange-500" />;
      case 'delivered': return <PackageCheck className="h-5 w-5 text-green-500" />;
      case 'delivery-failed': return <PackageX className="h-5 w-5 text-red-500" />;
      case 'returned-to-hub': return <ArrowLeftRight className="h-5 w-5 text-purple-500" />;
      default: return <PackageIcon className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const handleDashboardFilterApply = () => {
    toast({ title: "Filter Diterapkan (Simulasi)", description: "Data dashboard akan diperbarui sesuai filter." });
  };

  const handleDownloadDashboardSummary = () => {
    toast({ title: "Unduh Ringkasan (Simulasi)", description: "Ringkasan data dashboard sedang disiapkan untuk diunduh." });
  };

  if (!currentUser) {
    return <div className="flex justify-center items-center h-screen"><p>Memuat data pengguna...</p></div>;
  }
  
  if (currentUser.role === 'Kurir' && isCourierCheckedIn === null) {
    return <div className="flex justify-center items-center h-screen"><p>Memeriksa status absensi...</p></div>;
  }

  if (currentUser.role === 'Kurir' && dayFinished) {
    return (
      <div className="space-y-6">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Laporan Performa Harian</CardTitle>
            <CardDescription>Ringkasan pengantaran paket hari ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-2">
                <p>Total Paket Dibawa: <strong>{dailyInput?.totalPackages || 0}</strong></p>
                <p>Total Paket Terkirim: <strong className="text-green-600 dark:text-green-400">{deliveredCount}</strong></p>
                <p>Total Paket Pending/Retur: <strong className="text-red-600 dark:text-red-400">{pendingCountOnFinish}</strong></p>
                <p>Tingkat Keberhasilan: <strong className="text-primary">{((deliveredCount / dailyTotalForChart) * 100).toFixed(1)}%</strong></p>
                {pendingReturnPackages.length > 0 && (
                    <p>Paket Retur Diserahkan ke Leader: <strong>{returnLeadReceiverName || 'N/A'}</strong></p>
                )}
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={performanceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                       {performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Legend wrapperStyle={{fontSize: "0.8rem"}}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            {pendingReturnPackages.length > 0 && returnProofPhoto && (
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-2">Bukti Paket Retur:</h3>
                <Image
                  src={URL.createObjectURL(returnProofPhoto)}
                  alt="Bukti Retur"
                  className="max-w-sm w-full md:max-w-xs rounded-lg shadow-md border border-border"
                  width={300}
                  height={200}
                  style={{objectFit: 'contain'}}
                  data-ai-hint="package receipt"
                />
              </div>
            )}
             {pendingReturnPackages.length > 0 && !returnProofPhoto && (
                <p className="text-muted-foreground text-center">Tidak ada foto bukti retur yang diupload untuk paket pending.</p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-4 pt-6 border-t mt-6">
             <p className="text-lg italic text-muted-foreground text-center px-4">{motivationalQuote}</p>
            <Button onClick={resetDay} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
              Mulai Hari Baru
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (currentUser.role === 'Kurir') {
    return (
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={currentUser.avatarUrl || mockKurirProfileData.avatarUrl} alt={currentUser.fullName} data-ai-hint="man face"/>
              <AvatarFallback>{currentUser.fullName.split(" ").map(n=>n[0]).join("")}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{currentUser.fullName}</CardTitle>
              <CardDescription>{currentUser.id} - {currentUser.workLocation || mockKurirProfileData.workLocation}</CardDescription>
            </div>
          </CardHeader>
        </Card>

        {!isCourierCheckedIn && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Anda Belum Melakukan Absen!</AlertTitle>
            <AlertDescription>
              Silakan lakukan <Link href="/attendance" className="font-bold underline hover:text-destructive-foreground">Check-In</Link> terlebih dahulu untuk memulai pekerjaan dan menginput data paket.
            </AlertDescription>
          </Alert>
        )}

        {!dailyInput && isCourierCheckedIn && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><PackagePlus className="mr-2 h-6 w-6 text-primary" /> Data Input Paket Harian</CardTitle>
              <CardDescription>Masukkan jumlah total paket yang akan dibawa hari ini.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePackageFormSubmit(handleDailyPackageInputSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="totalPackages">Total Paket Dibawa</Label>
                  <Input id="totalPackages" type="number" {...register("totalPackages")} placeholder="cth: 50" />
                  {errors.totalPackages && <p className="text-destructive text-sm mt-1">{errors.totalPackages.message}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="codPackages">Total Paket COD</Label>
                    <Input id="codPackages" type="number" {...register("codPackages")} placeholder="cth: 20" />
                    {errors.codPackages && <p className="text-destructive text-sm mt-1">{errors.codPackages.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="nonCodPackages">Total Paket Non-COD</Label>
                    <Input id="nonCodPackages" type="number" {...register("nonCodPackages")} placeholder="cth: 30" />
                    {errors.nonCodPackages && <p className="text-destructive text-sm mt-1">{errors.nonCodPackages.message}</p>}
                  </div>
                </div>
                {errors.totalPackages && errors.totalPackages.type === "refine" && <p className="text-destructive text-sm mt-1">{errors.totalPackages.message}</p>}
                <Button type="submit" className="w-full">Input Data Paket</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {dailyInput && !deliveryStarted && isCourierCheckedIn && (
          <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><ScanLine className="mr-2 h-6 w-6 text-primary" /> Scan & Kelola Paket</CardTitle>
              <CardDescription>Scan barcode atau input manual nomor resi. Total {managedPackages.length}/{dailyInput.totalPackages} paket.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleStartScan} disabled={managedPackages.length >= dailyInput.totalPackages} className="flex-1">
                      <Camera className="mr-2 h-4 w-4" /> Mulai Scan Barcode
                  </Button>
              </div>
              <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Input
                          type="text"
                          placeholder="Input manual nomor resi"
                          value={currentScannedResi}
                          onChange={(e) => setCurrentScannedResi(e.target.value)}
                          disabled={managedPackages.length >= dailyInput.totalPackages}
                          className="flex-grow"
                      />
                      <Button onClick={handleManualResiAdd} variant="outline" disabled={managedPackages.length >= dailyInput.totalPackages} className="sm:w-auto w-full">Tambah</Button>
                  </div>
                  <div className="flex items-center space-x-2 pt-1">
                      <Checkbox
                          id="isManualCOD"
                          checked={isManualCOD}
                          onCheckedChange={(checked) => setIsManualCOD(checked as boolean)}
                          disabled={managedPackages.length >= dailyInput.totalPackages}
                      />
                      <Label htmlFor="isManualCOD" className="text-sm font-normal text-muted-foreground">
                          Paket COD
                      </Label>
                  </div>
              </div>


              {isScanning && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <Card className="w-[calc(100%-2rem)] max-w-xl">
                    <CardHeader>
                      <CardTitle>Scan Barcode Paket</CardTitle>
                      <CardDescription>Arahkan kamera ke barcode paket.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                      <canvas ref={photoCanvasRef} style={{display: 'none'}} />
                      {hasCameraPermission === false && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertTitle>Akses Kamera Dibutuhkan</AlertTitle>
                          <AlertDescription>Mohon izinkan akses kamera.</AlertDescription>
                        </Alert>
                      )}
                      {hasCameraPermission === null && <p>Meminta izin kamera...</p>}
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row justify-between gap-2">
                      <Button variant="outline" onClick={() => setIsScanning(false)} className="w-full sm:w-auto">Tutup</Button>
                      <Button onClick={handleSimulateScan} disabled={!hasCameraPermission} className="w-full sm:w-auto">
                          <Camera className="mr-2 h-4 w-4" /> Ambil Gambar (Simulasi Scan)
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              )}

              {managedPackages.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto p-1 border rounded-md">
                  <h3 className="font-semibold text-muted-foreground px-2">Paket Diproses ({managedPackages.length}):</h3>
                  {managedPackages.map(pkg => (
                    <div key={pkg.id} className="flex items-center justify-between p-2 bg-card-foreground/5 rounded-md">
                      <span className="text-sm break-all">{pkg.id} ({pkg.isCOD ? 'COD' : 'Non-COD'}) - <span className="italic text-xs text-primary">Proses</span></span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => handleDeleteManagedPackage(pkg.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Progress value={(managedPackages.length / dailyInput.totalPackages) * 100} className="w-full h-2.5" />
            </CardContent>
            <CardFooter>
              <Button onClick={handleStartDelivery} className="w-full" disabled={managedPackages.length !== dailyInput.totalPackages}>
                Mulai Pengantaran ({managedPackages.length}/{dailyInput.totalPackages})
              </Button>
            </CardFooter>
          </Card>
          </>
        )}

        {deliveryStarted && inTransitPackages.length > 0 && isCourierCheckedIn && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex-grow">
                      <CardTitle className="flex items-center"><PackageCheck className="mr-2 h-6 w-6 text-green-500" /> Sedang Dalam Pengantaran</CardTitle>
                      <CardDescription>Daftar paket yang sedang diantarkan. {inTransitPackages.filter(p => p.status === 'in_transit').length} paket belum terkirim.</CardDescription>
                  </div>
                  <Button 
                      onClick={handleOpenDeliveryScan} 
                      variant="outline" 
                      size="sm" 
                      className="w-full sm:w-auto"
                      disabled={!inTransitPackages.some(p => p.status === 'in_transit')}>
                    <ScanLine className="mr-2 h-4 w-4" /> Scan Update Kirim
                  </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {[...inTransitPackages]
                  .sort((a, b) => {
                    if (a.status === 'delivered' && b.status !== 'delivered') return 1; 
                    if (a.status !== 'delivered' && b.status === 'delivered') return -1; 
                    return new Date(b.lastUpdateTime).getTime() - new Date(a.lastUpdateTime).getTime();
                  })
                  .map(pkg => (
                <Card key={pkg.id} className={`p-3 ${pkg.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700' : 'bg-card'}`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-1">
                    <p className="font-semibold break-all">{pkg.id} <span className={`text-xs px-2 py-0.5 rounded-full ${pkg.isCOD ? 'bg-yellow-400/20 text-yellow-600 dark:text-yellow-300' : 'bg-blue-400/20 text-blue-600 dark:text-blue-300'}`}>{pkg.isCOD ? 'COD' : 'Non-COD'}</span></p>
                    {pkg.status === 'delivered' ? (
                      <span className="text-xs text-green-600 dark:text-green-400 flex items-center flex-shrink-0"><CheckCircle size={14} className="mr-1"/> Terkirim</span>
                    ) : (
                      <span className="text-xs text-orange-500 dark:text-orange-400 flex-shrink-0">Dalam Perjalanan</span>
                    )}
                  </div>
                  {pkg.status === 'in_transit' && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenPackageCamera(pkg.id)} className="flex-1">
                        <Camera size={16} className="mr-1" /> Foto Bukti & Nama Penerima
                      </Button>
                    </div>
                  )}
                  {pkg.deliveryProofPhotoUrl && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Penerima: <span className="font-medium text-foreground">{pkg.recipientName || 'N/A'}</span></p>
                      <div className="flex items-end gap-2">
                          <Image src={pkg.deliveryProofPhotoUrl} alt={`Bukti ${pkg.id}`} className="w-24 h-24 object-cover rounded border" width={96} height={96} data-ai-hint="package at door"/>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeletePackagePhoto(pkg.id)}>
                              <Trash2 size={16} />
                          </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </CardContent>
            {capturingForPackageId && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <Card className="w-[calc(100%-2rem)] max-w-xl">
                    <CardHeader>
                      <CardTitle>Foto Bukti Paket: {capturingForPackageId}</CardTitle>
                      <CardDescription>Ambil foto dan masukkan nama penerima.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                      <canvas ref={photoCanvasRef} style={{display: 'none'}} />
                      {hasCameraPermission === false && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertTitle>Akses Kamera Dibutuhkan</AlertTitle>
                        </Alert>
                      )}
                      <div>
                          <Label htmlFor="photoRecipientName">Nama Penerima <span className="text-destructive">*</span></Label>
                          <Input
                              id="photoRecipientName"
                              type="text"
                              placeholder="Masukkan nama penerima"
                              value={photoRecipientName}
                              onChange={(e) => setPhotoRecipientName(e.target.value)}
                          />
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row justify-between gap-2">
                      <Button variant="outline" onClick={() => setCapturingForPackageId(null)} className="w-full sm:w-auto">Batal</Button>
                      <Button onClick={handleCapturePackagePhoto} disabled={!hasCameraPermission || !photoRecipientName.trim()} className="w-full sm:w-auto">
                          <Camera className="mr-2 h-4 w-4" /> Ambil & Simpan
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              )}
              {isScanningForDeliveryUpdate && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <Card className="w-[calc(100%-2rem)] max-w-xl">
                    <CardHeader>
                      <CardTitle>Scan Resi Paket untuk Update Pengiriman</CardTitle>
                      <CardDescription>Arahkan kamera ke barcode paket yang akan diupdate. (Simulasi)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                      <canvas ref={photoCanvasRef} style={{display: 'none'}} />
                      {hasCameraPermission === false && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertTitle>Akses Kamera Dibutuhkan</AlertTitle>
                          <AlertDescription>Mohon izinkan akses kamera.</AlertDescription>
                        </Alert>
                      )}
                      {hasCameraPermission === null && <p>Meminta izin kamera...</p>}
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row justify-between gap-2">
                      <Button variant="outline" onClick={() => setIsScanningForDeliveryUpdate(false)} className="w-full sm:w-auto">Tutup</Button>
                      <Button onClick={handleSimulateDeliveryScanAndIdentify} disabled={!hasCameraPermission} className="w-full sm:w-auto">
                          <ScanLine className="mr-2 h-4 w-4" /> Identifikasi (Simulasi)
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              )}
            <CardFooter>
              <Button onClick={handleFinishDay} className="w-full" variant="destructive">
                  Selesaikan Pengantaran Hari Ini
              </Button>
            </CardFooter>
          </Card>
        )}

        {deliveryStarted && pendingReturnPackages.length > 0 && !dayFinished && isCourierCheckedIn && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><PackageX className="mr-2 h-6 w-6 text-red-500" /> Paket Pending/Retur</CardTitle>
              <CardDescription>{pendingReturnPackages.length} paket belum terkirim dan perlu di-retur.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                  <Label htmlFor="returnProof" className="mb-1 block">Upload Foto Bukti Pengembalian Semua Paket Pending ke Gudang <span className="text-destructive">*</span></Label>
                  <Input id="returnProof" type="file" accept="image/*" onChange={handleReturnProofUpload} />
                  {returnProofPhoto && <p className="text-xs text-green-500 dark:text-green-400 mt-1">{returnProofPhoto.name} dipilih.</p>}
              </div>
              <div>
                  <Label htmlFor="returnLeadReceiverName">Nama Leader Serah Terima <span className="text-destructive">*</span></Label>
                  <Input
                      id="returnLeadReceiverName"
                      type="text"
                      placeholder="Nama Leader/Supervisor"
                      value={returnLeadReceiverName}
                      onChange={(e) => setReturnLeadReceiverName(e.target.value)}
                  />
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Daftar Resi Pending:</h4>
                  {pendingReturnPackages.map(pkg => (
                      <p key={pkg.id} className="text-sm text-muted-foreground break-all">{pkg.id} - <span className="italic">Pending Retur</span></p>
                  ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleFinishDay} className="w-full" variant="destructive" disabled={!returnProofPhoto || !returnLeadReceiverName.trim()}>
                  Konfirmasi Selesai dengan Paket Pending
              </Button>
            </CardFooter>
          </Card>
        )}

        {!dayFinished && isCourierCheckedIn && (
            <Card className="bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 border-transparent">
              <CardContent className="pt-6">
                  <p className="text-center text-lg italic text-foreground/70 dark:text-primary-foreground/80">{motivationalQuote}</p>
              </CardContent>
            </Card>
        )}

      </div>
    );
  }

  if (!dashboardSummary) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Memuat ringkasan dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center">
            {currentUser.role === 'MasterAdmin' ? <UserCog className="mr-2 h-7 w-7" /> : currentUser.role === 'Admin' ? <Users className="mr-2 h-7 w-7" /> : <Briefcase className="mr-2 h-7 w-7" />}
             Selamat Datang, {currentUser.fullName}!
          </CardTitle>
          <CardDescription>Anda login sebagai {currentUser.role}. Berikut ringkasan operasional kurir.</CardDescription>
        </CardHeader>
      </Card>

      {currentUser.role !== 'Kurir' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <FilterIcon className="mr-2 h-5 w-5 text-primary" />
              Filter & Aksi Cepat Dashboard
            </CardTitle>
            <CardDescription>
              Saring data yang ditampilkan di dashboard atau unduh ringkasan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <div>
                <Label htmlFor="dashboard-wilayah">Wilayah</Label>
                <Select>
                  <SelectTrigger id="dashboard-wilayah">
                    <SelectValue placeholder="Semua Wilayah" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Wilayah</SelectItem>
                    <SelectItem value="jabodetabek">Jabodetabek</SelectItem>
                    <SelectItem value="jawa-barat">Jawa Barat</SelectItem>
                    <SelectItem value="jawa-tengah">Jawa Tengah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dashboard-area">Area Operasional</Label>
                <Select>
                  <SelectTrigger id="dashboard-area">
                    <SelectValue placeholder="Semua Area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Area</SelectItem>
                    <SelectItem value="jakarta-pusat">Jakarta Pusat</SelectItem>
                    <SelectItem value="bandung-kota">Bandung Kota</SelectItem>
                    <SelectItem value="surabaya-timur">Surabaya Timur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dashboard-lokasi-kerja">Lokasi Kerja (Hub)</Label>
                <Select>
                  <SelectTrigger id="dashboard-lokasi-kerja">
                    <SelectValue placeholder="Semua Hub" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Hub</SelectItem>
                    <SelectItem value="hub-a">Hub A (Jakarta)</SelectItem>
                    <SelectItem value="hub-b">Hub B (Bandung)</SelectItem>
                    <SelectItem value="hub-c">Hub C (Surabaya)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:col-span-2">
                <Label htmlFor="dashboard-search-kurir">Cari Kurir (Nama/ID)</Label>
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="dashboard-search-kurir" type="search" placeholder="Masukkan Nama atau ID Kurir..." className="pl-8" />
                </div>
              </div>
              <Button onClick={handleDashboardFilterApply} className="w-full lg:w-auto self-end">
                <FilterIcon className="mr-2 h-4 w-4" /> Terapkan Filter
              </Button>
            </div>
          </CardContent>
           <CardFooter>
              <Button onClick={handleDownloadDashboardSummary} variant="outline" className="w-full sm:w-auto">
                <DownloadIcon className="mr-2 h-4 w-4" /> Unduh Ringkasan Dashboard
              </Button>
            </CardFooter>
        </Card>
      )}


      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kurir Aktif Hari Ini</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardSummary.activeCouriersToday}</div>
            <p className="text-xs text-muted-foreground">Total kurir yang beroperasi</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paket Diproses Hari Ini</CardTitle>
            <PackageIcon className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardSummary.totalPackagesProcessedToday}</div>
            <p className="text-xs text-muted-foreground">Total paket ditugaskan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paket Terkirim Hari Ini</CardTitle>
            <PackageCheck className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardSummary.totalPackagesDeliveredToday}</div>
            <p className="text-xs text-muted-foreground">
              Dari {dashboardSummary.totalPackagesProcessedToday} paket
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Tepat Waktu</CardTitle>
            <Clock className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardSummary.onTimeDeliveryRateToday}%</div>
            <p className="text-xs text-muted-foreground">Pengiriman berhasil tepat waktu</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary"><BarChart2 className="mr-2 h-5 w-5"/>Ringkasan Pengiriman (7 Hari Terakhir)</CardTitle>
            <CardDescription>Visualisasi jumlah paket terkirim dan pending/retur.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={dashboardSummary.dailyShipmentSummary} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                <XAxis dataKey="name" tick={{fontSize: '0.75rem'}}/>
                <YAxis tick={{fontSize: '0.75rem'}}/>
                <Tooltip
                    contentStyle={{
                        background: "hsl(var(--background))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        fontSize: "0.8rem",
                        padding: "0.5rem"
                    }}
                    cursor={{ fill: "hsl(var(--accent)/0.2)" }}
                />
                <Legend wrapperStyle={{fontSize: "0.8rem"}}/>
                <Bar dataKey="terkirim" name="Terkirim" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={20}/>
                <Bar dataKey="pending" name="Pending/Retur" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} barSize={20}/>
                </RechartsBarChart>
            </ResponsiveContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center text-xl text-primary"><TrendingUp className="mr-2 h-5 w-5" />Tren Pengiriman Mingguan (4 Minggu)</CardTitle>
                <CardDescription>Performa pengiriman paket terkirim dan pending per minggu.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dashboardSummary.weeklyShipmentSummary} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                        <XAxis dataKey="week" tick={{fontSize: '0.75rem'}} />
                        <YAxis tick={{fontSize: '0.75rem'}} />
                        <Tooltip
                            contentStyle={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)", fontSize: "0.8rem", padding: "0.5rem" }}
                            cursor={{ fill: "hsl(var(--accent)/0.2)" }}
                        />
                        <Legend wrapperStyle={{fontSize: "0.8rem"}} />
                        <Line type="monotone" dataKey="terkirim" name="Terkirim" stroke="hsl(var(--chart-1))" strokeWidth={2} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="pending" name="Pending/Retur" stroke="hsl(var(--chart-2))" strokeWidth={2} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary"><BarChart2 className="mr-2 h-5 w-5" />Ringkasan Performa Bulanan (3 Bulan Terakhir)</CardTitle>
            <CardDescription>Perbandingan total paket terkirim dan pending.</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] pt-4">
             <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={dashboardSummary.monthlyPerformanceSummary} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                    <XAxis dataKey="month" tick={{fontSize: '0.75rem'}} />
                    <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-1))" tick={{fontSize: '0.75rem'}} />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" tick={{fontSize: '0.75rem'}} />
                    <Tooltip
                        contentStyle={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)", fontSize: "0.8rem", padding: "0.5rem" }}
                        cursor={{ fill: "hsl(var(--accent)/0.2)" }}
                    />
                    <Legend wrapperStyle={{fontSize: "0.8rem"}} />
                    <Bar yAxisId="left" dataKey="totalDelivered" name="Total Terkirim" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={25} />
                    <Bar yAxisId="left" dataKey="totalPending" name="Total Pending" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} barSize={25} />
                </RechartsBarChart>
            </ResponsiveContainer>
        </CardContent>
      </Card>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary"><ListChecks className="mr-2 h-5 w-5"/>Aktivitas Absensi Terkini</CardTitle>
            <CardDescription>Update check-in/out kurir. Termasuk lokasi kerja kurir.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto pr-2">
            {attendanceActivities.length > 0 ? (
              <ul className="space-y-3">
                {attendanceActivities.map(activity => (
                  <li key={activity.id} className="flex items-start space-x-3 p-3 bg-card-foreground/5 rounded-md">
                    <div className="flex-shrink-0 mt-0.5">
                      {getAttendanceActionIcon(activity.action)}
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm font-medium">
                        {activity.kurirName} <span className="text-xs text-muted-foreground">({activity.kurirId})</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activity.action === 'check-in' ? 'melakukan check-in' : activity.action === 'check-out' ? 'melakukan check-out' : 'melaporkan keterlambatan'}
                        {activity.location && <span className="text-xs"> di {activity.location}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">{formatActivityTimestamp(activity.timestamp)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">Belum ada aktivitas absensi.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-primary"><Truck className="mr-2 h-5 w-5"/>Aktivitas Pengiriman Terkini</CardTitle>
            <CardDescription>Update status pengiriman paket oleh kurir. Termasuk lokasi kerja kurir.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto pr-2">
            {deliveryActivities.length > 0 ? (
              <ul className="space-y-3">
                {deliveryActivities.map(activity => (
                  <li key={activity.id} className="flex items-start space-x-3 p-3 bg-card-foreground/5 rounded-md">
                     <div className="flex-shrink-0 mt-0.5">
                      {getDeliveryActionIcon(activity.action)}
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm font-medium">
                        {activity.kurirName} <span className="text-xs text-muted-foreground">({activity.kurirId})</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Paket <span className="font-semibold text-foreground">{activity.packageId}</span> - {
                          activity.action === 'picked-up' ? 'diambil dari hub' :
                          activity.action === 'in-transit' ? 'sedang diantar' :
                          activity.action === 'delivered' ? 'berhasil terkirim' :
                          activity.action === 'delivery-failed' ? 'gagal terkirim' :
                          activity.action === 'returned-to-hub' ? 'dikembalikan ke hub' :
                          'status tidak diketahui'
                        }
                        {activity.details && <span className="italic">: {activity.details}</span>}
                        {activity.location && <span className="text-xs"> ({activity.location})</span>}
                      </p>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">{formatActivityTimestamp(activity.timestamp)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">Belum ada aktivitas pengiriman.</p>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

