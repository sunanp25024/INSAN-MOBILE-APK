
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, UserCheck, UserRoundCheck, UserRoundX, Clock, Activity, PackageCheck, PackageX, AlertCircle } from 'lucide-react';
import type { UserProfile, AttendanceActivity, CourierWorkSummaryActivity } from '@/types';
import { formatDistanceToNow, subDays } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';

// Mock data (bisa diimpor atau didefinisikan di sini, atau diambil dari localStorage jika ada)
const mockAttendanceActivities: AttendanceActivity[] = [
  { id: 'att1', kurirName: 'Budi Santoso', kurirId: 'PISTEST2025', action: 'check-in', timestamp: subDays(new Date(), 0).setHours(7, 55, 0, 0).valueOf().toString(), location: 'Jakarta Pusat Hub (Thamrin)' },
  { id: 'att2', kurirName: 'Ani Yudhoyono', kurirId: 'KURIR002', action: 'check-in', timestamp: subDays(new Date(), 0).setHours(8, 5, 0, 0).valueOf().toString(), location: 'Bandung Kota Hub (Kota)' },
  { id: 'att3', kurirName: 'Charlie Van Houten', kurirId: 'KURIR003', action: 'reported-late', timestamp: subDays(new Date(), 0).setHours(9, 15, 0, 0).valueOf().toString(), location: 'Surabaya Timur Hub (Cawang)' },
  { id: 'att4', kurirName: 'Budi Santoso', kurirId: 'PISTEST2025', action: 'check-out', timestamp: subDays(new Date(), 0).setHours(17, 2, 0, 0).valueOf().toString(), location: 'Jakarta Pusat Hub (Thamrin)' },
  { id: 'att5', kurirName: 'Dewi Persik', kurirId: 'KURIR004', action: 'check-in', timestamp: subDays(new Date(), 0).setHours(8, 10, 0, 0).valueOf().toString(), location: 'Medan Barat Hub' },
  { id: 'att6', kurirName: 'Ani Yudhoyono', kurirId: 'KURIR002', action: 'check-out', timestamp: subDays(new Date(), 0).setHours(17, 30, 0, 0).valueOf().toString(), location: 'Bandung Kota Hub (Kota)' },
].sort((a,b) => parseInt(b.timestamp) - parseInt(a.timestamp));

const mockCourierWorkSummaries: CourierWorkSummaryActivity[] = [
  { id: 'sum1', kurirName: 'Budi Santoso', kurirId: 'PISTEST2025', hubLocation: 'Jakarta Pusat Hub (Thamrin)', timestamp: subDays(new Date(), 0).setHours(17, 5, 0, 0).valueOf().toString(), totalPackagesAssigned: 50, packagesDelivered: 48, packagesPendingOrReturned: 2 },
  { id: 'sum2', kurirName: 'Ani Yudhoyono', kurirId: 'KURIR002', hubLocation: 'Bandung Kota Hub (Kota)', timestamp: subDays(new Date(), 0).setHours(17, 30, 0, 0).valueOf().toString(), totalPackagesAssigned: 45, packagesDelivered: 40, packagesPendingOrReturned: 5 },
  { id: 'sum3', kurirName: 'Dewi Persik', kurirId: 'KURIR004', hubLocation: 'Medan Barat Hub', timestamp: subDays(new Date(), 1).setHours(18, 0, 0, 0).valueOf().toString(), totalPackagesAssigned: 55, packagesDelivered: 55, packagesPendingOrReturned: 0 },
].sort((a,b) => parseInt(b.timestamp) - parseInt(a.timestamp));


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

export default function CourierUpdatesPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [attendanceToday, setAttendanceToday] = useState<AttendanceActivity[]>([]);
  const [workSummariesToday, setWorkSummariesToday] = useState<CourierWorkSummaryActivity[]>([]);

  useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
      try {
        setCurrentUser(JSON.parse(userDataString) as UserProfile);
      } catch (error) { console.error("Error parsing user data", error); }
    }

    // Filter data for today (simplified for mock)
    const todayStart = new Date().setHours(0,0,0,0);
    const todayEnd = new Date().setHours(23,59,59,999);

    setAttendanceToday(
        mockAttendanceActivities.filter(act => {
            const actTime = parseInt(act.timestamp);
            return actTime >= todayStart && actTime <= todayEnd;
        })
    );
    setWorkSummariesToday(
        mockCourierWorkSummaries.filter(sum => {
             const sumTime = parseInt(sum.timestamp);
            return sumTime >= todayStart && sumTime <= todayEnd;
        })
    );
  }, []);

  if (!currentUser) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  if (currentUser.role !== 'PIC') {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center"><AlertCircle className="mr-2 h-6 w-6"/>Akses Terbatas</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Halaman ini hanya ditujukan untuk PIC.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <ListChecks className="mr-3 h-7 w-7" />
            Ringkasan Aktivitas & Absensi Kurir Harian
          </CardTitle>
          <CardDescription>
            Pantau ringkasan penyelesaian pekerjaan dan status absensi kurir untuk hari ini.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl"><PackageCheck className="mr-2 h-5 w-5 text-blue-500"/>Ringkasan Penyelesaian Kerja Hari Ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {workSummariesToday.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Belum ada kurir yang menyelesaikan pekerjaan hari ini.</p>
            ) : (
              workSummariesToday.map(summary => (
                <Card key={summary.id} className="p-4 bg-card-foreground/5">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <PackageCheck className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-grow">
                      <p className="font-semibold text-sm">{summary.kurirName} <span className="text-xs text-muted-foreground">({summary.kurirId})</span></p>
                      <p className="text-xs text-muted-foreground">Hub: {summary.hubLocation}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Selesai: <strong className="text-foreground">{summary.totalPackagesAssigned}</strong> paket dibawa, <strong className="text-green-500">{summary.packagesDelivered}</strong> terkirim, <strong className="text-red-500">{summary.packagesPendingOrReturned}</strong> retur/pending.
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {formatActivityTimestamp(summary.timestamp)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl"><UserCheck className="mr-2 h-5 w-5 text-green-500"/>Ringkasan Absensi Hari Ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {attendanceToday.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Belum ada aktivitas absensi hari ini.</p>
            ) : (
              attendanceToday.map(activity => (
                <Card key={activity.id} className="p-4 bg-card-foreground/5">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getAttendanceActionIcon(activity.action)}
                    </div>
                    <div className="flex-grow">
                      <p className="font-semibold text-sm">{activity.kurirName} <span className="text-xs text-muted-foreground">({activity.kurirId})</span></p>
                      <p className="text-sm text-muted-foreground">
                        {activity.action === 'check-in' ? 'Melakukan check-in' : activity.action === 'check-out' ? 'Melakukan check-out' : 'Melaporkan keterlambatan'}
                        {activity.location && <span className="text-xs"> di {activity.location}</span>}.
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {formatActivityTimestamp(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
