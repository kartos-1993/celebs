import { ErrorCode } from '../enums/error-code.enum';

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
