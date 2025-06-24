
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
// Aliasing BarChart from recharts to avoid conflict with lucide-react's BarChart icon
import { ResponsiveContainer, BarChart as RechartsBarChart, LineChart, PieChart, Pie, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
// Importing icons, including BarChart icon from lucide-react
import { TrendingUp, Package, CheckCircle, Clock, UserCheck, CalendarDays, ChevronsUpDown, CalendarIcon as LucideCalendarIcon, AlertCircle, BarChart as BarChartIcon } from 'lucide-react';
import type { UserProfile, KurirDailyTaskDoc, AttendanceRecord } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfWeek, endOfWeek, parseISO, startOfDay, subDays } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

// Interface for the processed performance data
interface PerformanceData {
  daily: { date: string; totalDelivered: number; totalPending: number; successRate: number; }[];
  weekly: { weekLabel: string; delivered: number; pending: number; }[];
  attendance: { totalAttendanceDays: number; totalWorkingDays: number; attendanceRate: number; };
  overall: { totalPackagesEver: number; totalSuccessfulDeliveriesEver: number; };
}

export default function PerformancePage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
      try {
        const user = JSON.parse(userDataString) as UserProfile;
        setCurrentUser(user);
      } catch (error) { 
        console.error("Error parsing user data for performance page", error); 
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchPerformanceData = async () => {
      setIsLoading(true);
      try {
        const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd');
        
        // Fetch daily task data for the last 90 days for performance calculation
        const tasksQuery = query(
          collection(db, "kurir_daily_tasks"),
          where("kurirUid", "==", currentUser.uid),
          where("date", ">=", ninetyDaysAgo),
          where("taskStatus", "==", "completed"),
          orderBy("date", "desc")
        );
        const tasksSnapshot = await getDocs(tasksQuery);
        const dailyTasks: KurirDailyTaskDoc[] = tasksSnapshot.docs.map(doc => doc.data() as KurirDailyTaskDoc);

        // Fetch attendance data for the last 90 days
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("kurirUid", "==", currentUser.uid),
          where("date", ">=", ninetyDaysAgo)
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceRecords: AttendanceRecord[] = attendanceSnapshot.docs.map(doc => doc.data() as AttendanceRecord);

        // Process data
        const dailyPerformance = dailyTasks.map(task => ({
          date: task.date,
          totalDelivered: task.finalDeliveredCount || 0,
          totalPending: task.finalPendingReturnCount || 0,
          successRate: task.totalPackages > 0 ? ((task.finalDeliveredCount || 0) / task.totalPackages) * 100 : 0,
        }));

        const weeklyPerformanceMap = new Map<string, { delivered: number, pending: number }>();
        dailyTasks.forEach(task => {
          try {
            const taskDate = parseISO(task.date);
            const weekStart = startOfWeek(taskDate, { weekStartsOn: 1 });
            const weekLabel = `W-${format(weekStart, 'W')}`;
            
            const existing = weeklyPerformanceMap.get(weekLabel) || { delivered: 0, pending: 0 };
            existing.delivered += task.finalDeliveredCount || 0;
            existing.pending += task.finalPendingReturnCount || 0;
            weeklyPerformanceMap.set(weekLabel, existing);
          } catch (e) {
            console.warn(`Could not parse date for weekly performance: ${task.date}`, e)
          }
        });

        const weeklyPerformance = Array.from(weeklyPerformanceMap.entries())
            .map(([weekLabel, data]) => ({ weekLabel, ...data }))
            .sort((a, b) => a.weekLabel.localeCompare(b.weekLabel));

        const totalAttendanceDays = attendanceRecords.filter(rec => rec.status === 'Present' || rec.status === 'Late').length;
        const totalWorkingDays = dailyTasks.length; 
        const attendanceRate = totalWorkingDays > 0 ? (totalAttendanceDays / totalWorkingDays) * 100 : 0;
        
        const overall = dailyTasks.reduce((acc, task) => {
            acc.totalPackagesEver += task.totalPackages || 0;
            acc.totalSuccessfulDeliveriesEver += task.finalDeliveredCount || 0;
            return acc;
        }, { totalPackagesEver: 0, totalSuccessfulDeliveriesEver: 0 });

        setPerformanceData({
          daily: dailyPerformance,
          weekly: weeklyPerformance,
          attendance: { totalAttendanceDays, totalWorkingDays, attendanceRate },
          overall: overall,
        });

      } catch (error) {
        console.error("Error fetching performance data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPerformanceData();
  }, [currentUser]);

  const filteredDailyPerformance = useMemo(() => {
    if (!performanceData) return [];
    const thirtyDaysAgo = subDays(new Date(), 30);
    return performanceData.daily.filter(item => {
      try {
        const itemDate = parseISO(item.date);
        return itemDate >= thirtyDaysAgo;
      } catch (e) { return false; }
    }).map(d => ({...d, name: format(new Date(d.date), 'dd/MM')})).reverse();
  }, [performanceData]);

  const selectedDayPerformance = useMemo(() => {
    if (!selectedDate || !performanceData) return null;
    return performanceData.daily.find(p => p.date === format(selectedDate, 'yyyy-MM-dd'));
  }, [selectedDate, performanceData]);

  const successRateData = selectedDayPerformance ? [
    { name: 'Terkirim', value: selectedDayPerformance.totalDelivered, color: 'hsl(var(--chart-1))' },
    { name: 'Pending', value: selectedDayPerformance.totalPending, color: 'hsl(var(--chart-2))' },
  ] : [];

  if (isLoading || !currentUser) {
    // Skeleton loading UI
    return (
        <div className="space-y-6">
            <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader></Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card><CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader><CardContent><Skeleton className="h-7 w-1/2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader><CardContent><Skeleton className="h-7 w-1/2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader><CardContent><Skeleton className="h-7 w-1/2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader><CardContent><Skeleton className="h-7 w-1/2" /></CardContent></Card>
            </div>
            <Card><CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader><CardContent className="h-[300px]"><Skeleton className="h-full w-full" /></CardContent></Card>
        </div>
    );
  }

  if (currentUser.role !== 'Kurir') {
    // Role check UI
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center"><AlertCircle className="mr-2 h-6 w-6"/>Akses Terbatas</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Halaman performa pengiriman hanya tersedia untuk peran Kurir.</p>
        </CardContent>
      </Card>
    );
  }
  
  const overallSuccessRate = (performanceData?.overall.totalPackagesEver ?? 0) > 0 ? (performanceData!.overall.totalSuccessfulDeliveriesEver / performanceData!.overall.totalPackagesEver * 100) : 0;

  // Main page content
  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center"><TrendingUp className="mr-2 h-6 w-6"/>Performa Pengiriman</CardTitle>
          <CardDescription>Analisis performa pengiriman paket Anda.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paket (90 Hari)</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(performanceData?.overall.totalPackagesEver || 0).toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Terkirim (90 Hari)</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(performanceData?.overall.totalSuccessfulDeliveriesEver || 0).toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">
              {overallSuccessRate.toFixed(1)}% sukses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Kehadiran</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(performanceData?.attendance.attendanceRate || 0).toFixed(1)}%</div>
             <p className="text-xs text-muted-foreground">
              {performanceData?.attendance.totalAttendanceDays} dari {performanceData?.attendance.totalWorkingDays} hari kerja
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Periode Data</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">90 Hari Terakhir</div>
            <p className="text-xs text-muted-foreground">Data performa yang ditampilkan</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <CardTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-primary"/> Performa Harian</CardTitle>
                    <CardDescription>Pilih tanggal untuk melihat detail performa harian.</CardDescription>
                </div>
                 <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className="w-full sm:w-auto justify-start text-left font-normal mt-2 sm:mt-0"
                    >
                        <LucideCalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP", { locale: indonesiaLocale }) : <span>Pilih tanggal</span>}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {setSelectedDate(date); setIsCalendarOpen(false);}}
                        initialFocus
                        locale={indonesiaLocale}
                        disabled={(date) => date > new Date() || date < new Date(Date.now() - 90 * 86400000)} 
                    />
                    </PopoverContent>
                </Popover>
            </div>
        </CardHeader>
        <CardContent>
          {selectedDayPerformance ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <h3 className="text-lg font-semibold mb-1">Ringkasan untuk {format(parseISO(selectedDayPerformance.date), "PPP", { locale: indonesiaLocale })}</h3>
                <p>Total Paket Terkirim: <strong className="text-green-500">{selectedDayPerformance.totalDelivered}</strong></p>
                <p>Total Paket Pending: <strong className="text-red-500">{selectedDayPerformance.totalPending}</strong></p>
                <p>Rate Sukses: <strong className="text-primary">{selectedDayPerformance.successRate.toFixed(1)}%</strong></p>
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={successRateData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                        {successRateData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))", borderRadius: "var(--radius)" }}/>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">{selectedDate ? 'Tidak ada data pengiriman selesai untuk tanggal ini.' : 'Pilih tanggal untuk melihat detail performa.'}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><BarChartIcon className="mr-2 h-5 w-5 text-primary"/> Grafik Pengiriman (Rentang 30 Hari)</CardTitle>
          <CardDescription>Menampilkan performa pengiriman Anda selama 30 hari terakhir.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          {filteredDailyPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={filteredDailyPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                <XAxis dataKey="name" tick={{fontSize: '0.65rem'}} interval="preserveStartEnd" height={50} angle={-30} textAnchor="end" />
                <YAxis tick={{fontSize: '0.75rem'}} />
                <Tooltip
                  contentStyle={{
                      background: "hsl(var(--background))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      fontSize: "0.8rem",
                      padding: "0.5rem"
                  }}
                />
                <Legend wrapperStyle={{fontSize: "0.8rem"}}/>
                <Bar dataKey="totalDelivered" name="Terkirim" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]}/>
                <Bar dataKey="totalPending" name="Pending" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]}/>
              </RechartsBarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">Tidak ada data untuk ditampilkan.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-primary"/> Grafik Pengiriman Mingguan</CardTitle>
          <CardDescription>Tren pengiriman paket selama beberapa minggu terakhir.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          {performanceData && performanceData.weekly.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData.weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                <XAxis dataKey="weekLabel" tick={{fontSize: '0.75rem'}} />
                <YAxis tick={{fontSize: '0.75rem'}}/>
                <Tooltip 
                  contentStyle={{
                      background: "hsl(var(--background))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      fontSize: "0.8rem",
                      padding: "0.5rem"
                  }}
                />
                <Legend wrapperStyle={{fontSize: "0.8rem"}}/>
                <Line type="monotone" dataKey="delivered" name="Terkirim" stroke="hsl(var(--chart-1))" strokeWidth={2} activeDot={{ r: 6 }}/>
                <Line type="monotone" dataKey="pending" name="Pending" stroke="hsl(var(--chart-2))" strokeWidth={2} activeDot={{ r: 6 }}/>
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">Tidak cukup data untuk tren mingguan.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
