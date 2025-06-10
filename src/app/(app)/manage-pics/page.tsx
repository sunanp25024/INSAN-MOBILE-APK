
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, FileUp, UserPlus, Edit, Trash2 } from 'lucide-react';
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

const picSchema = z.object({
  id: z.string().min(1, "ID PIC tidak boleh kosong").optional(),
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  passwordValue: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal('')),
  workLocation: z.string().min(3, "Area tanggung jawab minimal 3 karakter"), // Represents 'Area' for PIC
});

type PICFormData = z.infer<typeof picSchema>;

const initialPICData: UserProfile[] = [
    { id: 'PIC001', fullName: 'PIC Lapangan Satu', email: 'pic001@example.com', role: 'PIC', workLocation: 'Jakarta Pusat', status: 'Aktif', passwordValue: 'pic123' },
    { id: 'PIC002', fullName: 'PIC Wilayah Dua', email: 'pic002@example.com', role: 'PIC', workLocation: 'Bandung Kota', status: 'Aktif', passwordValue: 'pic123' },
];

export default function ManagePICsPage() {
  const { toast } = useToast();
  const [pics, setPics] = useState<UserProfile[]>(initialPICData);
  const [isAddPICDialogOpen, setIsAddPICDialogOpen] = useState(false);
  const [isEditPICDialogOpen, setIsEditPICDialogOpen] = useState(false);
  const [currentEditingPIC, setCurrentEditingPIC] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
      try {
        setCurrentUser(JSON.parse(userDataString) as UserProfile);
      } catch (error) { console.error("Error parsing user data for manage pics page", error); }
    }
  }, []);

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<PICFormData>({
    resolver: zodResolver(picSchema),
  });

  const handleAddPIC: SubmitHandler<PICFormData> = (data) => {
    const newPICId = data.id && data.id.trim() !== '' ? data.id : `PIC${String(Date.now()).slice(-6)}`;
    
    if (currentUser?.role === 'Admin') {
      if (pics.find(pic => pic.id === newPICId)) {
        toast({ title: "Gagal Mengajukan", description: `ID PIC ${newPICId} sudah ada atau sedang diajukan.`, variant: "destructive"});
        return;
      }
      toast({ title: "Permintaan Diajukan", description: `Permintaan penambahan PIC ${data.fullName} (ID: ${newPICId}) telah dikirim ke MasterAdmin untuk persetujuan.` });
    } else { // MasterAdmin or other direct roles
      if (pics.find(pic => pic.id === newPICId)) {
        toast({ title: "Gagal Menambahkan", description: `ID PIC ${newPICId} sudah ada.`, variant: "destructive"});
        return;
      }
      const newPIC: UserProfile = {
        ...data,
        id: newPICId,
        role: 'PIC',
        status: 'Aktif',
        passwordValue: data.passwordValue || 'defaultPassword',
      };
      setPics(prev => [...prev, newPIC]);
      toast({ title: "PIC Ditambahkan", description: `PIC ${data.fullName} (ID: ${newPICId}) berhasil ditambahkan.` });
    }
    reset({id: '', fullName: '', email: '', passwordValue: '', workLocation: ''});
    setIsAddPICDialogOpen(false);
  };

  const handleOpenEditDialog = (pic: UserProfile) => {
    setCurrentEditingPIC(pic);
    setValue('id', pic.id);
    setValue('fullName', pic.fullName);
    setValue('email', pic.email || '');
    setValue('workLocation', pic.workLocation || '');
    setValue('passwordValue', ''); // Clear password for edit
    setIsEditPICDialogOpen(true);
  };

  const handleEditPIC: SubmitHandler<PICFormData> = (data) => {
    if (!currentEditingPIC) return;

    if (currentUser?.role === 'Admin') {
      toast({ title: "Permintaan Diajukan", description: `Permintaan perubahan data PIC ${data.fullName} (ID: ${currentEditingPIC.id}) telah dikirim ke MasterAdmin untuk persetujuan.` });
    } else { // MasterAdmin or other direct roles
      setPics(prevPics =>
        prevPics.map(pic =>
          pic.id === currentEditingPIC.id
            ? {
                ...pic,
                fullName: data.fullName,
                email: data.email,
                workLocation: data.workLocation,
                passwordValue: data.passwordValue && data.passwordValue.trim() !== '' ? data.passwordValue : pic.passwordValue,
              }
            : pic
        )
      );
      toast({ title: "PIC Diperbarui", description: `Data PIC ${data.fullName} berhasil diperbarui.` });
    }
    reset({id: '', fullName: '', email: '', passwordValue: '', workLocation: ''});
    setIsEditPICDialogOpen(false);
    setCurrentEditingPIC(null);
  };


  const handleImportPICs = () => {
     toast({ title: "Fitur Dalam Pengembangan", description: "Impor PIC dari Excel belum diimplementasikan." });
  };
  
  const handleStatusChange = (picId: string, newStatus: boolean) => {
    if (currentUser?.role === 'Admin') {
      const pic = pics.find(p => p.id === picId);
      toast({
        title: "Permintaan Diajukan",
        description: `Permintaan perubahan status PIC ${pic?.fullName || picId} menjadi ${newStatus ? 'Aktif' : 'Nonaktif'} telah dikirim ke MasterAdmin.`,
      });
    } else { // MasterAdmin or other direct roles
      setPics(prevPics => 
        prevPics.map(pic => 
          pic.id === picId ? { ...pic, status: newStatus ? 'Aktif' : 'Nonaktif' } : pic
        )
      );
      toast({
        title: "Status PIC Diperbarui",
        description: `Status PIC ${picId} telah diubah menjadi ${newStatus ? 'Aktif' : 'Nonaktif'}. Akun ${newStatus ? 'dapat' : 'tidak dapat'} digunakan.`,
      });
    }
  };

  const filteredPICs = pics.filter(pic =>
    pic.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pic.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pic.email && pic.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (pic.workLocation && pic.workLocation.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  if (!currentUser) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
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
                ? "Kelola akun PIC. Penambahan atau perubahan data memerlukan persetujuan MasterAdmin."
                : "Kelola akun pengguna dengan peran PIC (Person In Charge)."}
            </CardDescription>
          </div>
          <Dialog open={isAddPICDialogOpen} onOpenChange={setIsAddPICDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-2 sm:mt-0 w-full sm:w-auto" onClick={() => reset()}>
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
                      <Switch
                        checked={pic.status === 'Aktif'}
                        onCheckedChange={(newStatus) => handleStatusChange(pic.id, newStatus)}
                        aria-label={`Status PIC ${pic.fullName}`}
                        onClick={(e) => {
                          if (currentUser.role === 'Admin') {
                            e.preventDefault(); 
                            handleStatusChange(pic.id, !(pic.status === 'Aktif'));
                          }
                        }}
                      />
                      <span className={`ml-2 text-xs ${pic.status === 'Aktif' ? 'text-green-600' : 'text-red-600'}`}>
                        {pic.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center space-x-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenEditDialog(pic)}><Edit size={16}/></Button>
                      <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => {
                        if (currentUser.role === 'Admin') {
                            toast({title: "Permintaan Diajukan", description: `Penghapusan PIC ${pic.id} memerlukan persetujuan MasterAdmin.`});
                        } else {
                            toast({title: "Fitur Dalam Pengembangan", description: `Hapus ${pic.id} belum diimplementasikan.`});
                        }
                      }}><Trash2 size={16}/></Button>
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
      
      {/* Edit PIC Dialog */}
      <Dialog open={isEditPICDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCurrentEditingPIC(null);
          reset();
        }
        setIsEditPICDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit PIC: {currentEditingPIC?.fullName}</DialogTitle>
            <DialogDescription>Perbarui detail PIC. ID tidak dapat diubah.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleEditPIC)} className="space-y-4 py-4">
            <div>
              <Label htmlFor="editPicId">ID PIC</Label>
              <Input id="editPicId" {...register("id")} readOnly className="bg-muted/50" />
            </div>
            <div>
              <Label htmlFor="editPicFullName">Nama Lengkap <span className="text-destructive">*</span></Label>
              <Input id="editPicFullName" {...register("fullName")} />
              {errors.fullName && <p className="text-destructive text-sm mt-1">{errors.fullName.message}</p>}
            </div>
            <div>
              <Label htmlFor="editPicEmail">Email <span className="text-destructive">*</span></Label>
              <Input id="editPicEmail" type="email" {...register("email")} />
              {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="editPicWorkLocation">Area Tanggung Jawab <span className="text-destructive">*</span></Label>
              <Input id="editPicWorkLocation" {...register("workLocation")} />
              {errors.workLocation && <p className="text-destructive text-sm mt-1">{errors.workLocation.message}</p>}
            </div>
            <div>
              <Label htmlFor="editPicPassword">Password Baru (Opsional)</Label>
              <Input id="editPicPassword" type="password" {...register("passwordValue")} placeholder="Kosongkan jika tidak ingin diubah"/>
              {errors.passwordValue && errors.passwordValue.message && errors.passwordValue.message !== '' && <p className="text-destructive text-sm mt-1">{errors.passwordValue.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { reset(); setIsEditPICDialogOpen(false); setCurrentEditingPIC(null);}}>Batal</Button>
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

