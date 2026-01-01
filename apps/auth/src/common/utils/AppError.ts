import { HTTPSTATUS, HttpStatusCode } from '../../config/http.config';
import { ErrorCode } from '../enums/error-code.enum';

export class AppError extends Error {
  public statusCode: HttpStatusCode;
  public errorCode?: ErrorCode;
  constructor(
    message: string,
    statuscode = HTTPSTATUS.INTERNAL_SERVER_ERROR,
    errorCode?: ErrorCode
  ) {
    super(message);
    this.statusCode = statuscode;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
