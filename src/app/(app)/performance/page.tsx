
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, BarChart, LineChart, PieChart, Pie, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { TrendingUp, Package, CheckCircle, AlertTriangle, Percent, Clock, UserCheck, CalendarDays, ChevronsUpDown, CalendarIcon, AlertCircle } from 'lucide-react';
import type { DailyPerformance, WeeklyPerformancePoint, UserProfile } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const mockDailyPerformance: DailyPerformance[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - i);
  const delivered = Math.floor(Math.random() * 50) + 20; 
  const pending = Math.floor(Math.random() * 10);       
  return {
    date: date.toISOString(),
    totalDelivered: delivered,
    totalPending: pending,
    successRate: (delivered / (delivered + pending)) * 100,
  };
}).reverse(); 

const mockWeeklyPerformance: WeeklyPerformancePoint[] = [
  { weekLabel: "Minggu-1", delivered: 250, pending: 30 },
  { weekLabel: "Minggu-2", delivered: 280, pending: 25 },
  { weekLabel: "Minggu-3", delivered: 260, pending: 20 },
  { weekLabel: "Minggu-4", delivered: 300, pending: 15 },
];

const mockAttendanceSummary = {
  totalAttendanceDays: 20,
  totalWorkingDays: 22,
  attendanceRate: (20/22) * 100, 
};

const mockOverallStats = {
    totalPackagesEver: 5890,
    totalSuccessfulDeliveriesEver: 5500,
    avgDeliveryTime: "3 jam 15 mnt", 
};


export default function PerformancePage() {
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dateRange, setDateRange] = useState<{ from: Date | undefined, to: Date | undefined }>({ from: new Date(Date.now() - 7 * 86400000), to: new Date() });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
      try {
        setCurrentUser(JSON.parse(userDataString) as UserProfile);
      } catch (error) { console.error("Error parsing user data for performance page", error); }
    }
  }, []);

  const filteredDailyPerformance = mockDailyPerformance.filter(item => {
    const itemDate = new Date(item.date);
    const from = dateRange.from ? new Date(dateRange.from.setHours(0,0,0,0)) : null;
    const to = dateRange.to ? new Date(dateRange.to.setHours(23,59,59,999)) : null;
    if (from && itemDate < from) return false;
    if (to && itemDate > to) return false;
    return true;
  }).map(d => ({...d, name: format(new Date(d.date), 'dd/MM')}));


  const selectedDayPerformance = selectedDate 
    ? mockDailyPerformance.find(p => format(new Date(p.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')) 
    : null;

  const successRateData = selectedDayPerformance ? [
    { name: 'Terkirim', value: selectedDayPerformance.totalDelivered, color: 'hsl(var(--chart-1))' },
    { name: 'Pending', value: selectedDayPerformance.totalPending, color: 'hsl(var(--chart-2))' },
  ] : [];

  if (!currentUser) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (currentUser.role !== 'Kurir') {
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
            <CardTitle className="text-sm font-medium">Total Paket (All Time)</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockOverallStats.totalPackagesEver.toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Terkirim (All Time)</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockOverallStats.totalSuccessfulDeliveriesEver.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">
              {(mockOverallStats.totalSuccessfulDeliveriesEver / mockOverallStats.totalPackagesEver * 100).toFixed(1)}% sukses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Waktu Kirim</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockOverallStats.avgDeliveryTime}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Kehadiran</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAttendanceSummary.attendanceRate.toFixed(1)}%</div>
             <p className="text-xs text-muted-foreground">
              {mockAttendanceSummary.totalAttendanceDays} dari {mockAttendanceSummary.totalWorkingDays} hari kerja
            </p>
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
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {setSelectedDate(date); setIsCalendarOpen(false);}}
                        initialFocus
                        locale={id}
                        disabled={(date) => date > new Date() || date < new Date(Date.now() - 30 * 86400000)} 
                    />
                    </PopoverContent>
                </Popover>
            </div>
        </CardHeader>
        <CardContent>
          {selectedDayPerformance ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <h3 className="text-lg font-semibold mb-1">Ringkasan untuk {format(new Date(selectedDayPerformance.date), "PPP", { locale: id })}</h3>
                <p>Total Paket Terkirim: <strong className="text-green-400">{selectedDayPerformance.totalDelivered}</strong></p>
                <p>Total Paket Pending: <strong className="text-red-400">{selectedDayPerformance.totalPending}</strong></p>
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
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Pilih tanggal untuk melihat detail performa.</p>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5 text-primary"/> Grafik Pengiriman (Rentang Tanggal)</CardTitle>
          <CardDescription>Default: 7 hari terakhir. Pilih rentang untuk kustomisasi.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredDailyPerformance}>
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
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><LineChart className="mr-2 h-5 w-5 text-primary"/> Grafik Pengiriman Mingguan</CardTitle>
          <CardDescription>Tren pengiriman paket selama 4 minggu terakhir.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockWeeklyPerformance}>
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
        </CardContent>
      </Card>
    </div>
  );
}
