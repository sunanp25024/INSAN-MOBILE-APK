
"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Camera, ScanLine, PackagePlus, PackageCheck, PackageX, Upload, Info, Trash2, CheckCircle, XCircle, ChevronsUpDown, CalendarIcon, AlertCircle, UserCheck as UserCheckIcon, UserCog, Users, Package as PackageIcon, Clock, TrendingUp, BarChart2, Activity, UserRoundCheck, UserRoundX, Truck, ListChecks, ArrowLeftRight, Filter as FilterIcon, Download as DownloadIcon, Search as SearchIcon, Briefcase } from 'lucide-react';
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
import { mockLocationsData } from '@/types';
import * as XLSX from 'xlsx';
import { getDashboardData } from '@/lib/kurirActions';
import { uploadFileToServer } from '@/lib/firebaseAdminActions';


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

// Helper to validate image URLs before rendering
const isValidImageUrl = (url?: string): url is string => {
    return !!url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image'));
};


export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  
  // Kurir specific state
  const [dailyTaskDocId, setDailyTaskDocId] = useState<string | null>(null);
  const [dailyTaskData, setDailyTaskData] = useState<KurirDailyTaskDoc | null>(null);
  const [managedPackages, setManagedPackages] = useState<PackageItem[]>([]); 
  const [inTransitPackages, setInTransitPackages] = useState<PackageItem[]>([]); 
  const [pendingReturnPackages, setPendingReturnPackages] = useState<PackageItem[]>([]);

  const [currentScannedResi, setCurrentScannedResi] = useState('');
  const [isManualCOD, setIsManualCOD] = useState(false);
  const [isScanning, setIsScanning] = useState(false); 
  const [deliveryStarted, setDeliveryStarted] = useState(false);
  const [dayFinished, setDayFinished] = useState(false); 

  const [motivationalQuote, setMotivationalQuote] = useState('');
  const [returnProofPhotoDataUrl, setReturnProofPhotoDataUrl] = useState<string | null>(null);
  const [returnLeadReceiverName, setReturnLeadReceiverName] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [packagePhotoMap, setPackagePhotoMap] = useState<Record<string, string>>({}); 
  const [capturingForPackageId, setCapturingForPackageId] = useState<string | null>(null);
  const [photoRecipientName, setPhotoRecipientName] = useState('');
  const [isCourierCheckedIn, setIsCourierCheckedIn] = useState<boolean | null>(null);
  const [isScanningForDeliveryUpdate, setIsScanningForDeliveryUpdate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const scannerControlsRef = useRef<IScannerControls | null>(null);

  // Dashboard states for managerial roles
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardSummaryData | null>(null);

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

  // Effect to set the current user from localStorage
  useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
        try {
            const user = JSON.parse(userDataString);
            setCurrentUser(user);
        } catch (error) {
            console.error("Failed to parse user data:", error);
            setIsDashboardLoading(false);
        }
    } else {
        setIsDashboardLoading(false);
    }
  }, []);

  // Main effect to initialize dashboard based on user role
  useEffect(() => {
    if (!currentUser) {
        return;
    }
    
    const initializeDashboard = async () => {
      setIsDashboardLoading(true);

      try {
        // Fetch authoritative data from server
        const data = await getDashboardData(currentUser.uid, currentUser.role);

        if (data.error) {
          throw new Error(data.error);
        }

        if (currentUser.role === 'Kurir') {
          const { isCheckedIn: isCheckedInFromServer, taskData, packages, photoMap } = data.kurirData || {};
          
          const finalCheckInStatus = isCheckedInFromServer ?? false;
          setIsCourierCheckedIn(finalCheckInStatus);
          
          if (finalCheckInStatus) {
            const todayISO = format(new Date(), 'yyyy-MM-dd');
            const docId = `${currentUser.uid}_${todayISO}`;
            setDailyTaskDocId(docId);
             
            if (taskData) {
                setDailyTaskData(taskData);
                setValue("totalPackages", taskData.totalPackages);
                setValue("codPackages", taskData.codPackages);
                setValue("nonCodPackages", taskData.nonCodPackages);
                
                if (taskData.taskStatus === 'in_progress' || taskData.taskStatus === 'completed') setDeliveryStarted(true);
                if (taskData.taskStatus === 'completed') {
                    setDayFinished(true);
                    setReturnProofPhotoDataUrl(taskData.finalReturnProofPhotoUrl || null);
                    setReturnLeadReceiverName(taskData.finalReturnLeadReceiverName || '');
                }

                if (taskData.taskStatus === 'pending_setup') {
                  setManagedPackages(packages?.filter(p => p.status === 'process') || []);
                } else {
                  setInTransitPackages(packages?.filter(p => p.status === 'in_transit' || p.status === 'delivered') || []);
                  setPendingReturnPackages(packages?.filter(p => p.status === 'pending_return' || p.status === 'returned') || []);
                  setPackagePhotoMap(photoMap || {});
                }
            } else {
                setDailyTaskData(null);
                setManagedPackages([]);
                setInTransitPackages([]);
                setPendingReturnPackages([]);
                setDeliveryStarted(false);
                setDayFinished(false);
                resetPackageInputForm();
            }
          } else {
             // Explicitly reset state if not checked in
             setDailyTaskData(null);
             setManagedPackages([]);
             setInTransitPackages([]);
             setPendingReturnPackages([]);
             setDeliveryStarted(false);
             setDayFinished(false);
             resetPackageInputForm();
          }
        } else {
          setDashboardData(data.managerialData || null);
        }
      } catch (error: any) {
        console.error("Error initializing dashboard:", error);
        toast({ title: "Error", description: `Gagal memuat data dashboard: ${error.message}`, variant: "destructive" });
      } finally {
        setIsDashboardLoading(false);
      }
    };

    initializeDashboard();
  }, [currentUser, toast, setValue, resetPackageInputForm]);
  

    // Effect for cascading dropdowns
  useEffect(() => {
    if (selectedWilayah === 'all-wilayah') {
      const allAreas = mockLocationsData.flatMap(w => w.areas);
      setAreaOptions(allAreas);
    } else {
      const wilayah = mockLocationsData.find(w => w.id === selectedWilayah);
      setAreaOptions(wilayah ? wilayah.areas : []);
    }
    setSelectedArea('all-area');
    setSelectedHub('all-hub');
  }, [selectedWilayah]);

  useEffect(() => {
    if (selectedArea === 'all-area' || selectedArea.startsWith('all-area-')) {
        const wilayahId = selectedArea.split('-').pop(); 
        const parentWilayah = mockLocationsData.find(w => w.id.includes(wilayahId as string));
        const allHubsInWilayah = parentWilayah?.areas.flatMap(a => a.hubs) || [];
        setHubOptions(allHubsInWilayah.filter(h => !h.id.startsWith('all-hub-')));
    } else {
      const wilayah = mockLocationsData.find(w => w.areas.some(a => a.id === selectedArea));
      const area = wilayah?.areas.find(a => a.id === selectedArea);
      setHubOptions(area ? area.hubs : []);
    }
    setSelectedHub('all-hub');
  }, [selectedArea]);


  const displayData = useMemo(() => {
    if (!dashboardData) {
      return {
        activeCouriersToday: 0,
        totalPackagesProcessedToday: 0,
        totalPackagesDeliveredToday: 0,
        onTimeDeliveryRateToday: 0,
        dailyShipmentSummary: [],
        weeklyShipmentSummary: [],
        monthlyPerformanceSummary: [],
        attendanceActivities: [],
        courierWorkSummaries: [],
      };
    }

    const { attendanceRecords, workRecords, userProfiles } = dashboardData;
    
    // Filter users first based on location
    const filteredUserUIDs = userProfiles
      .filter(user => {
        const wilayah = mockLocationsData.find(w => w.id === selectedWilayah);
        const area = areaOptions.find(a => a.id === selectedArea);
        const hub = hubOptions.find(h => h.id === selectedHub);

        const matchesWilayah = !wilayah || selectedWilayah === 'all-wilayah' || user.wilayah === wilayah.name;
        const matchesArea = !area || selectedArea === 'all-area' || selectedArea.startsWith('all-area-') || user.area === area.name;
        const matchesHub = !hub || selectedHub === 'all-hub' || selectedHub.startsWith('all-hub-') || user.workLocation === hub.name;
        
        return matchesWilayah && matchesArea && matchesHub;
      })
      .map(user => user.uid);

    const uidsSet = new Set(filteredUserUIDs);

    // Filter attendance and work records based on the filtered user UIDs
    const filteredWorkRecords = workRecords.filter(record => uidsSet.has(record.kurirUid));
    const filteredAttendanceRecords = attendanceRecords.filter(record => uidsSet.has(record.kurirUid));
    
    // Further filter by search term
    const finalFilteredWorkRecords = filteredWorkRecords.filter(r => r.kurirFullName.toLowerCase().includes(searchKurir.toLowerCase()));
    const finalFilteredAttendanceRecords = filteredAttendanceRecords.filter(r => r.kurirName.toLowerCase().includes(searchKurir.toLowerCase()));

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const workRecordsToday = finalFilteredWorkRecords.filter(r => r.date === todayStr);
    const attendanceToday = finalFilteredAttendanceRecords.filter(r => r.date === todayStr);

    // --- Process Data for Stats Cards ---
    const totalPackagesProcessedToday = workRecordsToday.reduce((sum, task) => sum + (task.totalPackages || 0), 0);
    const totalPackagesDeliveredToday = workRecordsToday.reduce((sum, task) => sum + (task.finalDeliveredCount || 0), 0);
    const presentCouriers = attendanceToday.filter(a => a.status === 'Present' || a.status === 'Late').length;
    const onTimeCouriers = attendanceToday.filter(a => a.status === 'Present').length;
    const onTimeDeliveryRateToday = presentCouriers > 0 ? (onTimeCouriers / presentCouriers) * 100 : 0;
    
    // --- Process Data for Feeds ---
    const attendanceActivities = attendanceToday.flatMap(record => {
        const activities: AttendanceActivity[] = [];
        if (record.checkInTimestamp) {
            activities.push({
                id: `${record.id}-check-in`, kurirName: record.kurirName, kurirId: record.kurirId,
                action: record.status === 'Late' ? 'check-in-late' : 'check-in',
                timestamp: record.checkInTimestamp,
                location: record.workLocation || 'N/A'
            });
        }
        if (record.checkOutTimestamp) {
            activities.push({
                id: `${record.id}-check-out`, kurirName: record.kurirName, kurirId: record.kurirId,
                action: 'check-out',
                timestamp: record.checkOutTimestamp,
                location: record.workLocation || 'N/A'
            });
        }
        return activities;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    const courierWorkSummaries = workRecordsToday
      .filter(task => task.taskStatus === 'completed' && task.finishTimestamp)
      .map(task => ({
          id: task.kurirUid + task.date, kurirName: task.kurirFullName, kurirId: task.kurirUid,
          hubLocation: "N/A", timestamp: task.finishTimestamp,
          totalPackagesAssigned: task.totalPackages,
          packagesDelivered: task.finalDeliveredCount || 0,
          packagesPendingOrReturned: task.finalPendingReturnCount || 0,
      })).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());


    // --- Process Data for Charts ---
    const dailyShipmentSummary = Array.from({ length: 7 }).map((_, i) => {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const tasksOnDate = finalFilteredWorkRecords.filter(t => t.date === dateStr);
        const terkirim = tasksOnDate.reduce((sum, task) => sum + (task.finalDeliveredCount || 0), 0);
        const pending = tasksOnDate.reduce((sum, task) => sum + (task.finalPendingReturnCount || 0), 0);
        return { date: dateStr, name: format(date, 'dd/MM'), terkirim, pending };
    }).reverse();

    const weeklyShipmentSummary = finalFilteredWorkRecords.reduce((acc, task) => {
        const taskDate = parseISO(task.date);
        if(!isValid(taskDate)) return acc;
        const weekNum = `W${getWeek(taskDate, { weekStartsOn: 1 })}`;
        if (!acc[weekNum]) acc[weekNum] = { week: weekNum, terkirim: 0, pending: 0 };
        acc[weekNum].terkirim += task.finalDeliveredCount || 0;
        acc[weekNum].pending += task.finalPendingReturnCount || 0;
        return acc;
    }, {} as Record<string, WeeklyShipmentSummary>);

    const monthlyPerformanceSummary = finalFilteredWorkRecords.reduce((acc, task) => {
        const taskDate = parseISO(task.date);
        if(!isValid(taskDate)) return acc;
        const monthName = format(taskDate, 'MMMM', { locale: indonesiaLocale });
        if (!acc[monthName]) acc[monthName] = { month: monthName, totalDelivered: 0, totalPending: 0, successRate: 0 };
        acc[monthName].totalDelivered += task.finalDeliveredCount || 0;
        acc[monthName].totalPending += task.finalPendingReturnCount || 0;
        return acc;
    }, {} as Record<string, MonthlySummaryData>);

    return {
        activeCouriersToday: presentCouriers,
        totalPackagesProcessedToday,
        totalPackagesDeliveredToday,
        onTimeDeliveryRateToday,
        dailyShipmentSummary,
        weeklyShipmentSummary: Object.values(weeklyShipmentSummary).slice(-4),
        monthlyPerformanceSummary: Object.values(monthlyPerformanceSummary).slice(-3),
        attendanceActivities,
        courierWorkSummaries,
    };
  }, [dashboardData, selectedWilayah, selectedArea, selectedHub, searchKurir, areaOptions, hubOptions]);

  useEffect(() => {
    setMotivationalQuote(MotivationalQuotes[Math.floor(Math.random() * MotivationalQuotes.length)]);
  }, []);

  // Effect for Camera Permission and Stream Setup
  useEffect(() => {
    let stream: MediaStream | null = null;
    const isCameraActive = isScanning || !!capturingForPackageId || isScanningForDeliveryUpdate;

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

    if (isCameraActive) {
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
    // Only proceed if a scan is active, the video element is ready, and we have permission
    if ((isScanning || isScanningForDeliveryUpdate) && videoRef.current && hasCameraPermission) {
      const codeReader = new BrowserMultiFormatReader();
      const videoElement = videoRef.current;

      const startScan = async () => {
        try {
          if (scannerControlsRef.current) {
            scannerControlsRef.current.stop();
          }

          const controls = await codeReader.decodeFromVideoElementContinuously(
            videoElement,
            (result, err) => {
              if (result) {
                if (scannerControlsRef.current) {
                  scannerControlsRef.current.stop();
                  scannerControlsRef.current = null;
                }
                const scannedText = result.getText();
                toast({ title: "Barcode Terbaca!", description: `Resi: ${scannedText}` });

                if (isScanning) {
                  if (dailyTaskData && managedPackages.length < dailyTaskData.totalPackages) {
                    const newPackage: PackageItem = { 
                        id: scannedText, 
                        status: 'process', 
                        isCOD: false,
                        lastUpdateTime: new Date().toISOString() 
                    };
                    const savePackage = async () => {
                        try {
                            if (!dailyTaskDocId) throw new Error("Daily task ID not set");
                            const packageDocRef = doc(db, "kurir_daily_tasks", dailyTaskDocId, "packages", scannedText);
                            await setDoc(packageDocRef, { ...newPackage, lastUpdateTime: serverTimestamp() });
                            setManagedPackages(prev => [...prev, newPackage]);
                            setCurrentScannedResi('');
                            if (managedPackages.length + 1 >= dailyTaskData.totalPackages) {
                                setIsScanning(false);
                            }
                        } catch (e) {
                            console.error("Error saving scanned package:", e);
                            toast({title: "Error Simpan", description: "Gagal menyimpan paket scan.", variant: "destructive"});
                        }
                    };
                    savePackage();
                  } else if (dailyTaskData) {
                    toast({ title: "Batas Paket Tercapai", variant: "destructive" });
                    setIsScanning(false);
                  }
                } else if (isScanningForDeliveryUpdate) {
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
           console.error("Gagal memulai pemindai:", error);
           toast({ title: "Error Kamera", description: "Gagal memulai pemindai. Coba lagi.", variant: "destructive" });
           setIsScanning(false);
           setIsScanningForDeliveryUpdate(false);
        }
      };

      videoElement.addEventListener('canplay', startScan);
      videoElement.play().catch(err => console.error("Video play failed:", err));
      
      return () => {
        videoElement.removeEventListener('canplay', startScan);
        if (scannerControlsRef.current) {
          scannerControlsRef.current.stop();
          scannerControlsRef.current = null;
        }
      };
    }
  }, [isScanning, isScanningForDeliveryUpdate, hasCameraPermission, dailyTaskData, managedPackages.length, inTransitPackages, dailyTaskDocId, toast]);


  const handleDailyPackageInputSubmit: SubmitHandler<DailyPackageInput> = async (data) => {
    if (!currentUser || !currentUser.uid || !dailyTaskDocId) {
        toast({ title: "Error", description: "Informasi kurir tidak ditemukan.", variant: "destructive" });
        return;
    }
    const todayDateString = format(new Date(), 'yyyy-MM-dd');
    const taskDocRef = doc(db, "kurir_daily_tasks", dailyTaskDocId);
    const newTaskData: KurirDailyTaskDoc = {
        kurirUid: currentUser.uid,
        kurirFullName: currentUser.fullName,
        kurirId: currentUser.id,
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
        setDailyTaskData(newTaskData); 
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
          context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
          return canvas.toDataURL('image/jpeg', 0.5);
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
        const updatedPkg = { ...pkg, status: 'in_transit' as const, lastUpdateTime: new Date().toISOString() };
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

    const photoDataUrl = capturePhoto();
    if (!photoDataUrl) {
        toast({ title: "Gagal Mengambil Foto", variant: "destructive" });
        return;
    }
    
    setIsSubmitting(true);
    try {
        const filePath = `delivery_proofs/${dailyTaskDocId}/${capturingForPackageId}_${Date.now()}.jpg`;
        const uploadResult = await uploadFileToServer(filePath, photoDataUrl);

        if (!uploadResult.success || !uploadResult.url) {
            toast({ title: "Gagal Mengunggah Foto", description: uploadResult.message, variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
        
        const packageDocRef = doc(db, "kurir_daily_tasks", dailyTaskDocId, "packages", capturingForPackageId);
        await updateDoc(packageDocRef, {
            status: 'delivered',
            recipientName: photoRecipientName.trim(),
            deliveryProofPhotoUrl: uploadResult.url, // Use the permanent URL from server
            lastUpdateTime: serverTimestamp()
        });
        
        // Locally, we still use the real photo for immediate user feedback.
        setPackagePhotoMap(prev => ({ ...prev, [capturingForPackageId]: uploadResult.url! }));
        setInTransitPackages(prev => prev.map(p =>
            p.id === capturingForPackageId ? { 
                ...p, 
                deliveryProofPhotoUrl: uploadResult.url!, 
                status: 'delivered', 
                recipientName: photoRecipientName.trim(),
                lastUpdateTime: new Date().toISOString() 
            } : p
        ));
        toast({ title: "Bukti Disimpan", description: "Foto bukti pengiriman telah disimpan." });
    } catch (error) {
        console.error("Error saving delivery proof:", error);
        toast({ title: "Error Simpan Bukti", description: "Gagal menyimpan bukti pengiriman.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
        setCapturingForPackageId(null);
        setPhotoRecipientName('');
    }
  };


  const handleDeletePackagePhoto = async (packageId: string) => {
    if(!dailyTaskDocId) return;
    try {
        const packageDocRef = doc(db, "kurir_daily_tasks", dailyTaskDocId, "packages", packageId);
        await updateDoc(packageDocRef, {
            deliveryProofPhotoUrl: null, 
            recipientName: null,
            status: 'in_transit', 
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
    
    setIsSubmitting(true);
    
    try {
        let finalReturnProofUrl: string | null = null;
        if (remainingInTransit.length > 0) {
          if (!returnProofPhotoDataUrl) { 
            toast({ title: "Upload Bukti Paket Pending", description: "Untuk menyelesaikan, upload foto bukti serah terima semua paket pending.", variant: "destructive" });
            setIsSubmitting(false);
            return;
          }
          if (!returnLeadReceiverName.trim()) {
            toast({ title: "Nama Leader Serah Terima Kosong", description: "Isi nama leader/supervisor yang menerima paket retur.", variant: "destructive" });
            setIsSubmitting(false);
            return;
          }

          // Upload the return proof photo
          const filePath = `return_proofs/${dailyTaskDocId}/return_proof_${Date.now()}.jpg`;
          const uploadResult = await uploadFileToServer(filePath, returnProofPhotoDataUrl);

          if (!uploadResult.success || !uploadResult.url) {
            toast({ title: "Gagal Mengunggah Bukti Retur", description: uploadResult.message, variant: "destructive" });
            setIsSubmitting(false);
            return;
          }
          finalReturnProofUrl = uploadResult.url;
        }

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
            finalReturnProofPhotoUrl: finalReturnProofUrl,
            finalReturnLeadReceiverName: returnLeadReceiverName.trim() || null,
        });

        const updatedPendingReturn: PackageItem[] = [];
        remainingInTransit.forEach(pkg => {
            const packageDocRef = doc(db, "kurir_daily_tasks", dailyTaskDocId, "packages", pkg.id);
            const finalPackageStatus = 'returned';
            batch.update(packageDocRef, { 
                status: finalPackageStatus, 
                lastUpdateTime: serverTimestamp(),
            });
            updatedPendingReturn.push({ ...pkg, status: finalPackageStatus, lastUpdateTime: new Date().toISOString() });
        });
        
        await batch.commit();

        setPendingReturnPackages(prev => [...prev.filter(p => p.status === 'returned'), ...updatedPendingReturn]);
        setInTransitPackages(prev => prev.filter(p => p.status === 'delivered')); 
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
    } catch (error: any) {
        console.error("Error finishing day:", error);
        toast({ title: "Error", description: `Gagal menyelesaikan hari: ${error.message}`, variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleReturnProofUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setReturnProofPhotoDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast({ title: "Foto Bukti Return Dipilih", description: file.name });
    }
  };

  const resetDayTask = async () => {
    setDailyTaskDocId(null);
    setDailyTaskData(null);
    resetPackageInputForm({ totalPackages: 0, codPackages: 0, nonCodPackages: 0 });
    setManagedPackages([]);
    setInTransitPackages([]);
    setPendingReturnPackages([]);
    setDeliveryStarted(false);
    setDayFinished(false);
    setReturnProofPhotoDataUrl(null);
    setReturnLeadReceiverName('');
    setPackagePhotoMap({});
    setMotivationalQuote(MotivationalQuotes[Math.floor(Math.random() * MotivationalQuotes.length)]);
    setIsCourierCheckedIn(false);
    localStorage.removeItem('courierCheckedInToday');
    
    toast({ title: "Tugas Baru Siap Dimulai", description: "Semua data tugas lokal telah direset. Selamat bekerja!" });
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
        const date = new Date(timestamp);
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
  const getCourierWorkSummaryIcon = () => { return <Truck className="h-5 w-5 text-blue-500" /> };
  
  const handleWilayahChange = (wilayahId: string) => { setSelectedWilayah(wilayahId) };
  const handleAreaChange = (areaId: string) => { setSelectedArea(areaId) };
  const handleHubChange = (hubId: string) => { setSelectedHub(hubId) };
  const handleSearchKurirChange = (event: React.ChangeEvent<HTMLInputElement>) => { setSearchKurir(event.target.value) };
  
  const handleDownloadDashboardSummary = () => {
    if (!displayData) return;
    toast({ title: "Mempersiapkan Unduhan..."});
    
    // 1. Summary Sheet
    const summaryData = [
        ["Statistik Utama Hari Ini", ""],
        ["Kurir Aktif", displayData.activeCouriersToday],
        ["Paket Diproses", displayData.totalPackagesProcessedToday],
        ["Paket Terkirim", displayData.totalPackagesDeliveredToday],
        ["Rate Tepat Waktu (%)", displayData.onTimeDeliveryRateToday.toFixed(1)],
    ];
    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWorksheet['!cols'] = [{ wch: 25 }, { wch: 15 }];

    // 2. Attendance Activity Sheet
    const attendanceData = displayData.attendanceActivities.map(act => ({
        "Nama Kurir": act.kurirName,
        "ID Kurir": act.kurirId,
        "Aksi": act.action,
        "Lokasi": act.location,
        "Waktu": formatActivityTimestamp(act.timestamp),
    }));
    const attendanceWorksheet = XLSX.utils.json_to_sheet(attendanceData);
    attendanceWorksheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 25 }];

    // 3. Work Summary Sheet
    const workSummaryData = displayData.courierWorkSummaries.map(sum => ({
        "Nama Kurir": sum.kurirName,
        "Total Paket": sum.totalPackagesAssigned,
        "Terkirim": sum.packagesDelivered,
        "Pending/Retur": sum.packagesPendingOrReturned,
        "Waktu Selesai": formatActivityTimestamp(sum.timestamp),
    }));
    const workSummaryWorksheet = XLSX.utils.json_to_sheet(workSummaryData);
    workSummaryWorksheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }];


    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Ringkasan Statistik");
    XLSX.utils.book_append_sheet(workbook, attendanceWorksheet, "Aktivitas Absensi");
    XLSX.utils.book_append_sheet(workbook, workSummaryWorksheet, "Penyelesaian Kerja");

    const todayDateString = format(new Date(), 'yyyy-MM-dd');
    XLSX.writeFile(workbook, `Ringkasan_Dashboard_${todayDateString}.xlsx`);
    toast({ title: "Unduhan Berhasil", description: "Ringkasan dashboard telah diunduh." });
  };


  if (isDashboardLoading) {
    return ( <div className="flex justify-center items-center h-screen"><p>Memuat ringkasan dashboard...</p></div> );
  }

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
            {pendingCountForChart > 0 && dailyTaskData.finalReturnProofPhotoUrl && isValidImageUrl(dailyTaskData.finalReturnProofPhotoUrl) && (
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-2">Bukti Paket Retur:</h3>
                <Image
                  src={dailyTaskData.finalReturnProofPhotoUrl}
                  alt="Bukti Retur"
                  className="max-w-sm w-full md:max-w-xs rounded-lg shadow-md border border-border"
                  width={300}
                  height={200}
                  style={{objectFit: 'contain'}}
                  data-ai-hint="receipt package"
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-4 pt-6 border-t mt-6">
             <p className="text-lg italic text-muted-foreground text-center px-4">{motivationalQuote}</p>
            <Button onClick={resetDayTask} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
              Mulai Tugas Baru
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const userInitials = currentUser?.fullName?.split(" ").map(n=>n[0]).join("") || "XX";

  if (currentUser.role === 'Kurir') {
    return (
      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={currentUser.avatarUrl || `https://placehold.co/150x150.png?text=${userInitials}`} alt={currentUser.fullName} data-ai-hint="man face" />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div><CardTitle className="text-2xl">{currentUser.fullName}</CardTitle><CardDescription>{currentUser.id} - {currentUser.workLocation}</CardDescription></div>
          </CardHeader>
        </Card>

        {!isCourierCheckedIn && ( <Alert variant="destructive"> <AlertCircle className="h-4 w-4" /> <AlertTitle>Anda Belum Melakukan Absen!</AlertTitle> <AlertDescription> Silakan lakukan <Link href="/attendance" className="font-bold underline hover:text-destructive-foreground">Check-In</Link> terlebih dahulu untuk memulai pekerjaan dan menginput data paket. </AlertDescription> </Alert> )}

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
              
              {managedPackages.length > 0 && ( <div className="space-y-2 max-h-60 overflow-y-auto p-1 border rounded-md"><h3 className="font-semibold text-muted-foreground px-2">Paket Diproses ({managedPackages.length}):</h3>{managedPackages.map(pkg => (<div key={pkg.id} className="flex items-center justify-between p-2 bg-card-foreground/5 rounded-md"><span className="text-sm break-all">{pkg.id} ({pkg.isCOD ? 'COD' : 'Non-COD'}) - <span className="italic text-xs text-primary">Proses</span></span><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => handleDeleteManagedPackage(pkg.id)}><Trash2 size={16} /></Button></div>))}</div> )}
              <Progress value={(managedPackages.length / (dailyTaskData.totalPackages || 1)) * 100} className="w-full h-2.5" />
            </CardContent>
            <CardFooter><Button onClick={handleStartDelivery} className="w-full" disabled={managedPackages.length !== dailyTaskData.totalPackages}>Mulai Pengantaran ({managedPackages.length}/{dailyTaskData.totalPackages})</Button></CardFooter>
          </Card>
          </>
        )}

        {dailyTaskData && dailyTaskData.taskStatus === 'in_progress' && deliveryStarted && !dayFinished && isCourierCheckedIn && (
          <Card>
            <CardHeader><div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"><div className="flex-grow"><CardTitle className="flex items-center"><PackageCheck className="mr-2 h-6 w-6 text-green-500" /> Sedang Dalam Pengantaran</CardTitle><CardDescription>Daftar paket. {inTransitPackages.filter(p => p.status === 'in_transit').length} paket belum terkirim.</CardDescription></div><Button onClick={handleOpenDeliveryScan} variant="outline" size="sm" className="w-full sm:w-auto" disabled={!inTransitPackages.some(p => p.status === 'in_transit')}><ScanLine className="mr-2 h-4 w-4" /> Scan Update Kirim</Button></div></CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">{[...inTransitPackages].sort((a,b) => (a.status === 'delivered' ? 1 : -1) - (b.status === 'delivered' ? 1: -1) || new Date(b.lastUpdateTime).getTime() - new Date(a.lastUpdateTime).getTime()).map(pkg => (
                <Card key={pkg.id} className={`p-3 ${pkg.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700' : 'bg-card'}`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-1"><p className="font-semibold break-all">{pkg.id} <span className={`text-xs px-2 py-0.5 rounded-full ${pkg.isCOD ? 'bg-yellow-400/20 text-yellow-600 dark:text-yellow-300' : 'bg-blue-400/20 text-blue-600 dark:text-blue-300'}`}>{pkg.isCOD ? 'COD' : 'Non-COD'}</span></p>{pkg.status === 'delivered' ? (<span className="text-xs text-green-600 dark:text-green-400 flex items-center flex-shrink-0"><CheckCircle size={14} className="mr-1"/> Terkirim</span>) : (<span className="text-xs text-orange-500 dark:text-orange-400 flex-shrink-0">Dalam Perjalanan</span>)}</div>
                  {pkg.status === 'in_transit' && (<div className="flex items-center gap-2 mt-2"><Button variant="outline" size="sm" onClick={() => handleOpenPackageCamera(pkg.id)} className="flex-1"><Camera size={16} className="mr-1" /> Foto Bukti & Nama Penerima</Button></div>)}
                  {isValidImageUrl(pkg.deliveryProofPhotoUrl) && (<div className="mt-2"><p className="text-xs text-muted-foreground mb-1">Penerima: <span className="font-medium text-foreground">{pkg.recipientName || 'N/A'}</span></p><div className="flex items-end gap-2"><Image src={pkg.deliveryProofPhotoUrl} alt={`Bukti ${pkg.id}`} className="w-24 h-24 object-cover rounded border" width={96} height={96} data-ai-hint="package door"/><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeletePackagePhoto(pkg.id)}><Trash2 size={16} /></Button></div></div>)}
                </Card>
            ))}</CardContent>
            
            <CardFooter><Button onClick={handleFinishDay} className="w-full" variant="destructive" disabled={isSubmitting}>{isSubmitting ? 'Memproses...' : 'Selesaikan Pengantaran Hari Ini'}</Button></CardFooter>
          </Card>
        )}

        {dailyTaskData && dailyTaskData.taskStatus === 'in_progress' && inTransitPackages.filter(p => p.status === 'in_transit').length > 0 && !dayFinished && isCourierCheckedIn && (
           <Card>
            <CardHeader><CardTitle className="flex items-center"><PackageX className="mr-2 h-6 w-6 text-red-500" /> Paket Pending/Retur</CardTitle><CardDescription>{inTransitPackages.filter(p => p.status === 'in_transit').length} paket belum terkirim dan perlu di-retur.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="returnProof" className="mb-1 block">Upload Foto Bukti Pengembalian Semua Paket Pending ke Gudang <span className="text-destructive">*</span></Label><Input id="returnProof" type="file" accept="image/*" onChange={handleReturnProofUpload} />{isValidImageUrl(returnProofPhotoDataUrl) && <Image src={returnProofPhotoDataUrl} alt="Preview Bukti Retur" width={100} height={100} className="mt-2 rounded border" data-ai-hint="receipt package"/>}</div>
              <div><Label htmlFor="returnLeadReceiverName">Nama Leader Serah Terima <span className="text-destructive">*</span></Label><Input id="returnLeadReceiverName" type="text" placeholder="Nama Leader/Supervisor" value={returnLeadReceiverName} onChange={(e) => setReturnLeadReceiverName(e.target.value)}/></div>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1"><h4 className="text-sm font-medium text-muted-foreground">Daftar Resi Pending:</h4>{inTransitPackages.filter(p => p.status === 'in_transit').map(pkg => (<p key={pkg.id} className="text-sm text-muted-foreground break-all">{pkg.id} - <span className="italic">Pending Retur</span></p>))}</div>
            </CardContent>
            <CardFooter><Button onClick={handleFinishDay} className="w-full" variant="destructive" disabled={isSubmitting || !returnProofPhotoDataUrl || !returnLeadReceiverName.trim()}>{isSubmitting ? 'Memproses...' : 'Konfirmasi Selesai dengan Paket Pending'}</Button></CardFooter>
          </Card>
        )}
        
        {dailyTaskData && dailyTaskData.taskStatus !== 'completed' && isCourierCheckedIn && (<Card className="bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 border-transparent"><CardContent className="pt-6"><p className="text-center text-lg italic text-foreground/70 dark:text-primary-foreground/80">{motivationalQuote}</p></CardContent></Card>)}

        {/* Full-screen Camera Modals */}
        {(isScanning || isScanningForDeliveryUpdate) && (
          <div className="fixed inset-0 z-50 bg-black">
            <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" autoPlay muted playsInline />
            <canvas ref={photoCanvasRef} className="hidden" />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
              <div className="relative h-64 w-11/12 max-w-sm">
                <div className="absolute inset-0 rounded-lg border-4 border-white/50" />
                <div className="absolute top-0 h-1 w-full animate-scan-line rounded-full bg-primary" />
              </div>
              <p className="mt-4 text-white">Arahkan kamera ke barcode</p>
            </div>
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white" onClick={() => { setIsScanning(false); setIsScanningForDeliveryUpdate(false); }}>
              <X className="h-6 w-6" />
            </Button>
            {hasCameraPermission === false && (<div className="absolute bottom-10 left-4 right-4"><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Akses Kamera Dibutuhkan</AlertTitle><AlertDescription>Izinkan akses kamera di pengaturan browser untuk memindai.</AlertDescription></Alert></div>)}
          </div>
        )}
        
        {capturingForPackageId && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            <canvas ref={photoCanvasRef} className="hidden" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 space-y-4">
              <div className="bg-black/50 rounded-lg p-4">
                  <Label htmlFor="photoRecipientName" className="text-white">Nama Penerima <span className="text-destructive">*</span></Label>
                  <Input id="photoRecipientName" type="text" placeholder="Masukkan nama penerima paket" value={photoRecipientName} onChange={(e) => setPhotoRecipientName(e.target.value)} className="bg-white/90 text-black"/>
              </div>
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" onClick={() => setCapturingForPackageId(null)} className="flex-1 bg-white/20 text-white border-white/50 hover:bg-white/30">Batal</Button>
                <Button onClick={handleCapturePackagePhoto} disabled={!hasCameraPermission || !photoRecipientName.trim() || isSubmitting} className="flex-1 bg-primary hover:bg-primary/90">
                  <Camera className="mr-2 h-5 w-5" /> {isSubmitting ? 'Mengunggah...' : 'Ambil Foto & Simpan'}
                </Button>
              </div>
            </div>
             {hasCameraPermission === false && (<div className="absolute top-10 left-4 right-4"><Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Akses Kamera Dibutuhkan</AlertTitle></Alert></div>)}
          </div>
        )}
      </div>
    );
  }


  if (currentUser.role !== 'Kurir' && displayData) {
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl"><FilterIcon className="mr-2 h-5 w-5 text-primary" />Filter & Aksi Cepat Dashboard</CardTitle>
            <CardDescription>Saring data yang ditampilkan untuk mendapatkan wawasan yang lebih spesifik.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <div>
                  <Label htmlFor="dashboard-wilayah">Wilayah</Label>
                  <Select value={selectedWilayah} onValueChange={handleWilayahChange}>
                      <SelectTrigger id="dashboard-wilayah"><SelectValue placeholder="Pilih Wilayah" /></SelectTrigger>
                      <SelectContent>{mockLocationsData.map(w => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}</SelectContent>
                  </Select>
              </div>
              <div>
                  <Label htmlFor="dashboard-area">Area Operasional</Label>
                  <Select value={selectedArea} onValueChange={handleAreaChange}>
                      <SelectTrigger id="dashboard-area"><SelectValue placeholder="Pilih Area" /></SelectTrigger>
                      <SelectContent>{areaOptions.map(a => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent>
                  </Select>
              </div>
              <div>
                  <Label htmlFor="dashboard-lokasi-kerja">Lokasi Kerja (Hub)</Label>
                  <Select value={selectedHub} onValueChange={handleHubChange}>
                      <SelectTrigger id="dashboard-lokasi-kerja"><SelectValue placeholder="Pilih Hub" /></SelectTrigger>
                      <SelectContent>{hubOptions.map(h => (<SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>))}</SelectContent>
                  </Select>
              </div>
              <div className="lg:col-span-3">
                  <Label htmlFor="dashboard-search-kurir">Cari Kurir (Nama)</Label>
                  <div className="relative">
                      <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="dashboard-search-kurir" type="search" placeholder="Masukkan Nama Kurir..." className="pl-8" value={searchKurir} onChange={handleSearchKurirChange}/>
                  </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
              <Button onClick={handleDownloadDashboardSummary} variant="outline" className="w-full sm:w-auto">
                  <DownloadIcon className="mr-2 h-4 w-4" /> Unduh Ringkasan Dashboard
              </Button>
          </CardFooter>
        </Card>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Kurir Aktif Hari Ini</CardTitle><Users className="h-5 w-5 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{displayData.activeCouriersToday}</div><p className="text-xs text-muted-foreground">Total kurir beroperasi</p></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Paket Diproses Hari Ini</CardTitle><PackageIcon className="h-5 w-5 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{displayData.totalPackagesProcessedToday}</div><p className="text-xs text-muted-foreground">Total paket ditugaskan</p></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Paket Terkirim Hari Ini</CardTitle><PackageCheck className="h-5 w-5 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{displayData.totalPackagesDeliveredToday}</div><p className="text-xs text-muted-foreground">Dari {displayData.totalPackagesProcessedToday} paket</p></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Rate Tepat Waktu</CardTitle><Clock className="h-5 w-5 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{displayData.onTimeDeliveryRateToday.toFixed(1)}%</div><p className="text-xs text-muted-foreground">Kurir check-in tepat waktu</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle className="flex items-center text-xl text-primary"><BarChart2 className="mr-2 h-5 w-5"/>Ringkasan Pengiriman (7 Hari)</CardTitle><CardDescription>Visualisasi paket terkirim & pending.</CardDescription></CardHeader><CardContent className="h-[300px] pt-4"><ResponsiveContainer width="100%" height="100%"><RechartsBarChart data={displayData.dailyShipmentSummary} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" /><XAxis dataKey="name" tick={{fontSize: '0.75rem'}}/><YAxis tick={{fontSize: '0.75rem'}}/><Tooltip contentStyle={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)", fontSize: "0.8rem", padding: "0.5rem" }} cursor={{ fill: "hsl(var(--accent)/0.2)" }}/><Legend wrapperStyle={{fontSize: "0.8rem"}}/><Bar dataKey="terkirim" name="Terkirim" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={20}/><Bar dataKey="pending" name="Pending/Retur" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} barSize={20}/></RechartsBarChart></ResponsiveContainer></CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center text-xl text-primary"><TrendingUp className="mr-2 h-5 w-5" />Tren Pengiriman Mingguan (4 Minggu)</CardTitle><CardDescription>Performa mingguan.</CardDescription></CardHeader><CardContent className="h-[300px] pt-4"><ResponsiveContainer width="100%" height="100%"><LineChart data={displayData.weeklyShipmentSummary} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" /><XAxis dataKey="week" tick={{fontSize: '0.75rem'}} /><YAxis tick={{fontSize: '0.75rem'}} /><Tooltip contentStyle={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)", fontSize: "0.8rem", padding: "0.5rem" }} cursor={{ fill: "hsl(var(--accent)/0.2)" }}/><Legend wrapperStyle={{fontSize: "0.8rem"}} /><Line type="monotone" dataKey="terkirim" name="Terkirim" stroke="hsl(var(--chart-3))" strokeWidth={2} activeDot={{ r: 6 }} /><Line type="monotone" dataKey="pending" name="Pending/Retur" stroke="hsl(var(--chart-4))" strokeWidth={2} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></CardContent></Card>
          <Card className="md:col-span-2"><CardHeader><CardTitle className="flex items-center text-xl text-primary"><BarChart2 className="mr-2 h-5 w-5" />Ringkasan Performa Bulanan (3 Bulan)</CardTitle><CardDescription>Perbandingan bulanan.</CardDescription></CardHeader><CardContent className="h-[320px] pt-4"><ResponsiveContainer width="100%" height="100%"><RechartsBarChart data={displayData.monthlyPerformanceSummary} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" /><XAxis dataKey="month" tick={{fontSize: '0.75rem'}} /><YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-1))" tick={{fontSize: '0.75rem'}} /><YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-5))" tick={{fontSize: '0.75rem'}} /><Tooltip contentStyle={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)", fontSize: "0.8rem", padding: "0.5rem" }} cursor={{ fill: "hsl(var(--accent)/0.2)" }}/><Legend wrapperStyle={{fontSize: "0.8rem"}} /><Bar yAxisId="left" dataKey="totalDelivered" name="Total Terkirim" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={25} /><Bar yAxisId="right" dataKey="totalPending" name="Total Pending" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} barSize={25} /></RechartsBarChart></ResponsiveContainer></CardContent></Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle className="flex items-center text-xl text-primary"><Activity className="mr-2 h-5 w-5"/>Aktivitas Absensi Terkini</CardTitle><CardDescription>Update check-in/out kurir.</CardDescription></CardHeader><CardContent className="max-h-[400px] overflow-y-auto pr-2">{displayData.attendanceActivities.length > 0 ? (<ul className="space-y-3">{displayData.attendanceActivities.map(activity => ( <li key={activity.id} className="flex items-start space-x-3 p-3 bg-card-foreground/5 rounded-md"><div className="flex-shrink-0 mt-0.5">{getAttendanceActionIcon(activity.action)}</div><div className="flex-grow"><p className="text-sm font-medium">{activity.kurirName} <span className="text-xs text-muted-foreground">({activity.kurirId})</span></p><p className="text-sm text-muted-foreground">{activity.action === 'check-in' ? 'melakukan check-in' : activity.action === 'check-out' ? 'melakukan check-out' : 'melaporkan keterlambatan'}{activity.location && <span className="text-xs"> di {activity.location}</span>}</p><p className="text-xs text-muted-foreground/80 mt-0.5">{formatActivityTimestamp(activity.timestamp)}</p></div></li>))}</ul>) : (<p className="text-muted-foreground text-center py-4">Belum ada aktivitas absensi.</p>)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center text-xl text-primary"><ListChecks className="mr-2 h-5 w-5"/>Ringkasan Penyelesaian Kerja Kurir</CardTitle><CardDescription>Laporan ringkas setelah kurir selesai.</CardDescription></CardHeader><CardContent className="max-h-[400px] overflow-y-auto pr-2">{displayData.courierWorkSummaries.length > 0 ? (<ul className="space-y-3">{displayData.courierWorkSummaries.map(summary => ( <li key={summary.id} className="flex items-start space-x-3 p-3 bg-card-foreground/5 rounded-md"><div className="flex-shrink-0 mt-0.5">{getCourierWorkSummaryIcon()}</div><div className="flex-grow"><p className="text-sm font-medium">{summary.kurirName} <span className="text-xs text-muted-foreground">({summary.kurirId})</span></p><p className="text-sm text-muted-foreground">Menyelesaikan: <strong className="text-foreground">{summary.totalPackagesAssigned}</strong> paket, <strong className="text-green-500">{summary.packagesDelivered}</strong> terkirim, <strong className="text-red-500">{summary.packagesPendingOrReturned}</strong> retur/pending.</p><p className="text-xs text-muted-foreground/80 mt-0.5">{formatActivityTimestamp(summary.timestamp)}</p></div></li>))}</ul>) : (<p className="text-muted-foreground text-center py-4">Belum ada ringkasan kerja.</p>)}</CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div>
        <p>Dashboard untuk peran Anda sedang dalam pengembangan.</p>
    </div>
  )

}
