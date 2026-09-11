import { Permission } from '../enums/permission.enum';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  roleId: string;
  roleName: string;
  permissions: Permission[];
  tokenId: string;
}

export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
}

/** Populated by FinancialUnlockGuard when a valid unlock session is presented. */
export interface FinancialAccessContext {
  unlocked: boolean;
  sessionId?: string;
  expiresAt?: Date;
}

declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
    financialAccess?: FinancialAccessContext;
  }
}
