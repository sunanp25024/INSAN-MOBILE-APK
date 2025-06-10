"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Upload, Lock, Bell, Palette, Save } from 'lucide-react';

// Mock user settings data
const mockUserSettings = {
  fullName: "Ahmad Subagja",
  email: "ahmad.s@example.com",
  avatarUrl: "https://placehold.co/150x150.png",
  notifications: {
    appUpdates: true,
    performanceReports: false,
  },
  theme: "dark", // 'dark' or 'light'
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [fullName, setFullName] = useState(mockUserSettings.fullName);
  const [email, setEmail] = useState(mockUserSettings.email);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(mockUserSettings.avatarUrl);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [appUpdatesNotif, setAppUpdatesNotif] = useState(mockUserSettings.notifications.appUpdates);
  const [perfReportsNotif, setPerfReportsNotif] = useState(mockUserSettings.notifications.performanceReports);
  
  // Theme switching is typically handled at a higher level (e.g., context or root layout)
  // This is a placeholder for UI representation
  const [currentTheme, setCurrentTheme] = useState(mockUserSettings.theme);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call
    toast({ title: "Profil Disimpan", description: "Informasi profil Anda telah diperbarui." });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Password baru dan konfirmasi password tidak cocok.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
       toast({ title: "Error", description: "Password minimal 6 karakter.", variant: "destructive" });
      return;
    }
    // Simulate API call
    toast({ title: "Password Diganti", description: "Password Anda telah berhasil diubah." });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleNotificationSave = () => {
     toast({ title: "Notifikasi Disimpan", description: "Pengaturan notifikasi Anda telah diperbarui." });
  };


  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Pengaturan Akun</CardTitle>
          <CardDescription>Kelola informasi profil, keamanan, dan preferensi Anda.</CardDescription>
        </CardHeader>
      </Card>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Upload className="mr-2 h-5 w-5 text-primary"/> Edit Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || undefined} alt={fullName} data-ai-hint="man face"/>
                <AvatarFallback>{fullName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
              </Avatar>
              <Input id="avatarUpload" type="file" accept="image/*" onChange={handleAvatarChange} className="text-sm max-w-xs" />
            </div>
            <div>
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full sm:w-auto"><Save className="mr-2 h-4 w-4"/> Simpan Perubahan Profil</Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Lock className="mr-2 h-5 w-5 text-primary"/> Ganti Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Password Saat Ini</Label>
              <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="newPassword">Password Baru</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full sm:w-auto"><Save className="mr-2 h-4 w-4"/> Ganti Password</Button>
          </form>
        </CardContent>
      </Card>

      {/* Notification Settings */}
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
                Dapatkan ringkasan performa Anda setiap minggu.
              </span>
            </Label>
            <Switch id="perfReports" checked={perfReportsNotif} onCheckedChange={setPerfReportsNotif} />
          </div>
           <Button onClick={handleNotificationSave} className="w-full sm:w-auto"><Save className="mr-2 h-4 w-4"/> Simpan Notifikasi</Button>
        </CardContent>
      </Card>
      
      {/* Theme Settings (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5 text-primary"/> Pengaturan Tema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <p className="text-muted-foreground text-sm">Pengaturan tema aplikasi (Terang/Gelap) biasanya dikelola secara global. Fitur ini adalah placeholder.</p>
           <div className="flex items-center space-x-2">
             <Button variant={currentTheme === 'light' ? 'default' : 'outline'} onClick={() => setCurrentTheme('light')}>Terang</Button>
             <Button variant={currentTheme === 'dark' ? 'default' : 'outline'} onClick={() => setCurrentTheme('dark')}>Gelap</Button>
           </div>
           <p className="text-xs text-muted-foreground">Tema saat ini: {currentTheme === 'dark' ? 'Gelap (Default untuk Mitra Kurir SPX)' : 'Terang'}</p>
        </CardContent>
      </Card>

    </div>
  );
}
