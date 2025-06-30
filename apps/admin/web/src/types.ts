// types.ts
import { LoaderFunction } from "react-router-dom";

export interface User {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  password?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface SessionResponse extends ApiResponse<SessionData> {}

export interface SessionData {
  id: string;
  userId: string;
  userAgent: string;
  createdAt: string;
  expiredAt: string;
  user: User;
}

export interface ProtectedLoaderData {
  user: User;
}

export type ProtectedLoader = LoaderFunction;
