import type { AddressFormValues } from './address-form-fields';

import type { AddressDraft, SavedAddress } from '@/features/addresses/types';

export function createAddressDefaultValues(editing: SavedAddress | null): AddressFormValues {
  return {
    label: editing?.label ?? 'Home',
    fullName: editing?.fullName ?? '',
    phone: editing?.phone ?? '',
    altPhone: editing?.altPhone ?? '',
    province: editing?.province ?? 'Bagmati',
    district: editing?.district ?? '',
    cityArea: editing?.cityArea ?? '',
    streetAddress: editing?.streetAddress ?? '',
    landmark: editing?.landmark ?? '',
    isDefault: editing?.isDefault ?? false,
    logisticsZoneId: editing?.logisticsZoneId ?? '',
  };
}

export function buildAddressDraft(data: AddressFormValues): AddressDraft {
  return {
    label: data.label || 'Home',
    fullName: data.fullName.trim(),
    phone: data.phone.trim(),
    ...(data.altPhone?.trim() ? { altPhone: data.altPhone.trim() } : {}),
    province: data.province.trim(),
    district: data.district.trim(),
    cityArea: data.cityArea.trim(),
    streetAddress: data.streetAddress.trim(),
    ...(data.landmark?.trim() ? { landmark: data.landmark.trim() } : {}),
    ...(data.logisticsZoneId ? { logisticsZoneId: data.logisticsZoneId } : {}),
    isDefault: !!data.isDefault,
  };
}
