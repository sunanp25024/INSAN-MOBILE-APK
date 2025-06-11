
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileUp, UserPlus, Edit, Trash2, CalendarIcon as LucideCalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isValid } from "date-fns";
import { id as indonesiaLocale } from "date-fns/locale";
import { Switch } from '@/components/ui/switch';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, Timestamp, serverTimestamp } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const kurirSchema = z.object({
  uid: z.string().optional(), // Firebase Auth UID, not part of form for add/edit but good for state
  id: z.string().min(1, "ID Kurir wajib diisi, cth: PISTESTXXXX").optional(),
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  nik: z.string().length(16, "NIK harus 16 digit").regex(/^\d+$/, "NIK hanya boleh berisi angka"),
  passwordValue: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal('')),
  jabatan: z.string().min(3, "Jabatan minimal 3 karakter"),
  wilayah: z.string().min(1, "Wilayah wajib diisi"),
  area: z.string().min(1, "Area wajib diisi"),
  workLocation: z.string().min(1, "Lokasi kerja (Hub) wajib diisi"),
  joinDate: z.date({ required_error: "Tanggal join wajib diisi" }),
  contractStatus: z.string().min(1, "Status kontrak wajib diisi"),
  bankName: z.string().min(3, "Nama bank minimal 3 karakter").optional().or(z.literal('')),
  bankAccountNumber: z.string().min(5, "Nomor rekening minimal 5 digit").regex(/^\d+$/, "Nomor rekening hanya boleh berisi angka").optional().or(z.literal('')),
  bankRecipientName: z.string().min(3, "Nama pemilik rekening minimal 3 karakter").optional().or(z.literal('')),
  email: z.string().email("Format email tidak valid").optional().or(z.literal('')),
  status: z.enum(['Aktif', 'Nonaktif']).default('Aktif').optional(),
});

type KurirFormData = z.infer<typeof kurirSchema>;

export default function ManageKurirsPage() {
  const { toast } = useToast();
  const [kurirs, setKurirs] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddKurirDialogOpen, setIsAddKurirDialogOpen] = useState(false);
  const [isEditKurirDialogOpen, setIsEditKurirDialogOpen] = useState(false);
  const [currentEditingKurir, setCurrentEditingKurir] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors }, setValue } = useForm<KurirFormData>({
    resolver: zodResolver(kurirSchema),
    defaultValues: {
      wilayah: '', area: '', workLocation: '', passwordValue: '', contractStatus: '',
      bankName: '', bankAccountNumber: '', bankRecipientName: '', email: '',
      status: 'Aktif',
    }
  });

  const fetchKurirs = async () => {
    setIsLoading(true);
    setFirebaseError(null);
    try {
      const q = query(collection(db, "users"), where("role", "==", "Kurir"));
      const querySnapshot = await getDocs(q);
      const kurirList: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        kurirList.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      setKurirs(kurirList);
    } catch (error: any) {
      console.error("Error fetching kurirs: ", error);
      setFirebaseError("Gagal memuat data Kurir. Periksa koneksi atau coba lagi nanti.");
      toast({ title: "Error Memuat Data", description: error.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchKurirs();
  }, []);

  const handleAddKurirSubmit: SubmitHandler<KurirFormData> = async (data) => {
    if (!data.passwordValue) {
      toast({ title: "Password Dibutuhkan", description: "Password awal wajib diisi untuk kurir baru.", variant: "destructive" });
      return;
    }

    const appKurirId = data.id && data.id.trim() !== '' ? data.id.trim() : `K${String(Date.now()).slice(-7)}`;
    const emailForAuth = data.email && data.email.trim() !== '' ? data.email.trim() : `${appKurirId.toLowerCase().replace(/\s+/g, '.')}@internal.spx`;

    // Check if app-specific ID already exists in current list (basic check)
    if (kurirs.some(k => k.id === appKurirId)) {
      toast({ title: "Gagal Menambahkan", description: `ID Kurir ${appKurirId} sudah ada.`, variant: "destructive"});
      return;
    }
    // Check if email already used (basic check)
    if (kurirs.some(k => k.email === emailForAuth)) {
        toast({ title: "Gagal Menambahkan", description: `Email ${emailForAuth} sudah terdaftar.`, variant: "destructive"});
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailForAuth, data.passwordValue);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        const newKurirProfile: UserProfile = {
          uid: firebaseUser.uid,
          id: appKurirId,
          fullName: data.fullName,
          nik: data.nik,
          email: emailForAuth,
          role: 'Kurir',
          jabatan: data.jabatan,
          wilayah: data.wilayah,
          area: data.area,
          workLocation: data.workLocation,
          joinDate: data.joinDate.toISOString(),
          contractStatus: data.contractStatus,
          bankName: data.bankName || '',
          bankAccountNumber: data.bankAccountNumber || '',
          bankRecipientName: data.bankRecipientName || '',
          status: 'Aktif',
          // avatarUrl and photoIdUrl can be added later or through a separate upload process
        };

        await setDoc(doc(db, "users", firebaseUser.uid), newKurirProfile);

        toast({ title: "Kurir Ditambahkan", description: `Kurir ${data.fullName} (ID: ${appKurirId}) berhasil ditambahkan.` });
        fetchKurirs();
        reset();
        setIsAddKurirDialogOpen(false);
      }
    } catch (error: any) {
      console.error("Error adding kurir: ", error);
      let errorMessage = "Gagal menambahkan kurir.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Email ini sudah terdaftar di Firebase Authentication. Gunakan email lain.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password terlalu lemah. Gunakan minimal 6 karakter.";
      }
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  };

  const handleOpenEditDialog = (kurir: UserProfile) => {
    setCurrentEditingKurir(kurir);
    setValue('uid', kurir.uid);
    setValue('id', kurir.id); // App-specific ID
    setValue('fullName', kurir.fullName);
    setValue('nik', kurir.nik || '');
    setValue('passwordValue', ''); 
    setValue('jabatan', kurir.jabatan || '');
    setValue('wilayah', kurir.wilayah || '');
    setValue('area', kurir.area || '');
    setValue('workLocation', kurir.workLocation || '');
    const joinDateObj = kurir.joinDate ? parseISO(kurir.joinDate) : new Date();
    setValue('joinDate', isValid(joinDateObj) ? joinDateObj : new Date());
    setValue('contractStatus', kurir.contractStatus || '');
    setValue('bankName', kurir.bankName || '');
    setValue('bankAccountNumber', kurir.bankAccountNumber || '');
    setValue('bankRecipientName', kurir.bankRecipientName || '');
    setValue('email', kurir.email || '');
    setValue('status', kurir.status || 'Aktif');
    setIsEditKurirDialogOpen(true);
  };

  const handleEditKurirSubmit: SubmitHandler<KurirFormData> = async (data) => {
    if (!currentEditingKurir || !currentEditingKurir.uid) return;

    // Check if new app-specific ID conflicts (if it's being changed and editable - currently ID is readOnly in edit)
    // if (data.id && data.id !== currentEditingKurir.id && kurirs.some(k => k.id === data.id && k.uid !== currentEditingKurir.uid)) { ... }
    
    // Check if new email conflicts with other users (excluding the current user)
    if (data.email && data.email !== currentEditingKurir.email && kurirs.some(k => k.email === data.email && k.uid !== currentEditingKurir.uid)) {
        toast({ title: "Gagal Memperbarui", description: `Email ${data.email} sudah digunakan oleh kurir lain.`, variant: "destructive"});
        return;
    }

    try {
      const kurirDocRef = doc(db, "users", currentEditingKurir.uid);
      const updatedData: Partial<UserProfile> = {
        fullName: data.fullName,
        nik: data.nik,
        email: data.email, // Note: Changing email in Firestore should ideally be synced with Firebase Auth email change
        jabatan: data.jabatan,
        wilayah: data.wilayah,
        area: data.area,
        workLocation: data.workLocation,
        joinDate: data.joinDate.toISOString(),
        contractStatus: data.contractStatus,
        bankName: data.bankName,
        bankAccountNumber: data.bankAccountNumber,
        bankRecipientName: data.bankRecipientName,
        status: data.status,
      };
      // Password change is not handled here directly for simplicity. 
      // It would typically involve re-authentication or Admin SDK.

      await updateDoc(kurirDocRef, updatedData);
      toast({ title: "Kurir Diperbarui", description: `Data Kurir ${data.fullName} berhasil diperbarui.` });
      fetchKurirs();
      reset();
      setIsEditKurirDialogOpen(false);
      setCurrentEditingKurir(null);
    } catch (error: any) {
      console.error("Error updating kurir: ", error);
      toast({ title: "Error", description: `Gagal memperbarui kurir: ${error.message}`, variant: "destructive" });
    }
  };
  
  const handleDeleteKurir = async (kurirToDelete: UserProfile) => {
    if (!kurirToDelete.uid) {
        toast({ title: "Error", description: "UID Kurir tidak ditemukan.", variant: "destructive" });
        return;
    }
    if (!window.confirm(`Apakah Anda yakin ingin menghapus Kurir ${kurirToDelete.fullName}? Akun login Firebase terkait TIDAK akan dihapus secara otomatis melalui form ini.`)) {
        return;
    }
    try {
        await deleteDoc(doc(db, "users", kurirToDelete.uid));
        toast({ title: "Profil Kurir Dihapus", description: `Profil Kurir ${kurirToDelete.fullName} telah dihapus dari Firestore.` });
        fetchKurirs();
    } catch (error: any) {
        console.error("Error deleting kurir profile: ", error);
        toast({ title: "Error Menghapus Profil", description: `Gagal menghapus profil kurir: ${error.message}`, variant: "destructive" });
    }
  };

  const handleImportKurirs = () => {
    toast({ title: "Fitur Dalam Pengembangan", description: "Impor Kurir dari Excel belum diimplementasikan." });
  };
  
  const handleStatusChange = async (kurirToUpdate: UserProfile, newStatusActive: boolean) => {
    if (!kurirToUpdate.uid) {
      toast({ title: "Error", description: "UID Kurir tidak ditemukan.", variant: "destructive" });
      return;
    }
    const newStatus = newStatusActive ? 'Aktif' : 'Nonaktif';
    try {
      const kurirDocRef = doc(db, "users", kurirToUpdate.uid);
      await updateDoc(kurirDocRef, { status: newStatus });
      toast({
        title: "Status Kurir Diperbarui",
        description: `Status kurir ${kurirToUpdate.fullName} telah diubah menjadi ${newStatus}.`,
      });
      fetchKurirs();
    } catch (error: any) {
      console.error("Error updating kurir status: ", error);
      toast({ title: "Error", description: `Gagal memperbarui status kurir: ${error.message}`, variant: "destructive" });
    }
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

  const KurirFormFields = ({ isEdit = false }: { isEdit?: boolean }) => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!isEdit && (
            <div>
            <Label htmlFor={isEdit ? "editKurirId" : "addKurirId"} className="mb-1 block">ID Kurir (Opsional)</Label>
            <Input id={isEdit ? "editKurirId" : "addKurirId"} {...register("id")} placeholder="Otomatis jika kosong (cth: KXXXXXXX)" />
            {errors.id && <p className="text-destructive text-sm mt-1">{errors.id.message}</p>}
            </div>
        )}
        {isEdit && (
             <div>
            <Label htmlFor="editKurirId" className="mb-1 block">ID Kurir</Label>
            <Input id="editKurirId" {...register("id")} readOnly className="bg-muted/50"/>
            </div>
        )}
        <div>
          <Label htmlFor={isEdit ? "editKurirFullName" : "addKurirFullName"} className="mb-1 block">Nama Lengkap <span className="text-destructive">*</span></Label>
          <Input id={isEdit ? "editKurirFullName" : "addKurirFullName"} {...register("fullName")} />
          {errors.fullName && <p className="text-destructive text-sm mt-1">{errors.fullName.message}</p>}
        </div>
        <div>
          <Label htmlFor={isEdit ? "editKurirNik" : "addKurirNik"} className="mb-1 block">NIK <span className="text-destructive">*</span></Label>
          <Input id={isEdit ? "editKurirNik" : "addKurirNik"} {...register("nik")} placeholder="16 digit NIK" />
          {errors.nik && <p className="text-destructive text-sm mt-1">{errors.nik.message}</p>}
        </div>
          <div>
          <Label htmlFor={isEdit ? "editKurirPassword" : "addKurirPassword"} className="mb-1 block">
            {isEdit ? "Password Baru (Opsional)" : "Password Awal *"}
          </Label>
          <Input id={isEdit ? "editKurirPassword" : "addKurirPassword"} type="password" {...register("passwordValue")} placeholder={isEdit ? "Kosongkan jika tidak diubah" : ""} />
          {errors.passwordValue && errors.passwordValue.message && errors.passwordValue.message !== '' && <p className="text-destructive text-sm mt-1">{errors.passwordValue.message}</p>}
        </div>
        <div>
          <Label htmlFor={isEdit ? "editKurirJabatan" : "addKurirJabatan"} className="mb-1 block">Jabatan <span className="text-destructive">*</span></Label>
          <Input id={isEdit ? "editKurirJabatan" : "addKurirJabatan"} {...register("jabatan")} placeholder="cth: Kurir, Kurir Motor" />
          {errors.jabatan && <p className="text-destructive text-sm mt-1">{errors.jabatan.message}</p>}
        </div>
        <div>
          <Label htmlFor={isEdit ? "editKurirEmail" : "addKurirEmail"} className="mb-1 block">Email (Opsional untuk login)</Label>
          <Input id={isEdit ? "editKurirEmail" : "addKurirEmail"} type="email" {...register("email")} placeholder="Auto: [ID_Kurir]@internal.spx jika kosong"/>
          {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
        </div>
      </div>

      <Label className="font-semibold block mt-4 mb-2">Lokasi Penempatan:</Label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor={isEdit ? "editKurirWilayah" : "addKurirWilayah"} className="mb-1 block">Wilayah <span className="text-destructive">*</span></Label>
          <Input id={isEdit ? "editKurirWilayah" : "addKurirWilayah"} {...register("wilayah")} placeholder="cth: Jabodetabek-Banten"/>
          {errors.wilayah && <p className="text-destructive text-sm mt-1">{errors.wilayah.message}</p>}
        </div>
        <div>
          <Label htmlFor={isEdit ? "editKurirArea" : "addKurirArea"} className="mb-1 block">Area <span className="text-destructive">*</span></Label>
          <Input id={isEdit ? "editKurirArea" : "addKurirArea"} {...register("area")} placeholder="cth: Jakarta Pusat"/>
          {errors.area && <p className="text-destructive text-sm mt-1">{errors.area.message}</p>}
        </div>
        <div>
          <Label htmlFor={isEdit ? "editKurirWorkLocation" : "addKurirWorkLocation"} className="mb-1 block">Lokasi Kerja (Hub) <span className="text-destructive">*</span></Label>
          <Input id={isEdit ? "editKurirWorkLocation" : "addKurirWorkLocation"} {...register("workLocation")} placeholder="cth: Hub Thamrin"/>
          {errors.workLocation && <p className="text-destructive text-sm mt-1">{errors.workLocation.message}</p>}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <Label htmlFor={isEdit ? "editKurirJoinDate" : "addKurirJoinDate"} className="mb-1 block">Tanggal Join <span className="text-destructive">*</span></Label>
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
                            <LucideCalendarIcon className="mr-2 h-4 w-4" />
                            {field.value && isValid(field.value) ? format(field.value, "PPP", { locale: indonesiaLocale }) : <span>Pilih tanggal</span>}
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
        <div>
          <Label htmlFor={isEdit ? "editKurirContractStatus" : "addKurirContractStatus"} className="mb-1 block">Status Kontrak <span className="text-destructive">*</span></Label>
          <Input id={isEdit ? "editKurirContractStatus" : "addKurirContractStatus"} {...register("contractStatus")} placeholder="cth: Permanent, Contract"/>
          {errors.contractStatus && <p className="text-destructive text-sm mt-1">{errors.contractStatus.message}</p>}
        </div>
      </div>


      <Label className="font-semibold block mt-4 mb-3">Informasi Bank (Opsional):</Label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor={isEdit ? "editKurirBankName" : "addKurirBankName"} className="mb-1 block">Nama Bank</Label>
          <Input id={isEdit ? "editKurirBankName" : "addKurirBankName"} {...register("bankName")} />
          {errors.bankName && errors.bankName.message && <p className="text-destructive text-sm mt-1">{errors.bankName.message}</p>}
        </div>
        <div>
          <Label htmlFor={isEdit ? "editKurirBankAccountNumber" : "addKurirBankAccountNumber"} className="mb-1 block">Nomor Rekening</Label>
          <Input id={isEdit ? "editKurirBankAccountNumber" : "addKurirBankAccountNumber"} {...register("bankAccountNumber")} />
            {errors.bankAccountNumber && errors.bankAccountNumber.message && <p className="text-destructive text-sm mt-1">{errors.bankAccountNumber.message}</p>}
        </div>
        <div>
          <Label htmlFor={isEdit ? "editKurirBankRecipientName" : "addKurirBankRecipientName"} className="mb-1 block">Nama Pemilik Rekening</Label>
          <Input id={isEdit ? "editKurirBankRecipientName" : "addKurirBankRecipientName"} {...register("bankRecipientName")} />
          {errors.bankRecipientName && errors.bankRecipientName.message && <p className="text-destructive text-sm mt-1">{errors.bankRecipientName.message}</p>}
        </div>
      </div>
       {isEdit && (
        <div className="mt-4">
            <Label htmlFor="editStatus" className="mb-1 block">Status Akun</Label>
            <Controller
                name="status"
                control={control}
                render={({ field }) => (
                    <Switch
                        id="editStatus"
                        checked={field.value === 'Aktif'}
                        onCheckedChange={(checked) => field.onChange(checked ? 'Aktif' : 'Nonaktif')}
                    />
                )}
            />
            <span className={`ml-2 text-sm ${watch("status") === 'Aktif' ? 'text-green-600' : 'text-red-600'}`}>
                {watch("status")}
            </span>
             {errors.status && <p className="text-destructive text-sm mt-1">{errors.status.message}</p>}
        </div>
      )}
    </>
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
              Kelola akun Kurir. Data disimpan di Firebase.
            </CardDescription>
          </div>
          <Dialog open={isAddKurirDialogOpen} onOpenChange={setIsAddKurirDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-2 sm:mt-0 w-full sm:w-auto" onClick={() => {
                  reset({
                    id: '', fullName: '', nik: '', passwordValue: '', jabatan: '',
                    wilayah: '', area: '', workLocation: '',
                    joinDate: undefined, contractStatus: '', 
                    bankName: '', bankAccountNumber: '', bankRecipientName: '', email: '',
                    status: 'Aktif',
                  });
                }}>
                <UserPlus className="mr-2 h-4 w-4" /> Tambah Kurir Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Kurir Baru</DialogTitle>
                <DialogDescription>Isi detail lengkap untuk Kurir baru. Akun akan dibuat di Firebase.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(handleAddKurirSubmit)} className="space-y-4 py-4">
                <KurirFormFields />
                <DialogFooter className="pt-6">
                  <Button type="button" variant="outline" onClick={() => { reset(); setIsAddKurirDialogOpen(false); }}>Batal</Button>
                  <Button type="submit">Simpan Kurir</Button>
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
              placeholder="Cari Kurir (ID, Nama, NIK, Email, Wilayah, Area, Hub)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          {isLoading ? (
            <p>Memuat data kurir...</p>
          ) : (
            <>
            <Card className="border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Kurir</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Hub</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKurirs.length > 0 ? filteredKurirs.map((kurir) => (
                    <TableRow key={kurir.uid}>
                      <TableCell className="font-medium">{kurir.id}</TableCell>
                      <TableCell>{kurir.fullName}</TableCell>
                      <TableCell>{kurir.email}</TableCell>
                      <TableCell>{kurir.workLocation}</TableCell>
                      <TableCell>
                        <Switch
                          checked={kurir.status === 'Aktif'}
                          onCheckedChange={(newStatusChecked) => handleStatusChange(kurir, newStatusChecked)}
                          aria-label={`Status kurir ${kurir.fullName}`}
                        />
                        <span className={`ml-2 text-xs ${kurir.status === 'Aktif' ? 'text-green-600' : 'text-red-600'}`}>
                          {kurir.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-center space-x-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenEditDialog(kurir)}><Edit size={16}/></Button>
                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteKurir(kurir)}><Trash2 size={16}/></Button>
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
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditKurirDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCurrentEditingKurir(null);
          reset(); 
        }
        setIsEditKurirDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Kurir: {currentEditingKurir?.fullName}</DialogTitle>
            <DialogDescription>Perbarui detail Kurir. ID Kurir tidak dapat diubah.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleEditKurirSubmit)} className="space-y-4 py-4">
            <KurirFormFields isEdit={true}/>
            <DialogFooter className="pt-6">
              <Button type="button" variant="outline" onClick={() => { reset(); setIsEditKurirDialogOpen(false); setCurrentEditingKurir(null);}}>Batal</Button>
              <Button type="submit">Simpan Perubahan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


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
            Format kolom yang diharapkan: ID Kurir (opsional), Nama Lengkap, NIK, Password Awal, Jabatan, Wilayah, Area, Lokasi Kerja (Hub), Tanggal Join (YYYY-MM-DD), Status Kontrak (Permanent/Contract/Probation), Email (opsional), Nama Bank (opsional), No Rekening (opsional), Nama Pemilik Rekening (opsional).
          </p>
          <Button onClick={handleImportKurirs} className="w-full sm:w-auto">
            <FileUp className="mr-2 h-4 w-4" /> Impor Data Kurir
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
    
