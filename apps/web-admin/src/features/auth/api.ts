import { axiosClient } from '@/lib/axios/axios-client';
import type {
  loginType,
  registerType,
  verifyEmailType,
  resetPasswordType,
  verifyMFAType,
  mfaLoginType,
  setupSuperadminType,
  vendorRegisterType,
} from '@celebs/shared-types';

export interface ForgotPasswordPayload {
  email: string;
}

export interface MfaSetupResponse {
  message: string;
  secret: string;
  qrImageUrl: string;
}

export async function login(data: loginType) {
  return await axiosClient.post('/auth/login', data);
}

export async function setupSuperadmin(data: setupSuperadminType) {
  return await axiosClient.post('/auth/setup-superadmin', data);
}

export async function getSetupStatus() {
  const response = await axiosClient.get('/auth/setup-status');
  return response.data;
}

export async function register(data: registerType) {
  return await axiosClient.post('/auth/register', data);
}

export async function registerVendor(data: vendorRegisterType) {
  return await axiosClient.post('/auth/vendor/register', data);
}

export async function verifyEmail(data: verifyEmailType) {
  return await axiosClient.post('/auth/verify-email', data);
}

export async function forgotPassword(data: ForgotPasswordPayload) {
  return await axiosClient.post('/auth/password-forgot', data);
}

export async function resetPassword(data: resetPasswordType) {
  return await axiosClient.post('/auth/password-reset', data);
}

export async function verifyMFA(data: verifyMFAType) {
  return await axiosClient.post('/mfa/verify', data);
}

export async function verifyMFALogin(data: mfaLoginType) {
  return await axiosClient.post('/mfa/verify-login', data);
}

export async function logout() {
  return await axiosClient.post('/auth/logout');
}

export async function getMFASetup() {
  const response = await axiosClient.get<MfaSetupResponse>('/mfa/setup');
  return response.data;
}

export async function revokeMFA() {
  return await axiosClient.put('/mfa/revoke', {});
}
