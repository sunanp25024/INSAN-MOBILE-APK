
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, CalendarDays, User, MapPin, FileText, Briefcase, Phone, Package, Percent, ShieldAlert, Users as UsersIcon, ClipboardList } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { UserProfile } from '@/types';

// This data structure should align with the one in courier-management/page.tsx for consistency
interface DetailedCourierProfile extends UserProfile {
  totalPackagesToday?: number;
  onTimeRate?: string;
  phone?: string; // Added for detail view
  // position is already in UserProfile
}

// This mock list is used to "fetch" data on this detail page.
// It should ideally mirror or be a superset of the data used in the listing page.
// For simplicity, we redefine it here with potentially more fields.
const mockCouriersList: DetailedCourierProfile[] = [
   { 
    id: 'PISTEST2025', 
    fullName: 'Budi Santoso', 
    status: 'Aktif', 
    workLocation: 'Jakarta Pusat Hub (Thamrin)', 
    totalPackagesToday: 35, 
    onTimeRate: '95%',
    email: 'budi.s@example.com',
    joinDate: new Date(2023, 0, 15).toISOString(),
    nik: '1234567890123456',
    role: 'Kurir',
    position: 'Kurir Senior',
    avatarUrl: 'https://placehold.co/100x100.png?text=BS',
    phone: '081200002025'
  },
  { 
    id: 'KURIR002', 
    fullName: 'Ani Yudhoyono', 
    status: 'Aktif', 
    workLocation: 'Bandung Kota Hub (Kota)', 
    totalPackagesToday: 42, 
    onTimeRate: '92%',
    email: 'ani.y@example.com',
    joinDate: new Date(2022, 5, 10).toISOString(),
    nik: '6543210987654321',
    role: 'Kurir',
    position: 'Kurir',
    avatarUrl: 'https://placehold.co/100x100.png?text=AY',
    phone: '081200000002'
  },
  { 
    id: 'KURIR003', 
    fullName: 'Charlie Van Houten', 
    status: 'Nonaktif', 
    workLocation: 'Surabaya Timur Hub (Cawang)', 
    totalPackagesToday: 0, 
    onTimeRate: 'N/A',
    email: 'charlie.vh@example.com',
    joinDate: new Date(2023, 8, 1).toISOString(),
    nik: '1122334455667788',
    role: 'Kurir',
    position: 'Kurir',
    avatarUrl: 'https://placehold.co/100x100.png?text=CVH',
    phone: '081200000003'
  },
  { 
    id: 'KURIR004', 
    fullName: 'Dewi Persik', 
    status: 'Aktif', 
    workLocation: 'Medan Barat Hub', 
    totalPackagesToday: 30, 
    onTimeRate: '98%',
    email: 'dewi.p@example.com',
    joinDate: new Date(2021, 11, 20).toISOString(),
    nik: '8877665544332211',
    role: 'Kurir',
    position: 'Kurir',
    avatarUrl: 'https://placehold.co/100x100.png?text=DP',
    phone: '081200000004'
  },
];


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
  const [courier, setCourier] = useState<DetailedCourierProfile | null | undefined>(undefined);

  useEffect(() => {
    if (courierId) {
      const foundCourier = mockCouriersList.find(c => c.id === courierId);
      setCourier(foundCourier || null); 
    }
  }, [courierId]);

  if (courier === undefined) {
    return <div className="flex h-screen items-center justify-center">Loading courier details...</div>;
  }

  if (courier === null) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <UsersIcon className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-xl text-destructive mb-4">Kurir tidak ditemukan.</p>
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
            <DetailItem icon={Package} label="Paket Dibawa Hari Ini (Contoh)" value={courier.totalPackagesToday?.toString() || "N/A"} />
            <DetailItem icon={Percent} label="Rate Tepat Waktu (Contoh)" value={courier.onTimeRate || "N/A"} />
            {/* <DetailItem icon={ShieldAlert} label="Kontak Darurat (Contoh)" value={"089988887777 (Ibu)"} /> */}
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

