
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, CalendarDays, User, MapPin, FileText, Briefcase, Phone, Package, Percent, ShieldAlert, Users as UsersIcon, ClipboardList, AlertCircle, Calendar as CalendarIcon, PackageSearch, ZoomIn, PackageX as PackageReturnedIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { UserProfile, KurirDailyTaskDoc, PackageItem } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isValid } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getKurirTaskHistory } from '@/lib/kurirActions';

// Helper to validate image URLs before rendering
const isValidImageUrl = (url?: string): url is string => {
    return !!url && (url.startsWith('http') || url.startsWith('data:image'));
};

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
  const { toast } = useToast();
  
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [courier, setCourier] = useState<UserProfile | null | undefined>(undefined);

  // State for task history
  const [selectedTaskDate, setSelectedTaskDate] = useState<Date | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [taskHistory, setTaskHistory] = useState<{ task: KurirDailyTaskDoc | null; packages: PackageItem[] } | null>(null);

  // State for image preview
  const [selectedImage, setSelectedImage] = useState<{ src: string, alt: string } | null>(null);

  useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
      setCurrentUser(JSON.parse(userDataString) as UserProfile);
    }
  }, []);

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
    if (selectedTaskDate && courier?.uid) {
        const fetchHistory = async () => {
            setIsLoadingHistory(true);
            try {
                const dateString = format(selectedTaskDate, 'yyyy-MM-dd');
                const historyData = await getKurirTaskHistory(courier.uid, dateString);
                setTaskHistory(historyData);
            } catch (error) {
                console.error("Error fetching task history:", error);
                toast({
                    title: "Gagal Memuat Riwayat",
                    description: "Terjadi kesalahan saat mengambil riwayat tugas kurir.",
                    variant: "destructive",
                });
            } finally {
                setIsLoadingHistory(false);
            }
        };
        fetchHistory();
    }
  }, [selectedTaskDate, courier?.uid, toast]);

  const handleImageClick = (src: string, alt: string) => {
    setSelectedImage({ src, alt });
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
  
  if (currentUser && !['MasterAdmin', 'Admin', 'PIC'].includes(currentUser.role)) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center"><AlertCircle className="mr-2 h-6 w-6"/>Akses Ditolak</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Anda tidak memiliki izin untuk melihat halaman ini.</p>
        </CardContent>
      </Card>
    );
  }

  const userInitials = courier.fullName?.split(" ").map(n => n[0]).join("").toUpperCase() || "XX";

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
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><PackageSearch className="mr-2 h-5 w-5 text-primary"/>Riwayat Tugas & Bukti Pengiriman</CardTitle>
          <CardDescription>Pilih tanggal untuk melihat riwayat tugas dan bukti pengiriman kurir ini.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                  <Button variant={"outline"} className="w-full justify-start text-left font-normal md:w-[280px]">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedTaskDate ? format(selectedTaskDate, "PPP", { locale: indonesiaLocale }) : <span>Pilih tanggal tugas</span>}
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                      mode="single"
                      selected={selectedTaskDate}
                      onSelect={(date) => { setSelectedTaskDate(date); setIsCalendarOpen(false); }}
                      disabled={(date) => date > new Date() || date < new Date("2023-01-01")}
                      initialFocus
                  />
              </PopoverContent>
          </Popover>

          {isLoadingHistory && <p>Memuat riwayat...</p>}

          {!isLoadingHistory && selectedTaskDate && (!taskHistory?.task) && (
             <p className="text-muted-foreground text-center py-4">Tidak ada data tugas untuk tanggal yang dipilih.</p>
          )}

          {taskHistory?.task && (
            <div className="space-y-6 mt-4">
              <Separator />
               {/* Delivered Packages Section */}
                <div>
                    <h4 className="text-lg font-semibold mb-2">Paket Terkirim ({taskHistory.packages.filter(p=>p.status === 'delivered').length})</h4>
                    {taskHistory.packages.filter(p=>p.status === 'delivered').length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {taskHistory.packages.filter(p => p.status === 'delivered').map(pkg => (
                            <Card key={pkg.id} className="overflow-hidden">
                                <CardContent className="p-3">
                                    <p className="font-semibold text-sm break-all">{pkg.id}</p>
                                    <p className="text-xs text-muted-foreground">Penerima: {pkg.recipientName || 'N/A'}</p>
                                    {isValidImageUrl(pkg.deliveryProofPhotoUrl) ? (
                                        <div className="mt-2 relative aspect-video cursor-pointer group" onClick={() => handleImageClick(pkg.deliveryProofPhotoUrl!, `Bukti untuk ${pkg.id}`)}>
                                            <Image src={pkg.deliveryProofPhotoUrl} alt={`Bukti untuk ${pkg.id}`} layout="fill" objectFit="cover" className="rounded-md" data-ai-hint="package door"/>
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ZoomIn className="h-8 w-8 text-white"/>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-2 aspect-video bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">Foto tidak tersedia</div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                      </div>
                    ) : <p className="text-sm text-muted-foreground">Tidak ada paket terkirim pada tanggal ini.</p>}
                </div>

                {/* Returned Packages Section */}
                <div>
                  <h4 className="text-lg font-semibold mb-2">Paket Pending/Retur ({taskHistory.packages.filter(p=>p.status === 'returned').length})</h4>
                  {taskHistory.packages.filter(p=>p.status === 'returned').length > 0 && isValidImageUrl(taskHistory.task.finalReturnProofPhotoUrl) ? (
                     <Card className="max-w-md">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center"><PackageReturnedIcon className="mr-2 h-4 w-4"/>Bukti Serah Terima Retur</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative aspect-video cursor-pointer group mb-2" onClick={() => handleImageClick(taskHistory.task!.finalReturnProofPhotoUrl!, `Bukti Retur`)}>
                                <Image src={taskHistory.task.finalReturnProofPhotoUrl} alt="Bukti Retur" layout="fill" objectFit="cover" className="rounded-md" data-ai-hint="receipt package" />
                                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ZoomIn className="h-8 w-8 text-white"/>
                                </div>
                            </div>
                            <p className="text-sm">Diserahkan kepada Leader: <span className="font-semibold">{taskHistory.task.finalReturnLeadReceiverName || 'N/A'}</span></p>
                             <p className="text-xs text-muted-foreground mt-2">Resi yang diretur:</p>
                             <ul className="list-disc list-inside text-xs text-muted-foreground">
                                {taskHistory.packages.filter(p => p.status === 'returned').map(p => <li key={p.id}>{p.id}</li>)}
                             </ul>
                        </CardContent>
                     </Card>
                  ) : taskHistory.packages.filter(p=>p.status === 'returned').length > 0 ? (
                      <p className="text-sm text-muted-foreground">Ada {taskHistory.packages.filter(p=>p.status === 'returned').length} paket yang diretur tetapi tidak ada bukti foto serah terima yang diunggah.</p>
                  ) : <p className="text-sm text-muted-foreground">Tidak ada paket yang diretur pada tanggal ini.</p>}
                </div>

            </div>
          )}

        </CardContent>
      </Card>
      
       <Dialog open={!!selectedImage} onOpenChange={(isOpen) => !isOpen && setSelectedImage(null)}>
          <DialogContent className="max-w-3xl">
              <DialogHeader>
                  <DialogTitle>{selectedImage?.alt}</DialogTitle>
              </DialogHeader>
              {selectedImage && (
                  <div className="mt-4 flex justify-center">
                    <Image src={selectedImage.src} alt={selectedImage.alt} width={800} height={600} className="max-w-full h-auto max-h-[80vh] rounded-lg object-contain" data-ai-hint="package receipt"/>
                  </div>
              )}
          </DialogContent>
        </Dialog>

    </div>
  );
}
