
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MailCheck, CheckCircle, XCircle, AlertCircle, Hourglass } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ApprovalRequest, UserProfile } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';


const StatusIcon = ({ status }: { status: ApprovalRequest['status'] }) => {
  switch (status) {
    case 'pending':
      return <Hourglass className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0" />;
    case 'approved':
      return <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />;
    case 'rejected':
      return <XCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />;
    default:
      return <AlertCircle className="h-5 w-5 text-muted-foreground mr-3 flex-shrink-0" />;
  }
};


export default function PendingApprovalsPage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
      const user = JSON.parse(userDataString) as UserProfile;
      setCurrentUser(user);
      if (user.role === 'Admin') {
        fetchRequests(user.uid);
      } else {
        setIsLoading(false);
      }
    } else {
        setIsLoading(false);
    }
  }, []);

  const fetchRequests = async (adminUid: string) => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "approval_requests"), 
        where("requestedByUid", "==", adminUid)
      );
      const querySnapshot = await getDocs(q);
      const fetchedRequests: ApprovalRequest[] = [];
      querySnapshot.forEach((doc) => {
        fetchedRequests.push({ id: doc.id, ...doc.data() } as ApprovalRequest);
      });
       // Sort on the client-side to avoid needing a composite index
      const sortedRequests = fetchedRequests.sort((a, b) => {
        const timeA = (a.requestTimestamp as Timestamp)?.toMillis() || 0;
        const timeB = (b.requestTimestamp as Timestamp)?.toMillis() || 0;
        return timeB - timeA;
      });
      setRequests(sortedRequests);
    } catch (error) {
      console.error("Error fetching pending approvals: ", error);
      toast({ title: "Error", description: "Gagal memuat daftar status persetujuan.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return <div className="text-center p-8">Memuat data...</div>;
  }
  
  if (currentUser?.role !== 'Admin') {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-destructive">
            <MailCheck className="mr-3 h-7 w-7" />
            Akses Ditolak
          </CardTitle>
          <CardDescription>
            Halaman ini hanya untuk Admin.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <MailCheck className="mr-3 h-7 w-7" />
            Status Persetujuan Saya
          </CardTitle>
          <CardDescription>
            Lihat status permintaan perubahan data yang telah Anda ajukan kepada MasterAdmin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((req) => (
                <Card key={req.id} className="p-4 bg-card-foreground/5">
                  <div className="flex items-start">
                    <StatusIcon status={req.status} />
                    <div className="flex-grow">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-1">
                        <h3 className="text-md font-semibold text-foreground">
                          {req.type} - {req.targetEntityName || req.payload.fullName}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            req.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{req.notesFromRequester || 'Tidak ada catatan pengajuan.'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Diajukan pada: {(req.requestTimestamp as Timestamp)?.toDate().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {req.notesFromHandler && (
                        <p className="text-xs text-primary italic mt-1">Catatan MasterAdmin: {req.notesFromHandler}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
             <div className="text-center py-8">
              <MailCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-lg text-muted-foreground">Belum ada permintaan yang diajukan.</p>
              <p className="text-sm text-muted-foreground">Semua permintaan persetujuan Anda akan muncul di sini.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
