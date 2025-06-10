

export type UserRole = 'MasterAdmin' | 'Admin' | 'PIC' | 'Kurir';

export interface UserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  email?: string; 
  passwordValue?: string; 
  workLocation?: string;
  joinDate?: string; 
  position?: string; 
  contractStatus?: 'Permanent' | 'Contract' | 'Probation';
  bankAccountNumber?: string; 
  bankName?: string; 
  bankRecipientName?: string; 
  avatarUrl?: string;
  photoIdUrl?: string; 
  status?: 'Aktif' | 'Nonaktif'; 
}


export type CourierProfile = UserProfile & {
  
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

// Existing DeliveryActivity, potentially used by other features or Kurir's view
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

// New type for managerial dashboard: Courier Work Completion Summary
export interface CourierWorkSummaryActivity {
  id: string; // Unique ID for this summary activity
  kurirName: string;
  kurirId: string;
  hubLocation: string; // Location of the hub they operate from
  timestamp: string; // Timestamp when they finished/reported
  totalPackagesAssigned: number;
  packagesDelivered: number;
  packagesPendingOrReturned: number;
  // successRate could be calculated: (packagesDelivered / totalPackagesAssigned) * 100
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

