import { ErrorCode } from '../enums/error-code.enum';
import { HTTPSTATUS, HttpStatusCode } from '../config/http.config';
import { AppError } from './AppError';

export class NotFoundException extends AppError {
  constructor(message = 'Resource not found', errorCode?: ErrorCode) {
    super(message, HTTPSTATUS.NOT_FOUND, errorCode || ErrorCode.RESOURCE_NOT_FOUND);
  }
}

export class BadRequestException extends AppError {
  constructor(message = 'Bad Request', errorCode?: ErrorCode) {
    super(message, HTTPSTATUS.BAD_REQUEST, errorCode || ErrorCode.INVALID_REQUEST);
  }
}

export class UnauthorizedException extends AppError {
  constructor(message = 'Unauthorized Access', errorCode?: ErrorCode) {
    super(message, HTTPSTATUS.UNAUTHORIZED, errorCode || ErrorCode.ACCESS_UNAUTHORIZED);
  }
}

export class ForbiddenException extends AppError {
  constructor(message = 'Forbidden Access', errorCode?: ErrorCode) {
    super(message, HTTPSTATUS.FORBIDDEN, errorCode || ErrorCode.FORBIDDEN_ACCESS);
  }
}

export class InternalServerException extends AppError {
  constructor(message = 'Internal Server Error', errorCode?: ErrorCode) {
    super(message, HTTPSTATUS.INTERNAL_SERVER_ERROR, errorCode || ErrorCode.INTERNAL_SERVER_ERROR);
  }
}

export class TooManyRequestsException extends AppError {
  constructor(message = 'Too many requests', errorCode?: ErrorCode) {
    super(message, HTTPSTATUS.TOO_MANY_REQUESTS, errorCode);
  }
}

export class HttpException extends AppError {
  constructor(arg1: any, arg2?: any, arg3?: any) {
    let statusCode: HttpStatusCode;
    let message: string;
    let errorCode: ErrorCode | undefined;

    if (typeof arg1 === 'number') {
      // (statusCode, message, errorCode) signature
      statusCode = arg1;
      message = arg2 || 'Http Exception Error';
      errorCode = arg3;
    } else {
      // (message, statusCode, errorCode) signature
      message = arg1 || 'Http Exception Error';
      statusCode = arg2 || HTTPSTATUS.INTERNAL_SERVER_ERROR;
      errorCode = arg3;
    }

    super(message, statusCode, errorCode);
  }
}
