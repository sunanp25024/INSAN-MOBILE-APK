
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { CheckCircle, XCircle, Clock, CalendarDays, BarChartHorizontalBig, CalendarIcon as LucideCalendarIcon, ChevronsUpDown, BarChart as BarChartIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { AttendanceRecord } from '@/types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDate as getDayOfMonthDateFns } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import type { Locale } from "date-fns";

// Mock data
const mockPastAttendance: AttendanceRecord[] = [
  { date: new Date(Date.now() - 86400000 * 3).toISOString(), checkInTime: '08:05', checkOutTime: '17:02', status: 'Present' },
  { date: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'Absent' },
  { date: new Date(Date.now() - 86400000 * 1).toISOString(), checkInTime: '07:58', checkOutTime: '17:10', status: 'Present' },
  // Add more mock data for the current month for better chart testing
  { date: new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString(), checkInTime: '08:00', checkOutTime: '17:00', status: 'Present' },
  { date: new Date(new Date().getFullYear(), new Date().getMonth(), 5).toISOString(), status: 'Absent' },
  { date: new Date(new Date().getFullYear(), new Date().getMonth(), 10).toISOString(), checkInTime: '08:30', checkOutTime: '17:30', status: 'Late' },
  { date: new Date(new Date().getFullYear(), new Date().getMonth(), 17).toISOString(), checkInTime: '07:55', checkOutTime: '16:55', status: 'Present' },
  { date: new Date(new Date().getFullYear(), new Date().getMonth(), 20).toISOString(), status: 'Absent' },
];

const generateMonthlyAttendanceData = (
  startDate: Date,
  endDate: Date,
  history: AttendanceRecord[],
  locale: Locale
): { name: string; Kehadiran: number }[] => {
  if (startDate > endDate) return [];

  const daysInInterval = eachDayOfInterval({ start: startDate, end: endDate });

  return daysInInterval.map(day => {
    const dayOfMonthStr = format(day, 'd', { locale }); // 'd' for day of month
    const isoDateString = format(day, 'yyyy-MM-dd');
    const record = history.find(rec => rec.date.startsWith(isoDateString));
    return {
      name: dayOfMonthStr,
      Kehadiran: (record && (record.status === 'Present' || record.status === 'Late')) ? 1 : 0,
    };
  });
};


export default function AttendancePage() {
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>(mockPastAttendance);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { toast } = useToast();

  const todayISO = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const existingRecord = attendanceHistory.find(rec => rec.date.startsWith(todayISO));
    if (existingRecord) {
      setTodayRecord(existingRecord);
    } else {
      setTodayRecord({ date: new Date().toISOString(), status: 'Absent' }); 
    }
  }, [attendanceHistory, todayISO]);

  const handleCheckIn = () => {
    if (todayRecord?.checkInTime) {
      toast({ title: "Sudah Check-In", description: "Anda sudah melakukan check-in hari ini.", variant: "default" });
      return;
    }
    const now = new Date();
    const newRecord: AttendanceRecord = {
      ...todayRecord!,
      date: now.toISOString(),
      checkInTime: now.toTimeString().slice(0, 5),
      status: now.getHours() < 9 ? 'Present' : 'Late', 
    };
    setTodayRecord(newRecord);
    setAttendanceHistory(prev => {
      const existingIndex = prev.findIndex(rec => rec.date.startsWith(todayISO));
      if (existingIndex > -1) {
        const updatedHistory = [...prev];
        updatedHistory[existingIndex] = newRecord;
        return updatedHistory;
      }
      return [...prev, newRecord];
    });
    localStorage.setItem('courierCheckedInToday', now.toISOString().split('T')[0]);
    toast({ title: "Check-In Berhasil", description: `Anda check-in pukul ${newRecord.checkInTime}. Status: ${newRecord.status}.` });
  };

  const handleCheckOut = () => {
    if (!todayRecord?.checkInTime) {
      toast({ title: "Belum Check-In", description: "Anda harus check-in terlebih dahulu.", variant: "destructive" });
      return;
    }
    if (todayRecord?.checkOutTime) {
      toast({ title: "Sudah Check-Out", description: "Anda sudah melakukan check-out hari ini.", variant: "default" });
      return;
    }
    const now = new Date();
    const newRecord: AttendanceRecord = {
      ...todayRecord!,
      checkOutTime: now.toTimeString().slice(0, 5),
    };
    setTodayRecord(newRecord);
    setAttendanceHistory(prev => {
      const existingIndex = prev.findIndex(rec => rec.date.startsWith(todayISO));
      if (existingIndex > -1) {
        const updatedHistory = [...prev];
        updatedHistory[existingIndex] = newRecord;
        return updatedHistory;
      }
      return [...prev, newRecord]; 
    });
    toast({ title: "Check-Out Berhasil", description: `Anda check-out pukul ${newRecord.checkOutTime}.` });
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

  const selectedRecord = attendanceHistory.find(rec => selectedDate && rec.date.startsWith(selectedDate.toISOString().split('T')[0]));
  const workDuration = selectedRecord ? calculateWorkDuration(selectedRecord.checkInTime, selectedRecord.checkOutTime) : null;

  const totalDaysTracked = attendanceHistory.length;
  const presentDays = attendanceHistory.filter(r => r.status === 'Present' || r.status === 'Late').length;
  const attendanceRate = totalDaysTracked > 0 ? (presentDays / totalDaysTracked) * 100 : 0;
  
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const firstDayCurrentMonth = new Date(currentYear, currentMonth, 1);
  const fifteenthCurrentMonth = new Date(currentYear, currentMonth, 15);
  const sixteenthCurrentMonth = new Date(currentYear, currentMonth, 16);
  const lastDayCurrentMonth = endOfMonth(today);

  const firstHalfMonthAttendance = generateMonthlyAttendanceData(firstDayCurrentMonth, fifteenthCurrentMonth, attendanceHistory, indonesiaLocale);
  const secondHalfMonthAttendance = generateMonthlyAttendanceData(sixteenthCurrentMonth, lastDayCurrentMonth, attendanceHistory, indonesiaLocale);


  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center"><Clock className="mr-2 h-6 w-6"/>Absensi Hari Ini</CardTitle>
          <CardDescription>Tanggal: {format(new Date(), "eeee, dd MMMM yyyy", { locale: indonesiaLocale })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayRecord?.checkInTime ? (
            <Alert variant={todayRecord.status === 'Present' ? 'default' : todayRecord.status === 'Late' ? 'destructive': 'default'} className={todayRecord.status === 'Present' ? 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700' : todayRecord.status === 'Late' ? 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700' : ''}>
              <CheckCircle className={`h-4 w-4 ${todayRecord.status === 'Present' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
              <AlertTitle>Sudah Check-In pukul {todayRecord.checkInTime}</AlertTitle>
              <AlertDescription>Status Kehadiran: {todayRecord.status}</AlertDescription>
            </Alert>
          ) : (
            <Alert variant="default" className="bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertTitle>Belum Check-In</AlertTitle>
              <AlertDescription>Silakan lakukan check-in untuk memulai hari kerja Anda.</AlertDescription>
            </Alert>
          )}

          {todayRecord?.checkOutTime && (
            <Alert variant="default" className="bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700">
              <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle>Sudah Check-Out pukul {todayRecord.checkOutTime}</AlertTitle>
              <AlertDescription>Hari kerja Anda telah selesai.</AlertDescription>
            </Alert>
          )}
          
          <div className="flex space-x-4">
            <Button 
              onClick={handleCheckIn} 
              disabled={!!todayRecord?.checkInTime}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Check In
            </Button>
            <Button 
              onClick={handleCheckOut} 
              disabled={!todayRecord?.checkInTime || !!todayRecord?.checkOutTime}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              <XCircle className="mr-2 h-4 w-4" /> Check Out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl text-primary flex items-center"><CalendarDays className="mr-2 h-5 w-5"/>Riwayat Absensi</CardTitle>
          <CardDescription>Pilih tanggal untuk melihat detail absensi.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
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
                disabled={(date) => date > new Date() || date < new Date(new Date().setFullYear(new Date().getFullYear() -1 ))} // Limit to 1 year back for performance
                initialFocus
                locale={indonesiaLocale}
              />
            </PopoverContent>
          </Popover>
          
          <div className="flex-1">
            {selectedDate && selectedRecord ? (
              <Card>
                <CardHeader>
                  <CardTitle>Detail Absensi: {format(selectedDate, "eeee, dd MMMM yyyy", { locale: indonesiaLocale })}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p>Status: <span className={`font-semibold ${selectedRecord.status === 'Present' ? 'text-green-600 dark:text-green-400' : selectedRecord.status === 'Late' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>{selectedRecord.status}</span></p>
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

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl text-primary flex items-center"><BarChartIcon className="mr-2 h-5 w-5"/>Performa Absensi Keseluruhan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Tingkat Kehadiran (Total)</span>
              <span className="font-bold text-primary">{attendanceRate.toFixed(1)}%</span>
            </div>
            <Progress value={attendanceRate} className="h-3" />
            <p className="text-sm text-muted-foreground">{presentDays} dari {totalDaysTracked} hari kerja terlacak.</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2">Kehadiran Bulan Ini (Tanggal 1-15): {format(firstDayCurrentMonth, "MMMM yyyy", { locale: indonesiaLocale })}</h4>
              {firstHalfMonthAttendance.length > 0 ? (
                <div className="h-[280px] mt-2 pr-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={firstHalfMonthAttendance} margin={{ top: 5, right: 0, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={50} interval={0} tick={{fontSize: '0.75rem'}}/>
                      <YAxis type="number" domain={[0,1]} tickCount={2} tickFormatter={(value) => value === 1 ? 'Hadir' : 'Absen'} allowDecimals={false} />
                      <Tooltip 
                        formatter={(value: number, name: string, props: any) => [props.payload.Kehadiran === 1 ? 'Hadir' : 'Absen', `Tgl ${props.payload.name}`]}
                        contentStyle={{
                          background: "hsl(var(--background))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Legend formatter={(value) => value === 'Kehadiran' ? 'Status Kehadiran' : value} />
                      <Bar dataKey="Kehadiran" fill="hsl(var(--chart-1))" barSize={15} name="Status Kehadiran"/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                ) : (
                <p className="text-muted-foreground text-center py-4">Belum ada data absensi untuk periode ini.</p>
              )}
            </div>

            <div>
              <h4 className="font-semibold mb-2">Kehadiran Bulan Ini (Tanggal 16-{getDayOfMonthDateFns(lastDayCurrentMonth)}): {format(firstDayCurrentMonth, "MMMM yyyy", { locale: indonesiaLocale })}</h4>
               {secondHalfMonthAttendance.length > 0 ? (
                <div className="h-[280px] mt-2 pr-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={secondHalfMonthAttendance} margin={{ top: 5, right: 0, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                       <XAxis dataKey="name" angle={-45} textAnchor="end" height={50} interval={0} tick={{fontSize: '0.75rem'}}/>
                      <YAxis type="number" domain={[0,1]} tickCount={2} tickFormatter={(value) => value === 1 ? 'Hadir' : 'Absen'} allowDecimals={false}/>
                      <Tooltip 
                        formatter={(value: number, name: string, props: any) => [props.payload.Kehadiran === 1 ? 'Hadir' : 'Absen', `Tgl ${props.payload.name}`]}
                        contentStyle={{
                          background: "hsl(var(--background))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Legend formatter={(value) => value === 'Kehadiran' ? 'Status Kehadiran' : value} />
                      <Bar dataKey="Kehadiran" fill="hsl(var(--chart-2))" barSize={15} name="Status Kehadiran"/>
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

    