
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/icons/AppLogo';
import { ArrowRight, ShieldCheck, Truck, Users, ScanLine, FileText, Download, BarChart3, CheckCircle, Smartphone, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string,
  }>;
  prompt(): Promise<void>;
}

const FeatureCard = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) => (
    <div className="relative overflow-hidden rounded-lg border bg-background p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
        </div>
        <h3 className="mb-2 text-xl font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
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
      toast({ title: 'Aplikasi Sudah Terinstal atau Tidak Didukung', description: 'Anda dapat menggunakan aplikasi ini langsung di browser.', variant: 'default' });
      return;
    }
    installPromptEvent.prompt();
    installPromptEvent.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        toast({ title: 'Instalasi Berhasil', description: 'Aplikasi sedang diinstal di perangkat Anda.' });
      } else {
        toast({ title: 'Instalasi Dibatalkan', variant: 'default' });
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
        <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-[0.08]"></div>
            <div className="container relative mx-auto flex flex-col items-center justify-center px-4 py-24 text-center md:py-32">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                    Platform Operasional Cerdas untuk Tim Anda
                </h1>
                <p className="mt-6 max-w-3xl text-lg text-muted-foreground md:text-xl">
                    Solusi terintegrasi untuk manajemen kurir, absensi, pelacakan performa, dan alur persetujuan. Efisiensi operasional di ujung jari Anda.
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row justify-center">
                    <Button size="lg" className="text-lg px-8 py-6 shadow-lg" onClick={() => router.push('/login')}>
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
            </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-muted/50 py-24">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Solusi Lengkap untuk Operasional Anda</h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Dari manajemen tugas harian kurir hingga laporan strategis untuk manajer, semua yang Anda butuhkan ada di satu platform.
                    </p>
                </div>
                <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <FeatureCard
                        icon={LayoutDashboard}
                        title="Manajemen Terpusat"
                        description="Pantau seluruh operasional dari satu dashboard. Ambil keputusan berdasarkan data dengan laporan performa yang mendalam."
                    />
                    <FeatureCard
                        icon={Truck}
                        title="Alur Kerja Kurir Modern"
                        description="Kurir dapat melakukan absensi, memindai resi, dan mengunggah bukti pengiriman langsung dari ponsel dengan mudah."
                    />
                    <FeatureCard
                        icon={ShieldCheck}
                        title="Alur Persetujuan Aman"
                        description="Setiap perubahan data penting seperti penambahan pengguna baru harus melalui otorisasi untuk menjaga integritas data."
                    />
                    <FeatureCard
                        icon={BarChart3}
                        title="Pelaporan & Analisis"
                        description="Hasilkan laporan kehadiran dan performa dengan filter dinamis, lalu unduh dalam format Excel untuk analisis lebih lanjut."
                    />
                    <FeatureCard
                        icon={Users}
                        title="Manajemen Pengguna"
                        description="Kelola akun untuk berbagai peran—MasterAdmin, Admin, PIC, dan Kurir—dengan mudah, termasuk impor data massal."
                    />
                    <FeatureCard
                        icon={Smartphone}
                        title="Akses Mobile & PWA"
                        description="Dirancang untuk bekerja di perangkat apa pun dan dapat diinstal langsung di ponsel Anda untuk pengalaman seperti aplikasi native."
                    />
                </div>
            </div>
        </section>

        {/* How it Works / Image Section */}
        <section className="py-24">
            <div className="container mx-auto grid grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-16">
                 <div className="space-y-6">
                    <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">Alur Kerja Efisien</div>
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Dari Lapangan ke Laporan dalam Sekejap</h2>
                    <p className="text-muted-foreground md:text-lg">
                        INSAN MOBILE menyederhanakan proses yang rumit menjadi langkah-langkah yang mudah diikuti, menghubungkan tim lapangan dengan manajemen secara real-time.
                    </p>
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <CheckCircle className="h-6 w-6 flex-shrink-0 text-green-500 mt-1" />
                            <div>
                                <h4 className="font-semibold">Absensi dan Input Paket</h4>
                                <p className="text-sm text-muted-foreground">Kurir memulai hari dengan check-in dan menginput data paket harian.</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4">
                            <CheckCircle className="h-6 w-6 flex-shrink-0 text-green-500 mt-1" />
                            <div>
                                <h4 className="font-semibold">Update Status Real-time</h4>
                                <p className="text-sm text-muted-foreground">Setiap paket terkirim diperbarui statusnya dengan bukti foto.</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4">
                            <CheckCircle className="h-6 w-6 flex-shrink-0 text-green-500 mt-1" />
                            <div>
                                <h4 className="font-semibold">Monitoring oleh Manajer</h4>
                                <p className="text-sm text-muted-foreground">PIC dan Admin memantau progres dan mengunduh laporan kapan saja.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="overflow-hidden rounded-lg shadow-2xl">
                    <Image
                        src="https://placehold.co/600x700.png"
                        alt="Aplikasi di berbagai perangkat"
                        width={600}
                        height={700}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        data-ai-hint="app interface"
                    />
                </div>
            </div>
        </section>

        {/* Final CTA */}
        <section className="bg-muted/50">
            <div className="container mx-auto px-4 py-24 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Siap Meningkatkan Efisiensi Tim Anda?</h2>
            <p className="mt-4 max-w-xl mx-auto text-lg text-muted-foreground">
                Bergabunglah dengan platform yang dirancang untuk menyederhanakan alur kerja dan memaksimalkan produktivitas.
            </p>
            <Button size="lg" className="mt-8 text-lg px-8 py-6 shadow-lg" onClick={() => router.push('/login')}>
                Masuk dan Mulai Kelola
            </Button>
            </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 py-8 px-4 text-center sm:flex-row sm:text-left md:px-6">
            <div className="flex items-center gap-2">
                <AppLogo className="h-8 w-8 text-primary" />
                <span className="font-semibold">INSAN MOBILE</span>
            </div>
            <p className="text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} PIS. All rights reserved.
            </p>
            <nav className="flex gap-4 sm:gap-6 text-sm text-muted-foreground">
                <Link href="#" className="hover:text-primary">Bantuan</Link>
                <Link href="#" className="hover:text-primary">Kontak</Link>
            </nav>
        </div>
      </footer>
    </div>
  );
}
