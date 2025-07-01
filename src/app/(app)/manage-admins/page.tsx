
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileUp, UserPlus, Edit, Trash2, AlertCircle, Download, KeyRound } from 'lucide-react';
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
import { createUserAccount, deleteUserAccount, importUsers, updateUserStatus, requestUserDeletion, resetUserPassword } from '@/lib/firebaseAdminActions';
import * as XLSX from 'xlsx';

const adminSchema = z.object({
  id: z.string().min(1, "ID Aplikasi Admin tidak boleh kosong (cth: ADMIN00X)").optional(),
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  passwordValue: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal('')),
});

const editAdminSchema = adminSchema.omit({ passwordValue: true, id: true });

type AdminFormData = z.infer<typeof adminSchema>;
type EditAdminFormData = z.infer<typeof editAdminSchema>;


export default function ManageAdminsPage() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddAdminDialogOpen, setIsAddAdminDialogOpen] = useState(false);
  const [isEditAdminDialogOpen, setIsEditAdminDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [userToManage, setUserToManage] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [currentEditingAdmin, setCurrentEditingAdmin] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
      try {
        setCurrentUser(JSON.parse(userDataString) as UserProfile);
      } catch (error) { console.error("Error parsing user data for manage admins page", error); }
    }
  }, []);

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<AdminFormData>({
    resolver: zodResolver(adminSchema),
  });

  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, formState: { errors: errorsEdit }, setValue: setValueEdit } = useForm<EditAdminFormData>({
    resolver: zodResolver(editAdminSchema),
  });

  const fetchAdmins = async () => {
    setIsLoading(true);
    setFirebaseError(null);
    try {
      const q = query(collection(db, "users"), where("role", "==", "Admin"));
      const querySnapshot = await getDocs(q);
      const adminList: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        adminList.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      setAdmins(adminList);
    } catch (error: any) {
      console.error("Error fetching admins: ", error);
      setFirebaseError("Gagal memuat data Admin. Periksa koneksi atau coba lagi nanti.");
      toast({ title: "Error Memuat Data", description: error.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin: SubmitHandler<AdminFormData> = async (data) => {
    setIsSubmitting(true);
    if (!currentUser) return; 
    if (!data.passwordValue) {
      toast({ title: "Password Dibutuhkan", description: "Password awal wajib diisi untuk admin baru.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const appAdminId = data.id && data.id.trim() !== '' ? data.id : `ADMIN${String(Date.now()).slice(-6)}`;

    if (admins.some(admin => admin.id === appAdminId || admin.email === data.email)) {
      toast({ title: "Gagal Menambahkan", description: `ID Aplikasi atau Email sudah ada.`, variant: "destructive"});
      setIsSubmitting(false);
      return;
    }

    const newAdminProfile: Omit<UserProfile, 'uid'> = {
      id: appAdminId,
      fullName: data.fullName,
      email: data.email,
      role: 'Admin',
      status: 'Aktif',
      joinDate: new Date().toISOString(),
      createdBy: { uid: currentUser.uid, name: currentUser.fullName, role: currentUser.role },
    };

    try {
      // MasterAdmin creates directly
      const result = await createUserAccount(data.email, data.passwordValue, newAdminProfile);

      if (result.success) {
        toast({ title: "Admin Ditambahkan", description: `Admin ${data.fullName} (Email: ${data.email}) berhasil ditambahkan.` });
        fetchAdmins();
        reset({ id: '', fullName: '', email: '', passwordValue: '' });
        setIsAddAdminDialogOpen(false);
      } else {
        let errorMessage = result.message || "Gagal menambahkan admin.";
        if (result.errorCode === 'auth/email-already-in-use') {
          errorMessage = "Email ini sudah terdaftar. Gunakan email lain.";
        }
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      }
    } catch (error: any) {
        console.error("Error creating admin:", error);
        toast({ title: "Error", description: "Terjadi kesalahan saat membuat akun.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleOpenEditDialog = (admin: UserProfile) => {
    setCurrentEditingAdmin(admin);
    setValueEdit('fullName', admin.fullName);
    setValueEdit('email', admin.email || '');
    setIsEditAdminDialogOpen(true);
  };

  const handleEditAdmin: SubmitHandler<EditAdminFormData> = async (data) => {
    if (!currentEditingAdmin || !currentEditingAdmin.uid || !currentUser) return;
    setIsSubmitting(true);

    if (data.email && data.email !== currentEditingAdmin.email && admins.some(admin => admin.email === data.email && admin.uid !== currentEditingAdmin.uid)) {
        toast({ title: "Gagal Memperbarui", description: `Email ${data.email} sudah digunakan oleh admin lain.`, variant: "destructive"});
        setIsSubmitting(false);
        return;
    }

    const updatedData: Partial<UserProfile> = {
        fullName: data.fullName,
        email: data.email,
        updatedAt: new Date().toISOString(),
        updatedBy: { uid: currentUser.uid, name: currentUser.fullName, role: currentUser.role }
      };

    try {
      const adminDocRef = doc(db, "users", currentEditingAdmin.uid);
      await updateDoc(adminDocRef, updatedData);
      toast({ title: "Admin Diperbarui", description: `Data Admin ${data.fullName} berhasil diperbarui.` });
      fetchAdmins();
      resetEdit({ fullName: '', email: '' });
      setIsEditAdminDialogOpen(false);
      setCurrentEditingAdmin(null);
    } catch (error: any) {
      console.error("Error updating admin: ", error);
      toast({ title: "Error", description: `Gagal memperbarui admin: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

 const handleOpenDeleteDialog = (user: UserProfile) => {
    setUserToManage(user);
    setIsDeleteDialogOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!userToManage || !currentUser) return;

    setIsSubmitting(true);
    let result;
    if (currentUser.role === 'MasterAdmin') {
        result = await deleteUserAccount(userToManage.uid);
    } else if (currentUser.role === 'Admin') {
        result = await requestUserDeletion(userToManage, { uid: currentUser.uid, fullName: currentUser.fullName, role: currentUser.role });
    }

    if (result && result.success) {
        toast({ title: "Sukses", description: result.message });
        if(currentUser.role === 'MasterAdmin') fetchAdmins();
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
    if (isImporting || !currentUser) return;
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
              toast({ title: "File Kosong", description: "File Excel yang Anda unggah tidak berisi data.", variant: "destructive" });
              setIsImporting(false);
              return;
            }

            const creatorProfile = { uid: currentUser.uid, fullName: currentUser.fullName, role: currentUser.role };
            const result = await importUsers(JSON.parse(JSON.stringify(jsonData)), 'Admin', creatorProfile);

            if (result.success || result.createdCount > 0) {
                toast({
                    title: "Impor Selesai",
                    description: `${result.createdCount} dari ${result.totalRows} admin berhasil ditambahkan. ${result.failedCount > 0 ? `${result.failedCount} gagal.` : ''}`,
                    duration: 9000,
                });
                if (result.errors && result.errors.length > 0) {
                    console.error("Import Errors:", result.errors);
                }
                fetchAdmins();
            } else {
                toast({
                    title: "Impor Gagal Total",
                    description: `Tidak ada admin yang berhasil ditambahkan. Error: ${result.errors?.[0] || 'Unknown error'}`,
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
    const headers = [['fullName', 'email', 'passwordValue', 'id (optional)']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Admin_Template.xlsx');
    toast({ title: "Template Diunduh", description: "Template Admin_Template.xlsx telah berhasil diunduh." });
  };


  const handleStatusChange = async (adminToUpdate: UserProfile, newStatusActive: boolean) => {
    if (!adminToUpdate.uid || !currentUser || currentUser.role !== 'MasterAdmin') {
      toast({ title: "Akses Ditolak", description: "Hanya MasterAdmin yang dapat mengubah status.", variant: "destructive" });
      return;
    }

    const newStatus = newStatusActive ? 'Aktif' : 'Nonaktif';
    const handlerProfile = { uid: currentUser.uid, name: currentUser.fullName, role: currentUser.role };

    const result = await updateUserStatus(adminToUpdate.uid, newStatus, handlerProfile);

    if (result.success) {
      toast({
        title: "Status Admin Diperbarui",
        description: `Status admin ${adminToUpdate.fullName} telah diubah menjadi ${newStatus}.`,
      });
      fetchAdmins();
    } else {
      console.error("Error updating admin status:", result.message);
      toast({ title: "Error", description: `Gagal memperbarui status admin: ${result.message}`, variant: "destructive" });
    }
  };

  const filteredAdmins = admins.filter(admin =>
    admin.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (admin.email && admin.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (currentUser?.role !== 'MasterAdmin') {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-destructive">Akses Ditolak</CardTitle>
                <CardDescription>Halaman ini hanya bisa diakses oleh MasterAdmin.</CardDescription>
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
              <Users className="mr-3 h-7 w-7" />
              Manajemen Akun Admin
            </CardTitle>
            <CardDescription>
              Kelola akun pengguna dengan peran Admin.
            </CardDescription>
          </div>
          <Dialog open={isAddAdminDialogOpen} onOpenChange={setIsAddAdminDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-2 sm:mt-0 w-full sm:w-auto" onClick={() => reset({ id: '', fullName: '', email: '', passwordValue: '' })}>
                <UserPlus className="mr-2 h-4 w-4" /> Tambah Admin Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Tambah Admin Baru</DialogTitle>
                <DialogDescription>Isi detail untuk Admin baru. Akun akan dibuat di Firebase.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(handleAddAdmin)} className="space-y-4 py-4">
                <div>
                  <Label htmlFor="addAdminAppId">ID Aplikasi Admin (Opsional)</Label>
                  <Input id="addAdminAppId" {...register("id")} placeholder="Otomatis jika kosong (cth: ADMINXXXXX)" />
                  {errors.id && <p className="text-destructive text-sm mt-1">{errors.id.message}</p>}
                </div>
                <div>
                  <Label htmlFor="addAdminFullName">Nama Lengkap <span className="text-destructive">*</span></Label>
                  <Input id="addAdminFullName" {...register("fullName")} autoComplete="name" />
                  {errors.fullName && <p className="text-destructive text-sm mt-1">{errors.fullName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="addAdminEmail">Email (untuk Login) <span className="text-destructive">*</span></Label>
                  <Input id="addAdminEmail" type="email" {...register("email")} autoComplete="email" />
                  {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="addAdminPassword">Password Awal <span className="text-destructive">*</span></Label>
                  <Input id="addAdminPassword" type="password" {...register("passwordValue")} autoComplete="new-password" />
                  {errors.passwordValue && errors.passwordValue.message !== '' && <p className="text-destructive text-sm mt-1">{errors.passwordValue.message}</p>}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { reset(); setIsAddAdminDialogOpen(false); }}>Batal</Button>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Menyimpan...' : 'Simpan Admin'}</Button>
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
              placeholder="Cari Admin (ID Aplikasi, Nama, Email)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          {isLoading ? (
            <p>Memuat data admin...</p>
          ) : (
            <>
            <Card className="border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Aplikasi</TableHead>
                    <TableHead>Nama Lengkap</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.length > 0 ? filteredAdmins.map((admin) => (
                    <TableRow key={admin.uid}>
                      <TableCell className="font-medium">{admin.id}</TableCell>
                      <TableCell>{admin.fullName}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        <Switch
                            checked={admin.status === 'Aktif'}
                            onCheckedChange={(newStatus) => handleStatusChange(admin, newStatus)}
                            aria-label={`Status admin ${admin.fullName}`}
                        />
                        <span className={`ml-2 text-xs ${admin.status === 'Aktif' ? 'text-green-600' : 'text-red-600'}`}>
                          {admin.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-center space-x-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenResetPasswordDialog(admin)} disabled={currentUser?.uid === admin.uid}><KeyRound size={16}/></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenEditDialog(admin)}><Edit size={16}/></Button>
                        <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenDeleteDialog(admin)}
                            disabled={isSubmitting || currentUser?.uid === admin.uid}
                        >
                            <Trash2 size={16}/>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">Tidak ada data Admin yang cocok dengan pencarian.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Menampilkan {filteredAdmins.length} dari {admins.length} Admin.
            </p>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Aksi</DialogTitle>
            <DialogDescription>
              {currentUser?.role === 'MasterAdmin'
                ? `Apakah Anda yakin ingin menghapus pengguna ${userToManage?.fullName}? Tindakan ini tidak dapat dibatalkan.`
                : `Ajukan penghapusan untuk pengguna ${userToManage?.fullName}? Permintaan ini memerlukan persetujuan dari MasterAdmin.`}
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
              {isSubmitting ? 'Memproses...' : (currentUser?.role === 'MasterAdmin' ? 'Ya, Hapus Pengguna' : 'Ya, Ajukan Penghapusan')}
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
            <Label htmlFor="newPassword">Password Baru (minimal 6 karakter)</Label>
            <Input 
              id="newPassword" 
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


      <Dialog open={isEditAdminDialogOpen} onOpenChange={(open) => {
          if (!open) setCurrentEditingAdmin(null);
          setIsEditAdminDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Admin: {currentEditingAdmin?.fullName}</DialogTitle>
            <DialogDescription>Perbarui detail Admin. ID Aplikasi tidak dapat diubah.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit(handleEditAdmin)} className="space-y-4 py-4">
            <div>
              <Label htmlFor="editAdminFullName">Nama Lengkap <span className="text-destructive">*</span></Label>
              <Input id="editAdminFullName" {...registerEdit("fullName")} autoComplete="name" />
              {errorsEdit.fullName && <p className="text-destructive text-sm mt-1">{errorsEdit.fullName.message}</p>}
            </div>
            <div>
              <Label htmlFor="editAdminEmail">Email</Label>
              <Input id="editAdminEmail" type="email" {...registerEdit("email")} readOnly className="bg-muted/50" />
              {errorsEdit.email && <p className="text-destructive text-sm mt-1">{errorsEdit.email.message}</p>}
               <p className="text-xs text-muted-foreground mt-1">Email login tidak dapat diubah dari form ini.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetEdit(); setIsEditAdminDialogOpen(false); setCurrentEditingAdmin(null); }}>Batal</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <FileUp className="mr-2 h-5 w-5 text-primary" />
            Impor Admin dari Excel
          </CardTitle>
          <CardDescription>
            Tambahkan beberapa akun admin sekaligus menggunakan file Excel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="excel-file-admin">Pilih File Excel (.xlsx)</Label>
            <Input
              id="excel-file-admin"
              type="file"
              accept=".xlsx, .xls"
              className="mt-1"
              onChange={handleFileSelectAndImport}
              ref={fileInputRef}
              disabled={isImporting}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Format kolom yang diharapkan: fullName, email, passwordValue, id (optional).
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto" disabled={isImporting}>
              <FileUp className="mr-2 h-4 w-4" /> {isImporting ? 'Mengimpor...' : 'Impor Data Admin'}
            </Button>
            <Button onClick={handleDownloadTemplate} variant="outline" className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Unduh Template
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
