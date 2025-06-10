
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
import type { UserRole, UserProfile } from '@/types';

// Mock users with different roles
const mockUsers: Record<string, UserProfile & { passwordValue: string }> = {
  'MASTERADMIN001': {
    id: 'MASTERADMIN001',
    fullName: 'Super Admin',
    role: 'MasterAdmin',
    passwordValue: 'master123',
    avatarUrl: 'https://placehold.co/100x100.png?text=MA',
    email: 'master@example.com',
  },
  'ADMIN001': {
    id: 'ADMIN001',
    fullName: 'Admin Staff',
    role: 'Admin',
    passwordValue: 'admin123',
    avatarUrl: 'https://placehold.co/100x100.png?text=AD',
    email: 'admin@example.com',
  },
  'PIC001': {
    id: 'PIC001',
    fullName: 'PIC Lapangan',
    role: 'PIC',
    passwordValue: 'pic123',
    avatarUrl: 'https://placehold.co/100x100.png?text=PC',
    email: 'pic@example.com',
  },
  'PISTEST2025': { // Existing Kurir
    id: 'PISTEST2025',
    fullName: 'Budi Santoso',
    role: 'Kurir',
    passwordValue: '123456',
    workLocation: 'Jakarta Pusat Hub',
    joinDate: new Date().toISOString(),
    position: 'Kurir Senior',
    contractStatus: 'Permanent',
    bankAccountNumber: '1234567890',
    bankName: 'Bank Central Asia',
    bankRecipientName: 'Budi Santoso',
    avatarUrl: 'https://placehold.co/100x100.png',
    photoIdUrl: 'https://placehold.co/300x200.png',
    email: 'budi.s@example.com',
  }
};


export default function LoginPage() {
  const [userIdInput, setUserIdInput] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const user = mockUsers[userIdInput.toUpperCase()];

    if (user && user.passwordValue === password) {
      toast({
        title: 'Login Successful',
        description: `Welcome back, ${user.fullName}! Role: ${user.role}`,
      });
      
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('loggedInUser', JSON.stringify({
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        email: user.email
      }));
      
      router.push('/dashboard');
    } else {
      toast({
        title: 'Login Failed',
        description: 'Invalid ID or Password.',
        variant: 'destructive',
      });
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('loggedInUser');
      localStorage.removeItem('courierCheckedInToday'); // Also clear check-in status
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/30">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <AppLogo className="h-20 w-20 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">INSAN MOBILE</CardTitle>
          <CardDescription>Silakan login untuk melanjutkan</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="id">User ID</Label>
              <Input
                id="id"
                type="text"
                placeholder="Masukkan User ID Anda"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
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
