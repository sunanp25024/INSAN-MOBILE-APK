
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, CalendarDays, User, MapPin, FileText, Briefcase, Phone, Package, Percent, ShieldAlert, Users as UsersIcon, ClipboardList } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { UserProfile } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

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
          
          <CardDescription className="text-center text-xs italic">
             Halaman ini bersifat lihat-saja (view only) untuk PIC. Perubahan data kurir dilakukan oleh Admin atau MasterAdmin.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
