

export type UserRole = 'MasterAdmin' | 'Admin' | 'PIC' | 'Kurir';

export interface UserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  email?: string;
  passwordValue?: string; // Only for mock/initial setup, not for general display
  nik?: string; 
  jabatan?: string; 
  wilayah?: string; 
  area?: string; 
  workLocation?: string; // Hub Location
  joinDate?: string;
  position?: string; // Used as 'Jabatan' for Kurir, or Role name for others
  contractStatus?: 'Permanent' | 'Contract' | 'Probation';
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
  id: string;
  status: 'process' | 'in_transit' | 'delivered' | 'pending_return' | 'returned';
  isCOD: boolean;
  recipientName?: string;
  deliveryProofPhotoUrl?: string;
  returnProofPhotoUrl?: string;
  returnLeadReceiverName?: string;
  lastUpdateTime: string;
}

export interface DailyPackageInput {
  totalPackages: number;
  codPackages: number;
  nonCodPackages: number;
}

export interface AttendanceRecord {
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'Present' | 'Absent' | 'Late';
}

export interface DailyPerformance {
  date: string;
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
  id: string;
  kurirName: string;
  kurirId: string;
  action: 'check-in' | 'check-out' | 'reported-late';
  timestamp: string;
  location?: string;
}

export interface DeliveryActivity {
  id: string;
  kurirName: string;
  kurirId: string;
  packageId: string;
  action: 'picked-up' | 'in-transit' | 'delivered' | 'delivery-failed' | 'returned-to-hub';
  timestamp: string;
  details?: string;
  location?: string; // Hub location of the courier
}

export interface CourierWorkSummaryActivity {
  id: string; // Unique ID for this summary activity
  kurirName: string;
  kurirId: string;
  hubLocation: string; // Location of the hub they operate from
  timestamp: string; // Timestamp when they finished/reported
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
        id: 'jakarta-pusat-jb', // Made ID more unique
        name: 'Jakarta Pusat',
        hubs: [
          { id: 'all-hub-jp', name: 'Semua Hub (Jakarta Pusat)'},
          { id: 'jp-hub-thamrin', name: 'Hub Thamrin' },
          { id: 'jp-hub-sudirman', name: 'Hub Sudirman' },
        ],
      },
      {
        id: 'jakarta-timur-jb', // Made ID more unique
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
        id: 'bandung-kota-jabar', // Made ID more unique
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
