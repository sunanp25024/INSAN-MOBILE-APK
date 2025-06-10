
"use client";

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { UserProfile } from "@/types";
import { Building, CalendarDays, CreditCard, DollarSign, Briefcase, FileText, MapPin, UserCircle, Mail } from "lucide-react";
import Image from "next/image";

function ProfileItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | React.ReactNode }) {
  if (!value) return null;
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
      try {
        const parsedUser = JSON.parse(userDataString) as UserProfile;
        // Augment with more details if it's the specific Kurir from mock, for demo
        if (parsedUser.id === 'PISTEST2025' && parsedUser.role === 'Kurir') {
           setUserProfile({
            ...parsedUser,
            workLocation: parsedUser.workLocation || "Jakarta Pusat Hub",
            joinDate: parsedUser.joinDate || new Date("2023-05-15T00:00:00.000Z").toISOString(),
            position: parsedUser.position || "Kurir Senior",
            contractStatus: parsedUser.contractStatus || "Permanent",
            bankAccountNumber: parsedUser.bankAccountNumber || "123-456-7890",
            bankName: parsedUser.bankName || "Bank Mandiri",
            bankRecipientName: parsedUser.bankRecipientName || "Ahmad Subagja",
            photoIdUrl: parsedUser.photoIdUrl || "https://placehold.co/400x250.png",
          });
        } else {
          setUserProfile(parsedUser);
        }
      } catch (error) {
        console.error("Failed to parse user data for profile", error);
      }
    }
  }, []);

  if (!userProfile) {
    return <div className="flex h-screen items-center justify-center">Loading profile...</div>;
  }

  const { 
    id, fullName, role, workLocation, joinDate, position, contractStatus, 
    bankAccountNumber, bankName, bankRecipientName, avatarUrl, photoIdUrl, email
  } = userProfile;

  const userInitials = fullName?.split(" ").map(n => n[0]).join("").toUpperCase() || "XX";

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden shadow-xl">
        <CardHeader className="bg-card-foreground/5 p-0">
          <div className="relative h-48 w-full">
            <Image src="https://placehold.co/1200x300.png" alt="Profile background" layout="fill" objectFit="cover" data-ai-hint="abstract pattern"/>
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute bottom-0 left-0 p-6">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarImage src={avatarUrl || `https://placehold.co/150x150.png?text=${userInitials}`} alt={fullName} data-ai-hint="man face"/>
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
            </div>
          </div>
           <div className="p-6 pt-2">
            <CardTitle className="text-3xl font-bold text-primary">{fullName}</CardTitle>
            <CardDescription className="text-md text-muted-foreground">
              {position || role} - {id}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          
          <section>
            <h3 className="text-lg font-semibold text-primary mb-2 flex items-center"><UserCircle className="mr-2 h-5 w-5"/>Informasi Dasar</h3>
            <Separator className="my-2"/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <ProfileItem icon={Mail} label="Email" value={email} />
              <ProfileItem icon={MapPin} label="Lokasi Kerja" value={workLocation} />
              <ProfileItem icon={CalendarDays} label="Tanggal Bergabung" value={joinDate ? new Date(joinDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined} />
              <ProfileItem icon={Briefcase} label="Jabatan" value={position || role} />
              <ProfileItem icon={FileText} label="Status Kontrak" value={contractStatus} />
            </div>
          </section>

          {(role === 'Kurir' || bankName) && ( // Show bank info only if Kurir or if data exists
            <>
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
            </>
          )}
          
          {(role === 'Kurir' || photoIdUrl) && ( // Show ID card only if Kurir or if data exists
            <>
            <Separator className="my-6"/>
            <section>
              <h3 className="text-lg font-semibold text-primary mb-2">Foto ID Card</h3>
              <div className="mt-2 rounded-lg overflow-hidden border border-border shadow-sm" style={{maxWidth: '400px'}}>
                  <Image src={photoIdUrl || "https://placehold.co/400x250.png?text=ID+Card"} alt="Foto ID Card" width={400} height={250} objectFit="cover" data-ai-hint="id card"/>
              </div>
            </section>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
