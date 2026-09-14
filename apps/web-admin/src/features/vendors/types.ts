export interface VendorListItem {
  id: string;
  shopName: string;
  phoneNumber: string;
  status: string;
  createdAt?: string;
  user?: {
    name?: string;
    email?: string;
    isEmailVerified?: boolean;
  };
}
