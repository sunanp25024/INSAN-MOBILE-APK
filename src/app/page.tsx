
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AppLogo } from '@/components/icons/AppLogo';
import { ArrowRight, ShieldCheck, Truck, Users, ScanLine, FileText, UserCog, Download, BarChart2, CheckCircle, Quote, Settings, UserCheck as UserCheckIcon, PackageCheck as PackageCheckIcon, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string,
  }>;
  prompt(): Promise<void>;
}

// Sub-component for a feature highlight section with alternating image/text
const FeatureHighlight = ({
  icon: Icon,
  title,
  description,
  imageUrl,
  imageAlt,
  imageHint,
  reverse = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  imageHint: string;
  reverse?: boolean;
}) => (
  <div className={`grid grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-16 ${reverse ? 'md:grid-flow-col-dense' : ''}`}>
    <div className={`space-y-4 ${reverse ? 'md:col-start-2' : ''}`}>
      <div className="inline-flex items-center gap-3 rounded-full bg-primary/10 px-4 py-2 text-primary">
        <Icon className="h-5 w-5" />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-muted-foreground md:text-lg">{description}</p>
      <ul className="space-y-2 text-muted-foreground">
        <li className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>Manajemen data terpusat dan aman.</span>
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>Alur kerja yang efisien untuk setiap peran.</span>
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>Dapat diakses di perangkat apa pun.</span>
        </li>
      </ul>
    </div>
    <div className="overflow-hidden rounded-lg shadow-xl">
      <Image
        src={imageUrl}
        alt={imageAlt}
        width={600}
        height={450}
        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        data-ai-hint={imageHint}
      />
    </div>
  </div>
);

export default function LandingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPromptEvent) {
      return;
    }
    installPromptEvent.prompt();
    installPromptEvent.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        toast({ title: 'Instalasi Berhasil', description: 'Aplikasi sedang diinstal di perangkat Anda.' });
      } else {
        toast({ title: 'Instalasi Dibatalkan', description: 'Anda dapat menginstal aplikasi nanti.', variant: 'default' });
      }
      setInstallPromptEvent(null);
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="container sticky top-0 z-50 mx-auto flex h-20 items-center justify-between bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <AppLogo className="h-10 w-10 text-primary" />
          <span className="text-xl font-bold text-foreground">INSAN MOBILE</span>
        </Link>
        <Button onClick={() => router.push('/login')}>
          Masuk Aplikasi <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto flex flex-col items-center justify-center px-4 py-20 text-center md:px-6 md:py-32">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Platform Operasional Cerdas untuk Tim Lapangan
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            Solusi terintegrasi untuk manajemen kurir, absensi, pelacakan performa, dan persetujuan berjenjang. Efisiensi operasional di ujung jari Anda.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row justify-center">
            <Button size="lg" className="text-lg px-8 py-6" onClick={() => router.push('/login')}>
              Mulai Sekarang
            </Button>
            {installPromptEvent && (
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6"
                onClick={handleInstallClick}
              >
                <Download className="mr-2 h-5 w-5" />
                Instal Aplikasi
              </Button>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-muted/40 py-24">
          <div className="container mx-auto space-y-20 px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Solusi Lengkap untuk Operasional Anda</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Dari manajemen tugas harian kurir hingga laporan strategis untuk manajer, semua yang Anda butuhkan ada di satu platform.
              </p>
            </div>

            <FeatureHighlight
              icon={BarChart2}
              title="Manajemen Terpusat & Visibilitas Penuh"
              description="Pantau seluruh operasional dari satu dashboard. Ambil keputusan berdasarkan data dengan laporan performa yang mendalam dan filter yang fleksibel."
              imageUrl="https://placehold.co/600x450.png"
              imageAlt="Dashboard analytics mockup"
              imageHint="dashboard analytics"
            />
            
            <FeatureHighlight
              icon={Truck}
              title="Efisiensi Kerja Lapangan Maksimal"
              description="Kurir dapat melakukan absensi, memindai resi, dan mengunggah bukti pengiriman langsung dari ponsel. Alur kerja yang dioptimalkan mengurangi kesalahan dan mempercepat proses."
              imageUrl="https://placehold.co/600x450.png"
              imageAlt="Mobile app interface for couriers"
              imageHint="mobile app interface"
              reverse={true}
            />

            <FeatureHighlight
              icon={ShieldCheck}
              title="Keamanan & Kontrol Berjenjang"
              description="Sistem persetujuan (approval) memastikan setiap perubahan data penting seperti penambahan pengguna atau penghapusan data harus melalui otorisasi MasterAdmin, menjaga integritas data Anda."
              imageUrl="https://placehold.co/600x450.png"
              imageAlt="Approval workflow table mockup"
              imageHint="data table list"
            />
          </div>
        </section>
        
        {/* How it Works Section */}
        <section className="container mx-auto px-4 py-24 md:px-6">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Alur Kerja yang Disederhanakan</h2>
            <p className="mt-4 text-lg text-muted-foreground">Empat langkah mudah untuk mengubah cara tim Anda bekerja.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
             <div className="flex flex-col items-center text-center">
               <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4 ring-8 ring-primary/5">
                 <Settings className="h-8 w-8" />
               </div>
               <h3 className="text-xl font-semibold mb-2">1. Setup & Kelola</h3>
               <p className="text-muted-foreground">Admin mengelola data master untuk Kurir, PIC, dan Admin lain dengan alur persetujuan yang aman.</p>
             </div>
             <div className="flex flex-col items-center text-center">
               <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4 ring-8 ring-primary/5">
                 <UserCheckIcon className="h-8 w-8" />
               </div>
               <h3 className="text-xl font-semibold mb-2">2. Absensi & Persiapan</h3>
               <p className="text-muted-foreground">Kurir melakukan absensi harian dan menginput jumlah paket yang akan dikirim melalui aplikasi.</p>
             </div>
             <div className="flex flex-col items-center text-center">
               <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4 ring-8 ring-primary/5">
                 <PackageCheckIcon className="h-8 w-8" />
               </div>
               <h3 className="text-xl font-semibold mb-2">3. Kirim & Update Status</h3>
               <p className="text-muted-foreground">Update status pengiriman secara real-time dengan mengunggah foto bukti penerimaan paket.</p>
             </div>
             <div className="flex flex-col items-center text-center">
               <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4 ring-8 ring-primary/5">
                 <ClipboardList className="h-8 w-8" />
               </div>
               <h3 className="text-xl font-semibold mb-2">4. Lapor & Analisis</h3>
               <p className="text-muted-foreground">Manajer dapat memantau aktivitas, melihat riwayat, dan mengunduh laporan performa untuk evaluasi.</p>
             </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="bg-muted/40 py-24">
          <div className="container mx-auto px-4 text-center md:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Dipercaya oleh Tim Hebat</h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Lihat bagaimana INSAN MOBILE membantu mentransformasi operasional mereka.
            </p>
            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <Card className="text-left">
                <CardHeader>
                  <div className="flex items-center gap-4">
                     <Avatar>
                        <AvatarImage src="https://placehold.co/100x100.png" alt="User" data-ai-hint="man face"/>
                        <AvatarFallback>SP</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">Slamet Purnomo</p>
                        <p className="text-sm text-muted-foreground">Kepala Operasional</p>
                      </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Quote className="h-6 w-6 text-primary/50 mb-2"/>
                  <p className="text-muted-foreground">"Visibilitas terhadap kurir meningkat drastis. Sekarang saya bisa memantau performa dan membuat keputusan berdasarkan data, bukan lagi firasat."</p>
                </CardContent>
              </Card>
              <Card className="text-left">
                <CardHeader>
                   <div className="flex items-center gap-4">
                     <Avatar>
                        <AvatarImage src="https://placehold.co/100x100.png" alt="User" data-ai-hint="woman face"/>
                        <AvatarFallback>DW</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">Dian Wulandari</p>
                        <p className="text-sm text-muted-foreground">Person In Charge (PIC)</p>
                      </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Quote className="h-6 w-6 text-primary/50 mb-2"/>
                  <p className="text-muted-foreground">"Pelaporan harian menjadi jauh lebih mudah. Saya tidak perlu lagi mengejar kurir untuk laporan manual. Semua bukti pengiriman tersimpan rapi."</p>
                </CardContent>
              </Card>
              <Card className="text-left">
                <CardHeader>
                  <div className="flex items-center gap-4">
                     <Avatar>
                        <AvatarImage src="https://placehold.co/100x100.png" alt="User" data-ai-hint="man face"/>
                        <AvatarFallback>AS</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">Ahmad Subagja</p>
                        <p className="text-sm text-muted-foreground">Kurir</p>
                      </div>
                  </div>
                </CardHeader>
                <CardContent>
                   <Quote className="h-6 w-6 text-primary/50 mb-2"/>
                  <p className="text-muted-foreground">"Aplikasinya sangat membantu. Absen dan lapor pengiriman jadi lebih cepat. Saya bisa lebih fokus mengantar paket tepat waktu."</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4 py-24 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Siap Meningkatkan Efisiensi Tim Anda?</h2>
          <p className="mt-4 max-w-xl mx-auto text-lg text-muted-foreground">
            Bergabunglah dengan platform yang dirancang untuk menyederhanakan alur kerja dan memaksimalkan produktivitas.
          </p>
          <Button size="lg" className="mt-8 text-lg px-8 py-6" onClick={() => router.push('/login')}>
            Masuk dan Mulai Kelola
          </Button>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted/40">
        <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 py-12 px-4 md:px-6">
            <div>
                <h4 className="font-semibold mb-3">Produk</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link href="#features" className="hover:text-primary">Fitur</Link></li>
                    <li><Link href="#" className="hover:text-primary">Keamanan</Link></li>
                    <li><Link href="/login" className="hover:text-primary">Login</Link></li>
                </ul>
            </div>
             <div>
                <h4 className="font-semibold mb-3">Sumber Daya</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link href="#" className="hover:text-primary">Pusat Bantuan</Link></li>
                    <li><Link href="#" className="hover:text-primary">Dokumentasi</Link></li>
                </ul>
            </div>
             <div>
                <h4 className="font-semibold mb-3">Perusahaan</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link href="#" className="hover:text-primary">Tentang Kami</Link></li>
                    <li><Link href="#" className="hover:text-primary">Kontak</Link></li>
                </ul>
            </div>
             <div>
                <Link href="/" className="flex items-center gap-2 mb-3">
                  <AppLogo className="h-8 w-8 text-primary" />
                  <span className="text-lg font-bold text-foreground">INSAN MOBILE</span>
                </Link>
                <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} PIS. All rights reserved.</p>
            </div>
        </div>
      </footer>
    </div>
  );
}
