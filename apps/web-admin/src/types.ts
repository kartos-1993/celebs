import { LoaderFunction } from 'react-router-dom';
import {
  IApiResponse as ApiResponse,
  Role,
  UserData,
  VendorProfileData,
} from '@celebs/shared-types';

export type { Role, UserData, VendorProfileData };

export interface SessionData {
  id: string;
  userId: string;
  userAgent: string;
  createdAt: string;
  expiredAt: string;
  user: UserData;
}

export type SessionResponse = ApiResponse<SessionData>;

export interface ProtectedLoaderData {
  user: UserData;
}

export type ProtectedLoader = LoaderFunction;
