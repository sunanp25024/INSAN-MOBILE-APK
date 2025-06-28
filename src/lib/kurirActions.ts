
'use server';

import { admin, adminDb } from '@/lib/firebaseAdmin';
import type { KurirAttendancePageData, KurirPerformancePageData, AttendanceRecord, KurirDailyTaskDoc, PackageItem, DashboardData, UserProfile, DashboardSummaryData } from '@/types';
import { format, subDays, startOfWeek, parseISO, isValid, getWeek } from 'date-fns';

function serializeData(doc: admin.firestore.DocumentData | admin.firestore.QueryDocumentSnapshot): any {
    const data = doc.data();
    if (!data) return null;

    const serialized: { [key: string]: any } = { id: doc.id };
    for (const key in data) {
        const value = data[key];
        if (value instanceof admin.firestore.Timestamp) {
            serialized[key] = value.toDate().toISOString();
        } else if (value instanceof admin.firestore.FieldValue) {
            serialized[key] = null;
        }
        else {
            serialized[key] = value;
        }
    }
    return serialized;
}

export async function getDashboardData(uid: string, role: string): Promise<DashboardData> {
    try {
        if (role === 'Kurir') {
            const todayDateString = format(new Date(), 'yyyy-MM-dd');
            const attendanceDocId = `${uid}_${todayDateString}`;
            const attendanceDoc = await adminDb.collection("attendance").doc(attendanceDocId).get();
            const isCheckedIn = attendanceDoc.exists && attendanceDoc.data()?.checkInTime;

            const dailyTaskRef = adminDb.collection("kurir_daily_tasks").doc(`${uid}_${todayDateString}`);
            const taskSnap = await dailyTaskRef.get();
            let taskData: KurirDailyTaskDoc | null = null;
            let packages: PackageItem[] = [];
            let photoMap: Record<string, string> = {};

            if (taskSnap.exists) {
                taskData = serializeData(taskSnap);
                const packagesSnapshot = await dailyTaskRef.collection("packages").get();
                packages = packagesSnapshot.docs.map(serializeData);
                packages.forEach(p => {
                    if (p.status === 'delivered' && p.deliveryProofPhotoUrl) {
                        photoMap[p.id] = p.deliveryProofPhotoUrl;
                    }
                });
            }

            return {
                kurirData: {
                    isCheckedIn: !!isCheckedIn,
                    taskData,
                    packages,
                    photoMap
                }
            };
        } else {
            const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd');
            
            const attendanceQuery = adminDb.collection('attendance').where('date', '>=', ninetyDaysAgo);
            const workSummaryQuery = adminDb.collection('kurir_daily_tasks').where('date', '>=', ninetyDaysAgo);
            const usersQuery = adminDb.collection('users').where('role', '==', 'Kurir');

            const [attendanceSnapshot, workSummarySnapshot, usersSnapshot] = await Promise.all([
                attendanceQuery.get(),
                workSummaryQuery.get(),
                usersQuery.get()
            ]);

            const attendanceRecords = attendanceSnapshot.docs.map(doc => serializeData(doc) as AttendanceRecord);
            const workRecords = workSummarySnapshot.docs.map(doc => serializeData(doc) as KurirDailyTaskDoc);
            const userProfiles = usersSnapshot.docs.map(doc => serializeData(doc) as UserProfile);

            return {
                managerialData: {
                    attendanceRecords,
                    workRecords,
                    userProfiles
                }
            };
        }
    } catch (error: any) {
        console.error(`[Server Action] Error getting dashboard data for UID ${uid} and role ${role}:`, error);
        return { error: 'Gagal memuat data dashboard dari server.' };
    }
}

export async function getKurirAttendancePageData(kurirUid: string): Promise<KurirAttendancePageData> {
    if (!kurirUid) {
        throw new Error("Kurir UID is required.");
    }
    const todayISO = format(new Date(), 'yyyy-MM-dd');
    let todayRecord: AttendanceRecord | null = null;
    const history: AttendanceRecord[] = [];

    const attendanceColRef = adminDb.collection('attendance');
    
    const historyQuerySnap = await attendanceColRef.where('kurirUid', '==', kurirUid).get();

    historyQuerySnap.forEach(doc => {
        const record = serializeData(doc) as AttendanceRecord;
        history.push(record);
    });

    const todayDocFromHistory = history.find(rec => rec.date === todayISO);

    if (todayDocFromHistory) {
        todayRecord = todayDocFromHistory;
    } else {
        const userDoc = await adminDb.collection('users').doc(kurirUid).get();
        const userData = userDoc.data();
        todayRecord = { 
            id: `${kurirUid}_${todayISO}`,
            kurirUid,
            kurirId: userData?.id || '', 
            kurirName: userData?.fullName || '',
            date: todayISO, 
            status: 'Not Checked In' 
        };
    }
    
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const sixtyDaysAgo = subDays(new Date(), 60);
    const filteredHistory = history.filter(rec => {
        if (!rec.date || !isValid(parseISO(rec.date))) return false;
        return parseISO(rec.date) >= sixtyDaysAgo;
    });

    return {
        todayRecord,
        history: filteredHistory,
    };
}

export async function getKurirPerformanceData(kurirUid: string): Promise<KurirPerformancePageData> {
     if (!kurirUid) {
        throw new Error("Kurir UID is required.");
    }
    
    const ninetyDaysAgo = subDays(new Date(), 90);

    const tasksQuery = adminDb.collection("kurir_daily_tasks").where("kurirUid", "==", kurirUid);
    const attendanceQuery = adminDb.collection("attendance").where("kurirUid", "==", kurirUid);
    
    const [tasksSnapshot, attendanceSnapshot] = await Promise.all([
        tasksQuery.get(),
        attendanceQuery.get(),
    ]);

    const allTasks: KurirDailyTaskDoc[] = tasksSnapshot.docs.map(doc => serializeData(doc) as KurirDailyTaskDoc);
    const hasAnyTasksInPeriod = allTasks.some(task => task && task.date && isValid(parseISO(task.date)) && parseISO(task.date) >= ninetyDaysAgo);

    const dailyTasks: KurirDailyTaskDoc[] = allTasks
        .filter(task => {
            if (!task || !task.date || !isValid(parseISO(task.date))) return false;
            return parseISO(task.date) >= ninetyDaysAgo && task.taskStatus === 'completed';
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const attendanceRecords: AttendanceRecord[] = attendanceSnapshot.docs
        .map(doc => serializeData(doc) as AttendanceRecord)
        .filter(record => record && record.date && isValid(parseISO(record.date)) && parseISO(record.date) >= ninetyDaysAgo);

    const dailyPerformance = dailyTasks.map(task => ({
        date: task.date,
        totalDelivered: task.finalDeliveredCount || 0,
        totalPending: task.finalPendingReturnCount || 0,
        successRate: task.totalPackages > 0 ? ((task.finalDeliveredCount || 0) / task.totalPackages) * 100 : 0,
    }));

    const weeklyPerformanceMap = new Map<string, { delivered: number, pending: number }>();
    dailyTasks.forEach(task => {
        const taskDate = parseISO(task.date);
        if(!isValid(taskDate)) return;
        const weekNumber = getWeek(taskDate, { weekStartsOn: 1 });
        const weekLabel = `W-${weekNumber}`;
        const existing = weeklyPerformanceMap.get(weekLabel) || { delivered: 0, pending: 0 };
        existing.delivered += task.finalDeliveredCount || 0;
        existing.pending += task.finalPendingReturnCount || 0;
        weeklyPerformanceMap.set(weekLabel, existing);
    });

    const weeklyPerformance = Array.from(weeklyPerformanceMap.entries())
        .map(([weekLabel, data]) => ({ weekLabel, ...data }))
        .sort((a, b) => a.weekLabel.localeCompare(b.weekLabel));

    const totalAttendanceDays = attendanceRecords.filter(rec => rec.status === 'Present' || rec.status === 'Late').length;
    const totalWorkingDays = new Set(attendanceRecords.map(rec => rec.date)).size;
    const attendanceRate = totalWorkingDays > 0 ? (totalAttendanceDays / totalWorkingDays) * 100 : 0;
    
    const overall = dailyTasks.reduce((acc, task) => {
        acc.totalPackagesEver += task.totalPackages || 0;
        acc.totalSuccessfulDeliveriesEver += task.finalDeliveredCount || 0;
        return acc;
    }, { totalPackagesEver: 0, totalSuccessfulDeliveriesEver: 0 });

    return {
        daily: dailyPerformance,
        weekly: weeklyPerformance,
        attendance: { totalAttendanceDays, totalWorkingDays, attendanceRate },
        overall: overall,
        hasAnyTasksInPeriod,
    };
}
