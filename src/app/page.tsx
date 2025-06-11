
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
import { auth, db } from '@/lib/firebase'; // Import Firebase auth and db
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginPage() {
  const [emailInput, setEmailInput] = useState(''); // Changed from userIdInput to emailInput
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, see if we have their profile and redirect
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

    if (!emailInput.includes('@')) {
        toast({
            title: 'Login Gagal',
            description: 'Format User ID harus berupa email yang valid.',
            variant: 'destructive',
        });
        setIsLoading(false);
        return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailInput, password);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        // Fetch user profile from Firestore
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userProfileData = userDocSnap.data() as UserProfile;
          
          toast({
            title: 'Login Berhasil',
            description: `Selamat datang kembali, ${userProfileData.fullName}! Peran: ${userProfileData.role}`,
          });
          
          localStorage.setItem('isAuthenticated', 'true');
          // Store the full profile fetched from Firestore
          localStorage.setItem('loggedInUser', JSON.stringify({
            ...userProfileData, // Spread all fields from Firestore
            uid: firebaseUser.uid, // Add Firebase UID for reference if needed
          }));
          
          router.replace('/dashboard');
        } else {
          // This case should ideally not happen if data seeding is correct
          // User exists in Auth, but no profile in Firestore
          toast({
            title: 'Login Gagal',
            description: 'Profil pengguna tidak ditemukan. Hubungi administrator.',
            variant: 'destructive',
          });
          await auth.signOut(); // Sign out the user from Auth
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('loggedInUser');
          localStorage.removeItem('courierCheckedInToday');
        }
      }
    } catch (error: any) {
      let errorMessage = 'Email atau password salah.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Email atau password yang Anda masukkan salah.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Format email tidak valid.';
      } else {
        console.error("Firebase login error:", error);
        errorMessage = 'Terjadi kesalahan saat login. Coba lagi nanti.';
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
        <CardFooter className="text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} PIS. All rights reserved.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
