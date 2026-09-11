import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';

export const SKIP_RESPONSE_ENVELOPE = 'skipResponseEnvelope';

interface Envelope<T> {
  success: true;
  data: T;
}

/**
 * Wraps every controller return value in `{ success: true, data }`.
 * File/stream endpoints opt out with @RawResponse().
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Envelope<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<Envelope<T> | T> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_ENVELOPE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) return next.handle();

    return next.handle().pipe(map((data: T) => ({ success: true as const, data })));
  }
}
