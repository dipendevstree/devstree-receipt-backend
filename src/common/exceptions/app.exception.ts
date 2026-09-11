import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';

/**
 * Every deliberate failure in the application is raised as an AppException so the
 * global filter can emit a stable `{ success, message, code }` envelope without
 * leaking internals.
 */
export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }

  static notFound(code: ErrorCode, message: string): AppException {
    return new AppException(code, message, HttpStatus.NOT_FOUND);
  }

  static forbidden(code: ErrorCode, message: string): AppException {
    return new AppException(code, message, HttpStatus.FORBIDDEN);
  }

  static unauthorized(code: ErrorCode, message: string): AppException {
    return new AppException(code, message, HttpStatus.UNAUTHORIZED);
  }

  static conflict(code: ErrorCode, message: string): AppException {
    return new AppException(code, message, HttpStatus.CONFLICT);
  }

  static badRequest(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ): AppException {
    return new AppException(code, message, HttpStatus.BAD_REQUEST, details);
  }

  static tooManyRequests(
    code: ErrorCode,
    message: string,
    retryAfterSeconds?: number,
  ): AppException {
    return new AppException(code, message, HttpStatus.TOO_MANY_REQUESTS, { retryAfterSeconds });
  }
}
