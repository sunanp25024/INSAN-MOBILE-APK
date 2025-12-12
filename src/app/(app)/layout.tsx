
"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/icons/AppLogo";
import {
  LayoutDashboard,
  User,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Users,
  Briefcase,
  Bell,
  MailCheck,
  FileText,
  ShieldCheck,
  ClipboardList,
  PackageSearch
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/toaster";
import type { UserRole, UserProfile } from "@/types";
import { auth, db, initializeFirebaseMessaging } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from "firebase/firestore";
import { SplashScreen } from "@/components/ui/SplashScreen";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  roles: UserRole[];
}

const allNavItems: NavItem[] = [
  // General Access
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ['MasterAdmin', 'Admin', 'PIC', 'Kurir'] },
  
  // MasterAdmin Only
  { href: "/manage-admins", icon: Users, label: "Manage Admin", roles: ['MasterAdmin'] },
  { href: "/notifications", icon: Bell, label: "Notifikasi Sistem", roles: ['MasterAdmin'] },

  // Admin & MasterAdmin
  { href: "/manage-pics", icon: Briefcase, label: "Manage PIC", roles: ['MasterAdmin', 'Admin'] },
  { href: "/approvals", icon: ShieldCheck, label: "Persetujuan", roles: ['MasterAdmin', 'Admin'] },
  
  // Managerial (PIC & Up)
  { href: "/manage-kurirs", icon: Users, label: "Manage Kurir", roles: ['MasterAdmin', 'Admin', 'PIC'] },
  { href: "/pending-approvals", icon: MailCheck, label: "Status Persetujuan", roles: ['PIC'] },
  { href: "/courier-management", icon: ClipboardList, label: "Monitoring Kurir", roles: ['MasterAdmin', 'Admin', 'PIC'] },
  { href: "/courier-updates", icon: Bell, label: "Ringkasan Aktifitas", roles: ['MasterAdmin', 'Admin', 'PIC'] },
  { href: "/delivery-proofs", icon: PackageSearch, label: "Bukti Pengiriman", roles: ['MasterAdmin', 'Admin', 'PIC'] },
  { href: "/reports", icon: FileText, label: "Laporan", roles: ['MasterAdmin', 'Admin', 'PIC'] },

  // Kurir Only
  { href: "/attendance", icon: ClipboardCheck, label: "Absen", roles: ['Kurir'] },
  { href: "/performance", icon: BarChart3, label: "Performa", roles: ['Kurir'] },
  
  // General Access (at the bottom)
  { href: "/profile", icon: User, label: "Profil Saya", roles: ['MasterAdmin', 'Admin', 'PIC', 'Kurir'] },
  { href: "/settings", icon: Settings, label: "Pengaturan Akun", roles: ['MasterAdmin', 'Admin', 'PIC', 'Kurir'] },
];


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(null);
  const [navItems, setNavItems] = React.useState<NavItem[]>([]);
  const [loadingAuth, setLoadingAuth] = React.useState(true);
  const [notificationSetupDone, setNotificationSetupDone] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoadingAuth(true);
      if (firebaseUser) {
        let userProfile: UserProfile | null = null;
        
        const localData = localStorage.getItem('loggedInUser');
        if (localData) {
          try {
            const parsed = JSON.parse(localData) as UserProfile;
            if (parsed.uid === firebaseUser.uid) {
              userProfile = parsed;
            }
          } catch (e) { console.warn("Could not parse user data from localStorage.", e) }
        }

        if (!userProfile) {
          try {
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              userProfile = { uid: firebaseUser.uid, ...userDocSnap.data() } as UserProfile;
              localStorage.setItem('loggedInUser', JSON.stringify(userProfile));
              localStorage.setItem('isAuthenticated', 'true');
            } else {
              await signOut(auth);
              userProfile = null;
            }
          } catch (error) {
            console.error("Error fetching user profile from Firestore:", error);
            await signOut(auth);
            userProfile = null;
          }
        }
        
        if (userProfile) {
          setCurrentUser(userProfile);
          if (userProfile.role) {
            setNavItems(allNavItems.filter(item => item.roles.includes(userProfile!.role)));
          }
        } else {
           setCurrentUser(null);
        }

      } else {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('loggedInUser');
        localStorage.removeItem('courierCheckedInToday');
        setCurrentUser(null);
        setNavItems([]);
        const publicPages = ['/', '/login', '/setup-admin'];
        if (!publicPages.includes(pathname)) {
          router.replace('/');
        }
      }
      setLoadingAuth(false);
    });

    return () => {
      unsubscribe();
    };
  }, [router, pathname]);

  // Effect for setting up push notifications
  React.useEffect(() => {
      if (currentUser && currentUser.uid && !notificationSetupDone) {
          if (process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
              initializeFirebaseMessaging(currentUser.uid);
              setNotificationSetupDone(true); // Ensure it only runs once per session
          } else {
              console.warn("VAPID key is missing. Push notifications are disabled.");
              setNotificationSetupDone(true);
          }
      }
  }, [currentUser, notificationSetupDone]);


  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
      localStorage.clear();
      router.push('/');
    }
  };

  if (loadingAuth) {
    return <SplashScreen />;
  }
  
  const publicPages = ['/', '/login', '/setup-admin'];
  if (!currentUser && !publicPages.includes(pathname)) {
    return <SplashScreen />;
  }
  
  if (publicPages.includes(pathname)) {
    return <>{children}</>;
  }


  const userInitials = currentUser?.fullName?.split(" ").map(n => n[0]).join("").toUpperCase() || "XX";

  return (
    <SidebarProvider defaultOpen>
      <Sidebar>
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <AppLogo className="h-10 w-10 text-primary" />
            <div className="flex flex-col">
              <h2 className="text-xl font-semibold text-sidebar-foreground">MORA Apps</h2>
              <span className="text-xs text-muted-foreground">Aplikasi Mobile</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(item.href)}
                    tooltip={{ children: item.label, side: "right", align: "center" }}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-sidebar-border">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start items-center p-2 h-auto">
                <Avatar className="h-9 w-9 mr-3">
                  <AvatarImage src={currentUser?.avatarUrl || `https://placehold.co/100x100.png?text=${userInitials}`} alt={currentUser?.fullName || "User"} data-ai-hint="man face"/>
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <div className="text-left flex-grow">
                  <p className="text-sm font-medium text-sidebar-foreground">{currentUser?.fullName || "User"}</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.id}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 mb-2">
              <DropdownMenuLabel>Akun Saya ({currentUser?.role})</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Pengaturan</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6 md:hidden">
             <SidebarTrigger />
          </div>
          {children}
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
