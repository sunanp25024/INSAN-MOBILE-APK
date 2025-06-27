
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AppLogo } from '@/components/icons/AppLogo';
import { ArrowRight, ShieldCheck, Truck, Users } from 'lucide-react';
import Link from 'next/link';

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center text-center p-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
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
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-primary">
            Aplikasi Mobile untuk Insan
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Solusi terintegrasi untuk manajemen kurir, absensi, dan pelacakan performa. Efisiensi operasional di ujung jari Anda.
          </p>
          <Button size="lg" className="mt-8 text-lg" onClick={() => router.push('/login')}>
            Mulai Sekarang
          </Button>
        </section>

        <section className="bg-card-foreground/5 py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-8 md:grid-cols-3">
              <FeatureCard 
                icon={Truck}
                title="Manajemen Pengiriman"
                description="Lacak paket, update status pengiriman, dan kelola retur dengan mudah."
              />
              <FeatureCard 
                icon={Users}
                title="Absensi & Performa"
                description="Catat kehadiran harian dan pantau metrik performa untuk meningkatkan produktivitas."
              />
              <FeatureCard 
                icon={ShieldCheck}
                title="Aman & Terpusat"
                description="Sistem persetujuan berjenjang untuk memastikan setiap perubahan data aman dan terkontrol."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="container mx-auto py-6 px-4 md:px-6">
        <p className="text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} PIS. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
