
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PackageSearch, Calendar as CalendarIcon, ZoomIn, PackageCheck, PackageX, Search } from 'lucide-react';
import type { KurirDailyTaskDoc, PackageItem } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { format } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import { getKurirTaskHistory } from '@/lib/kurirActions';
import { getAllKurirsForSelection } from '@/lib/managerialActions'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function DeliveryProofsPage() {
    const [allKurirs, setAllKurirs] = useState<{ uid: string; fullName: string; id: string }[]>([]);
    const [selectedKurirUid, setSelectedKurirUid] = useState<string | undefined>();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [taskHistory, setTaskHistory] = useState<{ task: KurirDailyTaskDoc | null; packages: PackageItem[] } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isKurirListLoading, setIsKurirListLoading] = useState(true);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    
    const [selectedImage, setSelectedImage] = useState<{ src: string, alt: string } | null>(null);
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

    useEffect(() => {
        const fetchKurirs = async () => {
            setIsKurirListLoading(true);
            const kurirs = await getAllKurirsForSelection();
            setAllKurirs(kurirs);
            setIsKurirListLoading(false);
        };
        fetchKurirs();
    }, []);

    useEffect(() => {
        if (!selectedDate || !selectedKurirUid) {
          setTaskHistory(null);
          return;
        }

        const fetchHistory = async () => {
          setIsHistoryLoading(true);
          setTaskHistory(null); // Clear previous history
          const dateString = format(selectedDate, 'yyyy-MM-dd');
          try {
            const historyData = await getKurirTaskHistory(selectedKurirUid, dateString);
            setTaskHistory(historyData);
          } catch (error) {
            console.error("Error fetching task history:", error);
          } finally {
            setIsHistoryLoading(false);
          }
        };

        fetchHistory();
    }, [selectedDate, selectedKurirUid]);
    
    const handleImageClick = (src: string, alt: string) => {
        setSelectedImage({ src, alt });
        setIsImageDialogOpen(true);
    };

    const deliveredPackages = taskHistory?.packages
        .filter(p => p.status === 'delivered' && p.id.toLowerCase().includes(searchTerm.toLowerCase())) || [];
    const selectedKurirName = allKurirs.find(k => k.uid === selectedKurirUid)?.fullName;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl text-primary">
                        <PackageSearch className="mr-3 h-7 w-7" />
                        Pusat Bukti Pengiriman
                    </CardTitle>
                    <CardDescription>
                        Pilih kurir dan tanggal untuk melihat riwayat tugas. Anda juga bisa memfilter berdasarkan nomor resi.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div>
                            <Label htmlFor="kurir-select">Pilih Kurir</Label>
                            {isKurirListLoading ? (
                                <Skeleton className="h-10 w-full" />
                            ) : (
                                <Select onValueChange={setSelectedKurirUid} value={selectedKurirUid}>
                                    <SelectTrigger id="kurir-select" className="w-full">
                                        <SelectValue placeholder="Pilih nama kurir..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allKurirs.map(kurir => (
                                            <SelectItem key={kurir.uid} value={kurir.uid}>
                                                {kurir.fullName} ({kurir.id})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="date-select">Pilih Tanggal</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={!selectedKurirUid}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {selectedDate ? format(selectedDate, "PPP", { locale: indonesiaLocale }) : "Pilih Tanggal"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        disabled={(date) => date > new Date()}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    
                    <div>
                        {isHistoryLoading && <p className="text-sm text-muted-foreground p-4 text-center">Memuat riwayat...</p>}
                        
                        {!isHistoryLoading && selectedKurirUid && selectedDate && !taskHistory?.task && (
                            <Card className="p-6 text-center text-muted-foreground bg-muted/50 mt-4">
                                Tidak ada data tugas untuk <strong>{selectedKurirName}</strong> pada tanggal yang dipilih.
                            </Card>
                        )}
                        
                        {!isHistoryLoading && taskHistory?.task && (
                            <div className="space-y-6 border-t pt-6 mt-6">
                                <div>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                                        <h4 className="font-semibold flex items-center text-lg">
                                            <PackageCheck className="mr-2 h-5 w-5 text-green-500"/> Bukti Paket Terkirim ({deliveredPackages.length})
                                        </h4>
                                        <div className="relative w-full sm:max-w-xs">
                                             <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input 
                                                placeholder="Cari nomor resi..." 
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                                className="pl-8"
                                            />
                                        </div>
                                    </div>
                                    {deliveredPackages.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {deliveredPackages.map(pkg => (
                                                <Card key={pkg.id} className="p-3">
                                                    <p className="font-medium text-sm break-all">{pkg.id}</p>
                                                    <p className="text-xs text-muted-foreground">Penerima: {pkg.recipientName || 'N/A'}</p>
                                                    {pkg.deliveryProofPhotoUrl ? (
                                                        <div className="mt-2 relative group cursor-pointer" onClick={() => handleImageClick(pkg.deliveryProofPhotoUrl!, `Bukti untuk ${pkg.id}`)}>
                                                            <Image src={pkg.deliveryProofPhotoUrl} alt={`Bukti untuk ${pkg.id}`} width={200} height={150} className="rounded-md object-cover w-full h-32"/>
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <ZoomIn className="h-8 w-8 text-white"/>
                                                            </div>
                                                        </div>
                                                    ) : <p className="text-xs text-destructive mt-2">Tidak ada foto bukti.</p>}
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">
                                        {searchTerm ? 'Tidak ada resi yang cocok dengan pencarian Anda.' : 'Tidak ada paket yang ditandai terkirim pada hari ini.'}
                                      </p>
                                    )}
                                </div>

                                {taskHistory.task.finalReturnProofPhotoUrl && (
                                     <div>
                                        <h4 className="font-semibold flex items-center mb-2 text-lg">
                                            <PackageX className="mr-2 h-5 w-5 text-red-500"/> Bukti Paket Pending/Retur
                                        </h4>
                                        <Card className="p-3 inline-block">
                                            <p className="text-xs text-muted-foreground">Diserahkan ke: {taskHistory.task.finalReturnLeadReceiverName || 'N/A'}</p>
                                            <div className="mt-2 relative group cursor-pointer" onClick={() => handleImageClick(taskHistory.task.finalReturnProofPhotoUrl!, `Bukti Retur`)}>
                                                <Image src={taskHistory.task.finalReturnProofPhotoUrl} alt="Bukti Retur" width={200} height={150} className="rounded-md object-cover w-full h-32"/>
                                                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ZoomIn className="h-8 w-8 text-white"/>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </CardContent>
            </Card>

            <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
              <DialogContent className="max-w-3xl">
                  <DialogHeader>
                      <DialogTitle>{selectedImage?.alt}</DialogTitle>
                  </DialogHeader>
                  {selectedImage && (
                      <div className="mt-4 flex justify-center">
                        <Image src={selectedImage.src} alt={selectedImage.alt} width={800} height={600} className="max-w-full h-auto rounded-lg object-contain" data-ai-hint="package receipt"/>
                      </div>
                  )}
              </DialogContent>
            </Dialog>
        </div>
    );
}
