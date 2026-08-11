import { axiosClient } from '@/lib/axios/axios-client';
import { SessionResponse } from '../types';

import {
  loginType,
  registerType,
  verifyEmailType,
  resetPasswordType,
  verifyMFAType,
  mfaLoginType,
  setupSuperadminType,
  vendorRegisterType,
  vendorProfileType,
  warehouseType,
  vendorDocumentsType,
  vendorBusinessInfoType,
} from '@celebs/shared-types';

type forgotPasswordType = { email: string };
type SessionType = {
  id: string;
  userId: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

type SessionResponseType = {
  message: string;
  sessions: SessionType[];
};

type mfaType = {
  message: string;
  secret: string;
  qrImageUrl: string;
};

export const loginMutationFn = async (data: loginType) => await axiosClient.post(`/auth/login`, data);

export const setupSuperadminMutationFn = async (data: setupSuperadminType) =>
  await axiosClient.post(`/auth/setup-superadmin`, data);

export const getSetupStatusQueryFn = async () => {
  const response = await axiosClient.get(`/auth/setup-status`);
  return response.data;
};

export const registerMutationFn = async (data: registerType) =>
  await axiosClient.post(`/auth/register`, data);

export const vendorRegisterMutationFn = async (data: vendorRegisterType) =>
  await axiosClient.post(`/auth/vendor/register`, data);

export const verifyEmailMutationFn = async (data: verifyEmailType) =>
  await axiosClient.post(`/auth/verify-email`, data);

export const forgotPasswordMutationFn = async (data: forgotPasswordType) =>
  await axiosClient.post(`/auth/password-forgot`, data);

export const resetPasswordMutationFn = async (data: resetPasswordType) =>
  await axiosClient.post(`/auth/password-reset`, data);

export const verifyMFAMutationFn = async (data: verifyMFAType) =>
  await axiosClient.post(`/mfa/verify`, data);

export const verifyMFALoginMutationFn = async (data: mfaLoginType) =>
  await axiosClient.post(`/mfa/verify-login`, data);

export const logoutMutationFn = async () => await axiosClient.post(`/auth/logout`);

export const mfaSetupQueryFn = async () => {
  const response = await axiosClient.get<mfaType>(`/mfa/setup`);
  return response.data;
};
export const revokeMFAMutationFn = async () => await axiosClient.put(`/mfa/revoke`, {});

export const getUserSessionQueryFn = async (): Promise<SessionResponse> =>
  await axiosClient.get(`/session/?t=${Date.now()}`).then((res: { data: SessionResponse }) => res.data);

export const sessionsQueryFn = async () => {
  const response = await axiosClient.get<SessionResponseType>(`/session/all`);
  return response.data;
};

export const sessionDelMutationFn = async (id: string) => await axiosClient.delete(`/session/${id}`);

// Vendor Onboarding Mutations & Queries
export const getOnboardingStatusQueryFn = async () => {
  const response = await axiosClient.get(`/vendor/onboarding-status`);
  return response.data;
};

export const updateVendorProfileMutationFn = async (data: vendorProfileType) =>
  await axiosClient.put(`/vendor/profile`, data);

export const updateVendorWarehouseMutationFn = async (data: warehouseType) =>
  await axiosClient.put(`/vendor/warehouse`, data);

export const updateVendorDocumentsMutationFn = async (data: vendorDocumentsType) =>
  await axiosClient.put(`/vendor/documents`, data);

export const updateVendorBusinessInfoMutationFn = async (data: vendorBusinessInfoType) =>
  await axiosClient.put(`/vendor/business-info`, data);

export const submitVendorForReviewMutationFn = async () =>
  await axiosClient.post(`/vendor/submit-for-review`);

export const getAdminVendorsQueryFn = async () => {
  const response = await axiosClient.get(`/admin/vendors`);
  return response.data;
};

export const getAdminVendorByIdQueryFn = async (id: string) => {
  const response = await axiosClient.get(`/admin/vendors/${id}`);
  return response.data;
};

export const approveVendorMutationFn = async (id: string) =>
  await axiosClient.patch(`/admin/vendors/${id}/approve`);

export const rejectVendorMutationFn = async ({ id, reason }: { id: string; reason?: string }) =>
  await axiosClient.patch(`/admin/vendors/${id}/reject`, { reason });

export const suspendVendorMutationFn = async (id: string) =>
  await axiosClient.patch(`/admin/vendors/${id}/suspend`);

// User Management (Superadmin)
export const getUsersQueryFn = async () => {
  const response = await axiosClient.get(`/admin/users`);
  return response.data;
};

export const createUserMutationFn = async (data: Record<string, unknown>) => await axiosClient.post(`/admin/users`, data);

export const deleteUserMutationFn = async (id: string) =>
  await axiosClient.delete(`/admin/users/${id}`);

// Staff Management (Vendors)
export const getStaffQueryFn = async (vendorId?: string) => {
  const response = await axiosClient.get(`/staff`, { params: vendorId ? { vendorId } : undefined });
  return response.data;
};

export const createStaffMutationFn = async (data: Record<string, unknown>) => await axiosClient.post(`/staff`, data);

export const deleteStaffMutationFn = async (id: string) => await axiosClient.delete(`/staff/${id}`);

// Marketing Campaigns API
export const getCampaignsQueryFn = async () => {
  const response = await axiosClient.get(`/campaigns/all`);
  return response.data;
};

export const getCampaignByIdQueryFn = async (id: string) => {
  const response = await axiosClient.get(`/campaigns/id/${id}`);
  return response.data;
};

export const createCampaignMutationFn = async (data: unknown) => {
  const response = await axiosClient.post(`/campaigns`, data);
  return response.data;
};

export const updateCampaignMutationFn = async ({ id, data }: { id: string; data: unknown }) => {
  const response = await axiosClient.put(`/campaigns/${id}`, data);
  return response.data;
};

// Generic Combo Bundles API
export const getCombosQueryFn = async () => {
  const response = await axiosClient.get(`/combos/all`);
  return response.data;
};

export const getComboByIdQueryFn = async (id: string) => {
  const response = await axiosClient.get(`/combos/id/${id}`);
  return response.data;
};

export const createComboMutationFn = async (data: unknown) => {
  const response = await axiosClient.post(`/combos`, data);
  return response.data;
};

export const updateComboMutationFn = async ({ id, data }: { id: string; data: unknown }) => {
  const response = await axiosClient.put(`/combos/${id}`, data);
  return response.data;
};

export const deleteComboMutationFn = async (id: string) => {
  const response = await axiosClient.delete(`/combos/${id}`);
  return response.data;
};

// Products Search API (for Combos & Campaigns product picker)
export const getProductsCatalogQueryFn = async (search?: string) => {
  const response = await axiosClient.get(`/products`, { params: { search, limit: 50 } });
  return response.data;
};

// 3PL Courier Logistics & COD Settlement API
export const dispatch3PLOrderMutationFn = async ({
  orderId,
  provider,
}: {
  orderId: string;
  provider?: string;
}) => {
  const response = await axiosClient.post(`/logistics/dispatch/${orderId}`, {
    courierProvider: provider || 'NEPAL_CAN_MOVE',
  });
  return response.data;
};

export const settleCodOrderMutationFn = async ({
  orderId,
  reference,
}: {
  orderId: string;
  reference: string;
}) => {
  const response = await axiosClient.post(`/logistics/settle-cod/${orderId}`, { reference });
  return response.data;
};

export const uploadMediaFilesMutationFn = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('files', file);
  const response = await axiosClient.post('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const items = response.data?.data || [];
  if (!items.length || !items[0]?.url) {
    throw new Error('Image upload failed');
  }
  return items[0].url;
};
