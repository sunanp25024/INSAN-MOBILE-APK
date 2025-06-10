
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BellRing, UserCheck, PackageX, PackageCheck } from 'lucide-react';
import type { UserProfile } from '@/types';
import React, { useEffect, useState } from 'react';

// Mock update data
const mockUpdates = [
  { id: 1, type: 'check-in', kurirName: 'Budi Santoso', kurirId: 'PISTEST2025', message: 'Telah melakukan Check-In.', timestamp: new Date(Date.now() - 300000), icon: <UserCheck className="h-5 w-5 text-green-500" /> },
  { id: 2, type: 'delivery-complete', kurirName: 'Ani Yudhoyono', kurirId: 'KURIR002', message: 'Menyelesaikan pengantaran 5 paket.', timestamp: new Date(Date.now() - 600000), icon: <PackageCheck className="h-5 w-5 text-blue-500" /> },
  { id: 3, type: 'package-return', kurirName: 'Budi Santoso', kurirId: 'PISTEST2025', message: 'Melaporkan 1 paket retur (Penerima tidak di tempat).', timestamp: new Date(Date.now() - 900000), icon: <PackageX className="h-5 w-5 text-red-500" /> },
  { id: 4, type: 'check-out', kurirName: 'Charlie Van Houten', kurirId: 'KURIR003', message: 'Telah melakukan Check-Out.', timestamp: new Date(Date.now() - 1200000), icon: <UserCheck className="h-5 w-5 text-gray-500" /> },
];

export default function CourierUpdatesPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const userDataString = localStorage.getItem('loggedInUser');
    if (userDataString) {
      try {
        setCurrentUser(JSON.parse(userDataString) as UserProfile);
      } catch (error) { console.error("Error parsing user data", error); }
    }
  }, []);

  if (!currentUser) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  // This page is intended for PIC, but other roles might see a generic message or be redirected.
  // For now, let's allow viewing but with a note if not PIC.
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl text-primary">
            <BellRing className="mr-3 h-7 w-7" />
            Update Aktivitas Kurir (Real-time Feed)
          </CardTitle>
          <CardDescription>
            Pantau aktivitas terbaru dari kurir di lapangan. {currentUser.role !== 'PIC' && "(Informasi ini biasanya relevan untuk PIC)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockUpdates.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Belum ada update aktivitas terbaru.</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {mockUpdates.map(update => (
                <Card key={update.id} className="p-4 bg-card-foreground/5">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {update.icon}
                    </div>
                    <div className="flex-grow">
                      <p className="font-semibold text-sm">{update.kurirName} <span className="text-xs text-muted-foreground">({update.kurirId})</span></p>
                      <p className="text-sm text-muted-foreground">{update.message}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {new Date(update.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {new Date(update.timestamp).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
