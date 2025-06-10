
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { CheckCircle, XCircle, Clock, CalendarDays, BarChartHorizontalBig } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { AttendanceRecord } from '@/types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

// Mock data
const mockPastAttendance: AttendanceRecord[] = [
  { date: new Date(Date.now() - 86400000 * 3).toISOString(), checkInTime: '08:05', checkOutTime: '17:02', status: 'Present' },
  { date: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'Absent' },
  { date: new Date(Date.now() - 86400000 * 1).toISOString(), checkInTime: '07:58', checkOutTime: '17:10', status: 'Present' },
];

export default function AttendancePage() {
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>(mockPastAttendance);
  const { toast } = useToast();

  const todayISO = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Check if there's a record for today
    const existingRecord = attendanceHistory.find(rec => rec.date.startsWith(todayISO));
    if (existingRecord) {
      setTodayRecord(existingRecord);
    } else {
      setTodayRecord({ date: new Date().toISOString(), status: 'Absent' }); // Default to Absent if no record
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
      status: now.getHours() < 9 ? 'Present' : 'Late', // Example: Late if after 9 AM
    };
    setTodayRecord(newRecord);
    // Update history (in real app, this would be an API call)
    setAttendanceHistory(prev => {
      const existingIndex = prev.findIndex(rec => rec.date.startsWith(todayISO));
      if (existingIndex > -1) {
        const updatedHistory = [...prev];
        updatedHistory[existingIndex] = newRecord;
        return updatedHistory;
      }
      return [...prev, newRecord];
    });
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
      return [...prev, newRecord]; // Should not happen if check-in was done
    });
    toast({ title: "Check-Out Berhasil", description: `Anda check-out pukul ${newRecord.checkOutTime}.` });
  };

  const selectedRecord = attendanceHistory.find(rec => selectedDate && rec.date.startsWith(selectedDate.toISOString().split('T')[0]));

  // Calculate overall performance
  const totalDaysTracked = attendanceHistory.length;
  const presentDays = attendanceHistory.filter(r => r.status === 'Present' || r.status === 'Late').length;
  const attendanceRate = totalDaysTracked > 0 ? (presentDays / totalDaysTracked) * 100 : 0;
  
  // Prepare data for chart (last 7 days)
  const last7DaysAttendance = attendanceHistory.slice(-7).map(rec => ({
    name: new Date(rec.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
    Kehadiran: (rec.status === 'Present' || rec.status === 'Late') ? 1 : 0,
  }));


  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center"><Clock className="mr-2 h-6 w-6"/>Absensi Hari Ini</CardTitle>
          <CardDescription>Tanggal: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayRecord?.checkInTime ? (
            <Alert variant={todayRecord.status === 'Present' ? 'default' : todayRecord.status === 'Late' ? 'destructive': 'default'} className={todayRecord.status === 'Present' ? 'bg-green-500/10 border-green-500/30' : todayRecord.status === 'Late' ? 'bg-yellow-500/10 border-yellow-500/30' : ''}>
              <CheckCircle className={`h-4 w-4 ${todayRecord.status === 'Present' ? 'text-green-500' : 'text-yellow-500'}`} />
              <AlertTitle>Sudah Check-In pukul {todayRecord.checkInTime}</AlertTitle>
              <AlertDescription>Status Kehadiran: {todayRecord.status}</AlertDescription>
            </Alert>
          ) : (
            <Alert variant="default">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <AlertTitle>Belum Check-In</AlertTitle>
              <AlertDescription>Silakan lakukan check-in untuk memulai hari kerja Anda.</AlertDescription>
            </Alert>
          )}

          {todayRecord?.checkOutTime && (
            <Alert variant="default" className="bg-blue-500/10 border-blue-500/30">
              <CheckCircle className="h-4 w-4 text-blue-500" />
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
        <CardContent className="flex flex-col md:flex-row gap-4">
          <div className="flex justify-center md:justify-start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
            />
          </div>
          <div className="flex-1">
            {selectedDate && selectedRecord ? (
              <Card>
                <CardHeader>
                  <CardTitle>Detail Absensi: {selectedDate.toLocaleDateString('id-ID')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Status: <span className={`font-semibold ${selectedRecord.status === 'Present' ? 'text-green-400' : selectedRecord.status === 'Late' ? 'text-yellow-400' : 'text-red-400'}`}>{selectedRecord.status}</span></p>
                  {selectedRecord.checkInTime && <p>Check-In: {selectedRecord.checkInTime}</p>}
                  {selectedRecord.checkOutTime && <p>Check-Out: {selectedRecord.checkOutTime}</p>}
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
          <CardTitle className="text-xl text-primary flex items-center"><BarChartHorizontalBig className="mr-2 h-5 w-5"/>Performa Absensi Keseluruhan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span>Tingkat Kehadiran</span>
            <span className="font-bold text-primary">{attendanceRate.toFixed(1)}%</span>
          </div>
          <Progress value={attendanceRate} className="h-3" />
          <p className="text-sm text-muted-foreground">{presentDays} dari {totalDaysTracked} hari kerja.</p>
          
          <h4 className="font-semibold pt-4">Kehadiran 7 Hari Terakhir:</h4>
           <div className="h-[200px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7DaysAttendance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                <XAxis type="number" domain={[0,1]} tickFormatter={(value) => value === 1 ? 'Hadir' : 'Absen'} />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip formatter={(value) => value === 1 ? 'Hadir' : 'Absen'} />
                <Legend />
                <Bar dataKey="Kehadiran" fill="hsl(var(--primary))" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
