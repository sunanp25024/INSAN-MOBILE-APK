
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
import { auth } from '@/lib/firebase'; // Import Firebase auth
import { onAuthStateChanged, signOut } from 'firebase/auth';

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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in.
        const userDataString = localStorage.getItem('loggedInUser');
        if (userDataString) {
          try {
            const parsedUser = JSON.parse(userDataString) as UserProfile;
            // Basic check: if the UID from localStorage matches firebaseUser's UID
            // For more robust check, you might re-fetch from Firestore or ensure token validity
            if (parsedUser.uid === firebaseUser.uid) {
              setCurrentUser(parsedUser);
              if (parsedUser.role) {
                setNavItems(allNavItems.filter(item => item.roles.includes(parsedUser.role)));
              } else {
                router.replace('/'); // Missing role, critical info
              }
            } else {
              // Mismatch, clear stale data and redirect
              localStorage.removeItem('isAuthenticated');
              localStorage.removeItem('loggedInUser');
              router.replace('/');
            }
          } catch (error) {
            console.error("Failed to parse user data from localStorage", error);
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('loggedInUser');
            router.replace('/');
          }
        } else {
          // No user data in localStorage despite Firebase auth - might happen on first load or if cleared
          // Redirect to login to fetch and store profile
          router.replace('/');
        }
      } else {
        // User is signed out.
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('loggedInUser');
        localStorage.removeItem('courierCheckedInToday');
        setCurrentUser(null);
        setNavItems([]);
        if (pathname !== '/') { // Avoid redirect loop if already on login page
             router.replace('/');
        }
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [router, pathname]);


  const handleLogout = async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged will handle clearing localStorage and redirecting
    } catch (error) {
      console.error("Error signing out: ", error);
      // Fallback cleanup if signOut fails or onAuthStateChanged doesn't trigger as expected
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('loggedInUser');
      localStorage.removeItem('courierCheckedInToday');
      router.push('/');
    }
  };

  if (loadingAuth) {
    return <div className="flex h-screen items-center justify-center">Memverifikasi sesi...</div>;
  }
  
  if (!currentUser && pathname !== '/') {
     // This case should ideally be handled by onAuthStateChanged redirecting to '/'
     // But as a fallback, if not loading and no user, show loading or redirect.
     // To prevent flashing content, we might just show a loader until redirect from onAuthStateChanged happens.
    return <div className="flex h-screen items-center justify-center">Mengalihkan ke halaman login...</div>;
  }
  
  // If currentUser is null, it means we are on the login page, so we don't render the layout.
  // This check relies on the fact that if user is not authenticated, onAuthStateChanged redirects to '/'.
  // If the pathname is '/', it means it's the login page, so children (login page) should be rendered directly.
  if (!currentUser && pathname.startsWith('/dashboard')) { // Or any other protected route prefix
     return <div className="flex h-screen items-center justify-center">Anda tidak diautentikasi. Mengalihkan...</div>;
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
                    isActive={pathname === item.href || (item.href === "/dashboard" && pathname.startsWith("/dashboard"))}
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
