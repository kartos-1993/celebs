import { IApiResponse as ApiResponse, UserData } from '@celebs/shared-types';

export type { UserData };

export interface SessionData {
  id: string;
  userId: string;
  userAgent: string;
  createdAt: string;
  expiredAt: string;
  user: UserData;
}

export type SessionResponse = ApiResponse<SessionData>;
