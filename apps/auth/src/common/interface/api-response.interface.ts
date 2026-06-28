import { ErrorCode } from '@celebs/shared-utils';

export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
  errorCode?: ErrorCode;
}
