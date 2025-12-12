
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ApprovalRequest, UserProfile } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { handleApprovalRequest } from '@/lib/firebaseAdminActions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ApprovalsPage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for rejection dialog
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [selectedRequestForRejection, setSelectedRequestForRejection] = useState<ApprovalRequest | null>(null);

  useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
      const user = JSON.parse(userDataString) as UserProfile;
      setCurrentUser(user);
      if (['MasterAdmin', 'Admin'].includes(user.role)) {
        fetchRequests();
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "approval_requests"), where("status", "==", "pending"));
      const querySnapshot = await getDocs(q);
      const fetchedRequests: ApprovalRequest[] = [];
      querySnapshot.forEach((doc) => {
        fetchedRequests.push({ id: doc.id, ...doc.data() } as ApprovalRequest);
      });
      setRequests(fetchedRequests.sort((a, b) => (b.requestTimestamp as Timestamp).toMillis() - (a.requestTimestamp as Timestamp).toMillis()));
    } catch (error) {
      console.error("Error fetching approval requests: ", error);
      toast({ title: "Error", description: "Gagal memuat permintaan persetujuan.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const processApproval = async (requestId: string, decision: 'approved' | 'rejected', notes?: string) => {
    if (!currentUser || !['MasterAdmin', 'Admin'].includes(currentUser.role)) {
        toast({ title: "Akses Ditolak", description: "Anda tidak punya izin untuk aksi ini.", variant: "destructive" });
        return;
    }
    
    setIsSubmitting(true);
    const handlerProfile = { uid: currentUser.uid, name: currentUser.fullName, role: currentUser.role };
    const result = await handleApprovalRequest(requestId, decision, handlerProfile, notes);
    
    if (result.success) {
        toast({ title: "Sukses", description: `Permintaan telah berhasil di-${decision}.` });
        fetchRequests(); // Refresh the list
    } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setIsSubmitting(false);
    
    // Close dialog if it was open
    if(isRejectDialogOpen) {
        setIsRejectDialogOpen(false);
        setRejectionNotes('');
        setSelectedRequestForRejection(null);
    }
  };

  const openRejectDialog = (request: ApprovalRequest) => {
    setSelectedRequestForRejection(request);
    setIsRejectDialogOpen(true);
  };
  
  const handleConfirmRejection = () => {
    if(selectedRequestForRejection) {
        processApproval(selectedRequestForRejection.id, 'rejected', rejectionNotes);
    }
  };

  if (isLoading) {
    return <div className="text-center p-8">Memuat permintaan...</div>;
  }
  
  if (!currentUser || !['MasterAdmin', 'Admin'].includes(currentUser.role)) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-destructive">
            <ShieldCheck className="mr-3 h-7 w-7" />
            Akses Ditolak
          </CardTitle>
          <CardDescription>
            Halaman ini hanya untuk MasterAdmin dan Admin.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  const renderRequestDetails = (req: ApprovalRequest) => {
    const { type, payload, oldPayload } = req;
    switch(type) {
        case 'NEW_USER_BULK':
            return (
                <div className="overflow-x-auto">
                    <p className="font-semibold mb-2">Daftar Pengguna Baru yang Diajukan:</p>
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Nama</TableHead>
                                <TableHead>NIK</TableHead>
                                <TableHead>Jabatan</TableHead>
                                <TableHead>Lokasi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.isArray(payload.users) && payload.users.map((user: any, index: number) => (
                                <TableRow key={index}>
                                    <TableCell>{user.fullName}</TableCell>
                                    <TableCell>{user.nik}</TableCell>
                                    <TableCell>{user.jabatan}</TableCell>
                                    <TableCell>{user.workLocation}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )
        case 'NEW_USER_ADMIN':
        case 'NEW_USER_PIC':
        case 'NEW_USER_KURIR':
            return Object.entries(payload)
                .filter(([key]) => key !== 'passwordValue' && key !== 'createdBy')
                .map(([key, value]) => <p key={key}><strong>{key}:</strong> {String(value)}</p>);
        case 'UPDATE_USER_PROFILE':
            return (
                <>
                    {Object.entries(payload).map(([key, value]) => {
                        if (key === 'updatedAt' || key === 'updatedBy') return null;
                        const oldValue = oldPayload ? oldPayload[key] : 'N/A';
                        return (<p key={key}><strong>{key}:</strong> <span className="line-through text-muted-foreground">{String(oldValue)}</span> &rarr; <span className="text-primary">{String(value)}</span></p>);
                    })}
                </>
            );
        case 'ACTIVATE_USER':
        case 'DEACTIVATE_USER':
            return <p><strong>Status Baru:</strong> {payload.status}</p>
        case 'DELETE_USER':
            return (
                <>
                    <p><strong>UID:</strong> {payload.uid}</p>
                    <p><strong>ID Aplikasi:</strong> {payload.id}</p>
                    <p><strong>Nama Lengkap:</strong> {payload.fullName}</p>
                    <p><strong>Role:</strong> {payload.role}</p>
                    <p className="text-destructive font-semibold mt-2">Permintaan ini akan menghapus pengguna secara permanen.</p>
                </>
            );
        default:
            return <p>Detail tidak tersedia untuk tipe permintaan ini.</p>
    }
  }


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <ShieldCheck className="mr-3 h-7 w-7" />
            Persetujuan Perubahan Data
          </CardTitle>
          <CardDescription>
            Tinjau dan setujui atau tolak permintaan perubahan data yang diajukan oleh PIC.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((req) => (
                <Card key={req.id} className="bg-card-foreground/5 p-4">
                  <h3 className="text-md font-semibold text-foreground mb-1">
                    {req.type} - {req.targetEntityName || req.payload.fullName || `Impor Massal ${req.payload?.users?.length || 0} Pengguna`}
                  </h3>
                  <div className="text-sm space-y-0.5 mb-3">
                    <p><strong>Diajukan oleh:</strong> {req.requestedByName} ({req.requestedByRole})</p>
                    <p><strong>Tanggal Diajukan:</strong> {(req.requestTimestamp as Timestamp)?.toDate().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    <div className="mt-2 p-2 border rounded-md bg-background text-xs">
                        {renderRequestDetails(req)}
                    </div>
                  </div>
                  <div className="mt-3 space-x-2">
                    <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => processApproval(req.id, 'approved')} disabled={isSubmitting}>
                      <CheckCircle className="mr-2 h-4 w-4" />Setujui
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => openRejectDialog(req)} disabled={isSubmitting}>
                        <XCircle className="mr-2 h-4 w-4" />Tolak
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-lg text-muted-foreground">Tidak ada permintaan persetujuan saat ini.</p>
              <p className="text-sm text-muted-foreground">Semua permintaan telah diproses atau belum ada yang masuk.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Rejection Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Tolak Permintaan Persetujuan</DialogTitle>
                <DialogDescription>
                    Berikan alasan penolakan. Catatan ini akan terlihat oleh pengguna yang mengajukan.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="rejectionNotes">Catatan Penolakan (Opsional)</Label>
                <Textarea id="rejectionNotes" value={rejectionNotes} onChange={(e) => setRejectionNotes(e.target.value)} placeholder="Contoh: Data NIK tidak valid, harap periksa kembali." />
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">Batal</Button>
                </DialogClose>
                <Button type="button" variant="destructive" onClick={handleConfirmRejection} disabled={isSubmitting}>
                    {isSubmitting ? 'Memproses...' : 'Konfirmasi Tolak'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
