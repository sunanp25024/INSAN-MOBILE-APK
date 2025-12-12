
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, FileUp, UserPlus, Edit, Trash2, AlertCircle, Download, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types';
import { Switch } from '@/components/ui/switch';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createUserAccount, deleteUserAccount, importUsers, updateUserStatus, resetUserPassword } from '@/lib/firebaseAdminActions';
import * as XLSX from 'xlsx';

const picSchema = z.object({
  id: z.string().min(1, "ID PIC tidak boleh kosong").optional(),
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  passwordValue: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal('')),
  workLocation: z.string().min(3, "Area tanggung jawab minimal 3 karakter"),
});

const editPicSchema = picSchema.omit({ passwordValue: true, id: true });

type PICFormData = z.infer<typeof picSchema>;
type EditPICFormData = z.infer<typeof editPicSchema>;

export default function ManagePICsPage() {
  const { toast } = useToast();
  const [pics, setPics] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddPICDialogOpen, setIsAddPICDialogOpen] = useState(false);
  const [isEditPICDialogOpen, setIsEditPICDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [userToManage, setUserToManage] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [currentEditingPIC, setCurrentEditingPIC] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
      try {
        const user = JSON.parse(userDataString) as UserProfile;
        setCurrentUser(user);
        if (!['MasterAdmin', 'Admin'].includes(user.role)) {
            setIsLoading(false);
        }
      } catch (error) { 
        console.error("Error parsing user data for manage pics page", error); 
        setIsLoading(false);
      }
    } else {
        setIsLoading(false);
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
    if (currentUser && ['MasterAdmin', 'Admin'].includes(currentUser.role)) {
        fetchPICs();
    }
  }, [currentUser]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PICFormData>({
    resolver: zodResolver(picSchema),
  });
  
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, formState: { errors: errorsEdit }, setValue } = useForm<EditPICFormData>({
    resolver: zodResolver(editPicSchema),
  });

  const handleAddPIC: SubmitHandler<PICFormData> = async (data) => {
    if (!currentUser || !['MasterAdmin', 'Admin'].includes(currentUser.role)) return;
    setIsSubmitting(true);
    
    if (!data.passwordValue) {
        toast({ title: "Password Dibutuhkan", description: `Password awal wajib diisi untuk PIC baru.`, variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    const appPICId = data.id && data.id.trim() !== '' ? data.id.trim() : `PIC${String(Date.now()).slice(-6)}`;
    const emailForAuth = data.email.trim();

    if (pics.some(pic => pic.id === appPICId || pic.email === emailForAuth)) {
      toast({ title: "Gagal Menambahkan", description: `ID Aplikasi PIC atau Email sudah ada.`, variant: "destructive"});
      setIsSubmitting(false);
      return;
    }

    const newPicProfile: Omit<UserProfile, 'uid'> = {
        id: appPICId,
        fullName: data.fullName,
        email: emailForAuth,
        role: 'PIC',
        status: 'Aktif',
        workLocation: data.workLocation,
        joinDate: new Date().toISOString(),
        createdBy: { uid: currentUser.uid, name: currentUser.fullName, role: currentUser.role },
    };
    
    const result = await createUserAccount(emailForAuth, data.passwordValue, newPicProfile);
    if (result.success) {
        toast({ title: "PIC Ditambahkan", description: `PIC ${data.fullName} berhasil ditambahkan.` });
        fetchPICs();
        reset({id: '', fullName: '', email: '', passwordValue: '', workLocation: ''});
        setIsAddPICDialogOpen(false);
    } else {
        toast({ title: "Error", description: result.message || 'Gagal menambahkan PIC', variant: "destructive" });
    }

    setIsSubmitting(false);
  };

  const handleOpenEditDialog = (pic: UserProfile) => {
    setCurrentEditingPIC(pic);
    setValue('fullName', pic.fullName);
    setValue('email', pic.email || '');
    setValue('workLocation', pic.workLocation || '');
    setIsEditPICDialogOpen(true);
  };

  const handleEditPIC: SubmitHandler<EditPICFormData> = async (data) => {
    if (!currentEditingPIC || !currentEditingPIC.uid || !currentUser || !['MasterAdmin', 'Admin'].includes(currentUser.role)) return;
    setIsSubmitting(true);

    if (data.email && data.email !== currentEditingPIC.email && pics.some(p => p.email === data.email && p.uid !== currentEditingPIC.uid)) {
        toast({ title: "Gagal Memperbarui", description: `Email ${data.email} sudah digunakan oleh PIC lain.`, variant: "destructive"});
        setIsSubmitting(false);
        return;
    }
    
    const updatePayload: Partial<UserProfile> = {
        fullName: data.fullName,
        email: data.email,
        workLocation: data.workLocation,
        updatedAt: new Date().toISOString(),
        updatedBy: { uid: currentUser.uid, name: currentUser.fullName, role: currentUser.role },
    };

    try {
        const picDocRef = doc(db, "users", currentEditingPIC.uid);
        await updateDoc(picDocRef, updatePayload);
        toast({ title: "PIC Diperbarui", description: `Data PIC ${data.fullName} berhasil diperbarui.` });
        fetchPICs();
    } catch (error: any) {
        toast({ title: "Error Update", description: `Gagal memperbarui PIC: ${error.message}`, variant: "destructive" });
    }
    
    setIsEditPICDialogOpen(false);
    setCurrentEditingPIC(null);
    resetEdit();
    setIsSubmitting(false);
  };
  
  const handleOpenDeleteDialog = (user: UserProfile) => {
    setUserToManage(user);
    setIsDeleteDialogOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!userToManage || !currentUser || !['MasterAdmin', 'Admin'].includes(currentUser.role)) return;
    setIsSubmitting(true);
    
    const result = await deleteUserAccount(userToManage.uid);

    if (result && result.success) {
        toast({ title: "Sukses", description: result.message });
        fetchPICs();
    } else if(result) {
        toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    
    setIsSubmitting(false);
    setIsDeleteDialogOpen(false);
    setUserToManage(null);
  };
  
  const handleOpenResetPasswordDialog = (user: UserProfile) => {
    setUserToManage(user);
    setNewPassword('');
    setIsResetPasswordDialogOpen(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!userToManage || !newPassword) return;
    setIsSubmitting(true);
    
    const result = await resetUserPassword(userToManage.uid, newPassword);

    if (result.success) {
      toast({ title: 'Password Direset', description: `Password untuk ${userToManage.fullName} telah berhasil direset.` });
      setIsResetPasswordDialogOpen(false);
    } else {
      toast({ title: 'Gagal Mereset Password', description: result.message, variant: 'destructive' });
    }

    setIsSubmitting(false);
    setUserToManage(null);
    setNewPassword('');
  };


  const handleFileSelectAndImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isImporting || !currentUser || !['MasterAdmin', 'Admin'].includes(currentUser.role)) return;
    if (!event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    setIsImporting(true);
    toast({ title: "Memulai Impor", description: `Memproses file ${file.name}...` });

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            if (!data) throw new Error("Gagal membaca file.");
            
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
              toast({ title: "File Kosong", variant: "destructive" });
              return;
            }

            const creatorProfile = { uid: currentUser.uid, fullName: currentUser.fullName, role: currentUser.role };
            const result = await importUsers(JSON.parse(JSON.stringify(jsonData)), 'PIC', creatorProfile);

            if (result.success || result.createdCount > 0) {
                toast({
                    title: "Impor Selesai",
                    description: `${result.createdCount} dari ${result.totalRows} PIC berhasil ditambahkan. ${result.failedCount > 0 ? `${result.failedCount} gagal.` : ''}`,
                    duration: 9000,
                });
                if (result.errors && result.errors.length > 0) {
                    console.error("Import Errors:", result.errors);
                }
                fetchPICs();
            } else {
                toast({
                    title: "Impor Gagal Total",
                    description: `Tidak ada PIC yang berhasil ditambahkan. Error: ${result.errors?.[0] || 'Unknown error'}`,
                    variant: "destructive",
                    duration: 9000,
                });
            }
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error Memproses File", description: error.message, variant: "destructive" });
        } finally {
            setIsImporting(false);
            if(fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    reader.onerror = () => {
      toast({ title: "Error Membaca File", variant: "destructive" });
      setIsImporting(false);
    };
    reader.readAsBinaryString(file);
  };
  
  const handleDownloadTemplate = () => {
    const headers = [
      ['fullName', 'email', 'passwordValue', 'workLocation', 'id'],
      ['Contoh Nama PIC', 'contoh.pic@internal.spx', 'passwordaman123', 'Jakarta Pusat', 'PIC007']
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template PIC');
    XLSX.writeFile(wb, 'PIC_Template.xlsx');
    toast({ title: "Template Diunduh", description: "Template PIC_Template.xlsx telah berhasil diunduh." });
  };
  
  const handleStatusChange = async (picToUpdate: UserProfile, newStatusActive: boolean) => {
    if (!picToUpdate.uid || !currentUser || !['MasterAdmin', 'Admin'].includes(currentUser.role)) return;
    const newStatus = newStatusActive ? 'Aktif' : 'Nonaktif';
    
    const handlerProfile = { uid: currentUser.uid, name: currentUser.fullName, role: currentUser.role };
    const result = await updateUserStatus(picToUpdate.uid, newStatus, handlerProfile);
    
    if (result.success) {
      toast({
        title: "Status PIC Diperbarui",
        description: `Status PIC ${picToUpdate.fullName} telah diubah menjadi ${newStatus}.`,
      });
      fetchPICs();
    } else {
      console.error("Error updating PIC status:", result.message);
      toast({ title: "Error", description: `Gagal memperbarui status PIC: ${result.message}`, variant: "destructive" });
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
  
  if (!['MasterAdmin', 'Admin'].includes(currentUser.role)) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-destructive">Akses Ditolak</CardTitle>
                <CardDescription>Halaman ini hanya bisa diakses oleh MasterAdmin dan Admin.</CardDescription>
            </CardHeader>
        </Card>
    )
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
              Kelola akun pengguna dengan peran PIC (Person In Charge).
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
                  <Input id="addPicFullName" {...register("fullName")} autoComplete="name" />
                  {errors.fullName && <p className="text-destructive text-sm mt-1">{errors.fullName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="addPicEmail">Email <span className="text-destructive">*</span></Label>
                  <Input id="addPicEmail" type="email" {...register("email")} autoComplete="email" />
                  {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="addPicPassword">Password Awal <span className="text-destructive">*</span></Label>
                  <Input id="addPicPassword" type="password" {...register("passwordValue")} autoComplete="new-password" />
                  {errors.passwordValue && errors.passwordValue.message && errors.passwordValue.message !== '' && <p className="text-destructive text-sm mt-1">{errors.passwordValue.message}</p>}
                </div>
                <div>
                  <Label htmlFor="addPicWorkLocation">Area Tanggung Jawab <span className="text-destructive">*</span></Label>
                  <Input id="addPicWorkLocation" {...register("workLocation")} placeholder="cth: Jakarta Pusat"/>
                  {errors.workLocation && <p className="text-destructive text-sm mt-1">{errors.workLocation.message}</p>}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { reset(); setIsAddPICDialogOpen(false); }}>Batal</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Menyimpan...' : 'Simpan PIC'}
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
                  <TableHeader className="bg-primary/10">
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
                          />
                          <span className={`ml-2 text-xs ${pic.status === 'Aktif' ? 'text-green-600' : pic.status === 'PendingApproval' ? 'text-yellow-600' : 'text-red-600'}`}>
                            {pic.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-center space-x-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenResetPasswordDialog(pic)} disabled={currentUser.uid === pic.uid}><KeyRound size={16}/></Button>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenEditDialog(pic)}><Edit size={16}/></Button>
                          <Button 
                              variant="destructive" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={() => handleOpenDeleteDialog(pic)} 
                              disabled={isSubmitting || (currentUser.role === 'MasterAdmin' && currentUser.uid === pic.uid)}
                          >
                            <Trash2 size={16}/>
                          </Button>
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
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
                Apakah Anda yakin ingin menghapus pengguna {userToManage?.fullName}? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Batal</Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Memproses...' : 'Ya, Hapus Pengguna'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password untuk {userToManage?.fullName}</DialogTitle>
            <DialogDescription>
              Masukkan password sementara yang baru. Pengguna dapat mengubahnya lagi nanti di halaman Pengaturan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="newPasswordPic">Password Baru (minimal 6 karakter)</Label>
            <Input 
              id="newPasswordPic" 
              type="text" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Masukkan password baru"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Batal</Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleConfirmResetPassword}
              disabled={isSubmitting || newPassword.length < 6}
            >
              {isSubmitting ? 'Memproses...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditPICDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCurrentEditingPIC(null);
          resetEdit();
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
              <Label htmlFor="editPicFullName">Nama Lengkap <span className="text-destructive">*</span></Label>
              <Input id="editPicFullName" {...registerEdit("fullName")} defaultValue={currentEditingPIC?.fullName} autoComplete="name"/>
              {errorsEdit.fullName && <p className="text-destructive text-sm mt-1">{errorsEdit.fullName.message}</p>}
            </div>
            <div>
              <Label htmlFor="editPicEmail">Email</Label>
              <Input id="editPicEmail" type="email" {...registerEdit("email")} defaultValue={currentEditingPIC?.email} readOnly className="bg-muted/50" />
              {errorsEdit.email && <p className="text-destructive text-sm mt-1">{errorsEdit.email.message}</p>}
               <p className="text-xs text-muted-foreground mt-1">Email login tidak dapat diubah dari form ini.</p>
            </div>
            <div>
              <Label htmlFor="editPicWorkLocation">Area Tanggung Jawab <span className="text-destructive">*</span></Label>
              <Input id="editPicWorkLocation" {...registerEdit("workLocation")} defaultValue={currentEditingPIC?.workLocation}/>
              {errorsEdit.workLocation && <p className="text-destructive text-sm mt-1">{errorsEdit.workLocation.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditPICDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting}>
                 {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
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
            <Input 
              id="excel-file-pic" 
              type="file" 
              accept=".xlsx, .xls"
              className="mt-1"
              onChange={handleFileSelectAndImport}
              ref={fileInputRef}
              disabled={isImporting}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            PENTING: Gunakan template yang diunduh. Pastikan baris pertama file Excel Anda adalah header dengan nama kolom persis: `fullName`, `email`, `passwordValue`, `workLocation`, `id`. Kolom `id` bersifat opsional.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto" disabled={isImporting}>
              <FileUp className="mr-2 h-4 w-4" /> {isImporting ? 'Mengimpor...' : 'Impor Data PIC'}
            </Button>
            <Button onClick={handleDownloadTemplate} variant="outline" className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4"/> Unduh Template
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    

    