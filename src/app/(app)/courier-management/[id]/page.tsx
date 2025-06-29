
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, CalendarDays, User, MapPin, FileText, Briefcase, Phone, Package, Percent, ShieldAlert, Users as UsersIcon, ClipboardList, History, ZoomIn, PackageCheck, PackageX, CalendarIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { UserProfile, KurirDailyTaskDoc, PackageItem } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { format } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { getKurirTaskHistory } from '@/lib/kurirActions';

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-start space-x-3 py-2">
      <Icon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
      <div className="flex-grow">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-sm break-words">{value}</p>
      </div>
    </div>
  );
}

export default function CourierDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courierId = params.id as string;
  const [courier, setCourier] = useState<UserProfile | null | undefined>(undefined);

  // New states for history feature
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [taskHistory, setTaskHistory] = useState<{ task: KurirDailyTaskDoc | null; packages: PackageItem[] } | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ src: string, alt: string } | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

  useEffect(() => {
    if (courierId) {
      const fetchCourier = async () => {
        try {
          const q = query(
            collection(db, "users"),
            where("id", "==", courierId),
            where("role", "==", "Kurir"),
            limit(1)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const courierDoc = querySnapshot.docs[0];
            setCourier({ ...courierDoc.data() } as UserProfile);
          } else {
            setCourier(null);
          }
        } catch (error) {
          console.error("Error fetching courier details:", error);
          setCourier(null);
        }
      };
      fetchCourier();
    }
  }, [courierId]);
  
  useEffect(() => {
    if (!selectedDate || !courier?.uid) {
      setTaskHistory(null);
      return;
    }

    const fetchHistory = async () => {
      setIsHistoryLoading(true);
      setTaskHistory(null); // Clear previous history
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      try {
        const historyData = await getKurirTaskHistory(courier.uid, dateString);
        setTaskHistory(historyData);
      } catch (error) {
        console.error("Error fetching task history:", error);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [selectedDate, courier?.uid]);
  
  const handleImageClick = (src: string, alt: string) => {
    setSelectedImage({ src, alt });
    setIsImageDialogOpen(true);
  };

  if (courier === undefined) {
    return (
        <div className="space-y-6">
            <Button variant="outline" disabled>
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
            <Card className="shadow-xl">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-64" />
                            <Skeleton className="h-5 w-48" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <Skeleton className="h-6 w-1/3 mb-4" />
                    <Separator className="mb-4"/>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 9 }).map((_, i) => (
                           <div key={i} className="space-y-2">
                               <Skeleton className="h-4 w-24" />
                               <Skeleton className="h-5 w-full" />
                           </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (courier === null) {
    return (
      <div className="flex flex-col h-screen items-center justify-center text-center p-4">
        <UsersIcon className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Kurir tidak ditemukan.</h2>
        <p className="text-muted-foreground mb-4">Data untuk kurir dengan ID '{courierId}' tidak dapat ditemukan di database.</p>
        <Button onClick={() => router.push('/courier-management')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Manajemen Kurir
        </Button>
      </div>
    );
  }

  const userInitials = courier.fullName?.split(" ").map(n => n[0]).join("").toUpperCase() || "XX";

  const deliveredPackages = taskHistory?.packages.filter(p => p.status === 'delivered') || [];

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.push('/courier-management')} className="mb-4 print:hidden">
        <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Kurir
      </Button>

      <Card className="shadow-xl">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <Avatar className="h-24 w-24 border-2 border-primary/20 flex-shrink-0">
              <AvatarImage src={courier.avatarUrl || `https://placehold.co/100x100.png?text=${userInitials}`} alt={courier.fullName} data-ai-hint="man face"/>
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-grow">
              <CardTitle className="text-3xl font-bold text-primary">{courier.fullName}</CardTitle>
              <CardDescription className="text-md text-muted-foreground mt-1">
                {courier.position || courier.role} - ID: <span className="font-semibold text-foreground">{courier.id}</span>
              </CardDescription>
              <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold ${courier.status === 'Aktif' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                Status: {courier.status}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center"><ClipboardList className="mr-2 h-5 w-5 text-primary"/>Informasi Detail Kurir</h3>
          <Separator className="mb-4"/>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
            <DetailItem icon={User} label="Nama Lengkap" value={courier.fullName} />
            <DetailItem icon={FileText} label="NIK (Nomor Induk Kependudukan)" value={courier.nik} />
            <DetailItem icon={Mail} label="Alamat Email" value={courier.email} />
            <DetailItem icon={Phone} label="Nomor Telepon" value={courier.phone || "N/A"} />
            <DetailItem icon={Briefcase} label="Jabatan" value={courier.position || courier.role} />
            <DetailItem icon={CalendarDays} label="Tanggal Bergabung" value={courier.joinDate ? new Date(courier.joinDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric'}) : "N/A"} />
            <DetailItem icon={MapPin} label="Lokasi Kerja (Hub)" value={courier.workLocation} />
            <DetailItem icon={Package} label="Wilayah" value={courier.wilayah || "N/A"} />
            <DetailItem icon={Percent} label="Area" value={courier.area || "N/A"} />
          </div>
          
          <Separator className="my-6" />

          <section>
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
              <History className="mr-2 h-5 w-5 text-primary" />
              Riwayat Tugas & Bukti Pengiriman
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP", { locale: indonesiaLocale }) : "Pilih Tanggal"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => date > new Date()}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
                <div className="flex-1 w-full">
                    {isHistoryLoading && <p className="text-sm text-muted-foreground p-4 text-center">Memuat riwayat...</p>}
                    {!isHistoryLoading && selectedDate && !taskHistory?.task && (
                        <Card className="p-4 text-center text-muted-foreground bg-muted/50">
                            Tidak ada data tugas untuk tanggal yang dipilih.
                        </Card>
                    )}
                    {!isHistoryLoading && taskHistory?.task && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-semibold flex items-center mb-2">
                                    <PackageCheck className="mr-2 h-4 w-4 text-green-500"/> Bukti Paket Terkirim ({deliveredPackages.length})
                                </h4>
                                {deliveredPackages.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {deliveredPackages.map(pkg => (
                                            <Card key={pkg.id} className="p-3">
                                                <p className="font-medium text-sm break-all">{pkg.id}</p>
                                                <p className="text-xs text-muted-foreground">Penerima: {pkg.recipientName || 'N/A'}</p>
                                                {pkg.deliveryProofPhotoUrl ? (
                                                    <div className="mt-2 relative group cursor-pointer" onClick={() => handleImageClick(pkg.deliveryProofPhotoUrl!, `Bukti untuk ${pkg.id}`)}>
                                                        <Image src={pkg.deliveryProofPhotoUrl} alt={`Bukti untuk ${pkg.id}`} width={200} height={150} className="rounded-md object-cover w-full h-32"/>
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <ZoomIn className="h-8 w-8 text-white"/>
                                                        </div>
                                                    </div>
                                                ) : <p className="text-xs text-destructive mt-2">Tidak ada foto bukti.</p>}
                                            </Card>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-muted-foreground">Tidak ada paket yang ditandai terkirim.</p>}
                            </div>

                            {taskHistory.task.finalReturnProofPhotoUrl && (
                                 <div>
                                    <h4 className="font-semibold flex items-center mb-2">
                                        <PackageX className="mr-2 h-4 w-4 text-red-500"/> Bukti Paket Pending/Retur
                                    </h4>
                                    <Card className="p-3 inline-block">
                                        <p className="text-xs text-muted-foreground">Diserahkan ke: {taskHistory.task.finalReturnLeadReceiverName || 'N/A'}</p>
                                        <div className="mt-2 relative group cursor-pointer" onClick={() => handleImageClick(taskHistory.task.finalReturnProofPhotoUrl!, `Bukti Retur`)}>
                                            <Image src={taskHistory.task.finalReturnProofPhotoUrl} alt="Bukti Retur" width={200} height={150} className="rounded-md object-cover w-full h-32"/>
                                             <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ZoomIn className="h-8 w-8 text-white"/>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
          </section>

          <Separator className="my-6" />
          
          <CardDescription className="text-center text-xs italic">
             Halaman ini bersifat lihat-saja (view only) untuk PIC. Perubahan data kurir dilakukan oleh Admin atau MasterAdmin.
          </CardDescription>
        </CardContent>
      </Card>
      
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
          <DialogContent className="max-w-3xl">
              <DialogHeader>
                  <DialogTitle>{selectedImage?.alt}</DialogTitle>
              </DialogHeader>
              {selectedImage && (
                  <div className="mt-4 flex justify-center">
                    <Image src={selectedImage.src} alt={selectedImage.alt} width={800} height={600} className="max-w-full h-auto rounded-lg object-contain" data-ai-hint="package receipt"/>
                  </div>
              )}
          </DialogContent>
      </Dialog>
    </div>
  );
}
