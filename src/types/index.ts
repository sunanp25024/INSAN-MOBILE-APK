export interface CourierProfile {
  id: string;
  fullName: string;
  workLocation: string;
  joinDate: string; // ISO date string
  position: string;
  contractStatus: 'Permanent' | 'Contract' | 'Probation';
  bankAccountNumber: string;
  bankName: string;
  bankRecipientName: string;
  avatarUrl?: string;
  photoIdUrl?: string;
}

export interface PackageItem {
  id: string; // Tracking number
  status: 'process' | 'in_transit' | 'delivered' | 'pending_return' | 'returned';
  isCOD: boolean;
  recipientName?: string;
  deliveryProofPhotoUrl?: string; // URL of the photo
  returnProofPhotoUrl?: string; // URL of the return photo for a batch of pending items
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
