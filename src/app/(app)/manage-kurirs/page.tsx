
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileUp, UserPlus, Edit, Trash2, CalendarIcon as LucideCalendarIcon, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
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
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createUserAccount, deleteUserAccount, importUsers, updateUserStatus, requestUserDeletion } from '@/lib/firebaseAdminActions';
import * as XLSX from 'xlsx';

const kurirSchema = z.object({
  uid: z.string().optional(),
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
  status: z.enum(['Aktif', 'Nonaktif', 'PendingApproval']).default('Aktif').optional(),
});

type KurirFormData = z.infer<typeof kurirSchema>;
const editKurirSchema = kurirSchema.omit({ passwordValue: true, id: true, nik: true });
type EditKurirFormData = z.infer<typeof editKurirSchema>;

export default function ManageKurirsPage() {
  const { toast } = useToast();
  const [kurirs, setKurirs] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddKurirDialogOpen, setIsAddKurirDialogOpen] = useState(false);
  const [isEditKurirDialogOpen, setIsEditKurirDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [currentEditingKurir, setCurrentEditingKurir] = useState<UserProfile | null>(null);
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
      } catch (error) { console.error("Error parsing user data for manage kurirs page", error); }
    }
  }, []);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<KurirFormData>({
    resolver: zodResolver(kurirSchema),
    defaultValues: {
      wilayah: '', area: '', workLocation: '', passwordValue: '', contractStatus: '',
      bankName: '', bankAccountNumber: '', bankRecipientName: '', email: '',
      status: 'Aktif',
    }
  });

  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, control: controlEdit, formState: { errors: errorsEdit }, setValue: setValueEdit, watch: watchEdit } = useForm<EditKurirFormData>({
    resolver: zodResolver(editKurirSchema)
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

  const createNotification = async (message: string) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        title: 'Permintaan Persetujuan Baru',
        message,
        type: 'APPROVAL_REQUEST',
        timestamp: serverTimestamp(),
        read: false,
        linkTo: '/approvals',
      });
    } catch (error) {
      console.error("Failed to create notification:", error);
    }
  };

  const handleAddKurirSubmit: SubmitHandler<KurirFormData> = async (data) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    
    if (!data.passwordValue) {
      toast({ title: "Password Dibutuhkan", description: "Password awal wajib diisi untuk kurir baru.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const appKurirId = data.id && data.id.trim() !== '' ? data.id.trim() : `K${String(Date.now()).slice(-7)}`;
    const emailForAuth = data.email && data.email.trim() !== '' ? data.email.trim() : `${appKurirId.toLowerCase().replace(/\s+/g, '.')}@internal.spx`;

    if (kurirs.some(k => k.id === appKurirId || k.email === emailForAuth)) {
      toast({ title: "Gagal Menambahkan", description: `ID Kurir atau Email sudah ada.`, variant: "destructive"});
      setIsSubmitting(false);
      return;
    }

    const newKurirProfile: Omit<UserProfile, 'uid'> & {passwordValue: string} = {
      id: appKurirId,
      fullName: data.fullName,
      nik: data.nik,
      email: emailForAuth,
      role: 'Kurir',
      position: data.jabatan,
      wilayah: data.wilayah,
      area: data.area,
      workLocation: data.workLocation,
      joinDate: data.joinDate.toISOString(),
      contractStatus: data.contractStatus,
      bankName: data.bankName || '',
      bankAccountNumber: data.bankAccountNumber || '',
      bankRecipientName: data.bankRecipientName || '',
      status: 'Aktif',
      createdBy: { uid: currentUser.uid, name: currentUser.fullName, role: currentUser.role },
      passwordValue: data.passwordValue
    };

    if (currentUser.role === 'Admin') {
       newKurirProfile.status = 'PendingApproval';
       const approvalRequest: Omit<ApprovalRequest, 'id'> = {
        type: 'NEW_USER_KURIR',
        status: 'pending',
        requestedByUid: currentUser.uid,
        requestedByName: currentUser.fullName,
        requestedByRole: currentUser.role,
        requestTimestamp: serverTimestamp(),
        targetEntityType: 'USER_PROFILE_DATA',
        targetEntityId: appKurirId,
        targetEntityName: data.fullName,
        payload: newKurirProfile,
        notesFromRequester: "Pengajuan kurir baru.",
      };
      try {
        await addDoc(collection(db, "approval_requests"), approvalRequest);
        await createNotification(`Admin ${currentUser.fullName} mengajukan penambahan kurir baru: ${data.fullName}.`);
        toast({ title: "Permintaan Diajukan", description: `Permintaan penambahan kurir ${data.fullName} telah dikirim.` });
        reset();
        setIsAddKurirDialogOpen(false);
      } catch (error: any) {
        toast({ title: "Error Pengajuan", description: `Gagal mengajukan permintaan: ${error.message}`, variant: "destructive" });
      }
    } else if (currentUser.role === 'MasterAdmin') {
        const { passwordValue, ...profileToCreate } = newKurirProfile;
        const result = await createUserAccount(emailForAuth, passwordValue, profileToCreate);
        if (result.success) {
            toast({ title: "Kurir Ditambahkan", description: `Kurir ${data.fullName} berhasil ditambahkan.` });
            fetchKurirs();
            reset();
            setIsAddKurirDialogOpen(false);
        } else {
            toast({ title: "Error", description: result.message || "Gagal menambah kurir", variant: "destructive" });
        }
    }
    setIsSubmitting(false);
  };

  const handleOpenEditDialog = (kurir: UserProfile) => {
    setCurrentEditingKurir(kurir);
    const joinDateObj = kurir.joinDate ? parseISO(kurir.joinDate) : new Date();
    
    setValueEdit('uid', kurir.uid);
    setValueEdit('fullName', kurir.fullName);
    setValueEdit('jabatan', kurir.position || '');
    setValueEdit('wilayah', kurir.wilayah || '');
    setValueEdit('area', kurir.area || '');
    setValueEdit('workLocation', kurir.workLocation || '');
    setValueEdit('joinDate', isValid(joinDateObj) ? joinDateObj : new Date());
    setValueEdit('contractStatus', kurir.contractStatus || '');
    setValueEdit('bankName', kurir.bankName || '');
    setValueEdit('bankAccountNumber', kurir.bankAccountNumber || '');
    setValueEdit('bankRecipientName', kurir.bankRecipientName || '');
    setValueEdit('email', kurir.email || '');
    setValueEdit('status', kurir.status || 'Aktif');
    
    setIsEditKurirDialogOpen(true);
  };

  const handleEditKurirSubmit: SubmitHandler<EditKurirFormData> = async (data) => {
    if (!currentEditingKurir || !currentEditingKurir.uid || !currentUser) return;
    setIsSubmitting(true);

    const updatePayload: Partial<UserProfile> = {
        fullName: data.fullName,
        email: data.email,
        position: data.jabatan,
        wilayah: data.wilayah,
        area: data.area,
        workLocation: data.workLocation,
        joinDate: data.joinDate.toISOString(),
        contractStatus: data.contractStatus,
        bankName: data.bankName,
        bankAccountNumber: data.bankAccountNumber,
        bankRecipientName: data.bankRecipientName,
        updatedAt: new Date().toISOString(),
        updatedBy: { uid: currentUser.uid, name: currentUser.fullName, role: currentUser.role }
      };
      
    const oldPayload = {
        fullName: currentEditingKurir.fullName,
        email: currentEditingKurir.email,
        position: currentEditingKurir.position,
        workLocation: currentEditingKurir.workLocation,
    }

    if (currentUser.role === 'Admin') {
        const approvalRequest: Omit<ApprovalRequest, 'id'> = {
            type: 'UPDATE_USER_PROFILE',
            status: 'pending',
            requestedByUid: currentUser.uid,
            requestedByName: currentUser.fullName,
            requestedByRole: currentUser.role,
            requestTimestamp: serverTimestamp(),
            targetEntityType: 'USER_PROFILE_DATA',
            targetEntityId: currentEditingKurir.uid,
            targetEntityName: currentEditingKurir.fullName,
            payload: updatePayload,
            oldPayload: oldPayload,
            notesFromRequester: `Pengajuan perubahan data untuk Kurir ID: ${currentEditingKurir.id}`,
        };
        try {
            await addDoc(collection(db, "approval_requests"), approvalRequest);
            await createNotification(`Admin ${currentUser.fullName} mengajukan perubahan data untuk Kurir: ${currentEditingKurir.fullName}.`);
            toast({ title: "Permintaan Perubahan Diajukan", description: `Permintaan perubahan data kurir ${data.fullName} telah dikirim.` });
        } catch (error: any) {
            toast({ title: "Error Pengajuan Update", description: `Gagal mengajukan permintaan: ${error.message}`, variant: "destructive" });
        }

    } else if (currentUser.role === 'MasterAdmin') {
        try {
            const kurirDocRef = doc(db, "users", currentEditingKurir.uid);
            await updateDoc(kurirDocRef, updatePayload);
            toast({ title: "Kurir Diperbarui", description: `Data Kurir ${data.fullName} berhasil diperbarui.` });
            fetchKurirs();
        } catch (error: any) {
            toast({ title: "Error Update", description: `Gagal memperbarui kurir: ${error.message}`, variant: "destructive" });
        }
    }
    
    setIsEditKurirDialogOpen(false);
    setCurrentEditingKurir(null);
    setIsSubmitting(false);
  };
  
  const handleOpenDeleteDialog = (user: UserProfile) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!userToDelete || !currentUser) return;

    setIsSubmitting(true);
    let result;
    if (currentUser.role === 'MasterAdmin') {
        result = await deleteUserAccount(userToDelete.uid);
    } else if (currentUser.role === 'Admin') {
        result = await requestUserDeletion(userToDelete, { uid: currentUser.uid, fullName: currentUser.fullName, role: currentUser.role });
    }

    if (result && result.success) {
        toast({ title: "Sukses", description: result.message });
        if(currentUser.role === 'MasterAdmin') fetchKurirs();
    } else if(result) {
        toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    
    setIsSubmitting(false);
    setIsDeleteDialogOpen(false);
    setUserToDelete(null);
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
              toast({ title: "File Kosong", variant: "destructive" });
              return;
            }
            
            const creatorProfile = { uid: currentUser.uid, fullName: currentUser.fullName, role: currentUser.role };
            const result = await importUsers(JSON.parse(JSON.stringify(jsonData)), 'Kurir', creatorProfile);

            if (result.success || result.createdCount > 0) {
                toast({
                    title: "Impor Selesai",
                    description: `${result.createdCount} dari ${result.totalRows} kurir berhasil ditambahkan. ${result.failedCount > 0 ? `${result.failedCount} gagal.` : ''}`,
                    duration: 9000,
                });
                if (result.errors && result.errors.length > 0) {
                    console.error("Import Errors:", result.errors);
                }
                fetchKurirs();
            } else {
                toast({
                    title: "Impor Gagal Total",
                    description: `Tidak ada kurir yang berhasil ditambahkan. Error: ${result.errors?.[0] || 'Unknown error'}`,
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
    const headers = [[
      'fullName', 'nik', 'passwordValue', 'email (optional)', 'jabatan', 
      'wilayah', 'area', 'workLocation', 'joinDate (YYYY-MM-DD)', 
      'contractStatus', 'id (optional)', 'bankName (optional)', 
      'bankAccountNumber (optional)', 'bankRecipientName (optional)'
    ]];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Kurir_Template.xlsx');
    toast({ title: "Template Diunduh", description: "Template Kurir_Template.xlsx telah berhasil diunduh." });
  };
  
  const handleStatusChange = async (kurirToUpdate: UserProfile, newStatusActive: boolean) => {
    if (!kurirToUpdate.uid || !currentUser) return;
    const newStatus = newStatusActive ? 'Aktif' : 'Nonaktif';
    
    if (currentUser.role === 'Admin') {
        const approvalRequest: Omit<ApprovalRequest, 'id'> = {
            type: newStatusActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
            status: 'pending',
            requestedByUid: currentUser.uid,
            requestedByName: currentUser.fullName,
            requestedByRole: currentUser.role,
            requestTimestamp: serverTimestamp(),
            targetEntityType: 'USER_PROFILE_DATA',
            targetEntityId: kurirToUpdate.uid,
            targetEntityName: kurirToUpdate.fullName,
            payload: { status: newStatus },
            notesFromRequester: `Pengajuan perubahan status Kurir ID ${kurirToUpdate.id} menjadi ${newStatus}.`,
        };
         try {
            await addDoc(collection(db, "approval_requests"), approvalRequest);
            await createNotification(`Admin ${currentUser.fullName} mengajukan perubahan status untuk Kurir: ${kurirToUpdate.fullName} menjadi ${newStatus}.`);
            toast({ title: "Permintaan Perubahan Status Diajukan", description: `Permintaan perubahan status kurir ${kurirToUpdate.fullName} menjadi ${newStatus} telah dikirim.` });
        } catch (error: any) {
            toast({ title: "Error Pengajuan", description: `Gagal mengajukan perubahan status: ${error.message}`, variant: "destructive" });
        }
    } else if (currentUser.role === 'MasterAdmin') {
        const handlerProfile = { uid: currentUser.uid, name: currentUser.fullName, role: currentUser.role };
        const result = await updateUserStatus(kurirToUpdate.uid, newStatus, handlerProfile);
        
        if (result.success) {
            toast({
                title: "Status Kurir Diperbarui",
                description: `Status kurir ${kurirToUpdate.fullName} telah diubah menjadi ${newStatus}.`,
            });
            fetchKurirs();
        } else {
            toast({ title: "Error", description: `Gagal memperbarui status kurir: ${result.message}`, variant: "destructive" });
        }
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

  const KurirFormFields = ({ control, register, errors, isEdit = false }: { control: any, register: any, errors: any, isEdit?: boolean }) => (
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
            <Input id="editKurirId" value={currentEditingKurir?.id || ''} readOnly className="bg-muted/50"/>
            </div>
        )}
        <div>
          <Label htmlFor={isEdit ? "editKurirFullName" : "addKurirFullName"} className="mb-1 block">Nama Lengkap <span className="text-destructive">*</span></Label>
          <Input id={isEdit ? "editKurirFullName" : "addKurirFullName"} {...register("fullName")} autoComplete="name" />
          {errors.fullName && <p className="text-destructive text-sm mt-1">{errors.fullName.message}</p>}
        </div>
        <div>
          <Label htmlFor={isEdit ? "editKurirNik" : "addKurirNik"} className="mb-1 block">NIK <span className="text-destructive">*</span></Label>
          <Input id={isEdit ? "editKurirNik" : "addKurirNik"} {...register("nik")} placeholder="16 digit NIK" readOnly={isEdit} className={isEdit ? 'bg-muted/50' : ''} autoComplete="off" />
          {errors.nik && <p className="text-destructive text-sm mt-1">{errors.nik.message}</p>}
        </div>
          {!isEdit && (
          <div>
          <Label htmlFor="addKurirPassword" className="mb-1 block">Password Awal <span className="text-destructive">*</span></Label>
          <Input id="addKurirPassword" type="password" {...register("passwordValue")} autoComplete="new-password" />
          {errors.passwordValue && errors.passwordValue.message && errors.passwordValue.message !== '' && <p className="text-destructive text-sm mt-1">{errors.passwordValue.message}</p>}
        </div>)}
        <div>
          <Label htmlFor={isEdit ? "editKurirJabatan" : "addKurirJabatan"} className="mb-1 block">Jabatan <span className="text-destructive">*</span></Label>
          <Input id={isEdit ? "editKurirJabatan" : "addKurirJabatan"} {...register("jabatan")} placeholder="cth: Kurir, Kurir Motor" />
          {errors.jabatan && <p className="text-destructive text-sm mt-1">{errors.jabatan.message}</p>}
        </div>
        <div>
          <Label htmlFor={isEdit ? "editKurirEmail" : "addKurirEmail"} className="mb-1 block">Email (Opsional untuk login)</Label>
          <Input id={isEdit ? "editKurirEmail" : "addKurirEmail"} type="email" {...register("email")} placeholder="Auto: [ID_Kurir]@internal.spx" autoComplete="email" />
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
          <Label className="mb-1 block">Tanggal Join <span className="text-destructive">*</span></Label>
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
          <Input id={isEdit ? "editKurirBankAccountNumber" : "addKurirBankAccountNumber"} {...register("bankAccountNumber")} autoComplete="off" />
            {errors.bankAccountNumber && errors.bankAccountNumber.message && <p className="text-destructive text-sm mt-1">{errors.bankAccountNumber.message}</p>}
        </div>
        <div>
          <Label htmlFor={isEdit ? "editKurirBankRecipientName" : "addKurirBankRecipientName"} className="mb-1 block">Nama Pemilik Rekening</Label>
          <Input id={isEdit ? "editKurirBankRecipientName" : "addKurirBankRecipientName"} {...register("bankRecipientName")} />
          {errors.bankRecipientName && errors.bankRecipientName.message && <p className="text-destructive text-sm mt-1">{errors.bankRecipientName.message}</p>}
        </div>
      </div>
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
              Kelola akun Kurir. Perubahan oleh Admin memerlukan persetujuan MasterAdmin.
            </CardDescription>
          </div>
          <Dialog open={isAddKurirDialogOpen} onOpenChange={setIsAddKurirDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mt-2 sm:mt-0 w-full sm:w-auto" onClick={() => reset()}>
                <UserPlus className="mr-2 h-4 w-4" /> Tambah Kurir Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Kurir Baru</DialogTitle>
                <DialogDescription>Isi detail lengkap untuk Kurir baru.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(handleAddKurirSubmit)} className="space-y-4 py-4">
                <KurirFormFields control={control} register={register} errors={errors} />
                <DialogFooter className="pt-6">
                  <Button type="button" variant="outline" onClick={() => setIsAddKurirDialogOpen(false)}>Batal</Button>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Memproses...' : (currentUser?.role === 'Admin' ? 'Ajukan Penambahan' : 'Simpan Kurir')}</Button>
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
                        <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenDeleteDialog(kurir)}
                            disabled={isSubmitting}
                        >
                            <Trash2 size={16}/>
                        </Button>
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
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Aksi</DialogTitle>
            <DialogDescription>
              {currentUser?.role === 'MasterAdmin'
                ? `Apakah Anda yakin ingin menghapus pengguna ${userToDelete?.fullName}? Tindakan ini tidak dapat dibatalkan.`
                : `Ajukan penghapusan untuk pengguna ${userToDelete?.fullName}? Permintaan ini memerlukan persetujuan dari MasterAdmin.`}
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


      <Dialog open={isEditKurirDialogOpen} onOpenChange={setIsEditKurirDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Kurir: {currentEditingKurir?.fullName}</DialogTitle>
            <DialogDescription>Perbarui detail Kurir. ID dan NIK tidak dapat diubah.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit(handleEditKurirSubmit)} className="space-y-4 py-4">
            <KurirFormFields control={controlEdit} register={registerEdit} errors={errorsEdit} isEdit={true}/>
            <DialogFooter className="pt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditKurirDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Memproses...' : (currentUser?.role === 'Admin' ? 'Ajukan Perubahan' : 'Simpan Perubahan')}</Button>
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
            <Input 
              id="excel-file-kurir" 
              type="file" 
              accept=".xlsx, .xls"
              className="mt-1"
              onChange={handleFileSelectAndImport}
              ref={fileInputRef}
              disabled={isImporting}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Format kolom yang diharapkan: ID Kurir (opsional), Nama Lengkap, NIK, Password Awal, Jabatan, Wilayah, Area, Lokasi Kerja (Hub), Tanggal Join (YYYY-MM-DD), Status Kontrak (Permanent/Contract/Probation), Email (opsional), Nama Bank (opsional), No Rekening (opsional), Nama Pemilik Rekening (opsional).
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto" disabled={isImporting}>
              <FileUp className="mr-2 h-4 w-4" /> {isImporting ? 'Mengimpor...' : 'Impor Data Kurir'}
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
