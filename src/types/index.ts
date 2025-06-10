

export type UserRole = 'MasterAdmin' | 'Admin' | 'PIC' | 'Kurir';

export interface UserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  workLocation?: string; // Optional, as not all roles might have it
  joinDate?: string; // ISO date string, optional
  position?: string; // Optional
  contractStatus?: 'Permanent' | 'Contract' | 'Probation'; // Optional
  bankAccountNumber?: string; // Optional
  bankName?: string; // Optional
  bankRecipientName?: string; // Optional
  avatarUrl?: string;
  photoIdUrl?: string; // Optional
  email?: string; // Added for settings
}


// CourierProfile can extend or be a specific type of UserProfile if needed later
// For now, Courier specific data might still be relevant if a Kurir logs in.
// We'll primarily use UserProfile for general user info.
export type CourierProfile = UserProfile & {
  // any Kurir-specific fields can be added here if they don't fit UserProfile
};


export interface PackageItem {
  id: string; // Tracking number
  status: 'process' | 'in_transit' | 'delivered' | 'pending_return' | 'returned';
  isCOD: boolean;
  recipientName?: string;
  deliveryProofPhotoUrl?: string; // URL of the photo
  returnProofPhotoUrl?: string; // URL of the return photo for a batch of pending items
  returnLeadReceiverName?: string; // Name of the lead/supervisor who received the returned packages
  lastUpdateTime: string; // ISO date string
}

export interface DailyPackageInput {
  totalPackages: number;
  codPackages: number;
  nonCodPackages: number;
}

export interface AttendanceRecord {
  date: string; // ISO date string
  checkInTime?: string; // ISO time string
  checkOutTime?: string; // ISO time string
  status: 'Present' | 'Absent' | 'Late';
}

export interface DailyPerformance {
  date: string; // ISO date string
  totalDelivered: number;
  totalPending: number;
  successRate: number; // Percentage
}

export interface WeeklyPerformancePoint {
  weekLabel: string; // e.g., "W1", "W2"
  delivered: number;
  pending: number;
}
