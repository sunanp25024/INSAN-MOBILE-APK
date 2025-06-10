"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { CourierProfile } from "@/types";
import { Building, CalendarDays, CreditCard, DollarSign, Briefcase, FileText, MapPin, UserCircle } from "lucide-react";
import Image from "next/image";

// Mock data - replace with actual data fetching
const mockCourierProfile: CourierProfile = {
  id: "PISTEST2025",
  fullName: "Ahmad Subagja",
  workLocation: "Bandung Super Hub",
  joinDate: "2023-05-15T00:00:00.000Z",
  position: "Kurir Senior",
  contractStatus: "Permanent",
  bankAccountNumber: "123-456-7890",
  bankName: "Bank Mandiri",
  bankRecipientName: "Ahmad Subagja",
  avatarUrl: "https://placehold.co/150x150.png",
  photoIdUrl: "https://placehold.co/400x250.png",
};

function ProfileItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | React.ReactNode }) {
  return (
    <div className="flex items-start space-x-3 py-3">
      <Icon className="h-5 w-5 text-primary mt-1" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { 
    id, fullName, workLocation, joinDate, position, contractStatus, 
    bankAccountNumber, bankName, bankRecipientName, avatarUrl, photoIdUrl 
  } = mockCourierProfile;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden shadow-xl">
        <CardHeader className="bg-card-foreground/5 p-0">
          <div className="relative h-48 w-full">
            <Image src="https://placehold.co/1200x300.png" alt="Profile background" layout="fill" objectFit="cover" data-ai-hint="abstract pattern"/>
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute bottom-0 left-0 p-6">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarImage src={avatarUrl} alt={fullName} data-ai-hint="man face"/>
                  <AvatarFallback>{fullName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
            </div>
          </div>
           <div className="p-6 pt-2">
            <CardTitle className="text-3xl font-bold text-primary">{fullName}</CardTitle>
            <CardDescription className="text-md text-muted-foreground">{position} - {id}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          
          <section>
            <h3 className="text-lg font-semibold text-primary mb-2 flex items-center"><UserCircle className="mr-2 h-5 w-5"/>Informasi Pribadi</h3>
            <Separator className="my-2"/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <ProfileItem icon={MapPin} label="Lokasi Kerja" value={workLocation} />
              <ProfileItem icon={CalendarDays} label="Tanggal Bergabung" value={new Date(joinDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })} />
              <ProfileItem icon={Briefcase} label="Jabatan" value={position} />
              <ProfileItem icon={FileText} label="Status Kontrak" value={contractStatus} />
            </div>
          </section>

          <Separator className="my-6"/>

          <section>
            <h3 className="text-lg font-semibold text-primary mb-2 flex items-center"><CreditCard className="mr-2 h-5 w-5"/>Informasi Bank</h3>
            <Separator className="my-2"/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <ProfileItem icon={Building} label="Nama Bank" value={bankName} />
              <ProfileItem icon={UserCircle} label="Nama Pemilik Rekening" value={bankRecipientName} />
              <ProfileItem icon={DollarSign} label="Nomor Rekening" value={bankAccountNumber} />
            </div>
          </section>
          
          <Separator className="my-6"/>

          <section>
            <h3 className="text-lg font-semibold text-primary mb-2">Foto ID Card Mitra</h3>
             <div className="mt-2 rounded-lg overflow-hidden border border-border shadow-sm" style={{maxWidth: '400px'}}>
                <Image src={photoIdUrl || "https://placehold.co/400x250.png"} alt="Foto ID Card" width={400} height={250} objectFit="cover" data-ai-hint="id card"/>
             </div>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}
