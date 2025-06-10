
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileUp, UserPlus, Edit, Trash2 } from 'lucide-react';
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

const adminSchema = z.object({
  id: z.string().min(1, "ID Admin tidak boleh kosong").optional(), // ID is optional for add, but present for edit
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  passwordValue: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal('')), // Optional for edit
});

type AdminFormData = z.infer<typeof adminSchema>;

const initialAdminData: UserProfile[] = [
    { id: 'ADMIN001', fullName: 'Admin Staff Satu', email: 'admin001@example.com', role: 'Admin', status: 'Aktif', passwordValue: 'admin123' },
    { id: 'ADMIN002', fullName: 'Admin Staff Dua', email: 'admin002@example.com', role: 'Admin', status: 'Nonaktif', passwordValue: 'admin123' },
];

export default function ManageAdminsPage() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<UserProfile[]>(initialAdminData);
  const [isAddAdminDialogOpen, setIsAddAdminDialogOpen] = useState(false);
  const [isEditAdminDialogOpen, setIsEditAdminDialogOpen] = useState(false);
  const [currentEditingAdmin, setCurrentEditingAdmin] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<AdminFormData>({
    resolver: zodResolver(adminSchema),
  });

  const handleAddAdmin: SubmitHandler<AdminFormData> = (data) => {
    const newAdminId = data.id && data.id.trim() !== '' ? data.id : `ADMIN${String(Date.now()).slice(-6)}`;
    if (admins.find(admin => admin.id === newAdminId)) {
      toast({ title: "Gagal Menambahkan", description: `ID Admin ${newAdminId} sudah ada.`, variant: "destructive"});
      return;
    }
    const newAdmin: UserProfile = {
      ...data,
      id: newAdminId,
      role: 'Admin',
      status: 'Aktif',
      passwordValue: data.passwordValue || 'defaultPassword', // Ensure passwordValue is set
    };
    setAdmins(prev => [...prev, newAdmin]);
    toast({ title: "Admin Ditambahkan", description: `Admin ${data.fullName} (ID: ${newAdminId}) berhasil ditambahkan.` });
    reset({id: '', fullName: '', email: '', passwordValue: ''});
    setIsAddAdminDialogOpen(false);
  };

  const handleOpenEditDialog = (admin: UserProfile) => {
    setCurrentEditingAdmin(admin);
    setValue('id', admin.id);
    setValue('fullName', admin.fullName);
    setValue('email', admin.email || '');
    setValue('passwordValue', ''); // Clear password for edit, user can enter a new one if they want
    setIsEditAdminDialogOpen(true);
  };

  const handleEditAdmin: SubmitHandler<AdminFormData> = (data) => {
    if (!currentEditingAdmin) return;

    setAdmins(prevAdmins =>
      prevAdmins.map(admin =>
        admin.id === currentEditingAdmin.id
          ? {
              ...admin,
              fullName: data.fullName,
              email: data.email,
              passwordValue: data.passwordValue && data.passwordValue.trim() !== '' ? data.passwordValue : admin.passwordValue, // Update password only if new one is provided
            }
          : admin
      )
    );
    toast({ title: "Admin Diperbarui", description: `Data Admin ${data.fullName} berhasil diperbarui.` });
    reset({id: '', fullName: '', email: '', passwordValue: ''});
    setIsEditAdminDialogOpen(false);
    setCurrentEditingAdmin(null);
  };

  const handleImportAdmins = () => {
    toast({ title: "Fitur Dalam Pengembangan", description: "Impor Admin dari Excel belum diimplementasikan." });
  };

  const handleStatusChange = (adminId: string, newStatus: boolean) => {
    setAdmins(prevAdmins => 
      prevAdmins.map(admin => 
        admin.id === adminId ? { ...admin, status: newStatus ? 'Aktif' : 'Nonaktif' } : admin
      )
    );
    toast({
      title: "Status Admin Diperbarui",
      description: `Status admin ${adminId} telah diubah menjadi ${newStatus ? 'Aktif' : 'Nonaktif'}. Akun ${newStatus ? 'dapat' : 'tidak dapat'} digunakan.`,
    });
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
              <Button className="mt-2 sm:mt-0 w-full sm:w-auto" onClick={() => reset()}>
                <UserPlus className="mr-2 h-4 w-4" /> Tambah Admin Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Tambah Admin Baru</DialogTitle>
                <DialogDescription>Isi detail untuk Admin baru.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(handleAddAdmin)} className="space-y-4 py-4">
                <div>
                  <Label htmlFor="addAdminId">ID Admin (Opsional)</Label>
                  <Input id="addAdminId" {...register("id")} placeholder="Otomatis jika kosong (cth: ADMINXXXXX)" />
                  {errors.id && <p className="text-destructive text-sm mt-1">{errors.id.message}</p>}
                </div>
                <div>
                  <Label htmlFor="addAdminFullName">Nama Lengkap <span className="text-destructive">*</span></Label>
                  <Input id="addAdminFullName" {...register("fullName")} />
                  {errors.fullName && <p className="text-destructive text-sm mt-1">{errors.fullName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="addAdminEmail">Email <span className="text-destructive">*</span></Label>
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
                  <Button type="submit">Simpan Admin</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Cari Admin (ID, Nama, Email)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Card className="border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Admin</TableHead>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins.length > 0 ? filteredAdmins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.id}</TableCell>
                    <TableCell>{admin.fullName}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <Switch
                        checked={admin.status === 'Aktif'}
                        onCheckedChange={(newStatus) => handleStatusChange(admin.id, newStatus)}
                        aria-label={`Status admin ${admin.fullName}`}
                      />
                      <span className={`ml-2 text-xs ${admin.status === 'Aktif' ? 'text-green-600' : 'text-red-600'}`}>
                        {admin.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center space-x-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenEditDialog(admin)}><Edit size={16}/></Button>
                      <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => toast({title: "Fitur Dalam Pengembangan", description: `Hapus ${admin.id} belum diimplementasikan.`})}><Trash2 size={16}/></Button>
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
        </CardContent>
      </Card>
      
      {/* Edit Admin Dialog */}
      <Dialog open={isEditAdminDialogOpen} onOpenChange={setIsEditAdminDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
            <DialogDescription>Perbarui detail Admin. ID tidak dapat diubah.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleEditAdmin)} className="space-y-4 py-4">
            <div>
              <Label htmlFor="editAdminId">ID Admin</Label>
              <Input id="editAdminId" {...register("id")} readOnly className="bg-muted/50" />
            </div>
            <div>
              <Label htmlFor="editAdminFullName">Nama Lengkap <span className="text-destructive">*</span></Label>
              <Input id="editAdminFullName" {...register("fullName")} />
              {errors.fullName && <p className="text-destructive text-sm mt-1">{errors.fullName.message}</p>}
            </div>
            <div>
              <Label htmlFor="editAdminEmail">Email <span className="text-destructive">*</span></Label>
              <Input id="editAdminEmail" type="email" {...register("email")} />
              {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="editAdminPassword">Password Baru (Opsional)</Label>
              <Input id="editAdminPassword" type="password" {...register("passwordValue")} placeholder="Kosongkan jika tidak ingin diubah" />
              {errors.passwordValue && errors.passwordValue.message !== '' && <p className="text-destructive text-sm mt-1">{errors.passwordValue.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { reset(); setIsEditAdminDialogOpen(false); setCurrentEditingAdmin(null); }}>Batal</Button>
              <Button type="submit">Simpan Perubahan</Button>
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
            Format kolom yang diharapkan: ID Admin (opsional), Nama Lengkap, Email, Password Awal.
          </p>
          <Button onClick={handleImportAdmins} className="w-full sm:w-auto">
            <FileUp className="mr-2 h-4 w-4" /> Impor Data Admin
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
