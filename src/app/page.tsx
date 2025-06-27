
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AppLogo } from '@/components/icons/AppLogo';
import { ArrowRight, ShieldCheck, Truck, Users, ScanLine, FileText, UserCog, Download } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string,
  }>;
  prompt(): Promise<void>;
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center text-center p-4 rounded-lg bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

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
    <div className="flex flex-col min-h-screen bg-background">
      <header className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6 sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2">
          <AppLogo className="h-10 w-10 text-primary" />
          <span className="text-xl font-bold text-foreground">INSAN MOBILE</span>
        </Link>
        <Button onClick={() => router.push('/login')}>
          Masuk Aplikasi <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </header>

      <main className="flex-1">
        <section className="container mx-auto flex flex-col items-center justify-center px-4 py-20 text-center md:px-6 md:py-32">
          <AppLogo className="h-32 w-32 text-primary mb-6" />
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-primary">
            Aplikasi Mobile untuk Insan
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            Solusi terintegrasi untuk manajemen kurir, absensi, pelacakan performa, dan persetujuan berjenjang. Efisiensi operasional di ujung jari Anda.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
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

        <section id="features" className="bg-card-foreground/5 py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground">Solusi Lengkap untuk Operasional Anda</h2>
              <p className="mt-2 text-md text-muted-foreground">Semua yang Anda butuhkan untuk mengelola tim lapangan dengan efisien.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <FeatureCard 
                icon={Truck}
                title="Manajemen Pengiriman"
                description="Lacak paket dengan scan barcode, update status pengiriman secara real-time, dan kelola retur dengan mudah."
              />
              <FeatureCard 
                icon={Users}
                title="Absensi & Performa"
                description="Catat kehadiran harian, pantau metrik performa kurir, dan lihat laporan mingguan untuk evaluasi."
              />
              <FeatureCard 
                icon={ShieldCheck}
                title="Aman & Terpusat"
                description="Sistem persetujuan berjenjang (approval) memastikan setiap penambahan atau perubahan data penting aman dan terkontrol."
              />
               <FeatureCard 
                icon={ScanLine}
                title="Scan Barcode Cepat"
                description="Percepat proses input paket harian dengan memindai barcode resi langsung dari kamera ponsel Anda."
              />
              <FeatureCard 
                icon={FileText}
                title="Laporan Terpusat"
                description="Unduh laporan kehadiran dan performa pengiriman dalam format Excel untuk analisis data yang lebih mendalam."
              />
               <FeatureCard 
                icon={UserCog}
                title="Manajemen Multi-Peran"
                description="Kontrol akses yang terdefinisi dengan jelas untuk MasterAdmin, Admin, PIC, dan Kurir sesuai tugasnya masing-masing."
              />
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-24 text-center">
            <h2 className="text-3xl font-bold text-foreground">Siap Meningkatkan Efisiensi Tim Anda?</h2>
            <p className="mt-2 text-md text-muted-foreground max-w-xl mx-auto">
                Bergabunglah dengan platform yang dirancang untuk menyederhanakan alur kerja dan memaksimalkan produktivitas.
            </p>
            <Button size="lg" className="mt-8 text-lg px-8 py-6" onClick={() => router.push('/login')}>
                Masuk dan Mulai Kelola
            </Button>
        </section>
      </main>

      <footer className="container mx-auto py-6 px-4 md:px-6 border-t">
        <p className="text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} PIS. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
