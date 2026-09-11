import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ErrorCode } from '../constants/error-codes';
import { AppException } from '../exceptions/app.exception';

interface ErrorBody {
  success: false;
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly config: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isProduction = this.config.get<boolean>('app.isProduction') ?? false;

    const { status, body } = this.resolve(exception, isProduction);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // Log the cause server-side only; the client gets a generic message.
      this.logger.error(
        `${request.method} ${request.url} → ${status} ${body.code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
      this.logger.warn(`${request.method} ${request.url} → ${status} ${body.code}`);
    }

    response.status(status).json(body);
  }

  private resolve(exception: unknown, isProduction: boolean): { status: number; body: ErrorBody } {
    if (exception instanceof AppException) {
      const payload = exception.getResponse() as {
        code: ErrorCode;
        message: string;
        details?: Record<string, unknown>;
      };
      return {
        status: exception.getStatus(),
        body: {
          success: false,
          message: payload.message,
          code: payload.code,
          ...(payload.details ? { details: payload.details } : {}),
        },
      };
    }

    if (exception instanceof ThrottlerException) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        body: {
          success: false,
          message: 'Too many requests. Please slow down and try again shortly.',
          code: ErrorCode.TOO_MANY_REQUESTS,
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      return { status, body: this.fromHttpException(status, raw) };
    }

    if (exception instanceof QueryFailedError) {
      const driverCode = (exception as QueryFailedError & { code?: string }).code;
      if (driverCode === PG_UNIQUE_VIOLATION) {
        return {
          status: HttpStatus.CONFLICT,
          body: {
            success: false,
            message: 'A record with these details already exists.',
            code: ErrorCode.CONFLICT,
          },
        };
      }
      if (driverCode === PG_FOREIGN_KEY_VIOLATION) {
        return {
          status: HttpStatus.CONFLICT,
          body: {
            success: false,
            message: 'This record is referenced by other data and cannot be modified.',
            code: ErrorCode.CONFLICT,
          },
        };
      }
      // Never surface SQL text or column names to the client.
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          success: false,
          message: 'A database error occurred.',
          code: ErrorCode.INTERNAL_ERROR,
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        message: isProduction
          ? 'An unexpected error occurred.'
          : exception instanceof Error
            ? exception.message
            : 'An unexpected error occurred.',
        code: ErrorCode.INTERNAL_ERROR,
      },
    };
  }

  private fromHttpException(status: number, raw: unknown): ErrorBody {
    if (typeof raw === 'string') {
      return { success: false, message: raw, code: this.codeForStatus(status) };
    }

    const payload = (raw ?? {}) as {
      message?: string | string[];
      error?: string;
      code?: string;
      details?: Record<string, unknown>;
    };

    // ValidationPipe delivers an array of constraint messages.
    if (Array.isArray(payload.message)) {
      return {
        success: false,
        message: payload.message[0] ?? 'Validation failed.',
        code: ErrorCode.VALIDATION_FAILED,
        details: { errors: payload.message },
      };
    }

    return {
      success: false,
      message: payload.message ?? payload.error ?? 'Request failed.',
      code: payload.code ?? this.codeForStatus(status),
      ...(payload.details ? { details: payload.details } : {}),
    };
  }

  private codeForStatus(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_FAILED;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.TOO_MANY_REQUESTS;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
