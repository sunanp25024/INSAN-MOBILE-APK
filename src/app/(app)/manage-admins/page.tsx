
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Users, FileUp, UserPlus, Edit, Trash2, EyeOff, Eye } from 'lucide-react';
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

const adminSchema = z.object({
  id: z.string().min(1, "ID Admin tidak boleh kosong").optional(), // Optional for auto-generation
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

type AdminFormData = z.infer<typeof adminSchema>;

const initialAdminData: UserProfile[] = [
    { id: 'ADMIN001', fullName: 'Admin Staff Satu', email: 'admin001@example.com', role: 'Admin', status: 'Aktif' },
    { id: 'ADMIN002', fullName: 'Admin Staff Dua', email: 'admin002@example.com', role: 'Admin', status: 'Nonaktif' },
];

export default function ManageAdminsPage() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<UserProfile[]>(initialAdminData);
  const [isAddAdminDialogOpen, setIsAddAdminDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AdminFormData>({
    resolver: zodResolver(adminSchema),
  });

  const handleAddAdmin: SubmitHandler<AdminFormData> = (data) => {
    const newAdminId = data.id || `ADMIN${String(admins.length + 1).padStart(3, '0')}`;
    const newAdmin: UserProfile = {
      ...data,
      id: newAdminId,
      role: 'Admin',
      status: 'Aktif',
    };
    setAdmins(prev => [...prev, newAdmin]);
    toast({ title: "Admin Ditambahkan", description: `Admin ${data.fullName} berhasil ditambahkan.` });
    reset();
    setIsAddAdminDialogOpen(false);
  };

  const handleImportAdmins = () => {
    alert("Fitur impor Admin dari Excel belum diimplementasikan.");
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
              <Button className="mt-2 sm:mt-0 w-full sm:w-auto">
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
                  <Label htmlFor="adminId">ID Admin (Opsional)</Label>
                  <Input id="adminId" {...register("id")} placeholder="Otomatis jika kosong" />
                  {errors.id && <p className="text-destructive text-sm mt-1">{errors.id.message}</p>}
                </div>
                <div>
                  <Label htmlFor="adminFullName">Nama Lengkap <span className="text-destructive">*</span></Label>
                  <Input id="adminFullName" {...register("fullName")} />
                  {errors.fullName && <p className="text-destructive text-sm mt-1">{errors.fullName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="adminEmail">Email <span className="text-destructive">*</span></Label>
                  <Input id="adminEmail" type="email" {...register("email")} />
                  {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="adminPassword">Password Awal <span className="text-destructive">*</span></Label>
                  <Input id="adminPassword" type="password" {...register("password")} />
                  {errors.password && <p className="text-destructive text-sm mt-1">{errors.password.message}</p>}
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
                      <span className={`px-2 py-0.5 rounded-full text-xs ${admin.status === 'Aktif' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {admin.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center space-x-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => alert(`Edit ${admin.id}`)}><Edit size={16}/></Button>
                      <Button variant={admin.status === 'Aktif' ? "outline" : "outline"} size="icon" className={`h-8 w-8 ${admin.status === 'Aktif' ? 'hover:bg-yellow-100 dark:hover:bg-yellow-800' : 'hover:bg-green-100 dark:hover:bg-green-800'}`} onClick={() => alert(`${admin.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'} ${admin.id}`)}>
                        {admin.status === 'Aktif' ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </Button>
                      <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => alert(`Hapus ${admin.id}`)}><Trash2 size={16}/></Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">Tidak ada data Admin.</TableCell>
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
