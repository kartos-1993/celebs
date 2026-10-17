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

/**
 * What sendPaginated actually puts on the wire.
 *
 * The canonical helper keeps the rows in `data` and the counts in `meta`, which is
 * not the same shape as IPaginatedResponse above. Rather than let each client
 * re-derive it - consumers were reaching for `as unknown as { meta?: ... }` to see
 * the totals at all - the envelope is named here once.
 */
export interface IPaginatedApiResponse<T> extends IApiResponse<T[]> {
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
