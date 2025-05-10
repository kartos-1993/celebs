import { HTTPSTATUS, HttpStatusCode } from '../../config/http.config';
import { ErrorCode } from '../enums/error-code.enum';
import { AppError } from './AppError';

export class NotFoundException extends AppError {
  constructor(message = 'Resource Not Found', errorCode?: ErrorCode) {
    super(
      message,
      HTTPSTATUS.NOT_FOUND,
      errorCode || ErrorCode.RESOURCE_NOT_FOUND
    );
  }
}

export class BadRequestException extends AppError {
  constructor(message = 'BadRequest', errorCode?: ErrorCode) {
    super(message, HTTPSTATUS.BAD_REQUEST, errorCode);
  }
}

export class UnauthorizedException extends AppError {
  constructor(message = 'Unauthorized Access', errorCode?: ErrorCode) {
    super(
      message,
      HTTPSTATUS.UNAUTHORIZED,
      errorCode || ErrorCode.ACCESS_UNAUTHORIZED
    );
  }
}
