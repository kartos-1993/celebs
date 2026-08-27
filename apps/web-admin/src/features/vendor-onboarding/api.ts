import type {
  vendorBusinessInfoType,
  vendorDocumentsType,
  vendorProfileType,
  warehouseType,
} from '@celebs/shared-types';

import { axiosClient } from '@/lib/axios/axios-client';
import { directUploadFile } from '@/lib/media-upload';

export const VENDOR_ONBOARDING_QUERY_KEYS = {
  all: ['vendor-onboarding'] as const,
  status: () => [...VENDOR_ONBOARDING_QUERY_KEYS.all, 'status'] as const,
};

export async function getOnboardingStatus() {
  const response = await axiosClient.get('/vendor/onboarding-status');
  return response.data;
}

export async function updateVendorProfile(data: vendorProfileType) {
  return await axiosClient.put('/vendor/profile', data);
}

export async function updateVendorWarehouse(data: warehouseType) {
  return await axiosClient.put('/vendor/warehouse', data);
}

export async function updateVendorDocuments(data: vendorDocumentsType) {
  return await axiosClient.put('/vendor/documents', data);
}

export async function updateVendorBusinessInfo(data: vendorBusinessInfoType) {
  return await axiosClient.put('/vendor/business-info', data);
}

export async function submitVendorForReview() {
  return await axiosClient.post('/vendor/submit-for-review');
}

export async function resubmitForReview() {
  return await axiosClient.post('/vendor/resubmit');
}

export async function uploadOnboardingImage(file: File): Promise<string> {
  return directUploadFile(file, 'celebs/kyc', 'KYC');
}
