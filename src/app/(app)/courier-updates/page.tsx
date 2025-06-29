
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, UserCheck, UserRoundCheck, UserRoundX, Clock, Activity, PackageCheck, PackageX, AlertCircle } from 'lucide-react';
import type { UserProfile, AttendanceActivity, CourierWorkSummaryActivity, AttendanceRecord, KurirDailyTaskDoc } from '@/types';
import { format, formatDistanceToNow, startOfDay } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';


const formatActivityTimestamp = (timestamp: string): string => {
    try {
        const date = new Date(parseInt(timestamp));
        if (isNaN(date.getTime())) {
          return "Waktu tidak valid";
        }
        // Use a more user-friendly format for the timestamp
        const now = new Date();
        const differenceInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);

        if (differenceInMinutes < 60) {
          return formatDistanceToNow(date, { addSuffix: true, locale: indonesiaLocale });
        } else {
          return format(date, "HH:mm, dd MMM yyyy", { locale: indonesiaLocale });
        }
    } catch(e) {
        return "Waktu error";
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

export default function CourierUpdatesPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [attendanceActivities, setAttendanceActivities] = useState<AttendanceActivity[]>([]);
  const [workSummariesToday, setWorkSummariesToday] = useState<CourierWorkSummaryActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
      try {
        setCurrentUser(JSON.parse(userDataString) as UserProfile);
      } catch (error) { 
          console.error("Error parsing user data", error); 
          setIsLoading(false);
      }
    } else {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUser || !['PIC', 'Admin', 'MasterAdmin'].includes(currentUser.role)) {
        setIsLoading(false);
        return;
    };

    const fetchAllActivities = async () => {
        setIsLoading(true);
        try {
            const todayStr = format(new Date(), 'yyyy-MM-dd');

            // --- Fetch Attendance Activities ---
            const attendanceQuery = query(collection(db, 'attendance'), where('date', '==', todayStr));
            const attendanceSnapshot = await getDocs(attendanceQuery);
            
            const fetchedAttendanceActivities: AttendanceActivity[] = [];
            attendanceSnapshot.forEach(doc => {
                const record = doc.data() as AttendanceRecord;
                if (record.checkInTimestamp) {
                    fetchedAttendanceActivities.push({
                        id: `${doc.id}-check-in`, kurirName: record.kurirName, kurirId: record.kurirId,
                        action: record.status === 'Late' ? 'check-in-late' : 'check-in',
                        timestamp: (record.checkInTimestamp as Timestamp).toMillis().toString(),
                        location: record.workLocation || 'N/A'
                    });
                }
                if (record.checkOutTimestamp) {
                    fetchedAttendanceActivities.push({
                        id: `${doc.id}-check-out`, kurirName: record.kurirName, kurirId: record.kurirId,
                        action: 'check-out',
                        timestamp: (record.checkOutTimestamp as Timestamp).toMillis().toString(),
                        location: record.workLocation || 'N/A'
                    });
                }
            });
            setAttendanceActivities(fetchedAttendanceActivities.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp)));

            // --- Fetch Work Summary Activities ---
            const workSummaryQuery = query(
              collection(db, 'kurir_daily_tasks'), 
              where('date', '==', todayStr),
              where('taskStatus', '==', 'completed')
            );
            const workSummarySnapshot = await getDocs(workSummaryQuery);
            const fetchedWorkSummaries: CourierWorkSummaryActivity[] = [];

            workSummarySnapshot.forEach(doc => {
              const task = doc.data() as KurirDailyTaskDoc;
              if (task.finishTimestamp) {
                fetchedWorkSummaries.push({
                  id: doc.id,
                  kurirName: task.kurirFullName,
                  kurirId: task.kurirUid, // Using kurirUid as the identifier
                  hubLocation: "N/A", // This data isn't in kurir_daily_tasks, needs adjustment if required
                  timestamp: (task.finishTimestamp as Timestamp).toMillis().toString(),
                  totalPackagesAssigned: task.totalPackages,
                  packagesDelivered: task.finalDeliveredCount || 0,
                  packagesPendingOrReturned: task.finalPendingReturnCount || 0,
                });
              }
            });
            setWorkSummariesToday(fetchedWorkSummaries.sort((a,b) => parseInt(b.timestamp) - parseInt(a.timestamp)));

        } catch (error) {
            console.error("Error fetching activities:", error);
            toast({ title: "Error", description: "Gagal memuat aktivitas harian.", variant: "destructive"});
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchAllActivities();
    
  }, [currentUser, toast]);


  if (isLoading) {
      return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></CardContent>
              </Card>
              <Card>
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></CardContent>
              </Card>
          </div>
      );
  }
  
  if (!currentUser || !['PIC', 'Admin', 'MasterAdmin'].includes(currentUser.role)) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center"><AlertCircle className="mr-2 h-6 w-6"/>Akses Terbatas</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Halaman ini hanya ditujukan untuk PIC, Admin, dan MasterAdmin.</p>
        </CardContent>
      </Card>
    );
  }
  
  const getActionText = (action: AttendanceActivity['action']) => {
    switch(action) {
      case 'check-in': return 'Melakukan check-in';
      case 'check-in-late': return 'Melakukan check-in (Terlambat)';
      case 'check-out': return 'Melakukan check-out';
      default: return 'Melakukan aktivitas';
    }
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
            Pantau ringkasan penyelesaian pekerjaan dan status absensi kurir untuk hari ini secara real-time.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-xl"><PackageCheck className="mr-2 h-5 w-5 text-blue-500"/>Ringkasan Penyelesaian Kerja</CardTitle>
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
                      <p className="font-semibold text-sm">{summary.kurirName}</p>
                      <p className="text-xs text-muted-foreground">ID Kurir: {summary.kurirId}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Selesai: <strong className="text-foreground">{summary.totalPackagesAssigned}</strong> paket dibawa, <strong className="text-green-500">{summary.packagesDelivered}</strong> terkirim, <strong className="text-red-500">{summary.packagesPendingOrReturned}</strong> retur/pending.
                      </p>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">
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
            {attendanceActivities.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Belum ada aktivitas absensi hari ini.</p>
            ) : (
              attendanceActivities.map(activity => (
                <Card key={activity.id} className="p-4 bg-card-foreground/5">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getAttendanceActionIcon(activity.action)}
                    </div>
                    <div className="flex-grow">
                      <p className="font-semibold text-sm">{activity.kurirName} <span className="text-xs text-muted-foreground">({activity.kurirId})</span></p>
                      <p className="text-sm text-muted-foreground">
                        {getActionText(activity.action)}
                        {activity.location && activity.location !== 'N/A' && <span className="text-xs"> di {activity.location}</span>}.
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
