
"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Camera, ScanLine, PackagePlus, PackageCheck, PackageX, Upload, Info, Trash2, CheckCircle, XCircle, ChevronsUpDown, Calendar as CalendarIconLucide, AlertCircle, UserCheck as UserCheckIcon, UserCog, Users, Package as PackageIcon, Clock, TrendingUp, BarChart2, Activity, UserRoundCheck, UserRoundX, Truck, ListChecks, ArrowLeftRight, Filter as FilterIcon, Download as DownloadIcon, Search as SearchIcon, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { DailyPackageInput, PackageItem, UserProfile, AttendanceActivity, CourierWorkSummaryActivity, DashboardSummaryData, WeeklyShipmentSummary, MonthlySummaryData, Wilayah, Area, Hub, KurirDailyTaskDoc, AttendanceRecord } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { format, subDays, formatDistanceToNow, startOfWeek, endOfWeek, parseISO, isValid, startOfMonth, getWeek } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrowserMultiFormatReader, NotFoundException, ChecksumException, FormatException, type IScannerControls } from '@zxing/library';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, collection, addDoc, updateDoc, query, where, getDocs, Timestamp, serverTimestamp, writeBatch, deleteDoc, runTransaction, orderBy } from 'firebase/firestore';


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

// Mock location data for filters
const mockLocations: Wilayah[] = [
  {
    id: 'all-wilayah', name: 'Semua Wilayah', areas: []
  },
  {
    id: 'jabodetabek-banten',
    name: 'Jabodetabek-Banten',
    areas: [
      { id: 'all-area-jb', name: 'Semua Area (Jabodetabek-Banten)', hubs: []},
      {
        id: 'jakarta-pusat-jb',
        name: 'Jakarta Pusat',
        hubs: [
          { id: 'all-hub-jp', name: 'Semua Hub (Jakarta Pusat)'},
          { id: 'jp-hub-thamrin', name: 'Hub Thamrin' },
          { id: 'jp-hub-sudirman', name: 'Hub Sudirman' },
        ],
      },
      {
        id: 'jakarta-timur-jb',
        name: 'Jakarta Timur',
        hubs: [
          { id: 'all-hub-jt', name: 'Semua Hub (Jakarta Timur)'},
          { id: 'jt-hub-cawang', name: 'Hub Cawang' },
          { id: 'jt-hub-rawamangun', name: 'Hub Rawamangun' },
        ],
      },
    ],
  },
  {
    id: 'jawa-barat',
    name: 'Jawa Barat',
    areas: [
      { id: 'all-area-jabar', name: 'Semua Area (Jawa Barat)', hubs: []},
      {
        id: 'bandung-kota-jabar',
        name: 'Bandung Kota',
        hubs: [
          { id: 'all-hub-bdg', name: 'Semua Hub (Bandung Kota)'},
          { id: 'bdg-hub-kota', name: 'Hub Bandung Kota' },
          { id: 'bdg-hub-dago', name: 'Hub Dago' },
        ],
      },
    ],
  },
];


export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  // Kurir specific state
  const [dailyTaskDocId, setDailyTaskDocId] = useState<string | null>(null);
  const [dailyTaskData, setDailyTaskData] = useState<KurirDailyTaskDoc | null>(null);
  const [managedPackages, setManagedPackages] = useState<PackageItem[]>([]); // Packages in 'process' state before starting delivery
  const [inTransitPackages, setInTransitPackages] = useState<PackageItem[]>([]); // Packages 'in_transit' or 'delivered'
  const [pendingReturnPackages, setPendingReturnPackages] = useState<PackageItem[]>([]); // Packages 'pending_return' or 'returned'

  const [currentScannedResi, setCurrentScannedResi] = useState('');
  const [isManualCOD, setIsManualCOD] = useState(false);
  const [isScanning, setIsScanning] = useState(false); // For initial package input scan
  const [deliveryStarted, setDeliveryStarted] = useState(false); // UI state, real status in dailyTaskData.taskStatus
  const [dayFinished, setDayFinished] = useState(false); // UI state, real status in dailyTaskData.taskStatus

  const [motivationalQuote, setMotivationalQuote] = useState('');
  const [returnProofPhoto, setReturnProofPhoto] = useState<File | null>(null); // File object for upload
  const [returnProofPhotoDataUrl, setReturnProofPhotoDataUrl] = useState<string | null>(null); // For preview and Firestore
  const [returnLeadReceiverName, setReturnLeadReceiverName] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [packagePhotoMap, setPackagePhotoMap] = useState<Record<string, string>>({}); // { [resi]: dataUrl }
  const [capturingForPackageId, setCapturingForPackageId] = useState<string | null>(null);
  const [photoRecipientName, setPhotoRecipientName] = useState('');
  const [isCourierCheckedIn, setIsCourierCheckedIn] = useState<boolean | null>(null);
  const [isScanningForDeliveryUpdate, setIsScanningForDeliveryUpdate] = useState(false);
  
  const scannerControlsRef = useRef<IScannerControls | null>(null);

  // Dashboard states for managerial roles
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummaryData | null>(null);
  const [attendanceActivities, setAttendanceActivities] = useState<AttendanceActivity[]>([]);
  const [courierWorkSummaries, setCourierWorkSummaries] = useState<CourierWorkSummaryActivity[]>([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);

  // Filter states
  const [selectedWilayah, setSelectedWilayah] = useState<string>('all-wilayah');
  const [selectedArea, setSelectedArea] = useState<string>('all-area');
  const [selectedHub, setSelectedHub] = useState<string>('all-hub');
  const [searchKurir, setSearchKurir] = useState<string>('');
  const [areaOptions, setAreaOptions] = useState<Area[]>([]);
  const [hubOptions, setHubOptions] = useState<Hub[]>([]);

  const { toast } = useToast();

  const { register, handleSubmit: handlePackageFormSubmit, formState: { errors }, setValue, reset: resetPackageInputForm } = useForm<DailyPackageInput>({
    resolver: zodResolver(packageInputSchema),
    defaultValues: { totalPackages: 0, codPackages: 0, nonCodPackages: 0 }
  });

  const todayDateString = format(new Date(), 'yyyy-MM-dd');

  // Generate Document ID for daily task
  const generateDailyTaskDocId = (kurirUid: string) => {
    return `${kurirUid}_${todayDateString}`;
  };

  // Fetch or create daily task and packages for Kurir
  useEffect(() => {
    if (currentUser?.role === 'Kurir' && currentUser.uid && isCourierCheckedIn) {
      const docId = generateDailyTaskDocId(currentUser.uid);
      setDailyTaskDocId(docId);
      const dailyTaskRef = doc(db, "kurir_daily_tasks", docId);
      const packagesColRef = collection(dailyTaskRef, "packages");

      const fetchDailyData = async () => {
        try {
          const taskSnap = await getDoc(dailyTaskRef);
          if (taskSnap.exists()) {
            const taskData = taskSnap.data() as KurirDailyTaskDoc;
            setDailyTaskData(taskData);
            setValue("totalPackages", taskData.totalPackages);
            setValue("codPackages", taskData.codPackages);
            setValue("nonCodPackages", taskData.nonCodPackages);
            
            if (taskData.taskStatus === 'in_progress' || taskData.taskStatus === 'completed') {
              setDeliveryStarted(true);
            }
            if (taskData.taskStatus === 'completed') {
              setDayFinished(true);
              setReturnProofPhotoDataUrl(taskData.finalReturnProofPhotoUrl || null);
              setReturnLeadReceiverName(taskData.finalReturnLeadReceiverName || '');
            }

            // Fetch packages
            const packagesQuerySnapshot = await getDocs(packagesColRef);
            const fetchedPackages: PackageItem[] = [];
            packagesQuerySnapshot.forEach((pkgDoc) => {
              fetchedPackages.push({ id: pkgDoc.id, ...pkgDoc.data() } as PackageItem);
            });

            if (taskData.taskStatus === 'pending_setup') {
              setManagedPackages(fetchedPackages.filter(p => p.status === 'process'));
            } else if (taskData.taskStatus === 'in_progress' || taskData.taskStatus === 'completed') {
              setInTransitPackages(fetchedPackages.filter(p => p.status === 'in_transit' || p.status === 'delivered'));
              setPendingReturnPackages(fetchedPackages.filter(p => p.status === 'pending_return' || p.status === 'returned'));
              
              const photoMap: Record<string, string> = {};
              fetchedPackages.filter(p => p.status === 'delivered' && p.deliveryProofPhotoUrl).forEach(p => {
                photoMap[p.id] = p.deliveryProofPhotoUrl!;
              });
              setPackagePhotoMap(photoMap);
            }

          } else {
            // No task for today, ready for new input
            setDailyTaskData(null);
            setManagedPackages([]);
            setInTransitPackages([]);
            setPendingReturnPackages([]);
            setDeliveryStarted(false);
            setDayFinished(false);
            resetPackageInputForm();
          }
        } catch (error) {
          console.error("Error fetching daily task:", error);
          toast({ title: "Error", description: "Gagal memuat data harian.", variant: "destructive" });
        }
      };
      fetchDailyData();
    }
  }, [currentUser, isCourierCheckedIn, setValue, todayDateString, toast, resetPackageInputForm]);


 useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
      try {
        const parsedUser = JSON.parse(userDataString) as UserProfile;
        setCurrentUser(parsedUser);
      } catch (error) {
        console.error("Failed to parse user data from localStorage for dashboard", error);
      }
    }
  }, []);

  // Fetch managerial dashboard data (feeds and stats)
  useEffect(() => {
    if (currentUser?.role && currentUser.role !== 'Kurir') {
      const fetchManagerialData = async () => {
        setIsDashboardLoading(true);
        try {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const ninetyDaysAgo = subDays(new Date(), 90);

            // --- Fetch Attendance Data (Today & Last 90 days) ---
            const attendanceQuery = query(collection(db, 'attendance'), where('date', '>=', format(ninetyDaysAgo, 'yyyy-MM-dd')));
            const attendanceSnapshot = await getDocs(attendanceQuery);
            const allAttendanceRecords: AttendanceRecord[] = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
            
            const attendanceToday = allAttendanceRecords.filter(r => r.date === todayStr);

            const fetchedAttendanceActivities: AttendanceActivity[] = [];
            attendanceToday.forEach(record => {
                if (record.checkInTimestamp) {
                    fetchedAttendanceActivities.push({
                        id: `${record.id}-check-in`, kurirName: record.kurirName, kurirId: record.kurirId,
                        action: record.status === 'Late' ? 'check-in-late' : 'check-in',
                        timestamp: (record.checkInTimestamp as Timestamp).toMillis().toString(),
                        location: record.workLocation || 'N/A'
                    });
                }
                if (record.checkOutTimestamp) {
                    fetchedAttendanceActivities.push({
                        id: `${record.id}-check-out`, kurirName: record.kurirName, kurirId: record.kurirId,
                        action: 'check-out',
                        timestamp: (record.checkOutTimestamp as Timestamp).toMillis().toString(),
                        location: record.workLocation || 'N/A'
                    });
                }
            });
            const sortedAttendance = fetchedAttendanceActivities.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));
            setAttendanceActivities(sortedAttendance);


            // --- Fetch Work Data (Today & Last 90 days) ---
            const workSummaryQuery = query(collection(db, 'kurir_daily_tasks'), where('date', '>=', format(ninetyDaysAgo, 'yyyy-MM-dd')));
            const workSummarySnapshot = await getDocs(workSummaryQuery);
            const allWorkRecords: KurirDailyTaskDoc[] = workSummarySnapshot.docs.map(doc => doc.data() as KurirDailyTaskDoc);
            
            const workRecordsToday = allWorkRecords.filter(r => r.date === todayStr);
            const completedWorkToday = workRecordsToday.filter(task => task.taskStatus === 'completed' && task.finishTimestamp);

            const fetchedWorkSummaries: CourierWorkSummaryActivity[] = completedWorkToday.map(task => ({
                id: task.kurirUid + task.date,
                kurirName: task.kurirFullName,
                kurirId: task.kurirUid,
                hubLocation: "N/A",
                timestamp: (task.finishTimestamp as Timestamp).toMillis().toString(),
                totalPackagesAssigned: task.totalPackages,
                packagesDelivered: task.finalDeliveredCount || 0,
                packagesPendingOrReturned: task.finalPendingReturnCount || 0,
            }));
            const sortedSummaries = fetchedWorkSummaries.sort((a,b) => parseInt(b.timestamp) - parseInt(a.timestamp));
            setCourierWorkSummaries(sortedSummaries);
            
            // --- Process Data for Stats Cards ---
            const totalPackagesProcessedToday = workRecordsToday.reduce((sum, task) => sum + (task.totalPackages || 0), 0);
            const totalPackagesDeliveredToday = workRecordsToday.reduce((sum, task) => sum + (task.finalDeliveredCount || 0), 0);
            const presentCouriers = attendanceToday.filter(a => a.status === 'Present').length;
            const onTimeDeliveryRateToday = attendanceToday.length > 0 ? (presentCouriers / attendanceToday.length) * 100 : 0;

            // --- Process Data for Charts ---
            const dailyShipmentSummary = Array.from({ length: 7 }).map((_, i) => {
                const date = subDays(new Date(), i);
                const dateStr = format(date, 'yyyy-MM-dd');
                const tasksOnDate = allWorkRecords.filter(t => t.date === dateStr);
                const terkirim = tasksOnDate.reduce((sum, task) => sum + (task.finalDeliveredCount || 0), 0);
                const pending = tasksOnDate.reduce((sum, task) => sum + (task.finalPendingReturnCount || 0), 0);
                return { date: dateStr, name: format(date, 'dd/MM'), terkirim, pending };
            }).reverse();

            const weeklyShipmentSummary = allWorkRecords.reduce((acc, task) => {
                const weekNum = `W${getWeek(parseISO(task.date), { weekStartsOn: 1 })}`;
                if (!acc[weekNum]) acc[weekNum] = { week: weekNum, terkirim: 0, pending: 0 };
                acc[weekNum].terkirim += task.finalDeliveredCount || 0;
                acc[weekNum].pending += task.finalPendingReturnCount || 0;
                return acc;
            }, {} as Record<string, WeeklyShipmentSummary>);

            const monthlyPerformanceSummary = allWorkRecords.reduce((acc, task) => {
                const monthName = format(parseISO(task.date), 'MMMM', { locale: indonesiaLocale });
                if (!acc[monthName]) acc[monthName] = { month: monthName, totalDelivered: 0, totalPending: 0, successRate: 0 };
                acc[monthName].totalDelivered += task.finalDeliveredCount || 0;
                acc[monthName].totalPending += task.finalPendingReturnCount || 0;
                return acc;
            }, {} as Record<string, MonthlySummaryData>);

            setDashboardSummary({
                activeCouriersToday: attendanceToday.length,
                totalPackagesProcessedToday,
                totalPackagesDeliveredToday,
                onTimeDeliveryRateToday,
                dailyShipmentSummary,
                weeklyShipmentSummary: Object.values(weeklyShipmentSummary).slice(-4),
                monthlyPerformanceSummary: Object.values(monthlyPerformanceSummary).slice(-3)
            });


        } catch (error: any) {
            console.error("Error fetching managerial dashboard data:", error);
            toast({ title: "Error", description: "Gagal memuat data dashboard.", variant: "destructive"});
        } finally {
          setIsDashboardLoading(false);
        }
      };
      fetchManagerialData();
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (currentUser?.role !== 'Kurir') return;

    const updateCheckInStatus = () => {
      const checkedInDate = localStorage.getItem('courierCheckedInToday');
      const today = new Date().toISOString().split('T')[0];
      setIsCourierCheckedIn(checkedInDate === today);
    };
    
    // Check on mount
    updateCheckInStatus();
    
    // Listen for storage changes from other tabs and window focus
    window.addEventListener('storage', updateCheckInStatus);
    window.addEventListener('focus', updateCheckInStatus);
    
    return () => { 
        window.removeEventListener('storage', updateCheckInStatus);
        window.removeEventListener('focus', updateCheckInStatus);
    };
  }, [currentUser]);

  useEffect(() => {
    setMotivationalQuote(MotivationalQuotes[Math.floor(Math.random() * MotivationalQuotes.length)]);
  }, []);

  // Effect for Camera Permission and Stream Setup
  useEffect(() => {
    let stream: MediaStream | null = null;
    const setupCamera = async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setHasCameraPermission(true);
        } catch (err) {
            console.error("Camera permission denied:", err);
            setHasCameraPermission(false);
            toast({ title: "Akses Kamera Ditolak", description: "Mohon izinkan akses kamera di pengaturan browser Anda.", variant: "destructive" });
        }
    };

    if (isScanning || capturingForPackageId || isScanningForDeliveryUpdate) {
        setupCamera();
    }
  
    return () => {
        stream?.getTracks().forEach(track => track.stop());
        if (scannerControlsRef.current) {
            scannerControlsRef.current.stop();
            scannerControlsRef.current = null;
        }
    };
  }, [isScanning, capturingForPackageId, isScanningForDeliveryUpdate, toast]);


  // Effect for Barcode Scanning
  useEffect(() => {
    if ((isScanning || isScanningForDeliveryUpdate) && videoRef.current && hasCameraPermission) {
      const codeReader = new BrowserMultiFormatReader();
      const startScan = async () => {
        try {
          if (!videoRef.current || !videoRef.current.srcObject) return;
          await videoRef.current.play();
          const controls = await codeReader.decodeFromVideoElementContinuously(
            videoRef.current,
            async (result, err, scanControls) => {
              if (scannerControlsRef.current === null && scanControls) scannerControlsRef.current = scanControls;
              if (result) {
                if (scannerControlsRef.current) { scannerControlsRef.current.stop(); scannerControlsRef.current = null; }
                const scannedText = result.getText();
                toast({ title: "Barcode Terbaca!", description: `Resi: ${scannedText}` });

                if (isScanning) { // Initial package input scan
                  if (dailyTaskData && managedPackages.length < dailyTaskData.totalPackages) {
                    const isCODForScanned = managedPackages.filter(p => p.isCOD).length < dailyTaskData.codPackages;
                    const newPackage: PackageItem = { 
                        id: scannedText, 
                        status: 'process', 
                        isCOD: isCODForScanned, 
                        lastUpdateTime: new Date().toISOString() 
                    };
                    try {
                        if (!dailyTaskDocId) throw new Error("Daily task ID not set");
                        const packageDocRef = doc(db, "kurir_daily_tasks", dailyTaskDocId, "packages", scannedText);
                        await setDoc(packageDocRef, { ...newPackage, lastUpdateTime: serverTimestamp() });
                        setManagedPackages(prev => [...prev, newPackage]);
                        setIsManualCOD(false);
                        if (managedPackages.length + 1 === dailyTaskData.totalPackages) setIsScanning(false);
                    } catch (e) {
                        console.error("Error saving scanned package:", e);
                        toast({title: "Error Simpan", description: "Gagal menyimpan paket scan.", variant: "destructive"});
                    }
                  } else if (dailyTaskData) {
                    toast({ title: "Batas Paket Tercapai", variant: "destructive" });
                    setIsScanning(false);
                  }
                } else if (isScanningForDeliveryUpdate) { // Delivery update scan
                  const packageToUpdate = inTransitPackages.find(p => p.id === scannedText && p.status === 'in_transit');
                  if (packageToUpdate) {
                    handleOpenPackageCamera(packageToUpdate.id);
                  } else {
                    toast({ variant: 'destructive', title: "Resi Tidak Cocok" });
                  }
                  setIsScanningForDeliveryUpdate(false);
                }
              }
              if (err && !(err instanceof NotFoundException) && !(err instanceof ChecksumException) && !(err instanceof FormatException)) {
                console.error('Barcode scan error:', err);
              }
            }
          );
          scannerControlsRef.current = controls;
        } catch (error) {
           console.error("Failed to start scanner:", error);
        }
      };
      
      const timeoutId = setTimeout(startScan, 300); // Small delay to ensure video element is ready
      return () => clearTimeout(timeoutId);
    }
    return () => {
       if (scannerControlsRef.current) {
         scannerControlsRef.current.stop();
         scannerControlsRef.current = null;
       }
    };
  }, [isScanning, isScanningForDeliveryUpdate, hasCameraPermission, dailyTaskData, managedPackages, inTransitPackages, dailyTaskDocId, toast]);


  const handleDailyPackageInputSubmit: SubmitHandler<DailyPackageInput> = async (data) => {
    if (!currentUser || !currentUser.uid || !dailyTaskDocId) {
        toast({ title: "Error", description: "Informasi kurir tidak ditemukan.", variant: "destructive" });
        return;
    }
    const taskDocRef = doc(db, "kurir_daily_tasks", dailyTaskDocId);
    const newTaskData: KurirDailyTaskDoc = {
        kurirUid: currentUser.uid,
        kurirFullName: currentUser.fullName,
        date: todayDateString,
        totalPackages: data.totalPackages,
        codPackages: data.codPackages,
        nonCodPackages: data.nonCodPackages,
        taskStatus: 'pending_setup',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    try {
        await setDoc(taskDocRef, newTaskData);
        setDailyTaskData(newTaskData); // Update local state
        toast({ title: "Data Paket Harian Disimpan", description: `Total ${data.totalPackages} paket akan diproses.` });
    } catch (error) {
        console.error("Error saving daily package input:", error);
        toast({ title: "Error Simpan", description: "Gagal menyimpan data input paket.", variant: "destructive" });
    }
  };

  const handleStartScan = () => {
    if (!dailyTaskData) {
      toast({ title: "Input Data Paket Dulu", variant: "destructive" });
      return;
    }
    if (managedPackages.length >= dailyTaskData.totalPackages) {
      toast({ title: "Batas Paket Tercapai", variant: "destructive" });
      return;
    }
    setIsScanning(true);
  };

  const capturePhoto = (): string | null => {
      if (videoRef.current && photoCanvasRef.current) {
        const video = videoRef.current;
        const canvas = photoCanvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/jpeg', 0.8);
        }
      }
      return null;
  }

  const handleManualResiAdd = async () => {
    const resiToAdd = currentScannedResi.trim();
    if (!resiToAdd) { toast({title: "Resi Kosong", variant: "destructive"}); return; }
    if (managedPackages.find(p => p.id === resiToAdd) || inTransitPackages.find(p => p.id === resiToAdd)) {
        toast({ title: "Resi Duplikat", variant: "destructive" }); return;
    }

    if (dailyTaskData && managedPackages.length < dailyTaskData.totalPackages && dailyTaskDocId) {
      const newPackage: PackageItem = { 
        id: resiToAdd, 
        status: 'process', 
        isCOD: isManualCOD, 
        lastUpdateTime: new Date().toISOString() 
      };
      try {
        const packageDocRef = doc(db, "kurir_daily_tasks", dailyTaskDocId, "packages", resiToAdd);
        await setDoc(packageDocRef, { ...newPackage, lastUpdateTime: serverTimestamp() });
        setManagedPackages(prev => [...prev, newPackage]);
        setCurrentScannedResi('');
        setIsManualCOD(false); 
        toast({ title: "Resi Ditambahkan" });
        if (managedPackages.length + 1 === dailyTaskData.totalPackages) setIsScanning(false);
      } catch (e) {
        console.error("Error saving manual package:", e);
        toast({ title: "Error Simpan", description: "Gagal menyimpan paket manual.", variant: "destructive" });
      }
    } else if (dailyTaskData) {
        toast({ title: "Batas Paket Tercapai", variant: "destructive" });
    }
  };

  const handleDeleteManagedPackage = async (resi: string) => {
    if (!dailyTaskDocId) return;
    try {
        const packageDocRef = doc(db, "kurir_daily_tasks", dailyTaskDocId, "packages", resi);
        await deleteDoc(packageDocRef);
        setManagedPackages(prev => prev.filter(p => p.id !== resi));
        toast({ title: "Resi Dihapus" });
    } catch (e) {
        console.error("Error deleting package:", e);
        toast({ title: "Error Hapus", variant: "destructive"});
    }
  };

  const handleStartDelivery = async () => {
    if (!dailyTaskData || managedPackages.length !== dailyTaskData.totalPackages || !dailyTaskDocId) {
      toast({ title: "Paket Belum Lengkap", description: `Data paket yang di-scan (${managedPackages.length}) tidak sesuai dengan total input (${dailyTaskData?.totalPackages}).`, variant: "destructive" });
      return;
    }
    try {
      const batch = writeBatch(db);
      const taskDocRef = doc(db, "kurir_daily_tasks", dailyTaskDocId);
      batch.update(taskDocRef, { taskStatus: 'in_progress', updatedAt: serverTimestamp() });

      const updatedInTransitPackages: PackageItem[] = [];
      managedPackages.forEach(pkg => {
        const packageDocRef = doc(db, "kurir_daily_tasks", dailyTaskDocId, "packages", pkg.id);
        const updatedPkg = { ...pkg, status: 'in_transit', lastUpdateTime: new Date().toISOString() };
        batch.update(packageDocRef, { status: 'in_transit', lastUpdateTime: serverTimestamp() });
        updatedInTransitPackages.push(updatedPkg);
      });
      await batch.commit();

      setInTransitPackages(updatedInTransitPackages);
      setManagedPackages([]);
      setDailyTaskData(prev => prev ? {...prev, taskStatus: 'in_progress'} : null);
      setDeliveryStarted(true);
      toast({ title: "Pengantaran Dimulai" });
    } catch (error) {
      console.error("Error starting delivery:", error);
      toast({ title: "Error", description: "Gagal memulai pengantaran.", variant: "destructive"});
    }
  };

  const handleOpenPackageCamera = (packageId: string) => {
    setCapturingForPackageId(packageId);
  };

  const handleCapturePackagePhoto = async () => {
    if (!capturingForPackageId || !dailyTaskDocId) return;
    if (!photoRecipientName.trim()) { toast({ title: "Nama Penerima Kosong", variant: "destructive"}); return; }

    const photoDataUrl = capturePhoto(); // This is a dataURL
    // In a real app, upload photoDataUrl to Firebase Storage, get downloadURL
    // For now, we store dataURL directly or a placeholder if capturePhoto fails
    const proofUrlToStore = photoDataUrl || "https://placehold.co/300x200.png?text=NO_FOTO"; 

    try {
        const packageDocRef = doc(db, "kurir_daily_tasks", dailyTaskDocId, "packages", capturingForPackageId);
        await updateDoc(packageDocRef, {
            status: 'delivered',
            recipientName: photoRecipientName.trim(),
            deliveryProofPhotoUrl: proofUrlToStore, // Store the (data)URL
            lastUpdateTime: serverTimestamp()
        });
        
        setPackagePhotoMap(prev => ({ ...prev, [capturingForPackageId]: proofUrlToStore }));
        setInTransitPackages(prev => prev.map(p =>
            p.id === capturingForPackageId ? { 
                ...p, 
                deliveryProofPhotoUrl: proofUrlToStore, 
                status: 'delivered', 
                recipientName: photoRecipientName.trim(),
                lastUpdateTime: new Date().toISOString() 
            } : p
        ));
        toast({ title: "Foto Bukti Terkirim" });
    } catch (error) {
        console.error("Error saving delivery proof:", error);
        toast({ title: "Error Simpan Bukti", variant: "destructive" });
    }
    setCapturingForPackageId(null);
    setPhotoRecipientName('');
  };

  const handleDeletePackagePhoto = async (packageId: string) => {
    if(!dailyTaskDocId) return;
    try {
        const packageDocRef = doc(db, "kurir_daily_tasks", dailyTaskDocId, "packages", packageId);
        await updateDoc(packageDocRef, {
            deliveryProofPhotoUrl: null, // Or deleteField()
            recipientName: null,
            status: 'in_transit', // Revert status
            lastUpdateTime: serverTimestamp()
        });
        setPackagePhotoMap(prev => { const newState = {...prev}; delete newState[packageId]; return newState; });
        setInTransitPackages(prev => prev.map(p =>
            p.id === packageId ? { ...p, deliveryProofPhotoUrl: undefined, status: 'in_transit', recipientName: undefined, lastUpdateTime: new Date().toISOString() } : p
        ));
        toast({ title: "Foto Dihapus" });
    } catch (error) {
        console.error("Error deleting package photo info:", error);
        toast({ title: "Error Hapus Foto", variant: "destructive" });
    }
  };

  const handleFinishDay = async () => {
    if(!dailyTaskDocId || !currentUser || !dailyTaskData) return;

    const remainingInTransit = inTransitPackages.filter(p => p.status === 'in_transit');
    let finalReturnProofUrl = returnProofPhotoDataUrl; // Use already uploaded/captured one if any

    if (remainingInTransit.length > 0) {
        const updatedPendingReturnPackages = remainingInTransit.map(p => ({ ...p, status: 'pending_return' as const, lastUpdateTime: new Date().toISOString() }));
        setPendingReturnPackages(prev => [...prev, ...updatedPendingReturnPackages]);
        setInTransitPackages(prev => prev.filter(p => p.status !== 'in_transit'));

      if (!returnProofPhoto && !finalReturnProofUrl) { // No file selected AND no existing URL
        toast({ title: "Upload Bukti Paket Pending", description: "Untuk menyelesaikan, upload foto bukti serah terima semua paket pending.", variant: "destructive" });
        return;
      }
      if (!returnLeadReceiverName.trim()) {
        toast({ title: "Nama Leader Serah Terima Kosong", description: "Isi nama leader/supervisor yang menerima paket retur.", variant: "destructive" });
        return;
      }
      // If a new photo file is selected, use it. Otherwise, keep existing (if any)
      if (returnProofPhoto) {
        // SIMULATE UPLOAD: In real app, upload returnProofPhoto to Storage, get URL
        // For now, we are just using the Data URL from preview
        finalReturnProofUrl = returnProofPhotoDataUrl;
      }
    }


    try {
        const batch = writeBatch(db);
        const taskDocRef = doc(db, "kurir_daily_tasks", dailyTaskDocId);
        
        const deliveredCount = inTransitPackages.filter(p => p.status === 'delivered').length;
        const pendingForReturnCount = remainingInTransit.length;

        batch.update(taskDocRef, {
            taskStatus: 'completed',
            updatedAt: serverTimestamp(),
            finishTimestamp: serverTimestamp(),
            finalDeliveredCount: deliveredCount,
            finalPendingReturnCount: pendingForReturnCount,
            finalReturnProofPhotoUrl: finalReturnProofUrl || null,
            finalReturnLeadReceiverName: returnLeadReceiverName.trim() || null,
        });

        const updatedPendingReturn: PackageItem[] = [];
        remainingInTransit.forEach(pkg => {
            const packageDocRef = doc(db, "kurir_daily_tasks", dailyTaskDocId, "packages", pkg.id);
            // Status becomes 'returned' because proof is now mandatory to finish day.
            const finalPackageStatus = 'returned';
            batch.update(packageDocRef, { 
                status: finalPackageStatus, 
                lastUpdateTime: serverTimestamp(),
                returnProofPhotoUrl: finalReturnProofUrl || null,
                returnLeadReceiverName: returnLeadReceiverName.trim() || null,
            });
            updatedPendingReturn.push({ ...pkg, status: finalPackageStatus, returnProofPhotoUrl: finalReturnProofUrl || undefined, returnLeadReceiverName: returnLeadReceiverName.trim() || undefined });
        });
        
        await batch.commit();

        setPendingReturnPackages(prev => [...prev.filter(p => p.status === 'returned'), ...updatedPendingReturn]);
        setInTransitPackages(prev => prev.filter(p => p.status === 'delivered')); // Keep only delivered ones locally for summary
        setDayFinished(true);
        const finalTaskData = {
            ...dailyTaskData, 
            taskStatus: 'completed' as const,
            finalDeliveredCount: deliveredCount,
            finalPendingReturnCount: pendingForReturnCount,
            finalReturnProofPhotoUrl: finalReturnProofUrl || undefined,
            finalReturnLeadReceiverName: returnLeadReceiverName.trim() || undefined,
        };
        setDailyTaskData(finalTaskData);

        toast({ title: "Pengantaran Selesai", description: `Terima kasih! Paket retur diserahkan kepada ${returnLeadReceiverName.trim() || 'N/A'}.` });
    } catch (error) {
        console.error("Error finishing day:", error);
        toast({ title: "Error", description: "Gagal menyelesaikan hari.", variant: "destructive"});
    }
  };

  const handleReturnProofUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setReturnProofPhoto(file);
      setReturnProofPhotoDataUrl(URL.createObjectURL(file)); // For preview
      toast({ title: "Foto Bukti Return Dipilih", description: file.name });
    }
  };

  const resetDay = async () => {
    setDailyTaskDocId(null);
    setDailyTaskData(null);
    resetPackageInputForm({ totalPackages: 0, codPackages: 0, nonCodPackages: 0 });
    setManagedPackages([]);
    setInTransitPackages([]);
    setPendingReturnPackages([]);
    setDeliveryStarted(false);
    setDayFinished(false);
    setReturnProofPhoto(null);
    setReturnProofPhotoDataUrl(null);
    setReturnLeadReceiverName('');
    setPackagePhotoMap({});
    setMotivationalQuote(MotivationalQuotes[Math.floor(Math.random() * MotivationalQuotes.length)]);
    
    if (currentUser?.role === 'Kurir') {
        setIsCourierCheckedIn(false); 
        localStorage.removeItem('courierCheckedInToday'); 
    }
    toast({ title: "Hari Baru Dimulai", description: "Semua data lokal telah direset. Selamat bekerja!" });
  };

  const handleOpenDeliveryScan = () => { setIsScanningForDeliveryUpdate(true) };

  const deliveredCountForChart = dailyTaskData?.finalDeliveredCount ?? inTransitPackages.filter(p => p.status === 'delivered').length;
  const pendingCountForChart = dailyTaskData?.finalPendingReturnCount ?? pendingReturnPackages.filter(p => p.status === 'pending_return' || p.status === 'returned').length;
  const dailyTotalForChart = (dailyTaskData?.totalPackages || 0) === 0 ? 1 : (dailyTaskData?.totalPackages || 0);

  const performanceData = [
    { name: 'Terkirim', value: deliveredCountForChart, color: 'hsl(var(--chart-1))' },
    { name: 'Pending/Retur', value: pendingCountForChart, color: 'hsl(var(--chart-2))' },
  ];

  const formatActivityTimestamp = (timestamp: string): string => { 
      try {
        const date = new Date(parseInt(timestamp));
        if (isNaN(date.getTime())) return "Waktu tidak valid";
        const now = new Date();
        const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);

        if (diffInMinutes < 60) {
            return formatDistanceToNow(date, { addSuffix: true, locale: indonesiaLocale });
        } else {
            return format(date, "HH:mm, dd MMM yyyy", { locale: indonesiaLocale });
        }
      } catch (error) {
          return "Invalid date";
      }
  };
  const getAttendanceActionIcon = (action: AttendanceActivity['action']) => {
    switch (action) {
      case 'check-in': return <UserRoundCheck className="h-5 w-5 text-green-500" />;
      case 'check-in-late': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'check-out': return <UserRoundX className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };
  const getCourierWorkSummaryIcon = () => { return <Truck /> };
  const triggerFilterSimulation = () => { };
  const handleWilayahChange = (wilayahId: string) => { };
  const handleAreaChange = (areaId: string) => { };
  const handleHubChange = (hubId: string) => { };
  const handleSearchKurirChange = (event: React.ChangeEvent<HTMLInputElement>) => { };
  const handleDashboardFilterApply = () => { };
  const handleDownloadDashboardSummary = () => { };


  if (!currentUser) {
    return <div className="flex justify-center items-center h-screen"><p>Memuat data pengguna...</p></div>;
  }
  
  if (currentUser.role === 'Kurir' && isCourierCheckedIn === null) {
    return <div className="flex justify-center items-center h-screen"><p>Memeriksa status absensi...</p></div>;
  }

  if (currentUser.role === 'Kurir' && dayFinished && dailyTaskData?.taskStatus === 'completed') {
    return (
      <div className="space-y-6">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Laporan Performa Harian</CardTitle>
            <CardDescription>Ringkasan pengantaran paket untuk tanggal {format(parseISO(dailyTaskData.date), "dd MMMM yyyy", {locale: indonesiaLocale})}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-2">
                <p>Total Paket Dibawa: <strong>{dailyTaskData.totalPackages}</strong></p>
                <p>Total Paket Terkirim: <strong className="text-green-600 dark:text-green-400">{deliveredCountForChart}</strong></p>
                <p>Total Paket Pending/Retur: <strong className="text-red-600 dark:text-red-400">{pendingCountForChart}</strong></p>
                <p>Tingkat Keberhasilan: <strong className="text-primary">{((deliveredCountForChart / dailyTotalForChart) * 100).toFixed(1)}%</strong></p>
                {pendingCountForChart > 0 && (
                    <p>Paket Retur Diserahkan ke Leader: <strong>{dailyTaskData.finalReturnLeadReceiverName || 'N/A'}</strong></p>
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
                    <Tooltip contentStyle={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)" }} />
                    <Legend wrapperStyle={{fontSize: "0.8rem"}}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            {pendingCountForChart > 0 && dailyTaskData.finalReturnProofPhotoUrl && (
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-2">Bukti Paket Retur:</h3>
                <Image
                  src={dailyTaskData.finalReturnProofPhotoUrl} // This should be a valid URL (Firebase Storage or dataURL)
                  alt="Bukti Retur"
                  className="max-w-sm w-full md:max-w-xs rounded-lg shadow-md border border-border"
                  width={300}
                  height={200}
                  style={{objectFit: 'contain'}}
                  data-ai-hint="package receipt"
                />
              </div>
            )}
             {pendingCountForChart > 0 && !dailyTaskData.finalReturnProofPhotoUrl && (
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
        {/* User Info Card */}
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center space-x-4">
            <Avatar className="h-16 w-16"><AvatarImage src={currentUser.avatarUrl || `https://placehold.co/100x100.png?text=${currentUser.fullName.split(" ").map(n=>n[0]).join("")}`} alt={currentUser.fullName} data-ai-hint="man face"/><AvatarFallback>{currentUser.fullName.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
            <div><CardTitle className="text-2xl">{currentUser.fullName}</CardTitle><CardDescription>{currentUser.id} - {currentUser.workLocation}</CardDescription></div>
          </CardHeader>
        </Card>

        {/* Check-in Alert */}
        {!isCourierCheckedIn && ( <Alert variant="destructive"> <AlertCircle className="h-4 w-4" /> <AlertTitle>Anda Belum Melakukan Absen!</AlertTitle> <AlertDescription> Silakan lakukan <Link href="/attendance" className="font-bold underline hover:text-destructive-foreground">Check-In</Link> terlebih dahulu untuk memulai pekerjaan dan menginput data paket. </AlertDescription> </Alert> )}

        {/* Daily Package Input Form (if not yet submitted for the day and checked in) */}
        {!dailyTaskData && isCourierCheckedIn && (
          <Card>
            <CardHeader><CardTitle className="flex items-center"><PackagePlus className="mr-2 h-6 w-6 text-primary" /> Data Input Paket Harian</CardTitle><CardDescription>Masukkan jumlah total paket yang akan dibawa hari ini.</CardDescription></CardHeader>
            <CardContent><form onSubmit={handlePackageFormSubmit(handleDailyPackageInputSubmit)} className="space-y-4">
                <div><Label htmlFor="totalPackages">Total Paket Dibawa</Label><Input id="totalPackages" type="number" {...register("totalPackages")} placeholder="cth: 50" />{errors.totalPackages && <p className="text-destructive text-sm mt-1">{errors.totalPackages.message}</p>}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label htmlFor="codPackages">Total Paket COD</Label><Input id="codPackages" type="number" {...register("codPackages")} placeholder="cth: 20" />{errors.codPackages && <p className="text-destructive text-sm mt-1">{errors.codPackages.message}</p>}</div>
                  <div><Label htmlFor="nonCodPackages">Total Paket Non-COD</Label><Input id="nonCodPackages" type="number" {...register("nonCodPackages")} placeholder="cth: 30" />{errors.nonCodPackages && <p className="text-destructive text-sm mt-1">{errors.nonCodPackages.message}</p>}</div>
                </div>
                {errors.totalPackages && errors.totalPackages.type === "refine" && <p className="text-destructive text-sm mt-1">{errors.totalPackages.message}</p>}
                <Button type="submit" className="w-full">Input Data Paket</Button>
            </form></CardContent>
          </Card>
        )}

        {/* Scan & Manage Packages (if daily input submitted, not yet started delivery, and checked in) */}
        {dailyTaskData && dailyTaskData.taskStatus === 'pending_setup' && !deliveryStarted && isCourierCheckedIn && (
          <>
          <Card>
            <CardHeader><CardTitle className="flex items-center"><ScanLine className="mr-2 h-6 w-6 text-primary" /> Scan & Kelola Paket</CardTitle><CardDescription>Scan barcode atau input manual. Total {managedPackages.length}/{dailyTaskData.totalPackages} paket.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2"><Button onClick={handleStartScan} disabled={managedPackages.length >= dailyTaskData.totalPackages} className="flex-1"><Camera className="mr-2 h-4 w-4" /> Mulai Scan Barcode</Button></div>
              <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Input type="text" placeholder="Input manual nomor resi" value={currentScannedResi} onChange={(e) => setCurrentScannedResi(e.target.value)} disabled={managedPackages.length >= dailyTaskData.totalPackages} className="flex-grow"/>
                      <Button onClick={handleManualResiAdd} variant="outline" disabled={managedPackages.length >= dailyTaskData.totalPackages} className="sm:w-auto w-full">Tambah</Button>
                  </div>
                  <div className="flex items-center space-x-2 pt-1"><Checkbox id="isManualCOD" checked={isManualCOD} onCheckedChange={(checked) => setIsManualCOD(checked as boolean)} disabled={managedPackages.length >= dailyTaskData.totalPackages}/><Label htmlFor="isManualCOD" className="text-sm font-normal text-muted-foreground">Paket COD</Label></div>
              </div>
              {isScanning && ( /* Camera Modal for Scanning */ <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"> <Card className="w-[calc(100%-2rem)] max-w-2xl"><CardHeader><CardTitle>Scan Barcode Paket</CardTitle><CardDescription>Arahkan kamera ke barcode paket.</CardDescription></CardHeader><CardContent><video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline /><canvas ref={photoCanvasRef} style={{display: 'none'}} />{hasCameraPermission === false && ( <Alert variant="destructive" className="mt-2"><AlertTitle>Akses Kamera Dibutuhkan</AlertTitle></Alert> )}{hasCameraPermission === null && <p>Meminta izin kamera...</p>}</CardContent><CardFooter className="flex justify-end gap-2"><Button variant="outline" onClick={() => setIsScanning(false)} className="w-full sm:w-auto">Tutup</Button></CardFooter></Card></div> )}
              {managedPackages.length > 0 && ( /* List of Managed Packages */ <div className="space-y-2 max-h-60 overflow-y-auto p-1 border rounded-md"><h3 className="font-semibold text-muted-foreground px-2">Paket Diproses ({managedPackages.length}):</h3>{managedPackages.map(pkg => (<div key={pkg.id} className="flex items-center justify-between p-2 bg-card-foreground/5 rounded-md"><span className="text-sm break-all">{pkg.id} ({pkg.isCOD ? 'COD' : 'Non-COD'}) - <span className="italic text-xs text-primary">Proses</span></span><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => handleDeleteManagedPackage(pkg.id)}><Trash2 size={16} /></Button></div>))}</div> )}
              <Progress value={(managedPackages.length / (dailyTaskData.totalPackages || 1)) * 100} className="w-full h-2.5" />
            </CardContent>
            <CardFooter><Button onClick={handleStartDelivery} className="w-full" disabled={managedPackages.length !== dailyTaskData.totalPackages}>Mulai Pengantaran ({managedPackages.length}/{dailyTaskData.totalPackages})</Button></CardFooter>
          </Card>
          </>
        )}

        {/* In Transit Packages (if delivery started, not finished, and checked in) */}
        {dailyTaskData && dailyTaskData.taskStatus === 'in_progress' && deliveryStarted && !dayFinished && isCourierCheckedIn && (
          <Card>
            <CardHeader><div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"><div className="flex-grow"><CardTitle className="flex items-center"><PackageCheck className="mr-2 h-6 w-6 text-green-500" /> Sedang Dalam Pengantaran</CardTitle><CardDescription>Daftar paket. {inTransitPackages.filter(p => p.status === 'in_transit').length} paket belum terkirim.</CardDescription></div><Button onClick={handleOpenDeliveryScan} variant="outline" size="sm" className="w-full sm:w-auto" disabled={!inTransitPackages.some(p => p.status === 'in_transit')}><ScanLine className="mr-2 h-4 w-4" /> Scan Update Kirim</Button></div></CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">{[...inTransitPackages].sort((a,b) => (a.status === 'delivered' ? 1 : -1) - (b.status === 'delivered' ? 1: -1) || new Date(b.lastUpdateTime).getTime() - new Date(a.lastUpdateTime).getTime()).map(pkg => (
                <Card key={pkg.id} className={`p-3 ${pkg.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700' : 'bg-card'}`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-1"><p className="font-semibold break-all">{pkg.id} <span className={`text-xs px-2 py-0.5 rounded-full ${pkg.isCOD ? 'bg-yellow-400/20 text-yellow-600 dark:text-yellow-300' : 'bg-blue-400/20 text-blue-600 dark:text-blue-300'}`}>{pkg.isCOD ? 'COD' : 'Non-COD'}</span></p>{pkg.status === 'delivered' ? (<span className="text-xs text-green-600 dark:text-green-400 flex items-center flex-shrink-0"><CheckCircle size={14} className="mr-1"/> Terkirim</span>) : (<span className="text-xs text-orange-500 dark:text-orange-400 flex-shrink-0">Dalam Perjalanan</span>)}</div>
                  {pkg.status === 'in_transit' && (<div className="flex items-center gap-2 mt-2"><Button variant="outline" size="sm" onClick={() => handleOpenPackageCamera(pkg.id)} className="flex-1"><Camera size={16} className="mr-1" /> Foto Bukti & Nama Penerima</Button></div>)}
                  {pkg.deliveryProofPhotoUrl && (<div className="mt-2"><p className="text-xs text-muted-foreground mb-1">Penerima: <span className="font-medium text-foreground">{pkg.recipientName || 'N/A'}</span></p><div className="flex items-end gap-2"><Image src={pkg.deliveryProofPhotoUrl} alt={`Bukti ${pkg.id}`} className="w-24 h-24 object-cover rounded border" width={96} height={96} data-ai-hint="package door"/><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeletePackagePhoto(pkg.id)}><Trash2 size={16} /></Button></div></div>)}
                </Card>
            ))}</CardContent>
            {capturingForPackageId && ( /* Camera Modal for Proof */ <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"><Card className="w-[calc(100%-2rem)] max-w-2xl"><CardHeader><CardTitle>Foto Bukti Paket: {capturingForPackageId}</CardTitle><CardDescription>Ambil foto dan nama penerima.</CardDescription></CardHeader><CardContent className="space-y-4"><video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline /><canvas ref={photoCanvasRef} style={{display: 'none'}} />{hasCameraPermission === false && (<Alert variant="destructive" className="mt-2"><AlertTitle>Akses Kamera Dibutuhkan</AlertTitle></Alert>)}<div><Label htmlFor="photoRecipientName">Nama Penerima <span className="text-destructive">*</span></Label><Input id="photoRecipientName" type="text" placeholder="Nama penerima" value={photoRecipientName} onChange={(e) => setPhotoRecipientName(e.target.value)}/></div></CardContent><CardFooter className="flex flex-col sm:flex-row justify-between gap-2"><Button variant="outline" onClick={() => setCapturingForPackageId(null)} className="w-full sm:w-auto">Batal</Button><Button onClick={handleCapturePackagePhoto} disabled={!hasCameraPermission || !photoRecipientName.trim()} className="w-full sm:w-auto"><Camera className="mr-2 h-4 w-4" /> Ambil & Simpan</Button></CardFooter></Card></div>)}
            {isScanningForDeliveryUpdate && ( /* Camera Modal for Delivery Scan */ <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"><Card className="w-[calc(100%-2rem)] max-w-2xl"><CardHeader><CardTitle>Scan Resi Update Pengiriman</CardTitle><CardDescription>Arahkan kamera ke barcode.</CardDescription></CardHeader><CardContent><video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline /><canvas ref={photoCanvasRef} style={{display: 'none'}} />{hasCameraPermission === false && (<Alert variant="destructive" className="mt-2"><AlertTitle>Akses Kamera Dibutuhkan</AlertTitle></Alert>)}</CardContent><CardFooter className="flex justify-end gap-2"><Button variant="outline" onClick={() => setIsScanningForDeliveryUpdate(false)} className="w-full sm:w-auto">Tutup</Button></CardFooter></Card></div>)}
            <CardFooter><Button onClick={handleFinishDay} className="w-full" variant="destructive">Selesaikan Pengantaran Hari Ini</Button></CardFooter>
          </Card>
        )}

        {/* Pending/Return Packages Section (if delivery started, some packages pending, not finished, and checked in) */}
        {dailyTaskData && dailyTaskData.taskStatus === 'in_progress' && deliveryStarted && inTransitPackages.filter(p => p.status === 'in_transit').length > 0 && !dayFinished && isCourierCheckedIn && (
           <Card>
            <CardHeader><CardTitle className="flex items-center"><PackageX className="mr-2 h-6 w-6 text-red-500" /> Paket Pending/Retur</CardTitle><CardDescription>{inTransitPackages.filter(p => p.status === 'in_transit').length} paket belum terkirim dan perlu di-retur.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="returnProof" className="mb-1 block">Upload Foto Bukti Pengembalian Semua Paket Pending ke Gudang <span className="text-destructive">*</span></Label><Input id="returnProof" type="file" accept="image/*" onChange={handleReturnProofUpload} />{returnProofPhotoDataUrl && <Image src={returnProofPhotoDataUrl} alt="Preview Bukti Retur" width={100} height={100} className="mt-2 rounded border" data-ai-hint="receipt package"/>}{returnProofPhoto && <p className="text-xs text-green-500 dark:text-green-400 mt-1">{returnProofPhoto.name} dipilih.</p>}</div>
              <div><Label htmlFor="returnLeadReceiverName">Nama Leader Serah Terima <span className="text-destructive">*</span></Label><Input id="returnLeadReceiverName" type="text" placeholder="Nama Leader/Supervisor" value={returnLeadReceiverName} onChange={(e) => setReturnLeadReceiverName(e.target.value)}/></div>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1"><h4 className="text-sm font-medium text-muted-foreground">Daftar Resi Pending:</h4>{inTransitPackages.filter(p => p.status === 'in_transit').map(pkg => (<p key={pkg.id} className="text-sm text-muted-foreground break-all">{pkg.id} - <span className="italic">Pending Retur</span></p>))}</div>
            </CardContent>
            <CardFooter><Button onClick={handleFinishDay} className="w-full" variant="destructive" disabled={(!returnProofPhoto && !returnProofPhotoDataUrl) || !returnLeadReceiverName.trim()}>Konfirmasi Selesai dengan Paket Pending</Button></CardFooter>
          </Card>
        )}
        
        {/* Motivational Quote */}
        {dailyTaskData && dailyTaskData.taskStatus !== 'completed' && isCourierCheckedIn && (<Card className="bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 border-transparent"><CardContent className="pt-6"><p className="text-center text-lg italic text-foreground/70 dark:text-primary-foreground/80">{motivationalQuote}</p></CardContent></Card>)}
      </div>
    );
  }


  // Fallback for Managerial Roles (still uses mock data for now)
  if (isDashboardLoading) {
    return ( <div className="flex justify-center items-center h-screen"><p>Memuat ringkasan dashboard...</p></div> );
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

      {currentUser.role !== 'Kurir' && ( /* Filter Section */ <Card><CardHeader><CardTitle className="flex items-center text-xl"><FilterIcon className="mr-2 h-5 w-5 text-primary" />Filter & Aksi Cepat Dashboard</CardTitle><CardDescription>Saring data yang ditampilkan. (Efek filter masih simulasi).</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        <div><Label htmlFor="dashboard-wilayah">Wilayah</Label><Select value={selectedWilayah} onValueChange={handleWilayahChange}><SelectTrigger id="dashboard-wilayah"><SelectValue placeholder="Pilih Wilayah" /></SelectTrigger><SelectContent>{mockLocations.map(w => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}</SelectContent></Select></div>
        <div><Label htmlFor="dashboard-area">Area Operasional</Label><Select value={selectedArea} onValueChange={handleAreaChange} disabled={areaOptions.length === 0 || (selectedWilayah === 'all-wilayah' && areaOptions.length <=1)}><SelectTrigger id="dashboard-area"><SelectValue placeholder="Pilih Area" /></SelectTrigger><SelectContent>{areaOptions.map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent></Select></div>
        <div><Label htmlFor="dashboard-lokasi-kerja">Lokasi Kerja (Hub)</Label><Select value={selectedHub} onValueChange={handleHubChange} disabled={hubOptions.length === 0 || (selectedArea === 'all-area' && hubOptions.length <= 1) || (selectedArea.startsWith('all-area-') && hubOptions.length <=1)}><SelectTrigger id="dashboard-lokasi-kerja"><SelectValue placeholder="Pilih Hub" /></SelectTrigger><SelectContent>{hubOptions.map(h => (<SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>))}</SelectContent></Select></div>
        <div className="lg:col-span-2"><Label htmlFor="dashboard-search-kurir">Cari Kurir (Nama/ID)</Label><div className="relative"><SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="dashboard-search-kurir" type="search" placeholder="Masukkan Nama atau ID Kurir..." className="pl-8" value={searchKurir} onChange={handleSearchKurirChange}/></div></div>
        <Button onClick={handleDashboardFilterApply} className="w-full lg:w-auto self-end"><FilterIcon className="mr-2 h-4 w-4" /> Terapkan Filter</Button>
      </div></CardContent><CardFooter><Button onClick={handleDownloadDashboardSummary} variant="outline" className="w-full sm:w-auto"><DownloadIcon className="mr-2 h-4 w-4" /> Unduh Ringkasan Dashboard</Button></CardFooter></Card>)}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Kurir Aktif Hari Ini</CardTitle><Users className="h-5 w-5 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{dashboardSummary?.activeCouriersToday ?? 0}</div><p className="text-xs text-muted-foreground">Total kurir beroperasi</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Paket Diproses Hari Ini</CardTitle><PackageIcon className="h-5 w-5 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{dashboardSummary?.totalPackagesProcessedToday ?? 0}</div><p className="text-xs text-muted-foreground">Total paket ditugaskan</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Paket Terkirim Hari Ini</CardTitle><PackageCheck className="h-5 w-5 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{dashboardSummary?.totalPackagesDeliveredToday ?? 0}</div><p className="text-xs text-muted-foreground">Dari {dashboardSummary?.totalPackagesProcessedToday ?? 0} paket</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Rate Absen Tepat Waktu</CardTitle><Clock className="h-5 w-5 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{(dashboardSummary?.onTimeDeliveryRateToday ?? 0).toFixed(1)}%</div><p className="text-xs text-muted-foreground">Kurir check-in tepat waktu</p></CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="flex items-center text-xl text-primary"><BarChart2 className="mr-2 h-5 w-5"/>Ringkasan Pengiriman (7 Hari)</CardTitle><CardDescription>Visualisasi paket terkirim & pending.</CardDescription></CardHeader><CardContent className="h-[300px] pt-4"><ResponsiveContainer width="100%" height="100%"><RechartsBarChart data={dashboardSummary?.dailyShipmentSummary} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" /><XAxis dataKey="name" tick={{fontSize: '0.75rem'}}/><YAxis tick={{fontSize: '0.75rem'}}/><Tooltip contentStyle={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)", fontSize: "0.8rem", padding: "0.5rem" }} cursor={{ fill: "hsl(var(--accent)/0.2)" }}/><Legend wrapperStyle={{fontSize: "0.8rem"}}/><Bar dataKey="terkirim" name="Terkirim" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={20}/><Bar dataKey="pending" name="Pending/Retur" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} barSize={20}/></RechartsBarChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center text-xl text-primary"><TrendingUp className="mr-2 h-5 w-5" />Tren Pengiriman Mingguan (4 Minggu)</CardTitle><CardDescription>Performa mingguan.</CardDescription></CardHeader><CardContent className="h-[300px] pt-4"><ResponsiveContainer width="100%" height="100%"><LineChart data={dashboardSummary?.weeklyShipmentSummary} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" /><XAxis dataKey="week" tick={{fontSize: '0.75rem'}} /><YAxis tick={{fontSize: '0.75rem'}} /><Tooltip contentStyle={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)", fontSize: "0.8rem", padding: "0.5rem" }} cursor={{ fill: "hsl(var(--accent)/0.2)" }}/><Legend wrapperStyle={{fontSize: "0.8rem"}} /><Line type="monotone" dataKey="terkirim" name="Terkirim" stroke="hsl(var(--chart-3))" strokeWidth={2} activeDot={{ r: 6 }} /><Line type="monotone" dataKey="pending" name="Pending/Retur" stroke="hsl(var(--chart-4))" strokeWidth={2} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></CardContent></Card>
        <Card className="md:col-span-2"><CardHeader><CardTitle className="flex items-center text-xl text-primary"><BarChart2 className="mr-2 h-5 w-5" />Ringkasan Performa Bulanan (3 Bulan)</CardTitle><CardDescription>Perbandingan bulanan.</CardDescription></CardHeader><CardContent className="h-[320px] pt-4"><ResponsiveContainer width="100%" height="100%"><RechartsBarChart data={dashboardSummary?.monthlyPerformanceSummary} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" /><XAxis dataKey="month" tick={{fontSize: '0.75rem'}} /><YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-1))" tick={{fontSize: '0.75rem'}} /><YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-5))" tick={{fontSize: '0.75rem'}} /><Tooltip contentStyle={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)", fontSize: "0.8rem", padding: "0.5rem" }} cursor={{ fill: "hsl(var(--accent)/0.2)" }}/><Legend wrapperStyle={{fontSize: "0.8rem"}} /><Bar yAxisId="left" dataKey="totalDelivered" name="Total Terkirim" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={25} /><Bar yAxisId="right" dataKey="totalPending" name="Total Pending" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} barSize={25} /></RechartsBarChart></ResponsiveContainer></CardContent></Card>
      </div>
      
      {/* Activity Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle className="flex items-center text-xl text-primary"><Activity className="mr-2 h-5 w-5"/>Aktivitas Absensi Terkini</CardTitle><CardDescription>Update check-in/out kurir.</CardDescription></CardHeader><CardContent className="max-h-[400px] overflow-y-auto pr-2">{attendanceActivities.length > 0 ? (<ul className="space-y-3">{attendanceActivities.map(activity => ( <li key={activity.id} className="flex items-start space-x-3 p-3 bg-card-foreground/5 rounded-md"><div className="flex-shrink-0 mt-0.5">{getAttendanceActionIcon(activity.action)}</div><div className="flex-grow"><p className="text-sm font-medium">{activity.kurirName} <span className="text-xs text-muted-foreground">({activity.kurirId})</span></p><p className="text-sm text-muted-foreground">{activity.action === 'check-in' ? 'melakukan check-in' : activity.action === 'check-out' ? 'melakukan check-out' : 'melaporkan keterlambatan'}{activity.location && <span className="text-xs"> di {activity.location}</span>}</p><p className="text-xs text-muted-foreground/80 mt-0.5">{formatActivityTimestamp(activity.timestamp)}</p></div></li>))}</ul>) : (<p className="text-muted-foreground text-center py-4">Belum ada aktivitas absensi.</p>)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center text-xl text-primary"><ListChecks className="mr-2 h-5 w-5"/>Ringkasan Penyelesaian Kerja Kurir</CardTitle><CardDescription>Laporan ringkas setelah kurir selesai.</CardDescription></CardHeader><CardContent className="max-h-[400px] overflow-y-auto pr-2">{courierWorkSummaries.length > 0 ? (<ul className="space-y-3">{courierWorkSummaries.map(summary => ( <li key={summary.id} className="flex items-start space-x-3 p-3 bg-card-foreground/5 rounded-md"><div className="flex-shrink-0 mt-0.5">{getCourierWorkSummaryIcon()}</div><div className="flex-grow"><p className="text-sm font-medium">{summary.kurirName} <span className="text-xs text-muted-foreground">({summary.kurirId})</span></p><p className="text-sm text-muted-foreground">Menyelesaikan: <strong className="text-foreground">{summary.totalPackagesAssigned}</strong> paket, <strong className="text-green-500">{summary.packagesDelivered}</strong> terkirim, <strong className="text-red-500">{summary.packagesPendingOrReturned}</strong> retur/pending.</p><p className="text-xs text-muted-foreground/80 mt-0.5">{formatActivityTimestamp(summary.timestamp)}</p></div></li>))}</ul>) : (<p className="text-muted-foreground text-center py-4">Belum ada ringkasan kerja.</p>)}</CardContent></Card>
      </div>
    </div>
  );
}

    

    




    