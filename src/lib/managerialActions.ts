
'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import type { UserProfile } from '@/types';
import { admin } from '@/lib/firebaseAdmin';

// Helper to serialize Firestore Timestamps, etc.
function serializeData(doc: admin.firestore.DocumentData | admin.firestore.QueryDocumentSnapshot): any {
    const data = doc.data();
    if (!data) return null;

    const serialized: { [key: string]: any } = { uid: doc.id };
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
            const data = serializeData(doc) as UserProfile;
            return {
                uid: data.uid,
                fullName: data.fullName,
                id: data.id,
            };
        });

        return kurirs;

    } catch (error: any) {
        console.error("[Server Action] Error getting all kurirs for selection:", error);
        return [];
    }
}
