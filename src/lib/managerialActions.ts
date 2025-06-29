
'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import type { UserProfile } from '@/types';
import { admin } from '@/lib/firebaseAdmin';

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
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);

        // A collection group query is efficient for fetching all subcollection documents.
        // The orderBy clause is removed to prevent the FAILED_PRECONDITION error that
        // occurs when a composite index is required but not present. We will sort in-memory.
        const packagesSnapshot = await adminDb.collectionGroup('packages')
            .where('lastUpdateTime', '>=', admin.firestore.Timestamp.fromDate(dateLimit))
            .limit(2000) // Fetch more to sort and get the latest, as order is not guaranteed
            .get();

        if (packagesSnapshot.empty) {
            return [];
        }
        
        // To avoid fetching the parent task for each package (N+1 problem),
        // we gather all unique task IDs and fetch them in a single batch.
        const taskIds = new Set(packagesSnapshot.docs.map(doc => doc.ref.parent.parent!.id));
        const taskDocsRefs = Array.from(taskIds).map(id => adminDb.collection('kurir_daily_tasks').doc(id));
        
        if (taskDocsRefs.length === 0) {
            return [];
        }

        const taskDocs = await adminDb.getAll(...taskDocsRefs);
        const tasksMap = new Map();
        taskDocs.forEach(doc => {
            if (doc.exists) {
                tasksMap.set(doc.id, doc.data());
            }
        });

        // Now, combine package data with its corresponding parent task data.
        let aggregatedData = packagesSnapshot.docs.map(doc => {
            const packageData = serializeData(doc);
            const taskDocId = doc.ref.parent.parent!.id;
            const taskData = tasksMap.get(taskDocId);
            
            return {
                ...packageData,
                kurirUid: taskData?.kurirUid || 'N/A',
                kurirFullName: taskData?.kurirFullName || 'N/A',
                kurirId: taskData?.kurirId || 'N/A',
                date: taskData?.date || 'N/A',
                // Return-specific data lives on the task doc, so we attach it here.
                finalReturnProofPhotoUrl: taskData?.finalReturnProofPhotoUrl,
                finalReturnLeadReceiverName: taskData?.finalReturnLeadReceiverName,
            };
        }).filter(item => item.kurirId !== 'N/A'); // Ensure data consistency

        // Sort in-memory on the server to show the most recent items first.
        aggregatedData.sort((a, b) => {
            const timeA = a.lastUpdateTime ? new Date(a.lastUpdateTime).getTime() : 0;
            const timeB = b.lastUpdateTime ? new Date(b.lastUpdateTime).getTime() : 0;
            return timeB - timeA;
        });


        return aggregatedData.slice(0, 1000); // Return up to 1000 most recent records
    } catch (error: any) {
        console.error("[Server Action] Error aggregating delivery data:", error);
        // This error often indicates a missing composite index in Firestore.
        // The error message from Firebase is usually very helpful in creating it.
        throw new Error(`Gagal memuat data bukti pengiriman. Mungkin perlu membuat indeks komposit di Firestore untuk collection group 'packages' pada field 'lastUpdateTime'. Detail: ${error.message}`);
    }
}
