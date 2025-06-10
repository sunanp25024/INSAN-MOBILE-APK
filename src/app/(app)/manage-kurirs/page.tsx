
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileUp, UserPlus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, Wilayah, Area, Hub } from '@/types';
import { mockLocationsData } from '@/types'; // Import mock location data
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import { Switch } from '@/components/ui/switch';

const kurirSchema = z.object({
  id: z.string().min(1, "ID Kurir wajib diisi, cth: PISTESTXXXX").optional(),
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  nik: z.string().length(16, "NIK harus 16 digit").regex(/^\d+$/, "NIK hanya boleh berisi angka"),
  passwordValue: z.string().min(6, "Password minimal 6 karakter"),
  jabatan: z.string().min(3, "Jabatan minimal 3 karakter"),
  wilayah: z.string().min(1, "Wilayah wajib dipilih"),
  area: z.string().min(1, "Area wajib dipilih"),
  workLocation: z.string().min(1, "Lokasi kerja (Hub) wajib dipilih"), // Hub ID
  joinDate: z.date({ required_error: "Tanggal join wajib diisi" }),
  bankName: z.string().min(3, "Nama bank minimal 3 karakter").optional().or(z.literal('')),
  bankAccountNumber: z.string().min(5, "Nomor rekening minimal 5 digit").regex(/^\d+$/, "Nomor rekening hanya boleh berisi angka").optional().or(z.literal('')),
  bankRecipientName: z.string().min(3, "Nama pemilik rekening minimal 3 karakter").optional().or(z.literal('')),
  email: z.string().email("Format email tidak valid").optional().or(z.literal('')),
});

type KurirFormData = z.infer<typeof kurirSchema>;

const initialKurirData: UserProfile[] = [
    { id: 'PISTEST2025', fullName: 'Budi Santoso', nik: '3273201009900001', jabatan: 'Kurir Senior', email: 'budi.s@example.com', role: 'Kurir', wilayah: 'jabodetabek-banten', area: 'jakarta-pusat-jb', workLocation: 'jp-hub-thamrin', joinDate: new Date(2023, 4, 15).toISOString(), bankName: 'Bank Central Asia', bankAccountNumber: '1234567890', bankRecipientName: 'Budi Santoso', status: 'Aktif', passwordValue: '123456' },
    { id: 'KURIR002', fullName: 'Ani Yudhoyono', nik: '3273201009900002', jabatan: 'Kurir', email: 'ani.y@example.com', role: 'Kurir', wilayah: 'jawa-barat', area: 'bandung-kota-jabar', workLocation: 'bdg-hub-kota', joinDate: new Date(2023, 7, 1).toISOString(), bankName: 'Bank Mandiri', bankAccountNumber: '0987654321', bankRecipientName: 'Ani Yudhoyono', status: 'Aktif', passwordValue: '123456' },
    { id: 'KURIR003', fullName: 'Charlie Van Houten', nik: '3273201009900003', jabatan: 'Kurir', email: 'charlie.vh@example.com', role: 'Kurir', wilayah: 'jabodetabek-banten', area: 'jakarta-timur-jb', workLocation: 'jt-hub-cawang', joinDate: new Date(2024, 0, 10).toISOString(), bankName: 'Bank BRI', bankAccountNumber: '1122334455', bankRecipientName: 'Charlie Van Houten', status: 'Nonaktif', passwordValue: '123456' },
];

export default function ManageKurirsPage() {
  const { toast } = useToast();
  const [kurirs, setKurirs] = useState<UserProfile[]>(initialKurirData);
  const [isAddKurirDialogOpen, setIsAddKurirDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedWilayah, setSelectedWilayah] = useState<string | undefined>(undefined);
  const [availableAreas, setAvailableAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<string | undefined>(undefined);
  const [availableHubs, setAvailableHubs] = useState<Hub[]>([]);
  
  const { register, handleSubmit, reset, control, watch, formState: { errors }, setValue } = useForm<KurirFormData>({
    resolver: zodResolver(kurirSchema),
    defaultValues: {
      wilayah: '',
      area: '',
      workLocation: '',
    }
  });

  const watchWilayah = watch("wilayah");
  const watchArea = watch("area");

  useEffect(() => {
    if (watchWilayah) {
      const wilayahData = mockLocationsData.find(w => w.id === watchWilayah);
      setAvailableAreas(wilayahData?.areas.filter(a => !a.id.startsWith('all-area-')) || []);
      setValue("area", ""); // Reset area when wilayah changes
      setValue("workLocation", ""); // Reset hub when wilayah changes
    } else {
      setAvailableAreas([]);
    }
  }, [watchWilayah, setValue]);

  useEffect(() => {
    if (watchArea) {
      const areaData = availableAreas.find(a => a.id === watchArea);
      setAvailableHubs(areaData?.hubs.filter(h => !h.id.startsWith('all-hub-')) || []);
       setValue("workLocation", ""); // Reset hub when area changes
    } else {
      setAvailableHubs([]);
    }
  }, [watchArea, availableAreas, setValue]);


  const handleAddKurir: SubmitHandler<KurirFormData> = (data) => {
    const newKurirId = data.id || `K${String(Date.now()).slice(-7)}`; // Auto ID example
    const selectedWilayahName = mockLocationsData.find(w => w.id === data.wilayah)?.name;
    const selectedAreaName = availableAreas.find(a => a.id === data.area)?.name;
    const selectedHubName = availableHubs.find(h => h.id === data.workLocation)?.name;

    const newKurir: UserProfile = {
      ...data,
      id: newKurirId,
      email: data.email || `${newKurirId.toLowerCase().replace(/\s+/g, '.')}@internal.spx`,
      role: 'Kurir',
      status: 'Aktif',
      joinDate: data.joinDate.toISOString(),
      wilayah: selectedWilayahName, // Store name for display
      area: selectedAreaName, // Store name for display
      workLocation: selectedHubName, // Store Hub name for display in table
    };
    setKurirs(prev => [...prev, newKurir]);
    toast({ title: "Kurir Ditambahkan", description: `Kurir ${data.fullName} (ID: ${newKurirId}) berhasil ditambahkan.` });
    reset({
      id: '', fullName: '', nik: '', passwordValue: '', jabatan: '',
      wilayah: '', area: '', workLocation: '', joinDate: undefined,
      bankName: '', bankAccountNumber: '', bankRecipientName: '', email: ''
    });
    setIsAddKurirDialogOpen(false);
  };

  const handleImportKurirs = () => {
    toast({ title: "Fitur Dalam Pengembangan", description: "Impor Kurir dari Excel belum diimplementasikan." });
  };
  
  const handleStatusChange = (kurirId: string, newStatus: boolean) => {
    setKurirs(prevKurirs => 
      prevKurirs.map(kurir => 
        kurir.id === kurirId ? { ...kurir, status: newStatus ? 'Aktif' : 'Nonaktif' } : kurir
      )
    );
    toast({
      title: "Status Kurir Diperbarui",
      description: `Status kurir ${kurirId} telah diubah menjadi ${newStatus ? 'Aktif' : 'Nonaktif'}. Akun ${newStatus ? 'dapat' : 'tidak dapat'} digunakan.`,
    });
  };

  const filteredKurirs = kurirs.filter(kurir =>
    kurir.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kurir.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (kurir.email && kurir.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (kurir.workLocation && kurir.workLocation.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (kurir.nik && kurir.nik.includes(searchTerm)) ||
    (kurir.wilayah && kurir.wilayah.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (kurir.area && kurir.area.toLowerCase().includes(searchTerm.toLowerCase()))
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
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Kurir Baru</DialogTitle>
                <DialogDescription>Isi detail lengkap untuk Kurir baru.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(handleAddKurir)} className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="kurirId">ID Kurir (Opsional)</Label>
                    <Input id="kurirId" {...register("id")} placeholder="Otomatis jika kosong (cth: KXXXXXXX)" />
                    {errors.id && <p className="text-destructive text-sm mt-1">{errors.id.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="kurirFullName">Nama Lengkap <span className="text-destructive">*</span></Label>
                    <Input id="kurirFullName" {...register("fullName")} />
                    {errors.fullName && <p className="text-destructive text-sm mt-1">{errors.fullName.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="kurirNik">NIK <span className="text-destructive">*</span></Label>
                    <Input id="kurirNik" {...register("nik")} placeholder="16 digit NIK" />
                    {errors.nik && <p className="text-destructive text-sm mt-1">{errors.nik.message}</p>}
                  </div>
                   <div>
                    <Label htmlFor="kurirPassword">Password Awal <span className="text-destructive">*</span></Label>
                    <Input id="kurirPassword" type="password" {...register("passwordValue")} />
                    {errors.passwordValue && <p className="text-destructive text-sm mt-1">{errors.passwordValue.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="kurirJabatan">Jabatan <span className="text-destructive">*</span></Label>
                    <Input id="kurirJabatan" {...register("jabatan")} placeholder="cth: Kurir, Kurir Motor" />
                    {errors.jabatan && <p className="text-destructive text-sm mt-1">{errors.jabatan.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="kurirEmail">Email (Opsional)</Label>
                    <Input id="kurirEmail" type="email" {...register("email")} placeholder="Otomatis jika kosong"/>
                    {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
                  </div>
                </div>

                <Label className="font-semibold">Lokasi Penempatan:</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="kurirWilayah">Wilayah <span className="text-destructive">*</span></Label>
                    <Controller
                      name="wilayah"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger><SelectValue placeholder="Pilih Wilayah" /></SelectTrigger>
                          <SelectContent>
                            {mockLocationsData.filter(w => w.id !== 'all-wilayah').map(w => (
                              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.wilayah && <p className="text-destructive text-sm mt-1">{errors.wilayah.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="kurirArea">Area <span className="text-destructive">*</span></Label>
                     <Controller
                        name="area"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value} disabled={!watchWilayah || availableAreas.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Pilih Area" /></SelectTrigger>
                                <SelectContent>
                                    {availableAreas.map(a => (
                                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.area && <p className="text-destructive text-sm mt-1">{errors.area.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="kurirWorkLocation">Lokasi Kerja (Hub) <span className="text-destructive">*</span></Label>
                     <Controller
                        name="workLocation"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value} disabled={!watchArea || availableHubs.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Pilih Hub" /></SelectTrigger>
                                <SelectContent>
                                    {availableHubs.map(h => (
                                        <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.workLocation && <p className="text-destructive text-sm mt-1">{errors.workLocation.message}</p>}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="kurirJoinDate">Tanggal Join <span className="text-destructive">*</span></Label>
                  <Controller
                    name="joinDate"
                    control={control}
                    render={({ field }) => (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP", { locale: indonesiaLocale }) : <span>Pilih tanggal</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date > new Date() || date < new Date("1990-01-01")}
                                    initialFocus
                                    locale={indonesiaLocale}
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                  />
                   {errors.joinDate && <p className="text-destructive text-sm mt-1">{errors.joinDate.message}</p>}
                </div>

                <Label className="font-semibold">Informasi Bank (Opsional):</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="kurirBankName">Nama Bank</Label>
                    <Input id="kurirBankName" {...register("bankName")} />
                    {errors.bankName && <p className="text-destructive text-sm mt-1">{errors.bankName.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="kurirBankAccountNumber">Nomor Rekening</Label>
                    <Input id="kurirBankAccountNumber" {...register("bankAccountNumber")} />
                     {errors.bankAccountNumber && <p className="text-destructive text-sm mt-1">{errors.bankAccountNumber.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="kurirBankRecipientName">Nama Pemilik Rekening</Label>
                    <Input id="kurirBankRecipientName" {...register("bankRecipientName")} />
                    {errors.bankRecipientName && <p className="text-destructive text-sm mt-1">{errors.bankRecipientName.message}</p>}
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => { reset(); setIsAddKurirDialogOpen(false); }}>Batal</Button>
                  <Button type="submit">Simpan Kurir</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Cari Kurir (ID, Nama, NIK, Email, Wilayah, Area, Hub)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          <Card className="border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Kurir</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Hub</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKurirs.length > 0 ? filteredKurirs.map((kurir) => (
                  <TableRow key={kurir.id}>
                    <TableCell className="font-medium">{kurir.id}</TableCell>
                    <TableCell>{kurir.fullName}</TableCell>
                    <TableCell>{kurir.workLocation}</TableCell>
                    <TableCell>
                       <Switch
                        checked={kurir.status === 'Aktif'}
                        onCheckedChange={(newStatus) => handleStatusChange(kurir.id, newStatus)}
                        aria-label={`Status kurir ${kurir.fullName}`}
                      />
                      <span className={`ml-2 text-xs ${kurir.status === 'Aktif' ? 'text-green-600' : 'text-red-600'}`}>
                        {kurir.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center space-x-1">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => toast({title: "Fitur Dalam Pengembangan", description: `Edit untuk ${kurir.id} belum diimplementasikan.`})}><Edit size={16}/></Button>
                      <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => toast({title: "Fitur Dalam Pengembangan", description: `Hapus ${kurir.id} belum diimplementasikan.`})}><Trash2 size={16}/></Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">Tidak ada data Kurir yang cocok dengan pencarian.</TableCell>
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
            Format kolom yang diharapkan: ID Kurir (opsional), Nama Lengkap, NIK, Password Awal, Jabatan, Email (opsional), Wilayah (ID), Area (ID), Lokasi Kerja (ID Hub), Tanggal Join (YYYY-MM-DD), Nama Bank (opsional), No Rekening (opsional), Nama Pemilik Rekening (opsional).
          </p>
          <Button onClick={handleImportKurirs} className="w-full sm:w-auto">
            <FileUp className="mr-2 h-4 w-4" /> Impor Data Kurir
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
