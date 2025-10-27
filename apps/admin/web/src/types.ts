// types.ts
import { LoaderFunction } from "react-router-dom";

export interface UserData {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

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
  user: SessionData;
}

export type ProtectedLoader = LoaderFunction;
