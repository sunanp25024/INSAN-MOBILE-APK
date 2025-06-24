
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, FileUp, UserPlus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, ApprovalRequest } from '@/types';
import { Switch } from '@/components/ui/switch';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createUserAccount } from '@/lib/firebaseAdminActions';

const picSchema = z.object({
  id: z.string().min(1, "ID PIC tidak boleh kosong").optional(), // App-specific ID
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  passwordValue: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal('')),
  workLocation: z.string().min(3, "Area tanggung jawab minimal 3 karakter"),
});

// For edit, password is not directly changed here.
const editPicSchema = picSchema.omit({ passwordValue: true });

type PICFormData = z.infer<typeof picSchema>;
type EditPICFormData = z.infer<typeof editPicSchema>;

export default function ManagePICsPage() {
  const { toast } = useToast();
  const [pics, setPics] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddPICDialogOpen, setIsAddPICDialogOpen] = useState(false);
  const [isEditPICDialogOpen, setIsEditPICDialogOpen] = useState(false);
  const [currentEditingPIC, setCurrentEditingPIC] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
      try {
        setCurrentUser(JSON.parse(userDataString) as UserProfile);
      } catch (error) { console.error("Error parsing user data for manage pics page", error); }
    }
  }, []);

  const fetchPICs = async () => {
    setIsLoading(true);
    setFirebaseError(null);
    try {
      const q = query(collection(db, "users"), where("role", "==", "PIC"));
      const querySnapshot = await getDocs(q);
      const picList: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        picList.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      setPics(picList);
    } catch (error: any) {
      console.error("Error fetching PICs: ", error);
      setFirebaseError("Gagal memuat data PIC. Periksa koneksi atau coba lagi nanti.");
      toast({ title: "Error Memuat Data", description: error.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPICs();
  }, []);

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<PICFormData>({
    resolver: zodResolver(picSchema),
  });
  
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, formState: { errors: errorsEdit }, setValue: setValueEdit } = useForm<EditPICFormData>({
    resolver: zodResolver(editPicSchema),
  });

  const handleAddPIC: SubmitHandler<PICFormData> = async (data) => {
    if (!currentUser || !currentUser.uid) {
      toast({ title: "Error", description: "Pengguna tidak terautentikasi.", variant: "destructive" });
      return;
    }
    if (!data.passwordValue) {
        const roleName = currentUser.role === 'Admin' ? 'pengajuan' : 'PIC';
        toast({ title: "Password Dibutuhkan", description: `Password awal wajib diisi untuk ${roleName} baru.`, variant: "destructive" });
        return;
    }

    const appPICId = data.id && data.id.trim() !== '' ? data.id.trim() : `PIC${String(Date.now()).slice(-6)}`;
    const emailForAuth = data.email.trim();

    if (currentUser.role === 'Admin') {
      // Admin mengajukan permintaan persetujuan
      if (pics.some(pic => pic.id === appPICId || pic.email === emailForAuth)) {
        toast({ title: "Gagal Mengajukan", description: `ID Aplikasi PIC atau Email sudah ada atau sedang diajukan.`, variant: "destructive"});
        return;
      }
      
      const approvalPayload: Partial<UserProfile> & { passwordValue?: string } = {
        id: appPICId,
        fullName: data.fullName,
        email: emailForAuth,
        role: 'PIC',
        status: 'PendingApproval',
        workLocation: data.workLocation,
        passwordValue: data.passwordValue, // Password to be used by MasterAdmin for Auth creation
        createdAt: new Date().toISOString(),
        createdBy: { uid: currentUser.uid, name: currentUser.fullName, role: currentUser.role },
      };

      const approvalRequest: ApprovalRequest = {
        type: 'NEW_USER_PIC',
        status: 'pending',
        requestedByUid: currentUser.uid,
        requestedByName: currentUser.fullName,
        requestedByRole: currentUser.role,
        requestTimestamp: serverTimestamp(),
        targetEntityType: 'USER_PROFILE_DATA',
        targetEntityId: appPICId,
        targetEntityName: data.fullName,
        payload: approvalPayload,
        notesFromRequester: "Pengajuan PIC baru.",
      };

      try {
        await addDoc(collection(db, "approval_requests"), approvalRequest);
        toast({ title: "Permintaan Diajukan", description: `Permintaan penambahan PIC ${data.fullName} (ID: ${appPICId}) telah dikirim ke MasterAdmin untuk persetujuan.` });
        reset({id: '', fullName: '', email: '', passwordValue: '', workLocation: ''});
        setIsAddPICDialogOpen(false);
      } catch (error: any) {
        console.error("Error submitting approval request:", error);
        toast({ title: "Error Pengajuan", description: `Gagal mengajukan permintaan: ${error.message}`, variant: "destructive" });
      }

    } else if (currentUser.role === 'MasterAdmin') {
        // MasterAdmin langsung menambahkan PIC menggunakan server action
        if (pics.some(pic => pic.id === appPICId || pic.email === emailForAuth)) {
            toast({ title: "Gagal Menambahkan", description: `ID Aplikasi PIC atau Email sudah ada.`, variant: "destructive"});
            return;
        }

        const profileToCreate: Omit<UserProfile, 'uid' | 'createdAt'> = {
            id: appPICId,
            fullName: data.fullName,
            email: emailForAuth,
            role: 'PIC',
            status: 'Aktif',
            workLocation: data.workLocation,
            joinDate: new Date().toISOString(),
            createdBy: { uid: currentUser.uid, name: currentUser.fullName, role: currentUser.role },
        };

        try {
            const result = await createUserAccount(emailForAuth, data.passwordValue, profileToCreate);

            if (result.success) {
                toast({ title: "PIC Ditambahkan", description: `PIC ${data.fullName} (ID: ${appPICId}) berhasil ditambahkan.` });
                fetchPICs();
                reset({id: '', fullName: '', email: '', passwordValue: '', workLocation: ''});
                setIsAddPICDialogOpen(false);
            } else {
                let errorMessage = result.message || "Gagal menambahkan PIC.";
                if (result.errorCode === 'auth/email-already-in-use') {
                    errorMessage = "Email ini sudah terdaftar. Gunakan email lain.";
                }
                toast({ title: "Error", description: errorMessage, variant: "destructive" });
            }
        } catch (error) {
            console.error("Error creating PIC:", error);
            toast({ title: "Error", description: "Terjadi kesalahan saat membuat akun.", variant: "destructive" });
        }
    }
  };

  const handleOpenEditDialog = (pic: UserProfile) => {
    setCurrentEditingPIC(pic);
    setValueEdit('id', pic.id);
    setValueEdit('fullName', pic.fullName);
    setValueEdit('email', pic.email || '');
    setValueEdit('workLocation', pic.workLocation || '');
    // Password is not edited here
    setIsEditPICDialogOpen(true);
  };

  const handleEditPIC: SubmitHandler<EditPICFormData> = async (data) => {
    if (!currentEditingPIC || !currentEditingPIC.uid || !currentUser || !currentUser.uid) return;

    if (data.email && data.email !== currentEditingPIC.email && pics.some(p => p.email === data.email && p.uid !== currentEditingPIC.uid)) {
        toast({ title: "Gagal Memperbarui", description: `Email ${data.email} sudah digunakan oleh PIC lain.`, variant: "destructive"});
        return;
    }
    
    const updatePayload: Partial<UserProfile> = {
        fullName: data.fullName,
        email: data.email,
        workLocation: data.workLocation,
        updatedAt: new Date().toISOString(),
        updatedBy: { uid: currentUser.uid, name: currentUser.fullName, role: currentUser.role },
    };

    if (currentUser.role === 'Admin') {
      const approvalRequest: ApprovalRequest = {
        type: 'UPDATE_USER_PROFILE',
        status: 'pending',
        requestedByUid: currentUser.uid,
        requestedByName: currentUser.fullName,
        requestedByRole: currentUser.role,
        requestTimestamp: serverTimestamp(),
        targetEntityType: 'USER_PROFILE_DATA',
        targetEntityId: currentEditingPIC.uid,
        targetEntityName: currentEditingPIC.fullName,
        payload: updatePayload,
        oldPayload: { fullName: currentEditingPIC.fullName, email: currentEditingPIC.email, workLocation: currentEditingPIC.workLocation },
        notesFromRequester: `Pengajuan perubahan data untuk PIC ID: ${currentEditingPIC.id}`,
      };
      try {
        await addDoc(collection(db, "approval_requests"), approvalRequest);
        toast({ title: "Permintaan Perubahan Diajukan", description: `Permintaan perubahan data PIC ${data.fullName} (ID: ${currentEditingPIC.id}) telah dikirim ke MasterAdmin.` });
      } catch (error: any) {
        toast({ title: "Error Pengajuan Update", description: `Gagal mengajukan permintaan: ${error.message}`, variant: "destructive" });
      }
    } else if (currentUser.role === 'MasterAdmin') {
      try {
        const picDocRef = doc(db, "users", currentEditingPIC.uid);
        await updateDoc(picDocRef, updatePayload);
        toast({ title: "PIC Diperbarui", description: `Data PIC ${data.fullName} berhasil diperbarui.` });
        fetchPICs();
      } catch (error: any) {
        toast({ title: "Error Update", description: `Gagal memperbarui PIC: ${error.message}`, variant: "destructive" });
      }
    }
    resetEdit({id: '', fullName: '', email: '', workLocation: ''});
    setIsEditPICDialogOpen(false);
    setCurrentEditingPIC(null);
  };
  
  const handleDeletePIC = async (picToDelete: UserProfile) => {
    if (!picToDelete.uid || !currentUser) return;

    if (currentUser.role === 'Admin') {
        const approvalRequest: ApprovalRequest = {
            type: 'DEACTIVATE_USER',
            status: 'pending',
            requestedByUid: currentUser.uid,
            requestedByName: currentUser.fullName,
            requestedByRole: currentUser.role,
            requestTimestamp: serverTimestamp(),
            targetEntityType: 'USER_PROFILE_DATA',
            targetEntityId: picToDelete.uid,
            targetEntityName: picToDelete.fullName,
            payload: { status: 'Nonaktif' },
            notesFromRequester: `Pengajuan penonaktifan/penghapusan PIC ID: ${picToDelete.id}`,
        };
        try {
            await addDoc(collection(db, "approval_requests"), approvalRequest);
            toast({title: "Permintaan Diajukan", description: `Permintaan penonaktifan/penghapusan PIC ${picToDelete.fullName} telah dikirim ke MasterAdmin.`});
        } catch (error: any) {
            toast({ title: "Error Pengajuan", description: `Gagal mengajukan permintaan: ${error.message}`, variant: "destructive" });
        }
    } else if (currentUser.role === 'MasterAdmin') {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus PIC ${picToDelete.fullName}? Profil Firestore akan dihapus, namun akun login Firebase Auth tidak akan terhapus otomatis dari sini.`)) {
            return;
        }
        try {
            await deleteDoc(doc(db, "users", picToDelete.uid));
            toast({ title: "Profil PIC Dihapus", description: `Profil PIC ${picToDelete.fullName} telah dihapus dari Firestore.` });
            fetchPICs();
        } catch (error: any) {
            toast({ title: "Error Menghapus Profil", description: `Gagal menghapus profil PIC: ${error.message}`, variant: "destructive" });
        }
    }
  };

  const handleImportPICs = () => {
     toast({ title: "Fitur Dalam Pengembangan", description: "Impor PIC dari Excel belum diimplementasikan." });
  };
  
  const handleStatusChange = async (picToUpdate: UserProfile, newStatusActive: boolean) => {
    if (!picToUpdate.uid || !currentUser) return;

    const newStatus = newStatusActive ? 'Aktif' : 'Nonaktif';
    const payloadForApproval = { status: newStatus };

    if (currentUser.role === 'Admin') {
        const approvalRequest: ApprovalRequest = {
            type: newStatusActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
            status: 'pending',
            requestedByUid: currentUser.uid,
            requestedByName: currentUser.fullName,
            requestedByRole: currentUser.role,
            requestTimestamp: serverTimestamp(),
            targetEntityType: 'USER_PROFILE_DATA',
            targetEntityId: picToUpdate.uid,
            targetEntityName: picToUpdate.fullName,
            payload: payloadForApproval,
            notesFromRequester: `Pengajuan perubahan status PIC ID ${picToUpdate.id} menjadi ${newStatus}.`,
        };
         try {
            await addDoc(collection(db, "approval_requests"), approvalRequest);
            toast({ title: "Permintaan Perubahan Status Diajukan", description: `Permintaan perubahan status PIC ${picToUpdate.fullName} menjadi ${newStatus} telah dikirim.` });
        } catch (error: any) {
            toast({ title: "Error Pengajuan", description: `Gagal mengajukan perubahan status: ${error.message}`, variant: "destructive" });
        }
    } else if (currentUser.role === 'MasterAdmin') {
        try {
            const picDocRef = doc(db, "users", picToUpdate.uid);
            await updateDoc(picDocRef, { 
                status: newStatus,
                updatedAt: new Date().toISOString(),
                updatedBy: { uid: currentUser.uid, name: currentUser.fullName, role: currentUser.role },
            });
            toast({
                title: "Status PIC Diperbarui",
                description: `Status PIC ${picToUpdate.fullName} telah diubah menjadi ${newStatus}.`,
            });
            fetchPICs();
        } catch (error: any) {
            toast({ title: "Error Update Status", description: `Gagal memperbarui status PIC: ${error.message}`, variant: "destructive" });
        }
    }
  };

  const filteredPICs = pics.filter(pic =>
    pic.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pic.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pic.email && pic.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (pic.workLocation && pic.workLocation.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  if (!currentUser) {
    return <div className="flex h-screen items-center justify-center">Loading user data...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <CardTitle className="flex items-center text-2xl text-primary">
              <Briefcase className="mr-3 h-7 w-7" />
              Manajemen Akun PIC
            </CardTitle>
            <CardDescription>
              {currentUser.role === 'Admin' 
                ? "Kelola akun PIC. Penambahan, perubahan, atau penghapusan data memerlukan persetujuan MasterAdmin."
                : "Kelola akun pengguna dengan peran PIC (Person In Charge)."}
            </CardDescription>
          </div>
          <Dialog open={isAddPICDialogOpen} onOpenChange={setIsAddPICDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-2 sm:mt-0 w-full sm:w-auto" onClick={() => reset({id: '', fullName: '', email: '', passwordValue: '', workLocation: ''})}>
                <UserPlus className="mr-2 h-4 w-4" /> Tambah PIC Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Tambah PIC Baru</DialogTitle>
                <DialogDescription>Isi detail untuk PIC baru.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(handleAddPIC)} className="space-y-4 py-4">
                <div>
                  <Label htmlFor="addPicId">ID PIC (Opsional)</Label>
                  <Input id="addPicId" {...register("id")} placeholder="Otomatis jika kosong (cth: PICXXXXX)" />
                </div>
                <div>
                  <Label htmlFor="addPicFullName">Nama Lengkap <span className="text-destructive">*</span></Label>
                  <Input id="addPicFullName" {...register("fullName")} />
                  {errors.fullName && <p className="text-destructive text-sm mt-1">{errors.fullName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="addPicEmail">Email <span className="text-destructive">*</span></Label>
                  <Input id="addPicEmail" type="email" {...register("email")} />
                  {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="addPicPassword">Password Awal <span className="text-destructive">*</span></Label>
                  <Input id="addPicPassword" type="password" {...register("passwordValue")} />
                  {errors.passwordValue && errors.passwordValue.message && errors.passwordValue.message !== '' && <p className="text-destructive text-sm mt-1">{errors.passwordValue.message}</p>}
                </div>
                <div>
                  <Label htmlFor="addPicWorkLocation">Area Tanggung Jawab <span className="text-destructive">*</span></Label>
                  <Input id="addPicWorkLocation" {...register("workLocation")} placeholder="cth: Jakarta Pusat"/>
                  {errors.workLocation && <p className="text-destructive text-sm mt-1">{errors.workLocation.message}</p>}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { reset(); setIsAddPICDialogOpen(false); }}>Batal</Button>
                  <Button type="submit">
                    {currentUser.role === 'Admin' ? 'Ajukan Penambahan' : 'Simpan PIC'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
           {firebaseError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Terjadi</AlertTitle>
              <AlertDescription>{firebaseError}</AlertDescription>
            </Alert>
          )}
           <div className="mb-4">
            <Input
              placeholder="Cari PIC (ID, Nama, Email, Area)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          {isLoading ? (<p>Memuat data PIC...</p>) : (
            <>
              <Card className="border shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID PIC</TableHead>
                      <TableHead>Nama Lengkap</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Area Tanggung Jawab</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPICs.length > 0 ? filteredPICs.map((pic) => (
                      <TableRow key={pic.uid}>
                        <TableCell className="font-medium">{pic.id}</TableCell>
                        <TableCell>{pic.fullName}</TableCell>
                        <TableCell>{pic.email}</TableCell>
                        <TableCell>{pic.workLocation}</TableCell>
                        <TableCell>
                          <Switch
                            checked={pic.status === 'Aktif'}
                            onCheckedChange={(newStatusChecked) => handleStatusChange(pic, newStatusChecked)}
                            aria-label={`Status PIC ${pic.fullName}`}
                            onClick={(e) => {
                              if (currentUser.role === 'Admin') {
                                e.preventDefault(); 
                                handleStatusChange(pic, !(pic.status === 'Aktif'));
                              }
                            }}
                          />
                          <span className={`ml-2 text-xs ${pic.status === 'Aktif' ? 'text-green-600' : pic.status === 'PendingApproval' ? 'text-yellow-600' : 'text-red-600'}`}>
                            {pic.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-center space-x-1">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenEditDialog(pic)}><Edit size={16}/></Button>
                          <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeletePIC(pic)}><Trash2 size={16}/></Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">Tidak ada data PIC yang cocok dengan pencarian.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Menampilkan {filteredPICs.length} dari {pics.length} PIC.
              </p>
            </>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isEditPICDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCurrentEditingPIC(null);
          resetEdit({id: '', fullName: '', email: '', workLocation: ''});
        }
        setIsEditPICDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit PIC: {currentEditingPIC?.fullName}</DialogTitle>
            <DialogDescription>Perbarui detail PIC. ID tidak dapat diubah.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit(handleEditPIC)} className="space-y-4 py-4">
            <div>
              <Label htmlFor="editPicId">ID PIC</Label>
              <Input id="editPicId" {...registerEdit("id")} readOnly className="bg-muted/50" />
            </div>
            <div>
              <Label htmlFor="editPicFullName">Nama Lengkap <span className="text-destructive">*</span></Label>
              <Input id="editPicFullName" {...registerEdit("fullName")} />
              {errorsEdit.fullName && <p className="text-destructive text-sm mt-1">{errorsEdit.fullName.message}</p>}
            </div>
            <div>
              <Label htmlFor="editPicEmail">Email <span className="text-destructive">*</span></Label>
              <Input id="editPicEmail" type="email" {...registerEdit("email")} />
              {errorsEdit.email && <p className="text-destructive text-sm mt-1">{errorsEdit.email.message}</p>}
               <p className="text-xs text-muted-foreground mt-1">Mengubah email di sini hanya mempengaruhi profil Firestore. Untuk mengubah email login Firebase Auth, perlu proses terpisah.</p>
            </div>
            <div>
              <Label htmlFor="editPicWorkLocation">Area Tanggung Jawab <span className="text-destructive">*</span></Label>
              <Input id="editPicWorkLocation" {...registerEdit("workLocation")} />
              {errorsEdit.workLocation && <p className="text-destructive text-sm mt-1">{errorsEdit.workLocation.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetEdit({id: '', fullName: '', email: '', workLocation: ''}); setIsEditPICDialogOpen(false); setCurrentEditingPIC(null);}}>Batal</Button>
              <Button type="submit">
                 {currentUser.role === 'Admin' ? 'Ajukan Perubahan' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <FileUp className="mr-2 h-5 w-5 text-primary" />
            Impor PIC dari Excel
          </CardTitle>
          <CardDescription>
            Tambahkan beberapa akun PIC sekaligus menggunakan file Excel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="excel-file-pic">Pilih File Excel (.xlsx)</Label>
            <Input id="excel-file-pic" type="file" accept=".xlsx, .xls" className="mt-1" />
          </div>
          <p className="text-xs text-muted-foreground">
            Format kolom yang diharapkan: ID PIC (opsional), Nama Lengkap, Email, Password Awal, Area Tanggung Jawab.
          </p>
          <Button onClick={handleImportPICs} className="w-full sm:w-auto">
            <FileUp className="mr-2 h-4 w-4" /> Impor Data PIC
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
