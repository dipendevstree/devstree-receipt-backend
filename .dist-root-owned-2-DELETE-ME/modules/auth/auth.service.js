"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
exports.parseDuration = parseDuration;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const error_codes_1 = require("../../common/constants/error-codes");
const audit_action_enum_1 = require("../../common/enums/audit-action.enum");
const app_exception_1 = require("../../common/exceptions/app.exception");
const audit_log_service_1 = require("../audit-logs/audit-log.service");
const financial_unlock_service_1 = require("../financial/services/financial-unlock.service");
const user_entity_1 = require("../users/entities/user.entity");
const password_reset_token_entity_1 = require("./entities/password-reset-token.entity");
const refresh_token_entity_1 = require("./entities/refresh-token.entity");
const password_service_1 = require("./services/password.service");
const MAX_FAILED_LOGINS = 8;
const LOGIN_LOCKOUT_MINUTES = 15;
const RESET_TOKEN_TTL_MINUTES = 30;
let AuthService = AuthService_1 = class AuthService {
    users;
    refreshTokens;
    resetTokens;
    passwordService;
    jwtService;
    config;
    auditLog;
    financialUnlock;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(users, refreshTokens, resetTokens, passwordService, jwtService, config, auditLog, financialUnlock) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.resetTokens = resetTokens;
        this.passwordService = passwordService;
        this.jwtService = jwtService;
        this.config = config;
        this.auditLog = auditLog;
        this.financialUnlock = financialUnlock;
    }
    async login(identifier, password, context) {
        const user = await this.findByIdentifier(identifier);
        const genericFailure = () => app_exception_1.AppException.unauthorized(error_codes_1.ErrorCode.INVALID_CREDENTIALS, 'The email/mobile number or password is incorrect.');
        if (!user) {
            await this.passwordService.verify(null, password);
            throw genericFailure();
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            throw app_exception_1.AppException.tooManyRequests(error_codes_1.ErrorCode.TOO_MANY_REQUESTS, 'This account is temporarily locked after repeated failed sign-in attempts.');
        }
        const valid = await this.passwordService.verify(user.passwordHash, password);
        if (!valid) {
            await this.registerFailedLogin(user);
            await this.auditLog.record({
                action: audit_action_enum_1.AuditAction.LOGIN_FAILED,
                module: audit_action_enum_1.AuditModule.AUTH,
                recordId: user.id,
                description: 'Failed sign-in attempt',
                actor: { id: user.id, name: user.name },
                context,
            });
            throw genericFailure();
        }
        if (!user.isActive()) {
            throw app_exception_1.AppException.forbidden(error_codes_1.ErrorCode.ACCOUNT_INACTIVE, 'This account is not active. Contact an administrator.');
        }
        await this.users.update(user.id, {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
        });
        const tokens = await this.issueTokens(user, context);
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.LOGIN,
            module: audit_action_enum_1.AuditModule.AUTH,
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
    async refresh(refreshToken, context) {
        const tokenHash = this.passwordService.hashToken(refreshToken);
        const stored = await this.refreshTokens.findOne({ where: { tokenHash } });
        if (!stored || !stored.isUsable()) {
            if (stored && stored.revokedAt) {
                this.logger.warn(`Refresh token reuse detected for user ${stored.userId}.`);
                await this.revokeAllRefreshTokens(stored.userId);
            }
            throw app_exception_1.AppException.unauthorized(error_codes_1.ErrorCode.INVALID_REFRESH_TOKEN, 'Your session has expired. Please sign in again.');
        }
        const user = await this.users.findOne({
            where: { id: stored.userId },
            relations: { role: { permissions: true } },
        });
        if (!user || !user.isActive()) {
            throw app_exception_1.AppException.unauthorized(error_codes_1.ErrorCode.INVALID_REFRESH_TOKEN, 'Your session is no longer valid.');
        }
        await this.refreshTokens.update(stored.id, { revokedAt: new Date() });
        const tokens = await this.issueTokens(user, context);
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.TOKEN_REFRESHED,
            module: audit_action_enum_1.AuditModule.AUTH,
            recordId: user.id,
            actor: { id: user.id, name: user.name },
            context,
        });
        return { ...tokens, user: this.toAuthUser(user) };
    }
    async logout(actor, refreshToken, context) {
        if (refreshToken) {
            await this.refreshTokens.update({ tokenHash: this.passwordService.hashToken(refreshToken), revokedAt: (0, typeorm_2.IsNull)() }, { revokedAt: new Date() });
        }
        else {
            await this.revokeAllRefreshTokens(actor.id);
        }
        await this.financialUnlock.revokeActiveSessions(actor.id);
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.LOGOUT,
            module: audit_action_enum_1.AuditModule.AUTH,
            recordId: actor.id,
            description: 'Signed out',
            actor,
            context,
        });
    }
    async forgotPassword(email, context) {
        const user = await this.users.findOne({ where: { email } });
        if (!user || !user.isActive())
            return;
        const token = this.passwordService.generateToken(32);
        await this.resetTokens.insert({
            userId: user.id,
            tokenHash: this.passwordService.hashToken(token),
            expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
            ipAddress: context.ipAddress,
        });
        if (!this.config.get('app.isProduction')) {
            this.logger.warn(`[dev] Password reset token for ${email}: ${token}`);
        }
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.PASSWORD_RESET_REQUESTED,
            module: audit_action_enum_1.AuditModule.AUTH,
            recordId: user.id,
            actor: { id: user.id, name: user.name },
            context,
        });
    }
    async resetPassword(token, newPassword, context) {
        this.passwordService.assertStrength(newPassword, 'New password');
        const stored = await this.resetTokens.findOne({
            where: { tokenHash: this.passwordService.hashToken(token), usedAt: (0, typeorm_2.IsNull)() },
        });
        if (!stored || stored.expiresAt < new Date()) {
            throw app_exception_1.AppException.badRequest(error_codes_1.ErrorCode.UNAUTHORIZED, 'This password reset link is invalid or has expired.');
        }
        const user = await this.users.findOne({ where: { id: stored.userId } });
        if (!user) {
            throw app_exception_1.AppException.badRequest(error_codes_1.ErrorCode.UNAUTHORIZED, 'This password reset link is invalid.');
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
            action: audit_action_enum_1.AuditAction.PASSWORD_RESET_COMPLETED,
            module: audit_action_enum_1.AuditModule.AUTH,
            recordId: user.id,
            actor: { id: user.id, name: user.name },
            context,
        });
    }
    async revokeAllRefreshTokens(userId) {
        await this.refreshTokens.update({ userId, revokedAt: (0, typeorm_2.IsNull)() }, { revokedAt: new Date() });
    }
    async purgeExpiredTokens() {
        const now = new Date();
        await this.refreshTokens.delete({ expiresAt: (0, typeorm_2.LessThan)(now) });
        await this.resetTokens.delete({ expiresAt: (0, typeorm_2.LessThan)(now) });
    }
    async issueTokens(user, context) {
        const jti = (0, crypto_1.randomUUID)();
        const payload = {
            sub: user.id,
            email: user.email,
            roleId: user.roleId,
            tv: user.tokenVersion,
            jti,
        };
        const expiresIn = this.config.get('jwt.expiresIn', '15m');
        const accessToken = await this.jwtService.signAsync(payload, {
            secret: this.config.getOrThrow('jwt.secret'),
            expiresIn,
        });
        const refreshToken = this.passwordService.generateToken();
        const refreshTtlMs = parseDuration(this.config.get('jwt.refreshExpiresIn', '7d'));
        await this.refreshTokens.insert({
            userId: user.id,
            tokenHash: this.passwordService.hashToken(refreshToken),
            expiresAt: new Date(Date.now() + refreshTtlMs),
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
        });
        return {
            accessToken,
            refreshToken,
            expiresIn: Math.floor(parseDuration(expiresIn) / 1000),
        };
    }
    toAuthUser(user) {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role?.name ?? '',
            permissions: (user.role?.permissions ?? []).map((p) => p.name),
            hasAccountPassword: Boolean(user.accountPasswordHash),
        };
    }
    async registerFailedLogin(user) {
        const attempts = user.failedLoginAttempts + 1;
        const lockedUntil = attempts >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60_000) : null;
        await this.users.update(user.id, { failedLoginAttempts: attempts, lockedUntil });
    }
    async findByIdentifier(identifier) {
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __param(2, (0, typeorm_1.InjectRepository)(password_reset_token_entity_1.PasswordResetToken)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        password_service_1.PasswordService,
        jwt_1.JwtService,
        config_1.ConfigService,
        audit_log_service_1.AuditLogService,
        financial_unlock_service_1.FinancialUnlockService])
], AuthService);
function parseDuration(value) {
    const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
    if (!match)
        throw new Error(`Invalid duration: ${value}`);
    const amount = Number(match[1]);
    const unit = match[2] ?? 's';
    const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return amount * multipliers[unit];
}
//# sourceMappingURL=auth.service.js.map