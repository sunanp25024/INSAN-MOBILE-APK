
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Users, Search, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { UserProfile } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function CourierManagementPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [couriers, setCouriers] = useState<UserProfile[]>([]);
  const [filteredCouriers, setFilteredCouriers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
      const user = JSON.parse(userDataString) as UserProfile;
      setCurrentUser(user);
       if (['MasterAdmin', 'Admin', 'PIC'].includes(user.role)) {
        fetchCouriers();
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchCouriers = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "users"), where("role", "==", "Kurir"));
      const querySnapshot = await getDocs(q);
      const fetchedCouriers: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        fetchedCouriers.push({ ...doc.data() } as UserProfile);
      });
      setCouriers(fetchedCouriers);
      setFilteredCouriers(fetchedCouriers);
    } catch (error) {
      console.error("Error fetching couriers: ", error);
      toast({ title: "Error", description: "Gagal memuat data kurir.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const results = couriers.filter(courier =>
      courier.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      courier.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (courier.workLocation && courier.workLocation.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredCouriers(results);
  }, [searchTerm, couriers]);
  
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!currentUser || !['MasterAdmin', 'Admin', 'PIC'].includes(currentUser.role)) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center"><AlertCircle className="mr-2 h-6 w-6"/>Akses Terbatas</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Halaman ini hanya tersedia untuk peran manajerial (PIC, Admin, MasterAdmin).</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <ClipboardList className="mr-3 h-7 w-7" />
            Monitoring Kurir
          </CardTitle>
          <CardDescription>
            Pantau aktivitas dan performa kurir. Sebagai peran manajerial, Anda memiliki akses lihat saja ke data kurir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <div className="relative flex-grow w-full sm:w-auto">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Cari kurir (ID, Nama, atau Hub)..." 
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Card className="border shadow-sm">
            <Table>
              <TableHeader className="bg-primary/10">
                <TableRow>
                  <TableHead>ID Kurir</TableHead>
                  <TableHead>Nama Kurir</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lokasi Hub</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-8 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredCouriers.length > 0 ? (
                  filteredCouriers.map((kurir) => (
                    <TableRow key={kurir.id}>
                      <TableCell className="font-medium">{kurir.id}</TableCell>
                      <TableCell>{kurir.fullName}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${kurir.status === 'Aktif' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {kurir.status}
                        </span>
                      </TableCell>
                      <TableCell>{kurir.workLocation}</TableCell>
                      <TableCell>{kurir.position}</TableCell>
                      <TableCell className="text-center">
                        <Link href={`/courier-management/${kurir.id}`} passHref>
                          <Button variant="outline" size="sm">Lihat Detail</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      {couriers.length === 0 ? "Tidak ada data kurir ditemukan." : "Tidak ada kurir yang cocok dengan pencarian."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
          {!isLoading && (
            <p className="text-xs text-muted-foreground text-center">
              Menampilkan {filteredCouriers.length} dari {couriers.length} kurir.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    

    