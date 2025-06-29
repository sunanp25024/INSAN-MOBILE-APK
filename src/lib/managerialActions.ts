'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import type { UserProfile } from '@/types';
import { admin } from '@/lib/firebaseAdmin';
import { format, subDays } from 'date-fns';

// Helper to serialize Firestore Timestamps, etc.
function serializeData(doc: admin.firestore.DocumentData | admin.firestore.QueryDocumentSnapshot): any {
    const data = doc.data();
    if (!data) return null;

    const serialized: { [key: string]: any } = { uid: doc.id, id: doc.id }; // Use doc.id for both uid and id if not present
    for (const key in data) {
        const value = data[key];
        if (value instanceof admin.firestore.Timestamp) {
            serialized[key] = value.toDate().toISOString();
        } else if (value instanceof admin.firestore.FieldValue || value === undefined) {
            serialized[key] = null; 
        } else {
            serialized[key] = value;
        }
    }
    return serialized;
}

export async function getAllKurirsForSelection(): Promise<{ uid: string; fullName: string; id: string }[]> {
    try {
        const q = adminDb.collection('users').where('role', '==', 'Kurir').orderBy('fullName', 'asc');
        const snapshot = await q.get();

        if (snapshot.empty) {
            return [];
        }

        const kurirs = snapshot.docs.map(doc => {
            const data = doc.data() as UserProfile;
            return {
                uid: doc.id, // The UID from Firebase Auth is the document ID
                fullName: data.fullName,
                id: data.id, // The application-specific ID
            };
        });

        return kurirs;

    } catch (error: any) {
        console.error("[Server Action] Error getting all kurirs for selection:", error);
        return [];
    }
}


export async function getAggregatedDeliveryData(days: number = 90): Promise<any[]> {
    try {
        const dateLimit = format(subDays(new Date(), days), 'yyyy-MM-dd');

        // Step 1: Query the parent collection 'kurir_daily_tasks' within the date range.
        const tasksQuery = adminDb.collection('kurir_daily_tasks').where('date', '>=', dateLimit);
        const tasksSnapshot = await tasksQuery.get();

        if (tasksSnapshot.empty) {
            return [];
        }

        // Step 2: For each task, create a promise to fetch its 'packages' subcollection.
        const packageFetchPromises = tasksSnapshot.docs.map(taskDoc =>
            taskDoc.ref.collection('packages').get().then(packageSnapshot => ({
                taskData: serializeData(taskDoc),
                packages: packageSnapshot.docs.map(pkgDoc => serializeData(pkgDoc))
            }))
        );

        // Step 3: Execute all promises in parallel.
        const results = await Promise.all(packageFetchPromises);

        // Step 4: Aggregate all packages into a single array, combining with parent data.
        let aggregatedData = results.flatMap(({ taskData, packages }) =>
            packages.map((packageData: any) => ({
                ...packageData,
                kurirUid: taskData?.kurirUid || 'N/A',
                kurirFullName: taskData?.kurirFullName || 'N/A',
                kurirId: taskData?.kurirId || 'N/A',
                date: taskData?.date || 'N/A',
                finalReturnProofPhotoUrl: taskData?.finalReturnProofPhotoUrl,
                finalReturnLeadReceiverName: taskData?.finalReturnLeadReceiverName,
            }))
        );

        // Step 5: Sort in-memory to show the most recent items first.
        aggregatedData.sort((a, b) => {
            const timeA = a.lastUpdateTime ? new Date(a.lastUpdateTime).getTime() : 0;
            const timeB = b.lastUpdateTime ? new Date(b.lastUpdateTime).getTime() : 0;
            return timeB - timeA;
        });

        // Limit the final result size.
        return aggregatedData.slice(0, 1000);

    } catch (error: any) {
        console.error("[Server Action] Error aggregating delivery data:", error);
        throw new Error(`Gagal memuat data bukti pengiriman. Detail: ${error.message}`);
    }
}
