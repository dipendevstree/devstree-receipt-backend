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
var FinancialUnlockService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialUnlockService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const error_codes_1 = require("../../../common/constants/error-codes");
const audit_action_enum_1 = require("../../../common/enums/audit-action.enum");
const app_exception_1 = require("../../../common/exceptions/app.exception");
const audit_log_service_1 = require("../../audit-logs/audit-log.service");
const password_service_1 = require("../../auth/services/password.service");
const user_entity_1 = require("../../users/entities/user.entity");
const financial_unlock_attempt_entity_1 = require("../entities/financial-unlock-attempt.entity");
const financial_unlock_session_entity_1 = require("../entities/financial-unlock-session.entity");
let FinancialUnlockService = FinancialUnlockService_1 = class FinancialUnlockService {
    sessions;
    attempts;
    users;
    passwordService;
    auditLog;
    config;
    logger = new common_1.Logger(FinancialUnlockService_1.name);
    constructor(sessions, attempts, users, passwordService, auditLog, config) {
        this.sessions = sessions;
        this.attempts = attempts;
        this.users = users;
        this.passwordService = passwordService;
        this.auditLog = auditLog;
        this.config = config;
    }
    get unlockMinutes() {
        return this.config.get('financial.unlockMinutes', 15);
    }
    get maxAttempts() {
        return this.config.get('financial.maxUnlockAttempts', 5);
    }
    get lockoutMinutes() {
        return this.config.get('financial.lockoutMinutes', 15);
    }
    async unlock(actor, accountPassword, context) {
        await this.assertNotThrottled(actor.id);
        const user = await this.users
            .createQueryBuilder('user')
            .addSelect('user.accountPasswordHash')
            .where('user.id = :id', { id: actor.id })
            .getOne();
        if (!user) {
            throw app_exception_1.AppException.unauthorized(error_codes_1.ErrorCode.UNAUTHORIZED, 'Session is no longer valid.');
        }
        if (!user.accountPasswordHash) {
            throw app_exception_1.AppException.badRequest(error_codes_1.ErrorCode.ACCOUNT_PASSWORD_NOT_SET, 'No account password is configured. Set one in Settings before unlocking financial information.');
        }
        const valid = await this.passwordService.verify(user.accountPasswordHash, accountPassword);
        if (!valid) {
            await this.attempts.insert({
                userId: actor.id,
                successful: false,
                ipAddress: context.ipAddress,
            });
            await this.auditLog.record({
                action: audit_action_enum_1.AuditAction.FINANCIAL_UNLOCK_FAILED,
                module: audit_action_enum_1.AuditModule.FINANCIAL,
                recordId: actor.id,
                description: 'Failed financial unlock attempt',
                actor,
                context,
            });
            throw app_exception_1.AppException.unauthorized(error_codes_1.ErrorCode.INVALID_ACCOUNT_PASSWORD, 'Invalid account password');
        }
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
            action: audit_action_enum_1.AuditAction.FINANCIAL_UNLOCKED,
            module: audit_action_enum_1.AuditModule.FINANCIAL,
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
    async lock(actor, context) {
        const revoked = await this.revokeActiveSessions(actor.id);
        if (revoked > 0) {
            await this.auditLog.record({
                action: audit_action_enum_1.AuditAction.FINANCIAL_LOCKED,
                module: audit_action_enum_1.AuditModule.FINANCIAL,
                recordId: actor.id,
                description: 'Financial information locked',
                actor,
                context,
            });
        }
    }
    async resolveSession(userId, token) {
        if (!token)
            return null;
        const session = await this.sessions.findOne({
            where: {
                sessionTokenHash: this.passwordService.hashToken(token),
                userId,
                lockedAt: (0, typeorm_2.IsNull)(),
                expiresAt: (0, typeorm_2.MoreThan)(new Date()),
            },
        });
        return session ?? null;
    }
    async status(userId, token) {
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
    async revokeActiveSessions(userId, manager) {
        const repository = manager ? manager.getRepository(financial_unlock_session_entity_1.FinancialUnlockSession) : this.sessions;
        const result = await repository.update({ userId, lockedAt: (0, typeorm_2.IsNull)() }, { lockedAt: new Date() });
        return result.affected ?? 0;
    }
    async purgeExpired(olderThanDays = 30) {
        const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);
        const result = await this.sessions.delete({ expiresAt: (0, typeorm_2.LessThan)(cutoff) });
        return result.affected ?? 0;
    }
    async assertNotThrottled(userId) {
        const since = new Date(Date.now() - this.lockoutMinutes * 60_000);
        const recentFailures = await this.attempts.count({
            where: { userId, successful: false, createdAt: (0, typeorm_2.MoreThan)(since) },
        });
        if (recentFailures >= this.maxAttempts) {
            this.logger.warn(`Financial unlock throttled for user ${userId} after ${recentFailures} failures.`);
            throw app_exception_1.AppException.tooManyRequests(error_codes_1.ErrorCode.FINANCIAL_UNLOCK_THROTTLED, `Too many failed unlock attempts. Try again in ${this.lockoutMinutes} minutes.`, this.lockoutMinutes * 60);
        }
    }
};
exports.FinancialUnlockService = FinancialUnlockService;
exports.FinancialUnlockService = FinancialUnlockService = FinancialUnlockService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(financial_unlock_session_entity_1.FinancialUnlockSession)),
    __param(1, (0, typeorm_1.InjectRepository)(financial_unlock_attempt_entity_1.FinancialUnlockAttempt)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        password_service_1.PasswordService,
        audit_log_service_1.AuditLogService,
        config_1.ConfigService])
], FinancialUnlockService);
//# sourceMappingURL=financial-unlock.service.js.map