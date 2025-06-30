// Common API response interface
export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  errorCode?: number;
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