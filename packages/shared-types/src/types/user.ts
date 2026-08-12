export type Role = 'CUSTOMER' | 'VENDOR' | 'STAFF' | 'ADMIN' | 'SUPERADMIN';

export type VendorStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface WarehouseData {
  id: string;
  label: string;
  contactName: string;
  contactPhone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  province: string;
  postalCode?: string;
}

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
  businessName?: string;
  businessRegNumber?: string;
  businessPhoneNumber?: string;
  panDocumentUrl?: string;
  citizenshipDocumentUrl?: string;
  vatDocumentUrl?: string;
  businessRegDocumentUrl?: string;
  ownerPhotoUrl?: string;
  warehouses?: WarehouseData[];
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
