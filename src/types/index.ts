

export type UserRole = 'MasterAdmin' | 'Admin' | 'PIC' | 'Kurir';

export interface UserProfile {
  uid?: string; // Firebase Auth User ID, added when fetching/storing
  id: string; // Your application-specific ID (e.g., PISTEST2025)
  fullName: string;
  role: UserRole;
  email?: string; // Should match Firebase Auth email
  // passwordValue is removed as it's handled by Firebase Auth
  nik?: string; 
  jabatan?: string; 
  wilayah?: string; 
  area?: string; 
  workLocation?: string; // Hub Location
  joinDate?: string; // Store as ISO string
  position?: string; 
  contractStatus?: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankRecipientName?: string;
  avatarUrl?: string;
  photoIdUrl?: string;
  status?: 'Aktif' | 'Nonaktif';
}


export type CourierProfile = UserProfile & {
  // Courier specific fields already in UserProfile
};


export interface PackageItem {
  id: string; // This could be the resi number
  status: 'process' | 'in_transit' | 'delivered' | 'pending_return' | 'returned';
  isCOD: boolean;
  recipientName?: string;
  deliveryProofPhotoUrl?: string; // URL to image in Firebase Storage
  returnProofPhotoUrl?: string; // URL to image in Firebase Storage
  returnLeadReceiverName?: string;
  lastUpdateTime: string; // ISO string
}

export interface DailyPackageInput {
  totalPackages: number;
  codPackages: number;
  nonCodPackages: number;
}

export interface AttendanceRecord {
  date: string; // ISO string (yyyy-mm-dd)
  checkInTime?: string; // HH:mm
  checkOutTime?: string; // HH:mm
  status: 'Present' | 'Absent' | 'Late';
}

export interface DailyPerformance {
  date: string; // ISO string
  totalDelivered: number;
  totalPending: number;
  successRate: number;
}

export interface WeeklyPerformancePoint {
  weekLabel: string;
  delivered: number;
  pending: number;
}

export interface AttendanceActivity {
  id: string; // Firestore document ID
  kurirName: string;
  kurirId: string; // Your app's Kurir ID
  kurirUid?: string; // Firebase UID of the Kurir
  action: 'check-in' | 'check-out' | 'reported-late';
  timestamp: string; // ISO string or Firestore Timestamp
  location?: string; // Hub location
}

export interface DeliveryActivity {
  id: string; // Firestore document ID
  kurirName: string;
  kurirId: string; // Your app's Kurir ID
  kurirUid?: string; // Firebase UID of the Kurir
  packageId: string; // Resi number
  action: 'picked-up' | 'in-transit' | 'delivered' | 'delivery-failed' | 'returned-to-hub';
  timestamp: string; // ISO string or Firestore Timestamp
  details?: string;
  location?: string; // Hub location of the courier
}

export interface CourierWorkSummaryActivity {
  id: string; // Firestore document ID
  kurirName: string;
  kurirId: string; // Your app's Kurir ID
  kurirUid?: string; // Firebase UID of the Kurir
  hubLocation: string; 
  timestamp: string; // ISO string or Firestore Timestamp
  totalPackagesAssigned: number;
  packagesDelivered: number;
  packagesPendingOrReturned: number;
}


export interface DashboardSummaryData {
  activeCouriersToday: number;
  totalPackagesProcessedToday: number;
  totalPackagesDeliveredToday: number;
  onTimeDeliveryRateToday: number;
  dailyShipmentSummary: { date: string; name: string; terkirim: number; pending: number }[];
  weeklyShipmentSummary: WeeklyShipmentSummary[];
  monthlyPerformanceSummary: MonthlySummaryData[];
}

export interface MonthlySummaryData {
  month: string;
  totalDelivered: number;
  totalPending: number;
  successRate: number;
}

export interface WeeklyShipmentSummary {
  week: string;
  terkirim: number;
  pending: number;
}

// Location structure for filters and forms
export interface Hub {
  id: string;
  name: string;
}

export interface Area {
  id: string;
  name: string;
  hubs: Hub[];
}

export interface Wilayah {
  id: string;
  name: string;
  areas: Area[];
}

export const mockLocationsData: Wilayah[] = [
  {
    id: 'all-wilayah', name: 'Semua Wilayah', areas: []
  },
  {
    id: 'jabodetabek-banten',
    name: 'Jabodetabek-Banten',
    areas: [
      { id: 'all-area-jb', name: 'Semua Area (Jabodetabek-Banten)', hubs: []},
      {
        id: 'jakarta-pusat-jb', 
        name: 'Jakarta Pusat',
        hubs: [
          { id: 'all-hub-jp', name: 'Semua Hub (Jakarta Pusat)'},
          { id: 'jp-hub-thamrin', name: 'Hub Thamrin' },
          { id: 'jp-hub-sudirman', name: 'Hub Sudirman' },
        ],
      },
      {
        id: 'jakarta-timur-jb', 
        name: 'Jakarta Timur',
        hubs: [
          { id: 'all-hub-jt', name: 'Semua Hub (Jakarta Timur)'},
          { id: 'jt-hub-cawang', name: 'Hub Cawang' },
          { id: 'jt-hub-rawamangun', name: 'Hub Rawamangun' },
        ],
      },
    ],
  },
  {
    id: 'jawa-barat',
    name: 'Jawa Barat',
    areas: [
      { id: 'all-area-jabar', name: 'Semua Area (Jawa Barat)', hubs: []},
      {
        id: 'bandung-kota-jabar', 
        name: 'Bandung Kota',
        hubs: [
          { id: 'all-hub-bdg', name: 'Semua Hub (Bandung Kota)'},
          { id: 'bdg-hub-kota', name: 'Hub Bandung Kota' },
          { id: 'bdg-hub-dago', name: 'Hub Dago' },
        ],
      },
    ],
  },
];
