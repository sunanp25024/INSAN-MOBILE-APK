
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, UserPlus, ShieldCheck, AlertTriangle, ArrowRight, UserCog } from 'lucide-react';
import type { SystemNotification } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const getNotificationIcon = (type: SystemNotification['type']) => {
  switch (type) {
    case 'APPROVAL_REQUEST':
      return <ShieldCheck className="mt-1 h-6 w-6 flex-shrink-0 text-yellow-500" />;
    case 'USER_MANAGEMENT':
      return <UserPlus className="mt-1 h-6 w-6 flex-shrink-0 text-blue-500" />;
    case 'DATA_CHANGE':
       return <UserCog className="mt-1 h-6 w-6 flex-shrink-0 text-green-500" />;
    case 'SYSTEM_ALERT':
      return <AlertTriangle className="mt-1 h-6 w-6 flex-shrink-0 text-red-500" />;
    default:
      return <Bell className="mt-1 h-6 w-6 flex-shrink-0 text-muted-foreground" />;
  }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'notifications'),
        orderBy('timestamp', 'desc'),
        limit(50) 
      );
      const querySnapshot = await getDocs(q);
      const fetchedNotifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SystemNotification));
      setNotifications(fetchedNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast({
        title: "Gagal Memuat Notifikasi",
        description: "Terjadi kesalahan saat mengambil data dari server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (notificationId: string) => {
    const notifRef = doc(db, 'notifications', notificationId);
    try {
      await updateDoc(notifRef, { read: true });
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast({
        title: "Gagal",
        description: "Gagal menandai notifikasi sebagai sudah dibaca.",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) {
      toast({ title: "Tidak ada notifikasi baru", description: "Semua notifikasi sudah dibaca."});
      return;
    };
    
    // In a real large-scale app, this would be a backend function call.
    // For now, we'll batch the writes on the client.
    const batchPromises = unreadIds.map(id => {
      const notifRef = doc(db, 'notifications', id);
      return updateDoc(notifRef, { read: true });
    });

    try {
      await Promise.all(batchPromises);
      fetchNotifications(); // Refetch to confirm
      toast({ title: "Sukses", description: "Semua notifikasi telah ditandai sebagai sudah dibaca."});
    } catch (error) {
      console.error("Error marking all as read:", error);
       toast({ title: "Gagal", description: "Terjadi kesalahan saat menandai semua notifikasi.", variant: "destructive"});
    }
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <CardTitle className="flex items-center text-2xl text-primary">
              <Bell className="mr-3 h-7 w-7" />
              Notifikasi Sistem
            </CardTitle>
            <CardDescription>
              Pusat notifikasi untuk aktivitas penting dalam sistem, seperti pengajuan persetujuan baru.
            </CardDescription>
          </div>
          <Button onClick={markAllAsRead} disabled={unreadCount === 0 || isLoading} className="mt-2 sm:mt-0">
             Tandai Semua Sudah Dibaca ({unreadCount})
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-4"><div className="flex items-start space-x-3"><Skeleton className="h-6 w-6 rounded-full mt-1" /><div className="flex-grow space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-1/3" /></div></div></Card>
              ))}
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notif) => (
                <Card key={notif.id} className={`p-4 transition-colors ${notif.read ? 'bg-card-foreground/5 opacity-70' : 'bg-card-foreground/10 border-primary/30'}`}>
                  <div className="flex items-start space-x-3">
                    {getNotificationIcon(notif.type)}
                    <div className="flex-grow">
                      <div className="flex justify-between items-center">
                        <h3 className={`text-md font-semibold ${notif.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {notif.title}
                        </h3>
                        {!notif.read && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Baru</span>}
                      </div>
                      <p className={`text-sm ${notif.read ? 'text-muted-foreground' : 'text-foreground/90'}`}>{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(notif.timestamp as Timestamp)?.toDate().toLocaleString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className="mt-2 flex gap-2">
                        {!notif.read && <Button variant="ghost" size="sm" className="h-auto p-1 text-xs" onClick={() => markAsRead(notif.id)}>Tandai sudah dibaca</Button>}
                        {notif.linkTo && (
                          <Link href={notif.linkTo} passHref>
                            <Button variant="link" size="sm" className="h-auto p-1 text-xs">
                              Lihat Detail <ArrowRight className="ml-1 h-3 w-3"/>
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="mx-auto h-16 w-16 text-muted-foreground/30" />
              <p className="mt-4 text-xl font-semibold text-muted-foreground">Tidak ada notifikasi.</p>
              <p className="text-sm text-muted-foreground mt-1">Semua aktivitas sistem akan muncul di sini.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
