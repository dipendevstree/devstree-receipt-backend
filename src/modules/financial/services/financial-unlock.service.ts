import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, LessThan, MoreThan, Repository } from 'typeorm';
import { ErrorCode } from 'src/common/constants/error-codes';
import { AuditAction, AuditModule } from 'src/common/enums/audit-action.enum';
import { AppException } from 'src/common/exceptions/app.exception';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { AuditLogService } from 'src/modules/audit-logs/audit-log.service';
import { PasswordService } from 'src/modules/auth/services/password.service';
import { User } from 'src/modules/users/entities/user.entity';
import { FinancialUnlockAttempt } from '../entities/financial-unlock-attempt.entity';
import { FinancialUnlockSession } from '../entities/financial-unlock-session.entity';

export interface UnlockResult {
  token: string;
  expiresAt: Date;
  expiresInSeconds: number;
}

export interface FinancialStatus {
  unlocked: boolean;
  expiresAt: Date | null;
  expiresInSeconds: number;
  unlockDurationMinutes: number;
}

/**
 * Owns the temporary grant that allows decrypted amounts to leave the API.
 *
 * Security properties:
 *  - The account password is verified against an Argon2id hash; it is never stored,
 *    logged, echoed, or used as key material.
 *  - The issued token is returned once and persisted only as a SHA-256 digest.
 *  - Grants expire on a wall clock, and are revoked on logout, manual lock and
 *    any account-password change.
 *  - Repeated failures are throttled per user and recorded for audit.
 */
@Injectable()
export class FinancialUnlockService {
  private readonly logger = new Logger(FinancialUnlockService.name);

  constructor(
    @InjectRepository(FinancialUnlockSession)
    private readonly sessions: Repository<FinancialUnlockSession>,
    @InjectRepository(FinancialUnlockAttempt)
    private readonly attempts: Repository<FinancialUnlockAttempt>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly passwordService: PasswordService,
    private readonly auditLog: AuditLogService,
    private readonly config: ConfigService,
  ) {}

  private get unlockMinutes(): number {
    return this.config.get<number>('financial.unlockMinutes', 15);
  }

  private get maxAttempts(): number {
    return this.config.get<number>('financial.maxUnlockAttempts', 5);
  }

  private get lockoutMinutes(): number {
    return this.config.get<number>('financial.lockoutMinutes', 15);
  }

  async unlock(
    actor: AuthenticatedUser,
    accountPassword: string,
    context: RequestContext,
  ): Promise<UnlockResult> {
    await this.assertNotThrottled(actor.id);

    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.accountPasswordHash')
      .where('user.id = :id', { id: actor.id })
      .getOne();

    if (!user) {
      throw AppException.unauthorized(ErrorCode.UNAUTHORIZED, 'Session is no longer valid.');
    }

    if (!user.accountPasswordHash) {
      throw AppException.badRequest(
        ErrorCode.ACCOUNT_PASSWORD_NOT_SET,
        'No account password is configured. Set one in Settings before unlocking financial information.',
      );
    }

    const valid = await this.passwordService.verify(user.accountPasswordHash, accountPassword);

    if (!valid) {
      await this.attempts.insert({
        userId: actor.id,
        successful: false,
        ipAddress: context.ipAddress,
      });
      await this.auditLog.record({
        action: AuditAction.FINANCIAL_UNLOCK_FAILED,
        module: AuditModule.FINANCIAL,
        recordId: actor.id,
        description: 'Failed financial unlock attempt',
        actor,
        context,
      });
      throw AppException.unauthorized(
        ErrorCode.INVALID_ACCOUNT_PASSWORD,
        'Invalid account password',
      );
    }

    // A successful unlock supersedes any earlier grant for this user.
    await this.revokeActiveSessions(actor.id);

    const token = this.passwordService.generateToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.unlockMinutes * 60_000);

    await this.sessions.insert({
      userId: actor.id,
      sessionTokenHash: this.passwordService.hashToken(token),
      authTokenId: actor.tokenId ?? null,
      unlockedAt: now,
      expiresAt,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    await this.attempts.insert({
      userId: actor.id,
      successful: true,
      ipAddress: context.ipAddress,
    });

    await this.auditLog.record({
      action: AuditAction.FINANCIAL_UNLOCKED,
      module: AuditModule.FINANCIAL,
      recordId: actor.id,
      description: `Financial information unlocked for ${this.unlockMinutes} minutes`,
      actor,
      context,
    });

    return {
      token,
      expiresAt,
      expiresInSeconds: Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
    };
  }

  async lock(actor: AuthenticatedUser, context: RequestContext): Promise<void> {
    const revoked = await this.revokeActiveSessions(actor.id);
    if (revoked > 0) {
      await this.auditLog.record({
        action: AuditAction.FINANCIAL_LOCKED,
        module: AuditModule.FINANCIAL,
        recordId: actor.id,
        description: 'Financial information locked',
        actor,
        context,
      });
    }
  }

  /**
   * Resolves a presented token to an active grant. Returns null for every
   * failure mode — missing, unknown, expired, revoked or belonging to another
   * user — so a caller can never distinguish between them.
   */
  async resolveSession(
    userId: string,
    token: string | undefined | null,
  ): Promise<FinancialUnlockSession | null> {
    if (!token) return null;

    const session = await this.sessions.findOne({
      where: {
        sessionTokenHash: this.passwordService.hashToken(token),
        userId,
        lockedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });

    return session ?? null;
  }

  async status(userId: string, token: string | undefined | null): Promise<FinancialStatus> {
    const session = await this.resolveSession(userId, token);
    if (!session) {
      return {
        unlocked: false,
        expiresAt: null,
        expiresInSeconds: 0,
        unlockDurationMinutes: this.unlockMinutes,
      };
    }

    return {
      unlocked: true,
      expiresAt: session.expiresAt,
      expiresInSeconds: Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)),
      unlockDurationMinutes: this.unlockMinutes,
    };
  }

  /** Called on logout, account-password change and user deactivation. */
  async revokeActiveSessions(userId: string, manager?: EntityManager): Promise<number> {
    const repository = manager ? manager.getRepository(FinancialUnlockSession) : this.sessions;
    const result = await repository.update(
      { userId, lockedAt: IsNull() },
      { lockedAt: new Date() },
    );
    return result.affected ?? 0;
  }

  /** Housekeeping for expired rows; safe to call from a scheduled job. */
  async purgeExpired(olderThanDays = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);
    const result = await this.sessions.delete({ expiresAt: LessThan(cutoff) });
    return result.affected ?? 0;
  }

  private async assertNotThrottled(userId: string): Promise<void> {
    const since = new Date(Date.now() - this.lockoutMinutes * 60_000);

    const recentFailures = await this.attempts.count({
      where: { userId, successful: false, createdAt: MoreThan(since) },
    });

    if (recentFailures >= this.maxAttempts) {
      this.logger.warn(
        `Financial unlock throttled for user ${userId} after ${recentFailures} failures.`,
      );
      throw AppException.tooManyRequests(
        ErrorCode.FINANCIAL_UNLOCK_THROTTLED,
        `Too many failed unlock attempts. Try again in ${this.lockoutMinutes} minutes.`,
        this.lockoutMinutes * 60,
      );
    }
  }
}
