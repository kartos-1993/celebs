export interface SavedAddress {
  id: string;
  userId: string;
  label: string;
  fullName: string;
  phone: string;
  altPhone?: string | null;
  province: string;
  district: string;
  cityArea: string;
  streetAddress: string;
  landmark?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddressDraft {
  label: string;
  fullName: string;
  phone: string;
  altPhone?: string;
  province: string;
  district: string;
  cityArea: string;
  streetAddress: string;
  landmark?: string;
  isDefault: boolean;
}

export const ADDRESS_LABELS = ['Home', 'Office'] as const;
