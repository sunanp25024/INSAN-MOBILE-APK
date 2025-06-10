

export type UserRole = 'MasterAdmin' | 'Admin' | 'PIC' | 'Kurir';

export interface UserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  email?: string; // Made email consistently optional as ID might be primary
  passwordValue?: string; // Only for mock, should not be in real profile
  workLocation?: string;
  joinDate?: string; 
  position?: string; 
  contractStatus?: 'Permanent' | 'Contract' | 'Probation';
  bankAccountNumber?: string; 
  bankName?: string; 
  bankRecipientName?: string; 
  avatarUrl?: string;
  photoIdUrl?: string; 
  status?: 'Aktif' | 'Nonaktif'; // For user management tables
}


export type CourierProfile = UserProfile & {
  // any Kurir-specific fields can be added here if they don't fit UserProfile
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
  location?: string; 
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

