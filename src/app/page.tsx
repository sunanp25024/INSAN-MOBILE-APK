
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AppLogo } from '@/components/icons/AppLogo';
import { ArrowRight, Download, ScanLine, LayoutDashboard, ShieldCheck, BarChart3 } from 'lucide-react';
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
  imageUrl,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  imageUrl: string;
}) => (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 h-full">
        <div className="aspect-video overflow-hidden border-b">
             <Image
                src={imageUrl}
                alt={title}
                width={500}
                height={300}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
        </div>
        <CardHeader className="flex-row items-center gap-4 pb-3">
             <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                <Icon className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">{title}</h3>
        </CardHeader>
        <CardContent className="flex-grow pt-0">
            <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
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
       <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
            <AppLogo className="h-10 w-10 text-primary" />
            <span className="text-xl font-bold text-foreground">INSAN MOBILE</span>
            </Link>
            <nav className="hidden items-center gap-6 text-sm md:flex">
              <Link href="#features" className="text-muted-foreground transition-colors hover:text-foreground">
                Fitur
              </Link>
              <Link href="#how-it-works" className="text-muted-foreground transition-colors hover:text-foreground">
                Cara Kerja
              </Link>
              <Link href="#" className="text-muted-foreground transition-colors hover:text-foreground">
                Bantuan
              </Link>
            </nav>
            <Button onClick={() => router.push('/login')}>
            Masuk Aplikasi <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-background py-20 lg:py-28">
            <Image
                src="/images/landing/hero-background.png"
                alt="Modern logistics background"
                fill
                className="z-0 object-cover"
                priority
            />
            <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm" />

            <div className="container relative z-20 mx-auto flex flex-col items-center gap-12 px-4 text-center">
                <div className="flex flex-col items-center">
                    <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
                        Aplikasi Visual untuk Operasional Kurir Anda.
                    </h1>
                    <p className="mt-6 max-w-2xl text-lg text-primary-foreground/80">
                        Lihat langsung bagaimana aplikasi kami menyederhanakan pelacakan paket, absensi, dan pelaporan performa—semuanya dalam satu platform.
                    </p>
                    <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                        <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6 shadow-lg" onClick={() => router.push('/login')}>
                            Lihat Dashboard
                        </Button>
                        {installPromptEvent && (
                        <Button
                            variant="secondary"
                            size="lg"
                            className="text-lg px-8 py-6 shadow-lg"
                            onClick={handleInstallClick}
                        >
                            <Download className="mr-2 h-5 w-5" />
                            Instal Aplikasi
                        </Button>
                        )}
                    </div>
                </div>
                
                <div className="relative w-[280px] lg:w-[320px] mt-8">
                     <Image
                        src="/images/landing/hero-mockup.png"
                        alt="App Dashboard Mockup"
                        width={400}
                        height={800}
                        className="rounded-3xl border-8 border-neutral-700 shadow-2xl"
                    />
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-muted/50">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Fokus Pada Produk & Visual</h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                       Setiap fitur dirancang untuk memberikan informasi visual yang jelas dan mudah dipahami, baik untuk kurir di lapangan maupun tim manajemen.
                    </p>
                </div>
                <div className="mt-16 grid gap-8 sm:grid-cols-1 lg:grid-cols-2">
                    <FeatureCard
                        icon={LayoutDashboard}
                        title="Dashboard Terpusat"
                        description="Pantau semua aktivitas kurir, status pengiriman, dan ringkasan persetujuan dari satu layar yang intuitif dan informatif."
                        imageUrl="/images/landing/feature-dashboard.png"
                    />
                    <FeatureCard
                        icon={ScanLine}
                        title="Scan & Bukti Pengiriman"
                        description="Kurir dapat memindai barcode resi dan mengunggah bukti foto pengiriman langsung dari lapangan untuk akuntabilitas maksimal."
                        imageUrl="/images/landing/feature-scan.png"
                    />
                    <FeatureCard
                        icon={ShieldCheck}
                        title="Alur Persetujuan Aman"
                        description="Setiap perubahan data krusial, seperti penambahan pengguna baru, harus melalui persetujuan berjenjang untuk menjaga integritas data."
                        imageUrl="/images/landing/feature-approval.png"
                    />
                    <FeatureCard
                        icon={BarChart3}
                        title="Laporan Performa Detail"
                        description="Hasilkan laporan performa dan kehadiran dengan filter dinamis, lalu unduh dalam format Excel untuk analisis lebih mendalam."
                        imageUrl="/images/landing/feature-report.png"
                    />
                </div>
            </div>
        </section>

        {/* How it Works Section */}
        <section id="how-it-works" className="py-24">
            <div className="container mx-auto px-4 md:px-6">
                 <div className="mx-auto max-w-3xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Alur Kerja yang Disederhanakan</h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                       Tiga langkah mudah mengubah operasional manual menjadi proses digital yang efisien dan transparan.
                    </p>
                </div>
                <div className="mt-16 grid items-stretch gap-8 md:grid-cols-3">
                    <Card className="flex flex-col items-center text-center p-6 h-full transition-all hover:shadow-xl hover:-translate-y-1">
                        <CardHeader className="p-0">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-2xl font-bold text-primary">1</div>
                        </CardHeader>
                        <CardContent className="p-0 flex-grow">
                            <h3 className="mt-6 text-xl font-semibold">Input & Scan Paket</h3>
                            <p className="mt-2 text-muted-foreground">Kurir melakukan absensi, menginput data paket harian, dan memindai semua resi untuk memulai hari kerja.</p>
                        </CardContent>
                    </Card>
                     <Card className="flex flex-col items-center text-center p-6 h-full transition-all hover:shadow-xl hover:-translate-y-1">
                        <CardHeader className="p-0">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-2xl font-bold text-primary">2</div>
                        </CardHeader>
                        <CardContent className="p-0 flex-grow">
                            <h3 className="mt-6 text-xl font-semibold">Kirim & Lapor Bukti</h3>
                            <p className="mt-2 text-muted-foreground">Setiap paket terkirim diperbarui statusnya secara real-time dengan unggahan bukti foto langsung dari lokasi.</p>
                        </CardContent>
                    </Card>
                     <Card className="flex flex-col items-center text-center p-6 h-full transition-all hover:shadow-xl hover:-translate-y-1">
                        <CardHeader className="p-0">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-2xl font-bold text-primary">3</div>
                        </CardHeader>
                        <CardContent className="p-0 flex-grow">
                            <h3 className="mt-6 text-xl font-semibold">Pantau & Analisa</h3>
                            <p className="mt-2 text-muted-foreground">Manajemen memantau progres pengiriman dari dashboard, melihat riwayat, dan mengunduh laporan performa.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>

        {/* Final CTA */}
        <section className="bg-muted/50">
            <div className="container mx-auto px-4 py-24 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Siap Mengubah Cara Kerja Tim Anda?</h2>
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
      <footer className="border-t bg-background">
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
