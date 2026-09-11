import { ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { FinancialAccessContext } from '../interfaces/authenticated-user.interface';

export const FINANCIAL_UNLOCK_REQUIRED_KEY = 'financialUnlockRequired';

/**
 * Hard requirement: the route is rejected with FINANCIAL_LOCKED unless the caller
 * presents a valid, unexpired unlock session. Used by receipts, exports and reports.
 */
export const RequireFinancialUnlock = () => SetMetadata(FINANCIAL_UNLOCK_REQUIRED_KEY, true);

/**
 * Soft access: routes that return masked data when locked read this to decide
 * whether decrypted amounts may be included in the response.
 */
export const FinancialAccess = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return (request.financialAccess ?? { unlocked: false }) as FinancialAccessContext;
});
