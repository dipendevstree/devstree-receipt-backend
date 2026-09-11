import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { FinancialUnlockService } from 'src/modules/financial/services/financial-unlock.service';
import { FINANCIAL_UNLOCK_HEADER } from '../constants/app.constants';
import { ErrorCode } from '../constants/error-codes';
import { FINANCIAL_UNLOCK_REQUIRED_KEY } from '../decorators/financial-unlock.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppException } from '../exceptions/app.exception';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Runs on every authenticated request and is the ONLY place that decides whether
 * decrypted amounts may leave the API.
 *
 * It resolves the presented unlock token against the database and attaches the
 * verdict to the request. Routes decorated with @RequireFinancialUnlock() are
 * rejected outright when locked; every other route receives masked data because
 * mappers read `request.financialAccess`, never a client-supplied flag.
 */
@Injectable()
export class FinancialUnlockGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly unlockService: FinancialUnlockService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    request.financialAccess = { unlocked: false };

    const required = this.reflector.getAllAndOverride<boolean>(FINANCIAL_UNLOCK_REQUIRED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (user) {
      const header = request.headers[FINANCIAL_UNLOCK_HEADER];
      const token = Array.isArray(header) ? header[0] : header;
      const session = await this.unlockService.resolveSession(user.id, token);

      if (session) {
        request.financialAccess = {
          unlocked: true,
          sessionId: session.id,
          expiresAt: session.expiresAt,
        };
      }
    }

    if (required && !request.financialAccess.unlocked) {
      throw AppException.forbidden(
        ErrorCode.FINANCIAL_LOCKED,
        'Financial information is locked. Please unlock financial information to continue.',
      );
    }

    return true;
  }
}
