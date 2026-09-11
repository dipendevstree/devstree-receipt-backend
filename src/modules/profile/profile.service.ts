import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { PASSWORD_HISTORY_DEPTH } from 'src/common/constants/app.constants';
import { ErrorCode } from 'src/common/constants/error-codes';
import { AuditAction, AuditModule } from 'src/common/enums/audit-action.enum';
import { PasswordType } from 'src/common/enums/password-type.enum';
import { Permission } from 'src/common/enums/permission.enum';
import { AppException } from 'src/common/exceptions/app.exception';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { AuditLogService } from 'src/modules/audit-logs/audit-log.service';
import { AuthService } from 'src/modules/auth/auth.service';
import { PasswordService } from 'src/modules/auth/services/password.service';
import { FinancialUnlockService } from 'src/modules/financial/services/financial-unlock.service';
import { PasswordHistory } from 'src/modules/users/entities/password-history.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  ProfileResponseDto,
  UpdateAccountPasswordDto,
  UpdateFinancePasswordDto,
  UpdateProfileDto,
} from './dto/profile.dto';

/**
 * Self-service for the signed-in administrator: their own profile and their own
 * two passwords.
 *
 * Every method takes the actor from the authenticated request. There is no
 * `userId` parameter anywhere in this service — a caller cannot address another
 * administrator's record through it, whatever the request body says.
 * Administering *other* users remains UsersService, behind users.* permissions.
 *
 * Password terminology (see profile.dto.ts):
 *   "account password" → users.password_hash         → sign-in
 *   "finance password" → users.account_password_hash → financial unlock
 */
@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(PasswordHistory)
    private readonly passwordHistories: Repository<PasswordHistory>,
    private readonly passwordService: PasswordService,
    private readonly authService: AuthService,
    private readonly financialUnlock: FinancialUnlockService,
    private readonly auditLog: AuditLogService,
  ) {}

  async getProfile(actor: AuthenticatedUser): Promise<ProfileResponseDto> {
    return this.toResponse(await this.loadSelf(actor.id), actor.permissions);
  }

  async updateProfile(
    dto: UpdateProfileDto,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<ProfileResponseDto> {
    const user = await this.loadSelf(actor.id);
    const before = { name: user.name, email: user.email, phone: user.phone };

    if (dto.email !== undefined && dto.email !== user.email) {
      await this.assertEmailAvailable(dto.email, user.id);
      user.email = dto.email;
    }
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone ?? null;

    await this.users.save(user);

    await this.auditLog.record({
      action: AuditAction.PROFILE_UPDATED,
      module: AuditModule.PROFILE,
      recordId: user.id,
      description: 'Updated own profile',
      oldValue: before,
      newValue: { name: user.name, email: user.email, phone: user.phone },
      actor,
      context,
    });

    return this.toResponse(await this.loadSelf(actor.id), actor.permissions);
  }

  /**
   * Sign-in password.
   *
   * Bumping `tokenVersion` invalidates every access token already minted for
   * this administrator, and the refresh tokens are revoked outright — the old
   * password can leave nothing behind that still authenticates. The financial
   * unlock grant is revoked too: it was opened by a session that no longer
   * exists.
   */
  async updateAccountPassword(
    dto: UpdateAccountPasswordDto,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw AppException.badRequest(
        ErrorCode.PASSWORDS_MUST_DIFFER,
        'New password and confirmation do not match.',
      );
    }

    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: actor.id })
      .andWhere('user.deleted_at IS NULL')
      .getOne();

    if (!user) {
      throw AppException.unauthorized(ErrorCode.UNAUTHORIZED, 'Your session is no longer valid.');
    }

    const currentValid = await this.passwordService.verify(user.passwordHash, dto.currentPassword);
    if (!currentValid) {
      throw AppException.badRequest(
        ErrorCode.CURRENT_PASSWORD_INCORRECT,
        'Current password is incorrect.',
      );
    }

    if (dto.currentPassword === dto.newPassword) {
      throw AppException.badRequest(
        ErrorCode.PASSWORD_REUSED,
        'The new password must be different from your current password.',
      );
    }

    this.passwordService.assertStrength(dto.newPassword, 'New password');
    await this.assertNotReused(actor.id, PasswordType.LOGIN, dto.newPassword);

    const newHash = await this.passwordService.hash(dto.newPassword);
    await this.users.update(actor.id, {
      passwordHash: newHash,
      tokenVersion: user.tokenVersion + 1,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    await this.recordPasswordHistory(actor.id, PasswordType.LOGIN, newHash);

    await this.authService.revokeAllRefreshTokens(actor.id);
    await this.financialUnlock.revokeActiveSessions(actor.id);

    await this.auditLog.record({
      action: AuditAction.LOGIN_PASSWORD_CHANGED,
      module: AuditModule.PROFILE,
      recordId: actor.id,
      description: 'Account (sign-in) password changed — all sessions revoked',
      actor,
      context,
    });
  }

  /**
   * Financial-unlock password.
   *
   * Changing it revokes every active unlock grant so a window opened with the
   * previous password cannot outlive it. The sign-in session is untouched: the
   * administrator stays logged in and simply has to unlock again. That is the
   * existing separation between authentication and financial access, and this
   * endpoint keeps it.
   */
  async updateFinancePassword(
    dto: UpdateFinancePasswordDto,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    if (dto.newFinancePassword !== dto.confirmFinancePassword) {
      throw AppException.badRequest(
        ErrorCode.PASSWORDS_MUST_DIFFER,
        'New finance password and confirmation do not match.',
      );
    }

    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.accountPasswordHash')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: actor.id })
      .andWhere('user.deleted_at IS NULL')
      .getOne();

    if (!user) {
      throw AppException.unauthorized(ErrorCode.UNAUTHORIZED, 'Your session is no longer valid.');
    }

    if (user.accountPasswordHash) {
      const currentValid = await this.passwordService.verify(
        user.accountPasswordHash,
        dto.currentFinancePassword ?? '',
      );
      if (!currentValid) {
        throw AppException.badRequest(
          ErrorCode.CURRENT_PASSWORD_INCORRECT,
          'Current finance password is incorrect.',
        );
      }

      if (dto.currentFinancePassword === dto.newFinancePassword) {
        throw AppException.badRequest(
          ErrorCode.PASSWORD_REUSED,
          'The new finance password must be different from your current one.',
        );
      }
    }

    this.passwordService.assertStrength(dto.newFinancePassword, 'New finance password');
    await this.assertNotReused(actor.id, PasswordType.ACCOUNT, dto.newFinancePassword);

    // The two credentials must stay genuinely independent: reusing the sign-in
    // password as the finance password would make the financial lock decorative.
    if (await this.passwordService.verify(user.passwordHash, dto.newFinancePassword)) {
      throw AppException.badRequest(
        ErrorCode.PASSWORDS_MUST_DIFFER,
        'The finance password must be different from your sign-in password.',
      );
    }

    const newHash = await this.passwordService.hash(dto.newFinancePassword);
    // Only account_password_hash is written — the sign-in credential is untouched.
    await this.users.update(actor.id, { accountPasswordHash: newHash });
    await this.recordPasswordHistory(actor.id, PasswordType.ACCOUNT, newHash);

    await this.financialUnlock.revokeActiveSessions(actor.id);

    await this.auditLog.record({
      action: AuditAction.ACCOUNT_PASSWORD_CHANGED,
      module: AuditModule.PROFILE,
      recordId: actor.id,
      description: 'Finance password changed — active financial unlock sessions revoked',
      actor,
      context,
    });
  }

  /** Loads the actor's own row, with the role and its permissions attached. */
  private async loadSelf(userId: string): Promise<User> {
    const user = await this.users
      .createQueryBuilder('user')
      // Selected so hasFinancePassword can be reported; the value never leaves
      // this service.
      .addSelect('user.accountPasswordHash')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.id = :id', { id: userId })
      .andWhere('user.deleted_at IS NULL')
      .getOne();

    if (!user) {
      throw AppException.unauthorized(ErrorCode.UNAUTHORIZED, 'Your session is no longer valid.');
    }
    return user;
  }

  private async assertEmailAvailable(email: string, selfId: string): Promise<void> {
    const existing = await this.users.findOne({
      where: { email, id: Not(selfId), deletedAt: IsNull() },
    });
    if (existing) {
      throw AppException.conflict(
        ErrorCode.DUPLICATE_EMAIL,
        'Another user already uses this email address.',
      );
    }
  }

  private async assertNotReused(
    userId: string,
    type: PasswordType,
    plaintext: string,
  ): Promise<void> {
    const history = await this.passwordHistories.find({
      where: { userId, passwordType: type },
      order: { createdAt: 'DESC' },
      take: PASSWORD_HISTORY_DEPTH,
    });

    for (const entry of history) {
      if (await this.passwordService.verify(entry.passwordHash, plaintext)) {
        throw AppException.badRequest(
          ErrorCode.PASSWORD_REUSED,
          'This password was used recently. Choose a different one.',
        );
      }
    }
  }

  private async recordPasswordHistory(
    userId: string,
    type: PasswordType,
    hash: string,
  ): Promise<void> {
    await this.passwordHistories.insert({ userId, passwordType: type, passwordHash: hash });

    const excess = await this.passwordHistories.find({
      where: { userId, passwordType: type },
      order: { createdAt: 'DESC' },
      skip: PASSWORD_HISTORY_DEPTH,
    });
    if (excess.length > 0) {
      await this.passwordHistories.delete(excess.map((entry) => entry.id));
    }
  }

  private toResponse(user: User, permissions: Permission[]): ProfileResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role?.name ?? '',
      roleDisplayName: user.role?.displayName ?? user.role?.name ?? '',
      permissions,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      hasFinancePassword: Boolean(user.accountPasswordHash),
    };
  }
}
