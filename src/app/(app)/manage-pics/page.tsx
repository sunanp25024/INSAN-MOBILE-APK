
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Briefcase, FileUp, UserPlus, Edit, Trash2, EyeOff, Eye } from 'lucide-react';
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

const picSchema = z.object({
  id: z.string().min(1, "ID PIC tidak boleh kosong").optional(),
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  workLocation: z.string().min(3, "Area tanggung jawab minimal 3 karakter"),
});

type PICFormData = z.infer<typeof picSchema>;

const initialPICData: UserProfile[] = [
    { id: 'PIC001', fullName: 'PIC Lapangan Satu', email: 'pic001@example.com', role: 'PIC', workLocation: 'Jakarta Pusat', status: 'Aktif' },
    { id: 'PIC002', fullName: 'PIC Wilayah Dua', email: 'pic002@example.com', role: 'PIC', workLocation: 'Bandung Kota', status: 'Aktif' },
];

export default function ManagePICsPage() {
  const { toast } = useToast();
  const [pics, setPics] = useState<UserProfile[]>(initialPICData);
  const [isAddPICDialogOpen, setIsAddPICDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PICFormData>({
    resolver: zodResolver(picSchema),
  });

  const handleAddPIC: SubmitHandler<PICFormData> = (data) => {
    const newPICId = data.id || `PIC${String(pics.length + 1).padStart(3, '0')}`;
    const newPIC: UserProfile = {
      ...data,
      id: newPICId,
      role: 'PIC',
      status: 'Aktif',
    };
    setPics(prev => [...prev, newPIC]);
    toast({ title: "PIC Ditambahkan", description: `PIC ${data.fullName} berhasil ditambahkan.` });
    reset({id: '', fullName: '', email: '', password: '', workLocation: ''});
    setIsAddPICDialogOpen(false);
  };
  
  const handleImportPICs = () => {
     toast({ title: "Fitur Dalam Pengembangan", description: "Impor PIC dari Excel belum diimplementasikan." });
  };

  const filteredPICs = pics.filter(pic => 
    pic.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pic.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pic.email && pic.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (pic.workLocation && pic.workLocation.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
              <Button className="mt-2 sm:mt-0 w-full sm:w-auto">
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
                  <Label htmlFor="picId">ID PIC (Opsional)</Label>
                  <Input id="picId" {...register("id")} placeholder="Otomatis jika kosong (cth: PIC00X)" />
                </div>
                <div>
                  <Label htmlFor="picFullName">Nama Lengkap <span className="text-destructive">*</span></Label>
                  <Input id="picFullName" {...register("fullName")} />
                  {errors.fullName && <p className="text-destructive text-sm mt-1">{errors.fullName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="picEmail">Email <span className="text-destructive">*</span></Label>
                  <Input id="picEmail" type="email" {...register("email")} />
                  {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="picPassword">Password Awal <span className="text-destructive">*</span></Label>
                  <Input id="picPassword" type="password" {...register("password")} />
                  {errors.password && <p className="text-destructive text-sm mt-1">{errors.password.message}</p>}
                </div>
                <div>
                  <Label htmlFor="picWorkLocation">Area Tanggung Jawab <span className="text-destructive">*</span></Label>
                  <Input id="picWorkLocation" {...register("workLocation")} placeholder="cth: Jakarta Pusat"/>
                  {errors.workLocation && <p className="text-destructive text-sm mt-1">{errors.workLocation.message}</p>}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { reset({id: '', fullName: '', email: '', password: '', workLocation: ''}); setIsAddPICDialogOpen(false); }}>Batal</Button>
                  <Button type="submit">Simpan PIC</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
           <div className="mb-4">
            <Input 
              placeholder="Cari PIC (ID, Nama, Email, Area)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
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
                  <TableRow key={pic.id}>
                    <TableCell className="font-medium">{pic.id}</TableCell>
                    <TableCell>{pic.fullName}</TableCell>
                    <TableCell>{pic.email}</TableCell>
                    <TableCell>{pic.workLocation}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${pic.status === 'Aktif' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {pic.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center space-x-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => toast({title: "Fitur Dalam Pengembangan", description: `Edit untuk ${pic.id} belum diimplementasikan.`})}><Edit size={16}/></Button>
                       <Button variant={pic.status === 'Aktif' ? "outline" : "outline"} size="icon" className={`h-8 w-8 ${pic.status === 'Aktif' ? 'hover:bg-yellow-100 dark:hover:bg-yellow-800' : 'hover:bg-green-100 dark:hover:bg-green-800'}`} onClick={() => toast({title: "Fitur Dalam Pengembangan", description: `Ubah status untuk ${pic.id} belum diimplementasikan.`})}>
                        {pic.status === 'Aktif' ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </Button>
                      <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => toast({title: "Fitur Dalam Pengembangan", description: `Hapus ${pic.id} belum diimplementasikan.`})}><Trash2 size={16}/></Button>
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
        </CardContent>
      </Card>

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

