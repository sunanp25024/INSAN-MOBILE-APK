
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

const kurirSchema = z.object({
  id: z.string().min(1, "ID Kurir tidak boleh kosong").optional(),
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  email: z.string().email("Format email tidak valid").optional().or(z.literal('')), 
  password: z.string().min(6, "Password minimal 6 karakter"),
  workLocation: z.string().min(3, "Lokasi kerja minimal 3 karakter"),
});

type KurirFormData = z.infer<typeof kurirSchema>;

const initialKurirData: UserProfile[] = [
    { id: 'PISTEST2025', fullName: 'Budi Santoso', email: 'budi.s@example.com', role: 'Kurir', workLocation: 'Jakarta Pusat Hub', status: 'Aktif' },
    { id: 'KURIR002', fullName: 'Ani Yudhoyono', email: 'ani.y@example.com', role: 'Kurir', workLocation: 'Bandung Kota Hub', status: 'Aktif' },
    { id: 'KURIR003', fullName: 'Charlie Van Houten', email: 'charlie.vh@example.com', role: 'Kurir', workLocation: 'Surabaya Timur Hub', status: 'Nonaktif' },
];

export default function ManageKurirsPage() {
  const { toast } = useToast();
  const [kurirs, setKurirs] = useState<UserProfile[]>(initialKurirData);
  const [isAddKurirDialogOpen, setIsAddKurirDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<KurirFormData>({
    resolver: zodResolver(kurirSchema),
  });

  const handleAddKurir: SubmitHandler<KurirFormData> = (data) => {
    const newKurirId = data.id || `KURIR${String(kurirs.length + 3).padStart(3, '0')}`; 
    const newKurir: UserProfile = {
      ...data,
      id: newKurirId,
      email: data.email || `${newKurirId.toLowerCase().replace(/\s+/g, '.')}@internal.spx`, // Auto-generate internal email
      role: 'Kurir',
      status: 'Aktif',
    };
    setKurirs(prev => [...prev, newKurir]);
    toast({ title: "Kurir Ditambahkan", description: `Kurir ${data.fullName} berhasil ditambahkan.` });
    reset({id: '', fullName: '', email: '', password: '', workLocation: ''});
    setIsAddKurirDialogOpen(false);
  };

  const handleImportKurirs = () => {
    toast({ title: "Fitur Dalam Pengembangan", description: "Impor Kurir dari Excel belum diimplementasikan." });
  };

  const filteredKurirs = kurirs.filter(kurir => 
    kurir.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kurir.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (kurir.email && kurir.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (kurir.workLocation && kurir.workLocation.toLowerCase().includes(searchTerm.toLowerCase()))
  );


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <CardTitle className="flex items-center text-2xl text-primary">
              <Users className="mr-3 h-7 w-7" />
              Manajemen Akun Kurir
            </CardTitle>
            <CardDescription>
              Kelola akun Kurir. Perubahan mungkin memerlukan persetujuan MasterAdmin.
            </CardDescription>
          </div>
          <Dialog open={isAddKurirDialogOpen} onOpenChange={setIsAddKurirDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-2 sm:mt-0 w-full sm:w-auto">
                <UserPlus className="mr-2 h-4 w-4" /> Tambah Kurir Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Tambah Kurir Baru</DialogTitle>
                <DialogDescription>Isi detail untuk Kurir baru.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(handleAddKurir)} className="space-y-4 py-4">
                <div>
                  <Label htmlFor="kurirId">ID Kurir (Opsional)</Label>
                  <Input id="kurirId" {...register("id")} placeholder="Otomatis jika kosong (cth: KURIR00X)" />
                </div>
                <div>
                  <Label htmlFor="kurirFullName">Nama Lengkap <span className="text-destructive">*</span></Label>
                  <Input id="kurirFullName" {...register("fullName")} />
                  {errors.fullName && <p className="text-destructive text-sm mt-1">{errors.fullName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="kurirEmail">Email (Opsional)</Label>
                  <Input id="kurirEmail" type="email" {...register("email")} placeholder="Otomatis jika kosong"/>
                  {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="kurirPassword">Password Awal <span className="text-destructive">*</span></Label>
                  <Input id="kurirPassword" type="password" {...register("password")} />
                  {errors.password && <p className="text-destructive text-sm mt-1">{errors.password.message}</p>}
                </div>
                <div>
                  <Label htmlFor="kurirWorkLocation">Lokasi Kerja (Hub) <span className="text-destructive">*</span></Label>
                  <Input id="kurirWorkLocation" {...register("workLocation")} placeholder="cth: Jakarta Selatan Hub" />
                  {errors.workLocation && <p className="text-destructive text-sm mt-1">{errors.workLocation.message}</p>}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { reset({id: '', fullName: '', email: '', password: '', workLocation: ''}); setIsAddKurirDialogOpen(false); }}>Batal</Button>
                  <Button type="submit">Simpan Kurir</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input 
              placeholder="Cari Kurir (ID, Nama, Email, Lokasi)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Card className="border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Kurir</TableHead>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Lokasi Kerja</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKurirs.length > 0 ? filteredKurirs.map((kurir) => (
                  <TableRow key={kurir.id}>
                    <TableCell className="font-medium">{kurir.id}</TableCell>
                    <TableCell>{kurir.fullName}</TableCell>
                    <TableCell>{kurir.email || '-'}</TableCell>
                    <TableCell>{kurir.workLocation}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${kurir.status === 'Aktif' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {kurir.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center space-x-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => toast({title: "Fitur Dalam Pengembangan", description: `Edit untuk ${kurir.id} belum diimplementasikan.`})}><Edit size={16}/></Button>
                      <Button variant={kurir.status === 'Aktif' ? "outline" : "outline"} size="icon" className={`h-8 w-8 ${kurir.status === 'Aktif' ? 'hover:bg-yellow-100 dark:hover:bg-yellow-800' : 'hover:bg-green-100 dark:hover:bg-green-800'}`} onClick={() => toast({title: "Fitur Dalam Pengembangan", description: `Ubah status untuk ${kurir.id} belum diimplementasikan.`})}>
                        {kurir.status === 'Aktif' ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </Button>
                      <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => toast({title: "Fitur Dalam Pengembangan", description: `Hapus ${kurir.id} belum diimplementasikan.`})}><Trash2 size={16}/></Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">Tidak ada data Kurir yang cocok dengan pencarian.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Menampilkan {filteredKurirs.length} dari {kurirs.length} Kurir.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <FileUp className="mr-2 h-5 w-5 text-primary" />
            Impor Kurir dari Excel
          </CardTitle>
          <CardDescription>
            Tambahkan beberapa akun kurir sekaligus menggunakan file Excel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="excel-file-kurir">Pilih File Excel (.xlsx)</Label>
            <Input id="excel-file-kurir" type="file" accept=".xlsx, .xls" className="mt-1" />
          </div>
          <p className="text-xs text-muted-foreground">
            Format kolom yang diharapkan: ID Kurir (opsional), Nama Lengkap, Email (opsional), Password Awal, Lokasi Kerja.
          </p>
          <Button onClick={handleImportKurirs} className="w-full sm:w-auto">
            <FileUp className="mr-2 h-4 w-4" /> Impor Data Kurir
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

