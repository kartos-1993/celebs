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
  const response = await axiosClient.put('/vendor/profile', data);
  return response.data;
}

export async function updateVendorWarehouse(data: warehouseType) {
  const response = await axiosClient.put('/vendor/warehouse', data);
  return response.data;
}

export async function updateVendorDocuments(data: vendorDocumentsType) {
  const response = await axiosClient.put('/vendor/documents', data);
  return response.data;
}

export async function updateVendorBusinessInfo(data: vendorBusinessInfoType) {
  const response = await axiosClient.put('/vendor/business-info', data);
  return response.data;
}

export async function submitVendorForReview() {
  const response = await axiosClient.post('/vendor/submit-for-review');
  return response.data;
}

export async function resubmitForReview() {
  const response = await axiosClient.post('/vendor/resubmit');
  return response.data;
}

export async function uploadOnboardingImage(file: File): Promise<string> {
  return directUploadFile(file, 'celebs/kyc', 'KYC');
}
