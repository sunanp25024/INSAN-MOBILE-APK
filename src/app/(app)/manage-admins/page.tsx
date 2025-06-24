
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileUp, UserPlus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types';
import { Switch } from '@/components/ui/switch';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, Timestamp } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createUserAccount } from '@/lib/firebaseAdminActions';

const adminSchema = z.object({
  id: z.string().min(1, "ID Aplikasi Admin tidak boleh kosong (cth: ADMIN00X)").optional(), 
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  passwordValue: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal('')),
});

const editAdminSchema = adminSchema.omit({ passwordValue: true });

type AdminFormData = z.infer<typeof adminSchema>;
type EditAdminFormData = z.infer<typeof editAdminSchema>;


export default function ManageAdminsPage() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddAdminDialogOpen, setIsAddAdminDialogOpen] = useState(false);
  const [isEditAdminDialogOpen, setIsEditAdminDialogOpen] = useState(false);
  const [currentEditingAdmin, setCurrentEditingAdmin] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

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
    if (!data.passwordValue) {
      toast({ title: "Password Dibutuhkan", description: "Password awal wajib diisi untuk admin baru.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    if (!currentUser) {
      toast({ title: "Error", description: "Tidak dapat memverifikasi pengguna saat ini.", variant: "destructive" });
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
    setValueEdit('id', admin.id);
    setValueEdit('fullName', admin.fullName);
    setValueEdit('email', admin.email || '');
    setIsEditAdminDialogOpen(true);
  };

  const handleEditAdmin: SubmitHandler<EditAdminFormData> = async (data) => {
    if (!currentEditingAdmin || !currentEditingAdmin.uid) return;
    setIsSubmitting(true);
    
    if (data.id && data.id !== currentEditingAdmin.id && admins.some(admin => admin.id === data.id && admin.uid !== currentEditingAdmin.uid)) {
      toast({ title: "Gagal Memperbarui", description: `ID Aplikasi Admin ${data.id} sudah digunakan oleh admin lain.`, variant: "destructive"});
      setIsSubmitting(false);
      return;
    }
    if (data.email && data.email !== currentEditingAdmin.email && admins.some(admin => admin.email === data.email && admin.uid !== currentEditingAdmin.uid)) {
        toast({ title: "Gagal Memperbarui", description: `Email ${data.email} sudah digunakan oleh admin lain.`, variant: "destructive"});
        setIsSubmitting(false);
        return;
    }

    try {
      const adminDocRef = doc(db, "users", currentEditingAdmin.uid);
      const updatedData: Partial<UserProfile> = {
        fullName: data.fullName,
        email: data.email,
        updatedAt: Timestamp.now().toDate().toISOString(),
        updatedBy: currentUser ? { uid: currentUser.uid, name: currentUser.fullName, role: currentUser.role } : undefined
      };
      
      await updateDoc(adminDocRef, updatedData);
      toast({ title: "Admin Diperbarui", description: `Data Admin ${data.fullName} berhasil diperbarui.` });
      fetchAdmins();
      resetEdit({ id: '', fullName: '', email: '' });
      setIsEditAdminDialogOpen(false);
      setCurrentEditingAdmin(null);
    } catch (error: any) {
      console.error("Error updating admin: ", error);
      toast({ title: "Error", description: `Gagal memperbarui admin: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteAdmin = async (adminToDelete: UserProfile) => {
    if (!adminToDelete.uid) {
        toast({ title: "Error", description: "UID Admin tidak ditemukan.", variant: "destructive" });
        return;
    }
    if (!window.confirm(`Apakah Anda yakin ingin menghapus Admin ${adminToDelete.fullName}? Profil Firestore akan dihapus. Akun login di Authentication TIDAK terhapus.`)) {
        return;
    }

    try {
        await deleteDoc(doc(db, "users", adminToDelete.uid));
        toast({ title: "Admin Dihapus (Profil)", description: `Profil Admin ${adminToDelete.fullName} telah dihapus dari Firestore.` });
        fetchAdmins();
    } catch (error: any) {
        console.error("Error deleting admin profile: ", error);
        toast({ title: "Error Menghapus Profil", description: `Gagal menghapus profil admin: ${error.message}`, variant: "destructive" });
    }
};

  const handleImportAdmins = () => {
    toast({ title: "Fitur Dalam Pengembangan", description: "Impor Admin dari Excel belum diimplementasikan." });
  };

  const handleStatusChange = async (adminToUpdate: UserProfile, newStatusActive: boolean) => {
    if (!adminToUpdate.uid) {
      toast({ title: "Error", description: "UID Admin tidak ditemukan.", variant: "destructive" });
      return;
    }
    const newStatus = newStatusActive ? 'Aktif' : 'Nonaktif';
    try {
      const adminDocRef = doc(db, "users", adminToUpdate.uid);
      await updateDoc(adminDocRef, { 
          status: newStatus,
          updatedAt: Timestamp.now().toDate().toISOString(),
          updatedBy: currentUser ? { uid: currentUser.uid, name: currentUser.fullName, role: currentUser.role } : undefined
      });
      toast({
        title: "Status Admin Diperbarui",
        description: `Status admin ${adminToUpdate.fullName} telah diubah menjadi ${newStatus}.`,
      });
      fetchAdmins();
    } catch (error: any) {
      console.error("Error updating admin status: ", error);
      toast({ title: "Error", description: `Gagal memperbarui status admin: ${error.message}`, variant: "destructive" });
    }
  };

  const filteredAdmins = admins.filter(admin =>
    admin.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (admin.email && admin.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
                  <Input id="addAdminFullName" {...register("fullName")} />
                  {errors.fullName && <p className="text-destructive text-sm mt-1">{errors.fullName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="addAdminEmail">Email (untuk Login) <span className="text-destructive">*</span></Label>
                  <Input id="addAdminEmail" type="email" {...register("email")} />
                  {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="addAdminPassword">Password Awal <span className="text-destructive">*</span></Label>
                  <Input id="addAdminPassword" type="password" {...register("passwordValue")} />
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
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenEditDialog(admin)}><Edit size={16}/></Button>
                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteAdmin(admin)}><Trash2 size={16}/></Button>
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
      
      <Dialog open={isEditAdminDialogOpen} onOpenChange={(open) => {
          if (!open) setCurrentEditingAdmin(null);
          setIsEditAdminDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Admin: {currentEditingAdmin?.fullName}</DialogTitle>
            <DialogDescription>Perbarui detail Admin. ID Aplikasi dan Email dapat diubah. Perubahan email di sini hanya di profil Firestore, tidak mengubah email login Firebase Auth.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit(handleEditAdmin)} className="space-y-4 py-4">
            <div>
              <Label htmlFor="editAdminAppId">ID Aplikasi Admin</Label>
              <Input id="editAdminAppId" {...registerEdit("id")} />
              {errorsEdit.id && <p className="text-destructive text-sm mt-1">{errorsEdit.id.message}</p>}
            </div>
            <div>
              <Label htmlFor="editAdminFullName">Nama Lengkap <span className="text-destructive">*</span></Label>
              <Input id="editAdminFullName" {...registerEdit("fullName")} />
              {errorsEdit.fullName && <p className="text-destructive text-sm mt-1">{errorsEdit.fullName.message}</p>}
            </div>
            <div>
              <Label htmlFor="editAdminEmail">Email <span className="text-destructive">*</span></Label>
              <Input id="editAdminEmail" type="email" {...registerEdit("email")} />
              {errorsEdit.email && <p className="text-destructive text-sm mt-1">{errorsEdit.email.message}</p>}
               <p className="text-xs text-muted-foreground mt-1">Mengubah email di sini tidak mengubah email login Firebase Auth.</p>
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
            <Input id="excel-file-admin" type="file" accept=".xlsx, .xls" className="mt-1" />
          </div>
          <p className="text-xs text-muted-foreground">
            Format kolom yang diharapkan: ID Aplikasi Admin (opsional), Nama Lengkap, Email (untuk login), Password Awal.
          </p>
          <Button onClick={handleImportAdmins} className="w-full sm:w-auto">
            <FileUp className="mr-2 h-4 w-4" /> Impor Data Admin
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
