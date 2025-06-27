
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLogo } from '@/components/icons/AppLogo';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import Link from 'next/link';

export default function LoginPage() {
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
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
      await signInWithEmailAndPassword(auth, emailInput, password);
      
      toast({
        title: 'Login Berhasil',
        description: `Mengalihkan ke dashboard...`,
      });
      
      // Redirect to dashboard explicitly after successful login
      router.push('/dashboard');
      
    } catch (error: any) {
      let errorMessage = 'Email atau password salah.';
      
      // Check for the specific referer block error first
      if (error.message && error.message.includes('auth/requests-from-referer')) {
        errorMessage = 'Domain aplikasi Vercel Anda diblokir. Pastikan Anda telah menambahkan "apk-para-kurir-tau.vercel.app" ke daftar "HTTP referrers" pada setelan API Key di Google Cloud Console.';
      } else {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = 'Email atau password yang Anda masukkan salah.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Format email tidak valid.';
            break;
          case 'auth/too-many-requests':
              errorMessage = 'Terlalu banyak percobaan login. Coba lagi nanti.';
              break;
          default:
            errorMessage = 'Terjadi kesalahan saat login. Silakan coba lagi nanti.';
            break;
        }
      }
      
      toast({
        title: 'Login Gagal',
        description: errorMessage,
        variant: 'destructive',
        duration: 9000, // Give more time to read the detailed error
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <CardHeader className="text-center space-y-2">
          <Link href="/" className="flex justify-center mb-4">
            <AppLogo className="h-28 w-28 text-primary" />
          </Link>
          <CardTitle className="text-3xl font-bold text-primary">Selamat Datang Kembali</CardTitle>
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
                autoComplete="email"
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
                  autoComplete="current-password"
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
            <div className="flex flex-col gap-3">
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3" disabled={isLoading}>
                {isLoading ? 'Loading...' : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" /> Login
                  </>
                )}
              </Button>
            </div>
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
