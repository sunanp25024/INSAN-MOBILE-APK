
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLogo } from '@/components/icons/AppLogo';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import type { UserProfile } from '@/types';
import { auth, db } from '@/lib/firebase'; // Updated import
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';

export default function LoginPage() {
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const storedUser = localStorage.getItem('loggedInUser');
        if (storedUser) {
          router.replace('/dashboard');
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    let loginSuccess = false;
    let finalError: any = null;
    const maxRetries = 2; 

    if (!emailInput.includes('@')) {
        toast({
            title: 'Login Gagal',
            description: 'Format User ID harus berupa email yang valid.',
            variant: 'destructive',
        });
        setIsLoading(false);
        return;
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Login attempt ${attempt + 1} with email: ${emailInput}`);
        const userCredential = await signInWithEmailAndPassword(auth, emailInput, password);
        const firebaseUser = userCredential.user;
        console.log("Firebase Auth successful, user UID:", firebaseUser.uid);

        if (firebaseUser) {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          console.log("Fetching Firestore document from:", userDocRef.path);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userProfileData = userDocSnap.data() as UserProfile;
            console.log("Firestore document found:", userProfileData);
            toast({
              title: 'Login Berhasil',
              description: `Selamat datang kembali, ${userProfileData.fullName}! Peran: ${userProfileData.role}`,
            });
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('loggedInUser', JSON.stringify({
              ...userProfileData, // Spread existing data from Firestore
              uid: firebaseUser.uid, // Ensure Firebase UID is included
            }));
            loginSuccess = true;
            router.replace('/dashboard');
            break; 
          } else {
            console.error("Firestore document NOT found for UID:", firebaseUser.uid);
            finalError = { code: 'auth/user-profile-not-found', message: 'Profil pengguna tidak ditemukan di database.' };
            if (auth.currentUser) await auth.signOut();
            break; 
          }
        }
      } catch (error: any) {
        finalError = error;
        console.error(`Login attempt ${attempt + 1} failed:`, error.code, error.message);
        if (error.code === 'auth/visibility-check-was-unavailable' && attempt < maxRetries) {
          const delay = (attempt + 1) * 1500; 
          console.log(`Retrying login in ${delay / 1000}s due to ${error.code}`);
          toast({
            title: 'Masalah Koneksi Sementara',
            description: `Mencoba login lagi (${attempt + 1}/${maxRetries})...`,
            variant: 'default',
            duration: delay + 500
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          break; 
        }
      }
    }

    if (!loginSuccess && finalError) {
      let errorMessage = 'Email atau password salah.'; 
      switch (finalError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Email atau password yang Anda masukkan salah.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Format email tidak valid.';
          break;
        case 'auth/visibility-check-was-unavailable':
           errorMessage = 'Gagal terhubung ke server autentikasi setelah beberapa percobaan. Periksa koneksi internet Anda dan coba lagi. Jika masalah berlanjut, hubungi support.';
          break;
        case 'auth/user-profile-not-found':
          errorMessage = finalError.message; 
          break;
        default:
          console.error("Firebase login error (unhandled final):", finalError);
          errorMessage = 'Terjadi kesalahan saat login. Silakan coba lagi nanti.';
          break;
      }
      toast({
        title: 'Login Gagal',
        description: errorMessage,
        variant: 'destructive',
      });
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('loggedInUser');
      localStorage.removeItem('courierCheckedInToday');
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <AppLogo className="h-28 w-28 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">INSAN MOBILE</CardTitle>
          <CardDescription>Silakan login untuk melanjutkan</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">User ID (Email)</Label>
              <Input
                id="email"
                type="email"
                placeholder="Masukkan alamat email Anda"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="bg-input border-border focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="******"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-input border-border focus:ring-primary focus:border-primary pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-primary"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3" disabled={isLoading}>
              {isLoading ? 'Loading...' : (
                <>
                  <LogIn className="mr-2 h-5 w-5" /> Login
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-center text-sm text-muted-foreground space-y-2 pt-4">
           <p>
              Bermasalah saat login? <Link href="/setup-admin" className="underline hover:text-primary">Setup Akun MasterAdmin</Link>
          </p>
          <p className="pt-2">&copy; {new Date().getFullYear()} PIS. All rights reserved.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
