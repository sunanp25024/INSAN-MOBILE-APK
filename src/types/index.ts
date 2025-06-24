

export type UserRole = 'MasterAdmin' | 'Admin' | 'PIC' | 'Kurir';

export interface UserProfile {
  uid: string; // Firebase Auth User ID, THIS IS MANDATORY for logged-in users.
  id: string; // Your application-specific ID (e.g., PISTEST2025, ADMIN001)
  fullName: string;
  role: UserRole;
  email?: string; // Should match Firebase Auth email
  nik?: string; 
  jabatan?: string; 
  wilayah?: string; 
  area?: string; 
  workLocation?: string; // Hub Location for PIC/Kurir
  joinDate?: string; // Store as ISO string
  position?: string; // More specific title, e.g., "Kurir Senior", "Admin Staff"
  contractStatus?: string; // e.g., "Permanent", "Contract", "Probation"
  bankAccountNumber?: string;
  bankName?: string;
  bankRecipientName?: string;
  avatarUrl?: string;
  photoIdUrl?: string; // URL for KTP/SIM photo
  status?: 'Aktif' | 'Nonaktif' | 'PendingApproval'; // Status of the user account

  // Optional audit fields
  createdAt?: string; // ISO string (Timestamp from Firestore)
  updatedAt?: string; // ISO string (Timestamp from Firestore)
  createdBy?: { uid: string; name: string; role: UserRole }; // Who created this user record
  updatedBy?: { uid: string; name: string; role: UserRole }; // Who last updated this user record
  lastLogin?: string; // ISO string
}


export interface PackageItem {
  id: string; // This could be the resi number
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

export interface KurirDailyTaskDoc {
  kurirUid: string;
  kurirFullName: string;
  date: string; 
  totalPackages: number;
  codPackages: number;
  nonCodPackages: number;
  taskStatus: 'pending_setup' | 'in_progress' | 'completed' | 'archived'; 
  createdAt: any; 
  updatedAt: any; 
  finalDeliveredCount?: number;
  finalPendingReturnCount?: number;
  finalReturnProofPhotoUrl?: string; 
  finalReturnLeadReceiverName?: string; 
  finishTimestamp?: any; 
}

export interface ApprovalRequest {
  id: string; // Firestore document ID
  type: 'NEW_USER_PIC' | 'NEW_USER_KURIR' | 'NEW_USER_ADMIN' | 'UPDATE_USER_PROFILE' | 'DEACTIVATE_USER' | 'ACTIVATE_USER' | 'OTHER';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';

  requestedByUid: string;
  requestedByName: string;
  requestedByRole: UserRole;
  requestTimestamp: any; // Firestore Server Timestamp

  targetEntityType: 'USER_PROFILE_DATA' | 'OTHER_ENTITY';
  targetEntityId?: string; // e.g., App-specific ID for new user, or UID of user to be updated.
  targetEntityName?: string; // e.g., Full name of the user being affected.

  payload: Record<string, any>; // Data for the new user, or fields to be updated. For new user, might include initial password.
  oldPayload?: Record<string, any>; // Optional: for UPDATE_USER_PROFILE, the old values for audit.

  notesFromRequester?: string;

  // Fields to be filled by MasterAdmin upon handling
  handledByUid?: string;
  handledByName?: string;
  actionTimestamp?: any; // Firestore Server Timestamp
  notesFromHandler?: string; // Notes from MasterAdmin
}


export interface AttendanceRecord {
  id: string; // Firestore document ID, e.g., {kurirUid}_{yyyy-MM-dd}
  kurirUid: string;
  kurirId: string;
  kurirName: string;
  date: string; // ISO string 'yyyy-MM-dd'
  checkInTime?: string; // 'HH:mm'
  checkOutTime?: string; // 'HH:mm'
  status: 'Present' | 'Absent' | 'Late' | 'Not Checked In';
  timestamp?: any; // Firestore ServerTimestamp for sorting or Date object
  workLocation?: string;
  checkInTimestamp?: any; // Firestore Timestamp for precise check-in time
  checkOutTimestamp?: any; // Firestore Timestamp for precise check-out time
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
  kurirUid?: string; 
  action: 'check-in' | 'check-out' | 'check-in-late';
  timestamp: string; // Milliseconds as a string
  location?: string; 
}

export interface DeliveryActivity {
  id: string; 
  kurirName: string;
  kurirId: string; 
  kurirUid?: string; 
  packageId: string; 
  action: 'picked-up' | 'in-transit' | 'delivered' | 'delivery-failed' | 'returned-to-hub';
  timestamp: string; 
  details?: string;
  location?: string; 
}

export interface CourierWorkSummaryActivity {
  id: string; 
  kurirName: string;
  kurirId: string; 
  kurirUid?: string; 
  hubLocation: string; 
  timestamp: string; 
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
