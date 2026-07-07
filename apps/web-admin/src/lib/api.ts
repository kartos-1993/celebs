import {AuthAPI} from "./axios-client";
import { SessionResponse } from "../types";

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
  vendorBusinessInfoType
} from '@celebs/shared-types';

type forgotPasswordType = { email: string };
type SessionType = {
  _id: string;
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




export const loginMutationFn = async (data: loginType) =>
  await AuthAPI.post(`/auth/login`, data);

export const setupSuperadminMutationFn = async (data: setupSuperadminType) =>
  await AuthAPI.post(`/auth/setup-superadmin`, data);

export const getSetupStatusQueryFn = async () => {
  const response = await AuthAPI.get(`/auth/setup-status`);
  return response.data;
};

export const registerMutationFn = async (data: registerType) =>
  await AuthAPI.post(`/auth/register`, data);

export const vendorRegisterMutationFn = async (data: vendorRegisterType) =>
  await AuthAPI.post(`/auth/vendor/register`, data);

export const verifyEmailMutationFn = async (data: verifyEmailType) =>
  await AuthAPI.post(`/auth/verify-email`, data);

export const forgotPasswordMutationFn = async (data: forgotPasswordType) =>
  await AuthAPI.post(`/auth/password-forgot`, data);

export const resetPasswordMutationFn = async (data: resetPasswordType) =>
  await AuthAPI.post(`/auth/password-reset`, data);

export const verifyMFAMutationFn = async (data: verifyMFAType) =>
  await AuthAPI.post(`/mfa/verify`, data);

export const verifyMFALoginMutationFn = async (data: mfaLoginType) =>
  await AuthAPI.post(`/mfa/verify-login`, data);

export const logoutMutationFn = async () => await AuthAPI.post(`/auth/logout`);

export const mfaSetupQueryFn = async () => {
  const response = await AuthAPI.get<mfaType>(`/mfa/setup`);
  return response.data;
};
export const revokeMFAMutationFn = async () => await AuthAPI.put(`/mfa/revoke`, {});

export const getUserSessionQueryFn = async (): Promise<SessionResponse> =>
  await AuthAPI.get(`/session/`).then((res) => res.data);

export const sessionsQueryFn = async () => {
  const response = await AuthAPI.get<SessionResponseType>(`/session/all`);
  return response.data;
};

export const sessionDelMutationFn = async (id: string) =>
  await AuthAPI.delete(`/session/${id}`);

// Vendor Onboarding Mutations & Queries
export const getOnboardingStatusQueryFn = async () => {
  const response = await AuthAPI.get(`/vendor/onboarding-status`);
  return response.data;
};

export const updateVendorProfileMutationFn = async (data: vendorProfileType) =>
  await AuthAPI.put(`/vendor/profile`, data);

export const updateVendorWarehouseMutationFn = async (data: warehouseType) =>
  await AuthAPI.put(`/vendor/warehouse`, data);

export const updateVendorDocumentsMutationFn = async (data: vendorDocumentsType) =>
  await AuthAPI.put(`/vendor/documents`, data);

export const updateVendorBusinessInfoMutationFn = async (data: vendorBusinessInfoType) =>
  await AuthAPI.put(`/vendor/business-info`, data);

export const submitVendorForReviewMutationFn = async () =>
  await AuthAPI.post(`/vendor/submit-for-review`);

export const getAdminVendorsQueryFn = async () => {
  const response = await AuthAPI.get(`/admin/vendors`);
  return response.data;
};

export const getAdminVendorByIdQueryFn = async (id: string) => {
  const response = await AuthAPI.get(`/admin/vendors/${id}`);
  return response.data;
};

export const approveVendorMutationFn = async (id: string) =>
  await AuthAPI.patch(`/admin/vendors/${id}/approve`);

export const rejectVendorMutationFn = async ({ id, reason }: { id: string; reason?: string }) =>
  await AuthAPI.patch(`/admin/vendors/${id}/reject`, { reason });

export const suspendVendorMutationFn = async (id: string) =>
  await AuthAPI.patch(`/admin/vendors/${id}/suspend`);

// User Management (Superadmin)
export const getUsersQueryFn = async () => {
  const response = await AuthAPI.get(`/admin/users`);
  return response.data;
};

export const createUserMutationFn = async (data: any) =>
  await AuthAPI.post(`/admin/users`, data);

export const deleteUserMutationFn = async (id: string) =>
  await AuthAPI.delete(`/admin/users/${id}`);

// Staff Management (Vendors)
export const getStaffQueryFn = async () => {
  const response = await AuthAPI.get(`/staff`);
  return response.data;
};

export const createStaffMutationFn = async (data: any) =>
  await AuthAPI.post(`/staff`, data);

export const deleteStaffMutationFn = async (id: string) =>
  await AuthAPI.delete(`/staff/${id}`);



