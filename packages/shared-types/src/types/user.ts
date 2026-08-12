export type Role = 'CUSTOMER' | 'VENDOR' | 'STAFF' | 'ADMIN' | 'SUPERADMIN';

export type VendorStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface VendorProfileData {
  id: string;
  shopName: string;
  status: VendorStatus;
  onboardingStep: number;
  storeLogo?: string;
  holidayMode: boolean;
  phoneNumber: string;
  shopDescription?: string;
  rejectionReason?: string;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions?: string[];
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  vendorId?: string;
  vendorProfile?: VendorProfileData;
}
