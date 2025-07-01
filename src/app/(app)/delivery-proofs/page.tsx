
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PackageSearch, Calendar as CalendarIcon, ZoomIn, Search, PackageCheck, PackageX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { format, parseISO, isValid } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { getAggregatedDeliveryData } from '@/lib/managerialActions';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

// Define a type for the aggregated data for better type safety
type AggregatedPackageData = {
  id: string; // package resi
  status: 'delivered' | 'returned' | 'in_transit' | 'process';
  isCOD: boolean;
  recipientName?: string;
  deliveryProofPhotoUrl?: string;
  lastUpdateTime: string;
  kurirUid: string;
  kurirFullName: string;
  kurirId: string;
  date: string; // Delivery date
  finalReturnProofPhotoUrl?: string;
  finalReturnLeadReceiverName?: string;
};

// Helper to validate image URLs before rendering
const isValidImageUrl = (url?: string): url is string => {
    return !!url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image'));
};


export default function DeliveryProofsPage() {
    const { toast } = useToast();
    const [allPackages, setAllPackages] = useState<AggregatedPackageData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filtering states
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // UI states
    const [selectedImage, setSelectedImage] = useState<{ src: string, alt: string } | null>(null);

    useEffect(() => {
        const fetchAllPackageData = async () => {
            setIsLoading(true);
            try {
                const data = await getAggregatedDeliveryData(90); // Fetch last 90 days of data
                setAllPackages(data);
            } catch (error: any) {
                console.error("Error fetching aggregated delivery data:", error);
                toast({
                    title: "Gagal Memuat Data",
                    description: error.message || "Terjadi kesalahan saat mengambil data bukti pengiriman.",
                    variant: "destructive",
                    duration: 9000,
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllPackageData();
    }, [toast]);

    const filteredData = useMemo(() => {
        return allPackages.filter(pkg => {
            // Search term filter
            const matchesSearch = searchTerm === '' ||
                pkg.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pkg.kurirFullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pkg.kurirId.toLowerCase().includes(searchTerm.toLowerCase());

            // Date range filter
            let matchesDate = true;
            if (dateRange?.from && isValid(parseISO(pkg.date))) {
                const pkgDate = parseISO(pkg.date);
                // Set to start of day for accurate comparison
                const fromDate = new Date(dateRange.from.setHours(0,0,0,0));
                
                if (dateRange.to) {
                    const toDate = new Date(dateRange.to.setHours(23,59,59,999));
                    matchesDate = pkgDate >= fromDate && pkgDate <= toDate;
                } else {
                    matchesDate = pkgDate >= fromDate;
                }
            }
            return matchesSearch && matchesDate;
        });
    }, [allPackages, searchTerm, dateRange]);

    const deliveredPackages = useMemo(() => filteredData.filter(p => p.status === 'delivered'), [filteredData]);
    const returnedPackages = useMemo(() => {
        return filteredData.filter(p => p.status === 'returned');
    }, [filteredData]);


    const handleImageClick = (src: string, alt: string) => {
        setSelectedImage({ src, alt });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl text-primary">
                        <PackageSearch className="mr-3 h-7 w-7" />
                        Pusat Bukti Pengiriman
                    </CardTitle>
                    <CardDescription>
                        Cari dan lihat riwayat bukti pengiriman dan pengembalian paket dari semua kurir.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="search-universal">Cari (Resi, Nama/ID Kurir)</Label>
                             <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="search-universal"
                                    placeholder="Ketik nomor resi, nama, atau ID kurir..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="date-range">Rentang Tanggal</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button id="date-range" variant="outline" className="w-full justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(dateRange.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>Pilih rentang tanggal</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        numberOfMonths={2}
                                        locale={indonesiaLocale}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="space-y-4">
                     <Skeleton className="h-10 w-1/3" />
                     <Skeleton className="h-40 w-full" />
                </div>
            ) : (
                <>
                    {/* Delivered Packages Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center text-xl">
                                <PackageCheck className="mr-2 h-5 w-5 text-green-500" />
                                Paket Terkirim ({deliveredPackages.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID Kurir</TableHead>
                                            <TableHead>Nama Kurir</TableHead>
                                            <TableHead>No. Resi</TableHead>
                                            <TableHead>Tanggal Kirim</TableHead>
                                            <TableHead>Penerima</TableHead>
                                            <TableHead className="text-center">Bukti Foto</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {deliveredPackages.length > 0 ? (
                                            deliveredPackages.map(pkg => (
                                                <TableRow key={`${pkg.kurirUid}-${pkg.date}-${pkg.id}`}>
                                                    <TableCell>{pkg.kurirId}</TableCell>
                                                    <TableCell>{pkg.kurirFullName}</TableCell>
                                                    <TableCell className="font-medium break-all">{pkg.id}</TableCell>
                                                    <TableCell>{format(parseISO(pkg.date), 'dd MMM yyyy', { locale: indonesiaLocale })}</TableCell>
                                                    <TableCell>{pkg.recipientName || 'N/A'}</TableCell>
                                                    <TableCell className="text-center">
                                                        {isValidImageUrl(pkg.deliveryProofPhotoUrl) ? (
                                                            <Button variant="ghost" size="sm" onClick={() => handleImageClick(pkg.deliveryProofPhotoUrl!, `Bukti untuk ${pkg.id}`)}>
                                                                <ZoomIn className="h-4 w-4 mr-2" /> Lihat
                                                            </Button>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">Tidak Diunggah</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center h-24">Tidak ada data paket terkirim yang cocok dengan filter.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                     {/* Returned Packages Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center text-xl">
                                <PackageX className="mr-2 h-5 w-5 text-red-500" />
                                Paket Dikembalikan ({returnedPackages.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID Kurir</TableHead>
                                            <TableHead>Nama Kurir</TableHead>
                                            <TableHead>No. Resi</TableHead>
                                            <TableHead>Leader Penerima</TableHead>
                                            <TableHead className="text-center">Bukti Foto Serah Terima</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {returnedPackages.length > 0 ? (
                                            returnedPackages.map(pkg => (
                                                <TableRow key={`${pkg.kurirUid}-${pkg.date}-${pkg.id}`}>
                                                    <TableCell>{pkg.kurirId}</TableCell>
                                                    <TableCell>{pkg.kurirFullName}</TableCell>
                                                    <TableCell className="font-medium break-all">{pkg.id}</TableCell>
                                                    <TableCell>{pkg.finalReturnLeadReceiverName || 'N/A'}</TableCell>
                                                    <TableCell className="text-center">
                                                        {isValidImageUrl(pkg.finalReturnProofPhotoUrl) ? (
                                                             <Button variant="ghost" size="sm" onClick={() => handleImageClick(pkg.finalReturnProofPhotoUrl!, `Bukti retur untuk resi ${pkg.id}`)}>
                                                                <ZoomIn className="h-4 w-4 mr-2" /> Lihat
                                                            </Button>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">Tidak Diunggah</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center h-24">Tidak ada data paket yang dikembalikan yang cocok dengan filter.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            <Dialog open={!!selectedImage} onOpenChange={(isOpen) => !isOpen && setSelectedImage(null)}>
              <DialogContent className="max-w-3xl">
                  <DialogHeader>
                      <DialogTitle>{selectedImage?.alt}</DialogTitle>
                  </DialogHeader>
                  {selectedImage && (
                      <div className="mt-4 flex justify-center">
                        <Image src={selectedImage.src} alt={selectedImage.alt} width={800} height={600} className="max-w-full h-auto max-h-[80vh] rounded-lg object-contain" data-ai-hint="package receipt"/>
                      </div>
                  )}
              </DialogContent>
            </Dialog>
        </div>
    );
}
