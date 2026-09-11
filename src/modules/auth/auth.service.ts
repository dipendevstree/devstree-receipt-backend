import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { IsNull, LessThan, Repository } from 'typeorm';
import { ErrorCode } from 'src/common/constants/error-codes';
import { AuditAction, AuditModule } from 'src/common/enums/audit-action.enum';
import { Permission } from 'src/common/enums/permission.enum';
import { AppException } from 'src/common/exceptions/app.exception';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { AuditLogService } from 'src/modules/audit-logs/audit-log.service';
import { FinancialUnlockService } from 'src/modules/financial/services/financial-unlock.service';
import { User } from 'src/modules/users/entities/user.entity';
import { AuthUserDto, LoginResponseDto } from './dto/auth.dto';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordService } from './services/password.service';
import { JwtPayload } from './strategies/jwt.strategy';

const MAX_FAILED_LOGINS = 8;
const LOGIN_LOCKOUT_MINUTES = 15;
const RESET_TOKEN_TTL_MINUTES = 30;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken) private readonly refreshTokens: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokens: Repository<PasswordResetToken>,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly auditLog: AuditLogService,
    private readonly financialUnlock: FinancialUnlockService,
  ) {}

  async login(
    identifier: string,
    password: string,
    context: RequestContext,
  ): Promise<LoginResponseDto> {
    const user = await this.findByIdentifier(identifier);

    // A generic failure keeps "user does not exist" and "wrong password" indistinguishable.
    const genericFailure = () =>
      AppException.unauthorized(
        ErrorCode.INVALID_CREDENTIALS,
        'The email/mobile number or password is incorrect.',
      );

    if (!user) {
      // Still spend hashing time so absent accounts are not detectable by timing.
      await this.passwordService.verify(null, password);
      throw genericFailure();
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw AppException.tooManyRequests(
        ErrorCode.TOO_MANY_REQUESTS,
        'This account is temporarily locked after repeated failed sign-in attempts.',
      );
    }

    const valid = await this.passwordService.verify(user.passwordHash, password);

    if (!valid) {
      await this.registerFailedLogin(user);
      await this.auditLog.record({
        action: AuditAction.LOGIN_FAILED,
        module: AuditModule.AUTH,
        recordId: user.id,
        description: 'Failed sign-in attempt',
        actor: { id: user.id, name: user.name },
        context,
      });
      throw genericFailure();
    }

    if (!user.isActive()) {
      throw AppException.forbidden(
        ErrorCode.ACCOUNT_INACTIVE,
        'This account is not active. Contact an administrator.',
      );
    }

    await this.users.update(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    });

    const tokens = await this.issueTokens(user, context);

    await this.auditLog.record({
      action: AuditAction.LOGIN,
      module: AuditModule.AUTH,
      recordId: user.id,
      description: 'Signed in',
      actor: { id: user.id, name: user.name },
      context,
    });

    return {
      ...tokens,
      user: this.toAuthUser(user),
    };
  }

  async refresh(refreshToken: string, context: RequestContext): Promise<LoginResponseDto> {
    const tokenHash = this.passwordService.hashToken(refreshToken);
    const stored = await this.refreshTokens.findOne({ where: { tokenHash } });

    if (!stored || !stored.isUsable()) {
      if (stored && stored.revokedAt) {
        // Reuse of a rotated token indicates theft — drop every session for that user.
        this.logger.warn(`Refresh token reuse detected for user ${stored.userId}.`);
        await this.revokeAllRefreshTokens(stored.userId);
      }

      // The 9-hour window elapsing is an ordinary end of day, not a security event.
      if (stored && stored.isSessionExpired()) {
        await this.revokeAllRefreshTokens(stored.userId);
        throw AppException.unauthorized(
          ErrorCode.SESSION_EXPIRED,
          'Your session has expired. Please log in again.',
        );
      }

      throw AppException.unauthorized(
        ErrorCode.INVALID_REFRESH_TOKEN,
        'Your session has expired. Please log in again.',
      );
    }

    const user = await this.users.findOne({
      where: { id: stored.userId },
      relations: { role: { permissions: true } },
    });

    if (!user || !user.isActive()) {
      throw AppException.unauthorized(
        ErrorCode.INVALID_REFRESH_TOKEN,
        'Your session is no longer valid.',
      );
    }

    // Rotation: the presented token is retired as the replacement is issued.
    await this.refreshTokens.update(stored.id, { revokedAt: new Date() });
    const tokens = await this.issueTokens(user, context, stored.sessionExpiresAt);

    await this.auditLog.record({
      action: AuditAction.TOKEN_REFRESHED,
      module: AuditModule.AUTH,
      recordId: user.id,
      actor: { id: user.id, name: user.name },
      context,
    });

    return { ...tokens, user: this.toAuthUser(user) };
  }

  /** Logging out always locks financial information — no grant may outlive its session. */
  async logout(
    actor: AuthenticatedUser,
    refreshToken: string | undefined,
    context: RequestContext,
  ): Promise<void> {
    if (refreshToken) {
      await this.refreshTokens.update(
        { tokenHash: this.passwordService.hashToken(refreshToken), revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    } else {
      await this.revokeAllRefreshTokens(actor.id);
    }

    await this.financialUnlock.revokeActiveSessions(actor.id);

    await this.auditLog.record({
      action: AuditAction.LOGOUT,
      module: AuditModule.AUTH,
      recordId: actor.id,
      description: 'Signed out',
      actor,
      context,
    });
  }

  /**
   * Always resolves successfully so the endpoint cannot be used to enumerate
   * accounts. In development the token is logged for the operator; a production
   * deployment wires this to the mail transport instead.
   */
  async forgotPassword(email: string, context: RequestContext): Promise<void> {
    const user = await this.users.findOne({ where: { email } });
    if (!user || !user.isActive()) return;

    const token = this.passwordService.generateToken(32);
    await this.resetTokens.insert({
      userId: user.id,
      tokenHash: this.passwordService.hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
      ipAddress: context.ipAddress,
    });

    if (!this.config.get<boolean>('app.isProduction')) {
      this.logger.warn(`[dev] Password reset token for ${email}: ${token}`);
    }

    await this.auditLog.record({
      action: AuditAction.PASSWORD_RESET_REQUESTED,
      module: AuditModule.AUTH,
      recordId: user.id,
      actor: { id: user.id, name: user.name },
      context,
    });
  }

  async resetPassword(token: string, newPassword: string, context: RequestContext): Promise<void> {
    this.passwordService.assertStrength(newPassword, 'New password');

    const stored = await this.resetTokens.findOne({
      where: { tokenHash: this.passwordService.hashToken(token), usedAt: IsNull() },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw AppException.badRequest(
        ErrorCode.UNAUTHORIZED,
        'This password reset link is invalid or has expired.',
      );
    }

    const user = await this.users.findOne({ where: { id: stored.userId } });
    if (!user) {
      throw AppException.badRequest(ErrorCode.UNAUTHORIZED, 'This password reset link is invalid.');
    }

    await this.users.update(user.id, {
      passwordHash: await this.passwordService.hash(newPassword),
      tokenVersion: user.tokenVersion + 1,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    await this.resetTokens.update(stored.id, { usedAt: new Date() });
    await this.revokeAllRefreshTokens(user.id);
    await this.financialUnlock.revokeActiveSessions(user.id);

    await this.auditLog.record({
      action: AuditAction.PASSWORD_RESET_COMPLETED,
      module: AuditModule.AUTH,
      recordId: user.id,
      actor: { id: user.id, name: user.name },
      context,
    });
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.refreshTokens.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async purgeExpiredTokens(): Promise<void> {
    const now = new Date();
    await this.refreshTokens.delete({ expiresAt: LessThan(now) });
    await this.resetTokens.delete({ expiresAt: LessThan(now) });
  }

  /**
   * Issues an access/refresh pair.
   *
   * `sessionExpiresAt` is set once at login and then passed back in unchanged on
   * every rotation, so refreshing keeps the admin signed in but can never push
   * the session past AUTH_SESSION_TIMEOUT_MINUTES from the original sign-in.
   * This is entirely separate from the financial unlock window.
   */
  private async issueTokens(
    user: User,
    context: RequestContext,
    sessionExpiresAt?: Date,
  ): Promise<Omit<LoginResponseDto, 'user'>> {
    const now = Date.now();
    const sessionEnd =
      sessionExpiresAt ??
      new Date(now + this.config.get<number>('auth.sessionTimeoutMinutes', 540) * 60_000);

    const jti = randomUUID();
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      tv: user.tokenVersion,
      jti,
    };

    // An access token must never outlive the session that authorised it.
    const configuredTtlMs = parseDuration(this.config.get<string>('jwt.expiresIn', '60m'));
    const remainingSessionMs = Math.max(sessionEnd.getTime() - now, 1000);
    const accessTtlSeconds = Math.floor(Math.min(configuredTtlMs, remainingSessionMs) / 1000);

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow<string>('jwt.secret'),
      expiresIn: accessTtlSeconds,
    });

    const refreshToken = this.passwordService.generateToken();
    const refreshTtlMs = parseDuration(this.config.get<string>('jwt.refreshExpiresIn', '7d'));

    await this.refreshTokens.insert({
      userId: user.id,
      tokenHash: this.passwordService.hashToken(refreshToken),
      // The row itself dies with the session, whichever comes first.
      expiresAt: new Date(Math.min(now + refreshTtlMs, sessionEnd.getTime())),
      sessionExpiresAt: sessionEnd,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTtlSeconds,
      sessionExpiresAt: sessionEnd,
    };
  }

  private toAuthUser(user: User): AuthUserDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role?.name ?? '',
      permissions: (user.role?.permissions ?? []).map((p) => p.name as Permission),
      hasAccountPassword: Boolean(user.accountPasswordHash),
    };
  }

  private async registerFailedLogin(user: User): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;
    const lockedUntil =
      attempts >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60_000) : null;
    await this.users.update(user.id, { failedLoginAttempts: attempts, lockedUntil });
  }

  private async findByIdentifier(identifier: string): Promise<User | null> {
    const normalized = identifier.trim().toLowerCase();
    const digitsOnly = normalized.replace(/\D/g, '');

    const query = this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .addSelect('user.accountPasswordHash')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .where('LOWER(user.email) = :email', { email: normalized });

    if (digitsOnly.length >= 6) {
      query.orWhere('user.phone = :phone', { phone: digitsOnly });
    }

    return query.getOne();
  }
}

/** Parses "15m" / "7d" / "3600" into milliseconds. */
export function parseDuration(value: string): number {
  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
  if (!match) throw new Error(`Invalid duration: ${value}`);
  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * multipliers[unit];
}
