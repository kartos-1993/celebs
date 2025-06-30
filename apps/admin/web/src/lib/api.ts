import {AuthAPI} from "./axios-client";
import { SessionResponse } from "../types";

type loginType = { email: string; password: string };

type registerType = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type verifyEmailType = { code: string };
type forgotPasswordType = { email: string };
type resetPasswordType = { password: string; verificationCode: string };
type verifyMFAType = { code: string; secretKey: string };
type mfaLoginType = { code: string; email: string };
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

export const registerMutationFn = async (data: registerType) =>
  await AuthAPI.post(`/auth/register`, data);

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



