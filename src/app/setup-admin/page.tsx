
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLogo } from '@/components/icons/AppLogo';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, ArrowLeft } from 'lucide-react';
import type { UserProfile } from '@/types';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; // Removed serverTimestamp import
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';

const setupSchema = z.object({
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  appId: z.string().min(1, "ID Aplikasi wajib diisi (cth: MASTERADMIN01)"),
});

type SetupFormData = z.infer<typeof setupSchema>;

export default function SetupAdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
  });

  const handleSetup: SubmitHandler<SetupFormData> = async (data) => {
    setIsLoading(true);
    let success = false;
    try {
      // 1. Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        // 2. Create user profile in Firestore
        const newAdminProfile: Omit<UserProfile, 'uid'> = {
          id: data.appId,
          fullName: data.fullName,
          email: data.email,
          role: 'MasterAdmin',
          status: 'Aktif',
          joinDate: new Date().toISOString(), // Use ISO string
          createdAt: new Date().toISOString(), // Use ISO string
        };

        // Use Firebase Auth UID as document ID in Firestore for consistency
        await setDoc(doc(db, "users", firebaseUser.uid), {
            ...newAdminProfile,
            uid: firebaseUser.uid, // also store uid inside the document
        });

        toast({
          title: "Setup MasterAdmin Berhasil!",
          description: `Akun untuk ${data.fullName} telah dibuat. Silakan login.`,
        });
        
        success = true;
      }
    } catch (error: any) {
      console.error("Error setting up MasterAdmin: ", error);
      let errorMessage = "Gagal membuat akun MasterAdmin.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Email ini sudah terdaftar. Gunakan email lain atau periksa Firebase Authentication.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password terlalu lemah. Gunakan minimal 6 karakter.";
      } else if (error.code === 'permission-denied' || error.code === 'permission_denied') {
        errorMessage = "Gagal menyimpan profil karena masalah izin. Pastikan Firestore Security Rules sudah diperbarui sesuai instruksi terbaru.";
      }
      toast({
        title: "Setup Gagal",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      if (success) {
        router.push('/'); // Redirect to login page ONLY on success
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-lg shadow-2xl border-primary/20">
        <CardHeader className="text-center space-y-2">
           <div className="flex justify-center mb-4">
            <AppLogo className="h-20 w-20 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Setup Akun MasterAdmin Pertama</CardTitle>
          <CardDescription>
            Gunakan halaman ini hanya sekali untuk membuat akun MasterAdmin awal.
            <br />
            Setelah selesai, link ke halaman ini sebaiknya dihapus dari kode.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleSetup)} className="space-y-4">
            <div>
              <Label htmlFor="appId">ID Aplikasi MasterAdmin <span className="text-destructive">*</span></Label>
              <Input id="appId" {...register("appId")} placeholder="cth: MASTERADMIN01" />
              {errors.appId && <p className="text-destructive text-sm mt-1">{errors.appId.message}</p>}
            </div>
            <div>
              <Label htmlFor="fullName">Nama Lengkap <span className="text-destructive">*</span></Label>
              <Input id="fullName" {...register("fullName")} placeholder="Nama Anda" />
              {errors.fullName && <p className="text-destructive text-sm mt-1">{errors.fullName.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email (untuk Login) <span className="text-destructive">*</span></Label>
              <Input id="email" type="email" {...register("email")} placeholder="masteradmin@example.com" />
              {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
              <Input id="password" type="password" {...register("password")} placeholder="Minimal 6 karakter" />
              {errors.password && <p className="text-destructive text-sm mt-1">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? 'Membuat Akun...' : (
                <>
                  <UserPlus className="mr-2 h-5 w-5" /> Buat Akun MasterAdmin
                </>
              )}
            </Button>
          </form>
        </CardContent>
         <CardFooter className="flex flex-col items-center text-center text-sm text-muted-foreground space-y-2">
            <Link href="/" passHref>
                <Button variant="link" className="text-sm">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Login
                </Button>
            </Link>
          <p>&copy; {new Date().getFullYear()} PIS. All rights reserved.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
