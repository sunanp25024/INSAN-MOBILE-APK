
'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import type { KurirAttendancePageData, KurirPerformancePageData, AttendanceRecord, KurirDailyTaskDoc } from '@/types';
import { format, subDays, startOfWeek, parseISO, isValid } from 'date-fns';
import { admin } from '@/lib/firebaseAdmin';

function serializeData(doc: admin.firestore.DocumentData): any {
    const data = doc.data();
    if (!data) return null;

    const serialized: { [key: string]: any } = { id: doc.id };
    for (const key in data) {
        const value = data[key];
        if (value instanceof admin.firestore.Timestamp) {
            serialized[key] = value.toDate().toISOString();
        } else {
            serialized[key] = value;
        }
    }
    return serialized;
}

export async function getKurirAttendancePageData(kurirUid: string): Promise<KurirAttendancePageData> {
    if (!kurirUid) {
        throw new Error("Kurir UID is required.");
    }
    const todayISO = format(new Date(), 'yyyy-MM-dd');
    let todayRecord: AttendanceRecord | null = null;
    const history: AttendanceRecord[] = [];

    const attendanceColRef = adminDb.collection('attendance');
    const todayDocRef = attendanceColRef.doc(`${kurirUid}_${todayISO}`);
    const sixtyDaysAgo = subDays(new Date(), 60);

    const [todayDocSnap, historyQuerySnap] = await Promise.all([
        todayDocRef.get(),
        attendanceColRef.where('kurirUid', '==', kurirUid).get()
    ]);

    if (todayDocSnap.exists) {
        todayRecord = serializeData(todayDocSnap) as AttendanceRecord;
    } else {
        todayRecord = { 
            id: `${kurirUid}_${todayISO}`,
            kurirUid,
            kurirId: '', 
            kurirName: '',
            date: todayISO, 
            status: 'Not Checked In' 
        };
    }
    
    historyQuerySnap.forEach(doc => {
        const record = serializeData(doc) as AttendanceRecord;
        if (record && isValid(parseISO(record.date)) && parseISO(record.date) >= sixtyDaysAgo) {
            history.push(record);
        }
    });

    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
        todayRecord,
        history,
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

    const dailyTasks: KurirDailyTaskDoc[] = tasksSnapshot.docs
        .map(doc => serializeData(doc) as KurirDailyTaskDoc)
        .filter(task => task && isValid(parseISO(task.date)) && parseISO(task.date) >= ninetyDaysAgo && task.taskStatus === 'completed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const attendanceRecords: AttendanceRecord[] = attendanceSnapshot.docs
        .map(doc => serializeData(doc) as AttendanceRecord)
        .filter(record => record && isValid(parseISO(record.date)) && parseISO(record.date) >= ninetyDaysAgo);

    const dailyPerformance = dailyTasks.map(task => ({
        date: task.date,
        totalDelivered: task.finalDeliveredCount || 0,
        totalPending: task.finalPendingReturnCount || 0,
        successRate: task.totalPackages > 0 ? ((task.finalDeliveredCount || 0) / task.totalPackages) * 100 : 0,
    }));

    const weeklyPerformanceMap = new Map<string, { delivered: number, pending: number }>();
    dailyTasks.forEach(task => {
        const taskDate = parseISO(task.date);
        const weekStart = startOfWeek(taskDate, { weekStartsOn: 1 });
        const weekLabel = `W-${format(weekStart, 'W')}`;
        const existing = weeklyPerformanceMap.get(weekLabel) || { delivered: 0, pending: 0 };
        existing.delivered += task.finalDeliveredCount || 0;
        existing.pending += task.finalPendingReturnCount || 0;
        weeklyPerformanceMap.set(weekLabel, existing);
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

    return {
        daily: dailyPerformance,
        weekly: weeklyPerformance,
        attendance: { totalAttendanceDays, totalWorkingDays, attendanceRate },
        overall: overall,
    };
}
