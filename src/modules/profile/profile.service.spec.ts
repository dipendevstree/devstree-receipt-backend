import { ErrorCode } from 'src/common/constants/error-codes';
import { AuditAction } from 'src/common/enums/audit-action.enum';
import { PasswordType } from 'src/common/enums/password-type.enum';
import { UserStatus } from 'src/common/enums/user-status.enum';
import { AppException } from 'src/common/exceptions/app.exception';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { ProfileService } from './profile.service';

const ACTOR: AuthenticatedUser = {
  id: 'user-1',
  name: 'Test Admin',
  email: 'admin@example.com',
  phone: null,
  roleId: 'role-1',
  roleName: 'ADMIN',
  permissions: [],
  tokenId: 'token-1',
};

const CONTEXT: RequestContext = { ipAddress: '127.0.0.1', userAgent: 'jest' };

/**
 * Stored credentials for the fake user. The point of most of these tests is
 * that an operation touches exactly one of these two fields and leaves the
 * other alone.
 */
const SIGN_IN_HASH = 'hash::SignIn@2026';
const FINANCE_HASH = 'hash::Finance@2026';

describe('ProfileService', () => {
  let service: ProfileService;
  let users: {
    createQueryBuilder: jest.Mock;
    update: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };
  let passwordHistories: { find: jest.Mock; insert: jest.Mock; delete: jest.Mock };
  let passwordService: {
    verify: jest.Mock;
    hash: jest.Mock;
    assertStrength: jest.Mock;
  };
  let authService: { revokeAllRefreshTokens: jest.Mock };
  let financialUnlock: { revokeActiveSessions: jest.Mock };
  let auditLog: { record: jest.Mock };
  let stored: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: UserStatus;
    tokenVersion: number;
    passwordHash: string;
    accountPasswordHash: string | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    role: { name: string; displayName: string };
  };

  beforeEach(() => {
    stored = {
      id: 'user-1',
      name: 'Test Admin',
      email: 'admin@example.com',
      phone: '9000000001',
      status: UserStatus.ACTIVE,
      tokenVersion: 3,
      passwordHash: SIGN_IN_HASH,
      accountPasswordHash: FINANCE_HASH,
      lastLoginAt: new Date('2026-09-01T10:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-09-01T10:00:00Z'),
      role: { name: 'ADMIN', displayName: 'Administrator' },
    };

    const builder = {
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockImplementation(async () => stored),
    };

    users = {
      createQueryBuilder: jest.fn(() => builder),
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockImplementation(async (entity) => entity),
      findOne: jest.fn().mockResolvedValue(null),
    };
    passwordHistories = {
      find: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    passwordService = {
      // The fake hash format lets a test assert which plaintext was hashed.
      verify: jest.fn(async (hash: string | null, plain: string) => hash === `hash::${plain}`),
      hash: jest.fn(async (plain: string) => `hash::${plain}`),
      assertStrength: jest.fn(),
    };
    authService = { revokeAllRefreshTokens: jest.fn().mockResolvedValue(undefined) };
    financialUnlock = { revokeActiveSessions: jest.fn().mockResolvedValue(0) };
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };

    service = new ProfileService(
      users as never,
      passwordHistories as never,
      passwordService as never,
      authService as never,
      financialUnlock as never,
      auditLog as never,
    );
  });

  describe('getProfile', () => {
    it('returns the identity without either password hash', async () => {
      const profile = await service.getProfile(ACTOR);

      expect(profile).toMatchObject({
        id: 'user-1',
        email: 'admin@example.com',
        role: 'ADMIN',
        roleDisplayName: 'Administrator',
        status: UserStatus.ACTIVE,
        hasFinancePassword: true,
      });

      const serialised = JSON.stringify(profile);
      expect(serialised).not.toContain(SIGN_IN_HASH);
      expect(serialised).not.toContain(FINANCE_HASH);
      expect(serialised).not.toMatch(/passwordHash|tokenVersion/);
    });

    it('reports a missing finance password without revealing anything else', async () => {
      stored.accountPasswordHash = null;
      await expect(service.getProfile(ACTOR)).resolves.toMatchObject({
        hasFinancePassword: false,
      });
    });
  });

  describe('updateAccountPassword (sign-in credential)', () => {
    const valid = {
      currentPassword: 'SignIn@2026',
      newPassword: 'BrandNew@2026',
      confirmPassword: 'BrandNew@2026',
    };

    it('rejects a wrong current password', async () => {
      await expect(
        service.updateAccountPassword({ ...valid, currentPassword: 'Wrong@2026' }, ACTOR, CONTEXT),
      ).rejects.toMatchObject({ code: ErrorCode.CURRENT_PASSWORD_INCORRECT });
      expect(users.update).not.toHaveBeenCalled();
    });

    it('rejects a confirmation mismatch before verifying anything', async () => {
      await expect(
        service.updateAccountPassword({ ...valid, confirmPassword: 'Other@2026' }, ACTOR, CONTEXT),
      ).rejects.toMatchObject({ code: ErrorCode.PASSWORDS_MUST_DIFFER });
      expect(users.update).not.toHaveBeenCalled();
    });

    it('rejects reusing the current password', async () => {
      await expect(
        service.updateAccountPassword(
          {
            currentPassword: 'SignIn@2026',
            newPassword: 'SignIn@2026',
            confirmPassword: 'SignIn@2026',
          },
          ACTOR,
          CONTEXT,
        ),
      ).rejects.toMatchObject({ code: ErrorCode.PASSWORD_REUSED });
    });

    it('rejects a password used recently', async () => {
      passwordHistories.find.mockResolvedValue([{ passwordHash: 'hash::BrandNew@2026' }]);
      await expect(service.updateAccountPassword(valid, ACTOR, CONTEXT)).rejects.toMatchObject({
        code: ErrorCode.PASSWORD_REUSED,
      });
    });

    it('applies the project password policy to the new password', async () => {
      passwordService.assertStrength.mockImplementation(() => {
        throw AppException.badRequest(ErrorCode.WEAK_PASSWORD, 'too weak');
      });
      await expect(service.updateAccountPassword(valid, ACTOR, CONTEXT)).rejects.toMatchObject({
        code: ErrorCode.WEAK_PASSWORD,
      });
    });

    it('writes only the sign-in hash and leaves the finance hash untouched', async () => {
      await service.updateAccountPassword(valid, ACTOR, CONTEXT);

      const [, patch] = users.update.mock.calls[0];
      expect(patch.passwordHash).toBe('hash::BrandNew@2026');
      expect(patch).not.toHaveProperty('accountPasswordHash');
    });

    it('invalidates every issued token, not just the current one', async () => {
      await service.updateAccountPassword(valid, ACTOR, CONTEXT);

      const [, patch] = users.update.mock.calls[0];
      expect(patch.tokenVersion).toBe(stored.tokenVersion + 1);
      expect(authService.revokeAllRefreshTokens).toHaveBeenCalledWith('user-1');
      expect(financialUnlock.revokeActiveSessions).toHaveBeenCalledWith('user-1');
    });

    it('records history under the LOGIN password type', async () => {
      await service.updateAccountPassword(valid, ACTOR, CONTEXT);
      expect(passwordHistories.insert).toHaveBeenCalledWith(
        expect.objectContaining({ passwordType: PasswordType.LOGIN }),
      );
    });

    it('audits the change without recording the password', async () => {
      await service.updateAccountPassword(valid, ACTOR, CONTEXT);

      const entry = auditLog.record.mock.calls[0][0];
      expect(entry).toMatchObject({ action: AuditAction.LOGIN_PASSWORD_CHANGED, actor: ACTOR });
      expect(JSON.stringify(entry)).not.toContain('BrandNew@2026');
    });
  });

  describe('updateFinancePassword (financial-unlock credential)', () => {
    const valid = {
      currentFinancePassword: 'Finance@2026',
      newFinancePassword: 'NewFinance@2026',
      confirmFinancePassword: 'NewFinance@2026',
    };

    it('rejects a wrong current finance password', async () => {
      await expect(
        service.updateFinancePassword(
          { ...valid, currentFinancePassword: 'Wrong@2026' },
          ACTOR,
          CONTEXT,
        ),
      ).rejects.toMatchObject({ code: ErrorCode.CURRENT_PASSWORD_INCORRECT });
      expect(users.update).not.toHaveBeenCalled();
    });

    it('does not accept the sign-in password as the current finance password', async () => {
      await expect(
        service.updateFinancePassword(
          { ...valid, currentFinancePassword: 'SignIn@2026' },
          ACTOR,
          CONTEXT,
        ),
      ).rejects.toMatchObject({ code: ErrorCode.CURRENT_PASSWORD_INCORRECT });
    });

    it('refuses to set the finance password to the sign-in password', async () => {
      await expect(
        service.updateFinancePassword(
          {
            currentFinancePassword: 'Finance@2026',
            newFinancePassword: 'SignIn@2026',
            confirmFinancePassword: 'SignIn@2026',
          },
          ACTOR,
          CONTEXT,
        ),
      ).rejects.toMatchObject({ code: ErrorCode.PASSWORDS_MUST_DIFFER });
      expect(users.update).not.toHaveBeenCalled();
    });

    it('rejects a confirmation mismatch', async () => {
      await expect(
        service.updateFinancePassword(
          { ...valid, confirmFinancePassword: 'Different@2026' },
          ACTOR,
          CONTEXT,
        ),
      ).rejects.toMatchObject({ code: ErrorCode.PASSWORDS_MUST_DIFFER });
    });

    it('allows the first finance password to be set without a current one', async () => {
      stored.accountPasswordHash = null;

      await service.updateFinancePassword(
        {
          newFinancePassword: 'NewFinance@2026',
          confirmFinancePassword: 'NewFinance@2026',
        },
        ACTOR,
        CONTEXT,
      );

      const [, patch] = users.update.mock.calls[0];
      expect(patch.accountPasswordHash).toBe('hash::NewFinance@2026');
    });

    it('writes only the finance hash and leaves the sign-in credential untouched', async () => {
      await service.updateFinancePassword(valid, ACTOR, CONTEXT);

      const [, patch] = users.update.mock.calls[0];
      expect(patch).toEqual({ accountPasswordHash: 'hash::NewFinance@2026' });
      expect(patch).not.toHaveProperty('passwordHash');
      expect(patch).not.toHaveProperty('tokenVersion');
    });

    it('revokes financial unlock sessions but never the login session', async () => {
      await service.updateFinancePassword(valid, ACTOR, CONTEXT);

      expect(financialUnlock.revokeActiveSessions).toHaveBeenCalledWith('user-1');
      // Changing the finance password must not sign the administrator out.
      expect(authService.revokeAllRefreshTokens).not.toHaveBeenCalled();
    });

    it('records history under the ACCOUNT password type, separate from LOGIN', async () => {
      await service.updateFinancePassword(valid, ACTOR, CONTEXT);
      expect(passwordHistories.insert).toHaveBeenCalledWith(
        expect.objectContaining({ passwordType: PasswordType.ACCOUNT }),
      );
    });

    it('audits the change without recording the password', async () => {
      await service.updateFinancePassword(valid, ACTOR, CONTEXT);

      const entry = auditLog.record.mock.calls[0][0];
      expect(entry).toMatchObject({ action: AuditAction.ACCOUNT_PASSWORD_CHANGED, actor: ACTOR });
      expect(JSON.stringify(entry)).not.toContain('NewFinance@2026');
    });
  });

  describe('updateProfile', () => {
    it('updates the caller’s own record and audits it', async () => {
      await service.updateProfile({ name: 'Renamed', phone: '9111111111' }, ACTOR, CONTEXT);

      expect(users.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1', name: 'Renamed', phone: '9111111111' }),
      );
      expect(auditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.PROFILE_UPDATED, actor: ACTOR }),
      );
    });

    it('refuses an email address another user already holds', async () => {
      users.findOne.mockResolvedValue({ id: 'someone-else' });

      await expect(
        service.updateProfile({ email: 'taken@example.com' }, ACTOR, CONTEXT),
      ).rejects.toMatchObject({ code: ErrorCode.DUPLICATE_EMAIL });
      expect(users.save).not.toHaveBeenCalled();
    });
  });
});
