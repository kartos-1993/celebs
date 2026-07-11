// types.ts
import { LoaderFunction } from "react-router-dom";

export type Role = 'CUSTOMER' | 'VENDOR' | 'STAFF' | 'ADMIN' | 'SUPERADMIN';

export interface VendorProfileData {
  id: string;
  shopName: string;
  status: string;
  onboardingStep: number;
  storeLogo?: string;
  holidayMode: boolean;
  phoneNumber: string;
  shopDescription?: string;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: Role;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  vendorId?: string;
  vendorProfile?: VendorProfileData;
}

import { IApiResponse as ApiResponse } from '@celebs/shared-types';

export interface SessionData {
  id: string;
  userId: string;
  userAgent: string;
  createdAt: string;
  expiredAt: string;
  user: UserData;
}

export interface SessionResponse extends ApiResponse<SessionData> {}



export interface ProtectedLoaderData {
  user: UserData;
}

export type ProtectedLoader = LoaderFunction;
