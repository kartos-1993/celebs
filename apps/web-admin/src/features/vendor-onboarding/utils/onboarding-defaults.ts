import type {
  vendorBusinessInfoType,
  vendorDocumentsType,
  VendorProfileData,
  vendorProfileType,
  warehouseType,
} from '@celebs/shared-types';

/**
 * Resolves Step 1 (Store Profile) default values with fallbacks.
 * Pure function with CC: 1.
 */
export function getProfileDefaultValues(
  profile?: Partial<VendorProfileData> | null,
): vendorProfileType {
  return {
    shopDescription: profile?.shopDescription || '',
    phoneNumber: profile?.phoneNumber || '',
    storeLogo: profile?.storeLogo || '',
  };
}

/**
 * Resolves Step 2 (Warehouse Address) default values with fallbacks.
 * Pure function with CC: 2.
 */
export function getWarehouseDefaultValues(
  profile?: Partial<VendorProfileData> | null,
  fallbackContactName = '',
): warehouseType {
  const primaryWarehouse = profile?.warehouses?.[0];
  const fallbackPhone = profile?.phoneNumber || '';

  return {
    label: primaryWarehouse?.label || 'Main Warehouse',
    contactName: primaryWarehouse?.contactName || fallbackContactName || '',
    contactPhone: primaryWarehouse?.contactPhone || fallbackPhone,
    addressLine1: primaryWarehouse?.addressLine1 || '',
    addressLine2: primaryWarehouse?.addressLine2 || '',
    city: primaryWarehouse?.city || '',
    district: primaryWarehouse?.district || '',
    province: primaryWarehouse?.province || '',
    postalCode: primaryWarehouse?.postalCode || '',
  };
}

/**
 * Resolves Step 3 (KYC Documents) default values with fallbacks.
 * Pure function with CC: 1.
 */
export function getDocumentsDefaultValues(
  profile?: Partial<VendorProfileData> | null,
): vendorDocumentsType {
  return {
    panDocumentUrl: profile?.panDocumentUrl || '',
    citizenshipDocumentUrl: profile?.citizenshipDocumentUrl || '',
    vatDocumentUrl: profile?.vatDocumentUrl || '',
    businessRegDocumentUrl: profile?.businessRegDocumentUrl || '',
    ownerPhotoUrl: profile?.ownerPhotoUrl || '',
  };
}

/**
 * Resolves Step 4 (Legal Business Info) default values with fallbacks.
 * Pure function with CC: 2.
 */
export function getBusinessInfoDefaultValues(
  profile?: Partial<VendorProfileData> | null,
): vendorBusinessInfoType {
  const fallbackPhone = profile?.phoneNumber || '';

  return {
    businessName: profile?.businessName || '',
    businessRegNumber: profile?.businessRegNumber || '',
    businessPhoneNumber: profile?.businessPhoneNumber || fallbackPhone,
  };
}
