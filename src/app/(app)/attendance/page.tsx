
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { CheckCircle, XCircle, Clock, CalendarDays, BarChartHorizontalBig, CalendarIcon as LucideCalendarIcon, ChevronsUpDown, BarChart as BarChartIcon, TrendingUp, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { AttendanceRecord, UserProfile } from '@/types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDate as getDayOfMonthDateFns, subDays } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import type { Locale } from "date-fns";
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, getDoc, collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';


const generateMonthlyAttendanceData = (
  startDate: Date,
  endDate: Date,
  history: AttendanceRecord[],
  locale: Locale
): { chartData: { name: string; Kehadiran: number }[], presentDays: number } => {
  if (startDate > endDate) return { chartData: [], presentDays: 0 };

  const daysInInterval = eachDayOfInterval({ start: startDate, end: endDate });
  let presentCount = 0;

  const chartData = daysInInterval.map(day => {
    const dayOfMonthStr = format(day, 'd', { locale }); 
    const isoDateString = format(day, 'yyyy-MM-dd');
    const record = history.find(rec => rec.date === isoDateString);
    const isPresent = record && (record.status === 'Present' || record.status === 'Late');
    if (isPresent) {
      presentCount++;
    }
    return {
      name: dayOfMonthStr,
      Kehadiran: isPresent ? 1 : 0,
    };
  });
  return { chartData, presentDays: presentCount };
};


export default function AttendancePage() {
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const todayISO = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
      try {
        setCurrentUser(JSON.parse(userDataString) as UserProfile);
      } catch (error) { console.error("Error parsing user data for attendance page", error); }
    } else {
        setIsLoading(false);
    }
  }, []);

  const fetchAttendanceData = useCallback(async (user: UserProfile) => {
    setIsLoading(true);
    try {
        // Fetch today's record specifically
        const todayDocId = `${user.uid}_${todayISO}`;
        const todayDocRef = doc(db, "attendance", todayDocId);
        const todayDocSnap = await getDoc(todayDocRef);
        
        if (todayDocSnap.exists()) {
            const record = todayDocSnap.data() as AttendanceRecord;
            setTodayRecord({ id: todayDocSnap.id, ...record });
            // Correct logic: check for checkInTime specifically
            localStorage.setItem('courierCheckedInToday', record.checkInTime ? todayISO : 'false');
        } else {
            setTodayRecord({ 
                id: todayDocId,
                kurirUid: user.uid,
                kurirId: user.id,
                kurirName: user.fullName,
                date: todayISO, 
                status: 'Not Checked In' 
            });
            localStorage.setItem('courierCheckedInToday', 'false');
        }

        // Fetch historical records for the last 60 days
        const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');
        const historyQuery = query(
            collection(db, "attendance"),
            where("kurirUid", "==", user.uid),
            where("date", ">=", sixtyDaysAgo),
            orderBy("date", "desc")
        );
        const querySnapshot = await getDocs(historyQuery);
        const fetchedHistory: AttendanceRecord[] = [];
        querySnapshot.forEach((doc) => {
            fetchedHistory.push({ id: doc.id, ...doc.data() } as AttendanceRecord);
        });
        setAttendanceHistory(fetchedHistory);

    } catch(error) {
        console.error("Error fetching attendance data:", error);
        toast({ title: "Error", description: "Gagal memuat data absensi.", variant: "destructive"});
    } finally {
        setIsLoading(false);
    }
  }, [toast, todayISO]);
  
  useEffect(() => {
    if (currentUser) {
      fetchAttendanceData(currentUser);
    }
  }, [currentUser, fetchAttendanceData]);


  const handleCheckIn = async () => {
    if (!currentUser || todayRecord?.checkInTime) {
      toast({ title: "Sudah Check-In", description: "Anda sudah melakukan check-in hari ini.", variant: "default" });
      return;
    }
    setIsSubmitting(true);
    const now = new Date();
    const docId = `${currentUser.uid}_${todayISO}`;
    const recordRef = doc(db, "attendance", docId);
    
    // We don't store the ID in the document itself
    const newRecord: Omit<AttendanceRecord, 'id'> = {
      kurirUid: currentUser.uid,
      kurirId: currentUser.id,
      kurirName: currentUser.fullName,
      date: todayISO,
      checkInTime: format(now, 'HH:mm'),
      status: now.getHours() < 9 ? 'Present' : 'Late',
      timestamp: Timestamp.fromDate(now),
      checkInTimestamp: Timestamp.fromDate(now),
      workLocation: currentUser.workLocation,
    };

    try {
        await setDoc(recordRef, newRecord, { merge: true });
        toast({ title: "Check-In Berhasil", description: `Anda check-in pukul ${newRecord.checkInTime}. Status: ${newRecord.status}.` });
        // REFETCH data from Firestore to ensure UI consistency
        await fetchAttendanceData(currentUser);
        localStorage.setItem('courierCheckedInToday', todayISO);
    } catch (error) {
        console.error("Error during check-in: ", error);
        toast({ title: "Check-In Gagal", description: "Terjadi kesalahan saat menyimpan data.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!currentUser || !todayRecord?.checkInTime) {
      toast({ title: "Belum Check-In", description: "Anda harus check-in terlebih dahulu.", variant: "destructive" });
      return;
    }
    if (todayRecord?.checkOutTime) {
      toast({ title: "Sudah Check-Out", description: "Anda sudah melakukan check-out hari ini.", variant: "default" });
      return;
    }
    setIsSubmitting(true);
    const now = new Date();
    const docId = `${currentUser.uid}_${todayISO}`;
    const recordRef = doc(db, "attendance", docId);
    const checkOutTime = format(now, 'HH:mm');

    try {
        await updateDoc(recordRef, {
            checkOutTime: checkOutTime,
            timestamp: Timestamp.fromDate(now),
            checkOutTimestamp: Timestamp.fromDate(now),
        });
        toast({ title: "Check-Out Berhasil", description: `Anda check-out pukul ${checkOutTime}.` });
        // REFETCH data from Firestore to ensure UI consistency
        await fetchAttendanceData(currentUser);
    } catch(error) {
        console.error("Error during check-out:", error);
        toast({ title: "Check-Out Gagal", description: "Terjadi kesalahan saat menyimpan data.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };


  const calculateWorkDuration = (checkInTime?: string, checkOutTime?: string): string | null => {
    if (!checkInTime || !checkOutTime) {
      return null;
    }

    const [inHours, inMinutes] = checkInTime.split(':').map(Number);
    const [outHours, outMinutes] = checkOutTime.split(':').map(Number);

    const dateRef = new Date(); 
    const checkInDate = new Date(dateRef.getFullYear(), dateRef.getMonth(), dateRef.getDate(), inHours, inMinutes, 0, 0);
    const checkOutDate = new Date(dateRef.getFullYear(), dateRef.getMonth(), dateRef.getDate(), outHours, outMinutes, 0, 0);

    if (checkOutDate < checkInDate) {
      return "Durasi tidak valid (check-out sebelum check-in)";
    }

    let diffMillis = checkOutDate.getTime() - checkInDate.getTime();

    const hours = Math.floor(diffMillis / (1000 * 60 * 60));
    diffMillis -= hours * (1000 * 60 * 60);
    const minutes = Math.floor(diffMillis / (1000 * 60));

    if (hours < 0 || minutes < 0) return "Durasi tidak valid";
    if (hours === 0 && minutes === 0) return "Kurang dari 1 menit";
    
    let durationString = "";
    if (hours > 0) {
      durationString += `${hours} jam `;
    }
    if (minutes > 0) {
      durationString += `${minutes} menit`;
    }
    
    return durationString.trim() || null;
  };

  const selectedRecord = attendanceHistory.find(rec => selectedDate && rec.date === format(selectedDate, 'yyyy-MM-dd'));
  const workDuration = selectedRecord ? calculateWorkDuration(selectedRecord.checkInTime, selectedRecord.checkOutTime) : null;

  const totalDaysTracked = attendanceHistory.filter(r => r.status !== 'Not Checked In').length;
  const presentDaysOverall = attendanceHistory.filter(r => r.status === 'Present' || r.status === 'Late').length;
  const attendanceRate = totalDaysTracked > 0 ? (presentDaysOverall / totalDaysTracked) * 100 : 0;
  
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const firstDayCurrentMonth = new Date(currentYear, currentMonth, 1);
  const fifteenthCurrentMonth = new Date(currentYear, currentMonth, 15);
  const sixteenthCurrentMonth = new Date(currentYear, currentMonth, 16);
  const lastDayCurrentMonth = endOfMonth(today);

  const { chartData: firstHalfMonthAttendance, presentDays: presentDaysFirstHalf } = generateMonthlyAttendanceData(firstDayCurrentMonth, fifteenthCurrentMonth, attendanceHistory, indonesiaLocale);
  const { chartData: secondHalfMonthAttendance, presentDays: presentDaysSecondHalf } = generateMonthlyAttendanceData(sixteenthCurrentMonth, lastDayCurrentMonth, attendanceHistory, indonesiaLocale);

  if (isLoading || !currentUser) {
    return (
        <div className="space-y-6">
            <Card className="shadow-lg"><CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></CardContent></Card>
            <Card className="shadow-lg"><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent className="flex flex-col md:flex-row gap-6"><Skeleton className="h-10 w-full md:w-[280px]"/><div className="flex-1"><Skeleton className="h-24 w-full"/></div></CardContent></Card>
            <Card className="shadow-lg"><CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader><CardContent className="space-y-6"><Skeleton className="h-20 w-full"/><div className="grid grid-cols-1 lg:grid-cols-2 gap-8"><Skeleton className="h-64 w-full"/><Skeleton className="h-64 w-full"/></div></CardContent></Card>
        </div>
    );
  }

  if (currentUser.role !== 'Kurir') {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center"><AlertCircle className="mr-2 h-6 w-6"/>Akses Terbatas</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Halaman absensi hanya tersedia untuk peran Kurir.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center"><Clock className="mr-2 h-6 w-6"/>Absensi Hari Ini</CardTitle>
          <CardDescription>Tanggal: {format(new Date(), "eeee, dd MMMM yyyy", { locale: indonesiaLocale })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayRecord?.checkInTime ? (
            <Alert variant={todayRecord.status === 'Late' ? 'destructive' : 'default'}>
              <CheckCircle className={`h-4 w-4 ${todayRecord.status === 'Present' ? 'text-primary' : ''}`} />
              <AlertTitle>Sudah Check-In pukul {todayRecord.checkInTime}</AlertTitle>
              <AlertDescription>Status Kehadiran: {todayRecord.status}</AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Belum Check-In</AlertTitle>
              <AlertDescription>Silakan lakukan check-in untuk memulai hari kerja Anda.</AlertDescription>
            </Alert>
          )}

          {todayRecord?.checkOutTime && (
            <Alert variant="default">
              <CheckCircle className="h-4 w-4 text-primary" />
              <AlertTitle>Sudah Check-Out pukul {todayRecord.checkOutTime}</AlertTitle>
              <AlertDescription>Hari kerja Anda telah selesai.</AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <Button 
              variant="default"
              onClick={handleCheckIn} 
              disabled={!!todayRecord?.checkInTime || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Memproses...' : <><CheckCircle className="mr-2 h-4 w-4" /> Check In</>}
            </Button>
            <Button 
              variant="destructive"
              onClick={handleCheckOut} 
              disabled={!todayRecord?.checkInTime || !!todayRecord?.checkOutTime || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Memproses...' : <><XCircle className="mr-2 h-4 w-4" /> Check Out</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-primary flex items-center"><CalendarDays className="mr-2 h-5 w-5"/>Riwayat Absensi</CardTitle>
          <CardDescription>Pilih tanggal untuk melihat detail absensi.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-6">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={("w-full justify-start text-left font-normal md:w-[280px]")}
              >
                <LucideCalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP", { locale: indonesiaLocale }) : <span>Pilih tanggal</span>}
                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setIsCalendarOpen(false);
                }}
                className="rounded-md border"
                disabled={(date) => date > new Date() || date < new Date(new Date().setFullYear(new Date().getFullYear() -1 ))} 
                initialFocus
                locale={indonesiaLocale}
              />
            </PopoverContent>
          </Popover>
          
          <div className="flex-1">
            {selectedDate && selectedRecord ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detail Absensi:</CardTitle>
                  <CardDescription>{format(selectedDate, "eeee, dd MMMM yyyy", { locale: indonesiaLocale })}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>Status: <span className={`font-semibold ${selectedRecord.status === 'Present' ? 'text-primary' : selectedRecord.status === 'Late' ? 'text-destructive' : 'text-destructive'}`}>{selectedRecord.status}</span></p>
                  {selectedRecord.checkInTime && <p>Check-In: {selectedRecord.checkInTime}</p>}
                  {selectedRecord.checkOutTime && <p>Check-Out: {selectedRecord.checkOutTime}</p>}
                  {workDuration && <p>Total Jam Kerja: <span className="font-semibold">{workDuration}</span></p>}
                </CardContent>
              </Card>
            ) : selectedDate ? (
              <p className="text-muted-foreground p-4 text-center">Tidak ada data absensi untuk tanggal ini.</p>
            ) : (
              <p className="text-muted-foreground p-4 text-center">Pilih tanggal pada kalender untuk melihat detail.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-primary flex items-center"><TrendingUp className="mr-2 h-5 w-5"/>Performa Absensi Keseluruhan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Tingkat Kehadiran (Total Keseluruhan)</span>
              <span className="font-bold text-lg text-primary">{attendanceRate.toFixed(1)}%</span>
            </div>
            <Progress value={attendanceRate} className="h-3" />
            <p className="text-sm text-muted-foreground">{presentDaysOverall} dari {totalDaysTracked} hari kerja terlacak.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <h4 className="font-semibold text-md">Kehadiran: Tgl 1 - 15 {format(firstDayCurrentMonth, "MMMM yyyy", { locale: indonesiaLocale })}</h4>
                <p className="text-sm text-primary font-semibold">Total Masuk: {presentDaysFirstHalf} hari</p>
              </div>
              {firstHalfMonthAttendance.length > 0 ? (
                <div className="h-[280px] mt-2 pr-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={firstHalfMonthAttendance} margin={{ top: 5, right: 0, left: -25, bottom: 35 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} tick={{fontSize: '0.65rem', dy: 5}}/>
                      <YAxis type="number" domain={[0,1]} tickCount={2} tickFormatter={(value) => value === 1 ? 'Hadir' : 'Absen'} allowDecimals={false} tick={{fontSize: '0.75rem'}} />
                      <Tooltip 
                        formatter={(value: number, name: string, props: any) => [props.payload.Kehadiran === 1 ? 'Hadir' : 'Absen', `Tgl ${props.payload.name}`]}
                        contentStyle={{
                          background: "hsl(var(--background))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "var(--radius)",
                          fontSize: "0.8rem",
                          padding: "0.5rem"
                        }}
                        cursor={{ fill: "hsl(var(--accent)/0.2)" }}
                      />
                      <Legend formatter={(value) => value === 'Kehadiran' ? 'Status Kehadiran' : value} wrapperStyle={{fontSize: "0.8rem"}} />
                      <Bar dataKey="Kehadiran" fill="hsl(var(--chart-1))" barSize={12} name="Status Kehadiran" radius={[4, 4, 0, 0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                ) : (
                <p className="text-muted-foreground text-center py-4">Belum ada data absensi untuk periode ini.</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-2">
                <h4 className="font-semibold text-md">Kehadiran: Tgl 16 - {getDayOfMonthDateFns(lastDayCurrentMonth)} {format(firstDayCurrentMonth, "MMMM yyyy", { locale: indonesiaLocale })}</h4>
                <p className="text-sm text-primary font-semibold">Total Masuk: {presentDaysSecondHalf} hari</p>
              </div>
               {secondHalfMonthAttendance.length > 0 ? (
                <div className="h-[280px] mt-2 pr-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={secondHalfMonthAttendance} margin={{ top: 5, right: 0, left: -25, bottom: 35 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                       <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} tick={{fontSize: '0.65rem', dy: 5}}/>
                      <YAxis type="number" domain={[0,1]} tickCount={2} tickFormatter={(value) => value === 1 ? 'Hadir' : 'Absen'} allowDecimals={false} tick={{fontSize: '0.75rem'}}/>
                      <Tooltip 
                        formatter={(value: number, name: string, props: any) => [props.payload.Kehadiran === 1 ? 'Hadir' : 'Absen', `Tgl ${props.payload.name}`]}
                        contentStyle={{
                          background: "hsl(var(--background))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "var(--radius)",
                          fontSize: "0.8rem",
                          padding: "0.5rem"
                        }}
                        cursor={{ fill: "hsl(var(--accent)/0.2)" }}
                      />
                      <Legend formatter={(value) => value === 'Kehadiran' ? 'Status Kehadiran' : value} wrapperStyle={{fontSize: "0.8rem"}} />
                      <Bar dataKey="Kehadiran" fill="hsl(var(--chart-2))" barSize={12} name="Status Kehadiran" radius={[4, 4, 0, 0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                 ) : (
                <p className="text-muted-foreground text-center py-4">Belum ada data absensi untuk periode ini.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
