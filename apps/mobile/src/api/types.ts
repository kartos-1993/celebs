export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
}

export interface ApiError {
  message: string;
  statusCode?: number;
  code?: string;
  errors?: Record<string, string[]> | unknown;
}
