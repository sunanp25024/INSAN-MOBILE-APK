
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Upload, Lock, Bell, Palette, Save } from 'lucide-react';
import type { UserProfile } from '@/types';
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { uploadFileToServer } from '@/lib/firebaseAdminActions';

export default function SettingsPage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // State for profile editing
  const [fullName, setFullName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);

  // State for password change (all roles)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // General settings applicable to all
  const [appUpdatesNotif, setAppUpdatesNotif] = useState(true);
  const [perfReportsNotif, setPerfReportsNotif] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("dark");
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
      try {
        const parsedUser = JSON.parse(userDataString) as UserProfile;
        setCurrentUser(parsedUser);
        setFullName(parsedUser.fullName || '');
        setAvatarPreview(parsedUser.avatarUrl || null);
        
        const savedTheme = localStorage.getItem('appTheme') || 'dark';
        setCurrentTheme(savedTheme);
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      } catch (error) {
        console.error("Failed to parse user data for settings", error);
      }
    }
  }, []);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string); // This is a data URL
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setIsProfileSubmitting(true);
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
        toast({ title: "Error", description: "Pengguna tidak terautentikasi.", variant: "destructive" });
        setIsProfileSubmitting(false);
        return;
    }
    
    let avatarUrlToSave = currentUser.avatarUrl || null;

    try {
        // 1. Upload new avatar if a new file has been selected
        if (avatarFile && avatarPreview) {
            const filePath = `avatars/${user.uid}/${avatarFile.name}`;
            const uploadResult = await uploadFileToServer(filePath, avatarPreview);
            if (!uploadResult.success || !uploadResult.url) {
                toast({ title: "Gagal Mengunggah Avatar", description: uploadResult.message, variant: "destructive" });
                setIsProfileSubmitting(false);
                return;
            }
            avatarUrlToSave = uploadResult.url;
        }

        // 2. Update Firebase Auth profile
        await updateProfile(user, {
            displayName: fullName,
            photoURL: avatarUrlToSave
        });

        // 3. Update Firestore profile document
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
            fullName: fullName,
            avatarUrl: avatarUrlToSave,
            updatedAt: new Date().toISOString()
        });
        
        // 4. Update local state and localStorage
        const updatedUser: UserProfile = { ...currentUser, fullName, avatarUrl: avatarUrlToSave || undefined };
        localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        
        toast({ title: "Profil Disimpan", description: "Informasi profil Anda telah berhasil diperbarui." });
    } catch (error) {
        console.error("Error saving profile:", error);
        toast({ title: "Gagal Menyimpan", description: "Terjadi kesalahan saat menyimpan profil.", variant: "destructive" });
    } finally {
        setIsProfileSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) {
      toast({ title: "Error", description: "Email pengguna tidak ditemukan untuk otentikasi.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Password baru dan konfirmasi password tidak cocok.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
       toast({ title: "Error", description: "Password baru minimal 6 karakter.", variant: "destructive" });
      return;
    }
    
    setIsPasswordSubmitting(true);
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      try {
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        
        toast({ title: "Password Berhasil Diganti", description: "Password Anda telah berhasil diubah." });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (error: any) {
        console.error("Password change error:", error);
        let errorMessage = "Gagal mengganti password.";
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          errorMessage = "Password saat ini yang Anda masukkan salah.";
        } else if (error.code === 'auth/too-many-requests') {
          errorMessage = "Terlalu banyak percobaan. Coba lagi nanti.";
        }
        toast({ title: "Gagal Mengganti Password", description: errorMessage, variant: "destructive" });
      } finally {
        setIsPasswordSubmitting(false);
      }
    }
  };

  const handleNotificationSave = () => {
     toast({ title: "Notifikasi Disimpan", description: "Pengaturan notifikasi Anda telah diperbarui." });
  };

  const toggleTheme = (theme: 'light' | 'dark') => {
    setCurrentTheme(theme);
    localStorage.setItem('appTheme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    toast({ title: "Tema Diubah", description: `Tema aplikasi diubah ke mode ${theme === 'dark' ? 'Gelap' : 'Terang'}.`})
  }

  if (!currentUser) {
    return <div className="flex h-screen items-center justify-center">Memuat pengaturan...</div>;
  }

  const userInitials = (fullName || currentUser.fullName || '').split(" ").map(n => n[0]).join("").toUpperCase() || "XX";

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Pengaturan Akun</CardTitle>
          <CardDescription>Kelola informasi profil, keamanan, dan preferensi Anda.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Upload className="mr-2 h-5 w-5 text-primary"/> Edit Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || `https://placehold.co/150x150.png?text=${userInitials}`} alt={fullName} data-ai-hint="man face"/>
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <Input id="avatarUpload" type="file" accept="image/*" onChange={handleAvatarChange} className="text-sm max-w-xs" />
            </div>
            <div>
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
            </div>
            <Button type="submit" className="w-full sm:w-auto" disabled={isProfileSubmitting}>
              {isProfileSubmitting ? 'Menyimpan...' : <><Save className="mr-2 h-4 w-4"/> Simpan Perubahan Profil</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Lock className="mr-2 h-5 w-5 text-primary"/> Ganti Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Password Saat Ini</Label>
              <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Masukkan password lama" required autoComplete="current-password" />
            </div>
            <div>
              <Label htmlFor="newPassword">Password Baru</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" required autoComplete="new-password" />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Konfirmasi password baru" required autoComplete="new-password" />
            </div>
            <Button type="submit" className="w-full sm:w-auto" disabled={isPasswordSubmitting}>
              {isPasswordSubmitting ? 'Memproses...' : <><Save className="mr-2 h-4 w-4"/> Ganti Password</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5 text-primary"/> Pengaturan Notifikasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="appUpdates" className="flex flex-col space-y-1">
              <span>Pembaruan Aplikasi</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Terima notifikasi tentang fitur baru dan pembaruan penting.
              </span>
            </Label>
            <Switch id="appUpdates" checked={appUpdatesNotif} onCheckedChange={setAppUpdatesNotif} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="perfReports" className="flex flex-col space-y-1">
              <span>Laporan Performa Mingguan</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Dapatkan ringkasan performa Anda setiap minggu (jika relevan).
              </span>
            </Label>
            <Switch id="perfReports" checked={perfReportsNotif} onCheckedChange={setPerfReportsNotif} />
          </div>
           <Button onClick={handleNotificationSave} className="w-full sm:w-auto"><Save className="mr-2 h-4 w-4"/> Simpan Notifikasi</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5 text-primary"/> Pengaturan Tema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <p className="text-muted-foreground text-sm">Pilih tema tampilan aplikasi.</p>
           <div className="flex items-center space-x-2">
             <Button variant={currentTheme === 'light' ? 'default' : 'outline'} onClick={() => toggleTheme('light')}>Terang</Button>
             <Button variant={currentTheme === 'dark' ? 'default' : 'outline'} onClick={() => toggleTheme('dark')}>Gelap</Button>
           </div>
        </CardContent>
      </Card>

    </div>
  );
}
