
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
  ClipboardList
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
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from "firebase/firestore";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  roles: UserRole[];
}

const allNavItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ['MasterAdmin', 'Admin', 'PIC', 'Kurir'] },
  { href: "/profile", icon: User, label: "Profil Saya", roles: ['MasterAdmin', 'Admin', 'PIC', 'Kurir'] },
  
  // MasterAdmin specific
  { href: "/manage-admins", icon: Users, label: "Manage Admin", roles: ['MasterAdmin'] },
  { href: "/manage-pics", icon: Briefcase, label: "Manage PIC", roles: ['MasterAdmin', 'Admin'] },
  { href: "/manage-kurirs", icon: Users, label: "Manage Kurir", roles: ['MasterAdmin', 'Admin'] },
  { href: "/approvals", icon: ShieldCheck, label: "Persetujuan", roles: ['MasterAdmin'] },
  { href: "/notifications", icon: Bell, label: "Notifikasi Sistem", roles: ['MasterAdmin'] },

  // Admin specific
  // Manage PICs and Manage Kurirs are shared with MasterAdmin
  { href: "/pending-approvals", icon: MailCheck, label: "Status Persetujuan", roles: ['Admin'] },
  
  // PIC specific
  { href: "/courier-management", icon: ClipboardList, label: "Manajemen Kurir", roles: ['PIC'] },
  { href: "/reports", icon: FileText, label: "Laporan", roles: ['PIC'] },
  { href: "/courier-updates", icon: Bell, label: "Update Kurir", roles: ['PIC'] },

  // Kurir specific
  { href: "/attendance", icon: ClipboardCheck, label: "Absen", roles: ['Kurir'] },
  { href: "/performance", icon: BarChart3, label: "Performa", roles: ['Kurir'] },
  
  { href: "/settings", icon: Settings, label: "Pengaturan Akun", roles: ['MasterAdmin', 'Admin', 'PIC', 'Kurir'] },
];


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(null);
  const [navItems, setNavItems] = React.useState<NavItem[]>([]);
  const [loadingAuth, setLoadingAuth] = React.useState(true);

  React.useEffect(() => {
    console.log("Layout Effect triggered. Pathname:", pathname);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("onAuthStateChanged triggered.");
      setLoadingAuth(true);
      if (firebaseUser) {
        console.log("Firebase user found, UID:", firebaseUser.uid);
        let userProfile: UserProfile | null = null;
        
        // 1. Try to get profile from local storage first for speed
        const localData = localStorage.getItem('loggedInUser');
        if (localData) {
          try {
            const parsed = JSON.parse(localData) as UserProfile;
            if (parsed.uid === firebaseUser.uid) {
              console.log("User profile found in localStorage.");
              userProfile = parsed;
            }
          } catch (e) { console.warn("Could not parse user data from localStorage.", e) }
        }

        // 2. If no valid local data, fetch from Firestore
        if (!userProfile) {
          try {
            console.log("No local profile. Fetching from Firestore for UID:", firebaseUser.uid);
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              console.log("Firestore document found.");
              userProfile = { uid: firebaseUser.uid, ...userDocSnap.data() } as UserProfile;
              console.log("User profile constructed:", userProfile);
              localStorage.setItem('loggedInUser', JSON.stringify(userProfile));
              localStorage.setItem('isAuthenticated', 'true');
            } else {
              console.error("Firestore document NOT found for UID:", firebaseUser.uid);
              await signOut(auth);
              userProfile = null;
            }
          } catch (error) {
            console.error("Error fetching user profile from Firestore:", error);
            await signOut(auth);
            userProfile = null;
          }
        }
        
        // 3. Final decision based on profile
        if (userProfile) {
          console.log("Setting current user state.");
          setCurrentUser(userProfile);
          if (userProfile.role) {
            setNavItems(allNavItems.filter(item => item.roles.includes(userProfile!.role)));
          } else {
             console.error("User profile is missing 'role' property. Cannot set nav items.");
          }
        } else {
           console.log("No user profile available after checks. Current user will be null.");
           setCurrentUser(null);
        }

      } else {
        // User is signed out.
        console.log("No Firebase user. Clearing session.");
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('loggedInUser');
        localStorage.removeItem('courierCheckedInToday');
        setCurrentUser(null);
        setNavItems([]);
        const publicPages = ['/', '/setup-admin'];
        if (!publicPages.includes(pathname)) {
          console.log("Not on a public page, redirecting to login.");
          router.replace('/');
        }
      }
      console.log("Authentication check finished.");
      setLoadingAuth(false);
    });

    return () => {
      console.log("Cleaning up onAuthStateChanged listener.");
      unsubscribe();
    };
  }, [router, pathname]);


  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
      // Fallback cleanup
      localStorage.clear();
      router.push('/');
    }
  };

  if (loadingAuth) {
    return <div className="flex h-screen items-center justify-center">Memverifikasi sesi...</div>;
  }
  
  const publicPages = ['/', '/setup-admin'];
  if (!currentUser && !publicPages.includes(pathname)) {
    return <div className="flex h-screen items-center justify-center">Mengalihkan ke halaman login...</div>;
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
              <h2 className="text-xl font-semibold text-sidebar-foreground">INSAN MOBILE</h2>
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
