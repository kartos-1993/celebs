// Common API response interface
export interface IApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  errorCode?: unknown;
  errors?: unknown[];
  requestId?: string;
  timestamp?: string;
}

// Pagination response interface
export interface IPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Interface for query parameters with pagination
export interface IPaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface VerifyEmailResponse {
  user: {
    id: string;
    name: string;
    email: string;
    isEmailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}
