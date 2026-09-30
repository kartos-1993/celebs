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
  /**
   * The courier zone this address sits in. Set when the customer picks their
   * district and area from the delivered list; an address without it cannot be
   * ordered to, because coverage cannot be confirmed.
   */
  logisticsZoneId?: string | null;
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
  logisticsZoneId?: string;
}

export const ADDRESS_LABELS = ['Home', 'Office'] as const;
