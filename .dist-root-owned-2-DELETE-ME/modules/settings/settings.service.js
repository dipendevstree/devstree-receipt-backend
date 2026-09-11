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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const app_constants_1 = require("../../common/constants/app.constants");
const error_codes_1 = require("../../common/constants/error-codes");
const audit_action_enum_1 = require("../../common/enums/audit-action.enum");
const password_type_enum_1 = require("../../common/enums/password-type.enum");
const app_exception_1 = require("../../common/exceptions/app.exception");
const audit_log_service_1 = require("../audit-logs/audit-log.service");
const auth_service_1 = require("../auth/auth.service");
const password_service_1 = require("../auth/services/password.service");
const financial_unlock_service_1 = require("../financial/services/financial-unlock.service");
const password_history_entity_1 = require("../users/entities/password-history.entity");
const user_entity_1 = require("../users/entities/user.entity");
const company_setting_entity_1 = require("./entities/company-setting.entity");
let SettingsService = class SettingsService {
    settings;
    users;
    passwordHistories;
    passwordService;
    authService;
    financialUnlock;
    auditLog;
    constructor(settings, users, passwordHistories, passwordService, authService, financialUnlock, auditLog) {
        this.settings = settings;
        this.users = users;
        this.passwordHistories = passwordHistories;
        this.passwordService = passwordService;
        this.authService = authService;
        this.financialUnlock = financialUnlock;
        this.auditLog = auditLog;
    }
    async getCompanySettings() {
        let settings = await this.settings.findOne({ where: { key: app_constants_1.COMPANY_SETTINGS_SINGLETON_KEY } });
        if (!settings) {
            settings = this.settings.create({ key: app_constants_1.COMPANY_SETTINGS_SINGLETON_KEY });
            settings = await this.settings.save(settings);
        }
        return settings;
    }
    async updateCompanySettings(dto, actor, context) {
        const settings = await this.getCompanySettings();
        const before = { ...settings };
        Object.assign(settings, dto, { updatedBy: actor.id });
        const saved = await this.settings.save(settings);
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.SETTINGS_UPDATED,
            module: audit_action_enum_1.AuditModule.SETTINGS,
            recordId: app_constants_1.COMPANY_SETTINGS_SINGLETON_KEY,
            description: 'Updated company settings',
            oldValue: before,
            newValue: { ...dto },
            actor,
            context,
        });
        return saved;
    }
    async changeLoginPassword(dto, actor, context) {
        if (dto.newPassword !== dto.confirmPassword) {
            throw app_exception_1.AppException.badRequest(error_codes_1.ErrorCode.PASSWORDS_MUST_DIFFER, 'New password and confirmation do not match.');
        }
        const user = await this.users
            .createQueryBuilder('user')
            .addSelect('user.passwordHash')
            .where('user.id = :id', { id: actor.id })
            .getOneOrFail();
        const currentValid = await this.passwordService.verify(user.passwordHash, dto.currentPassword);
        if (!currentValid) {
            throw app_exception_1.AppException.badRequest(error_codes_1.ErrorCode.CURRENT_PASSWORD_INCORRECT, 'Current password is incorrect.');
        }
        this.passwordService.assertStrength(dto.newPassword, 'New password');
        await this.assertNotReused(actor.id, password_type_enum_1.PasswordType.LOGIN, dto.newPassword);
        const newHash = await this.passwordService.hash(dto.newPassword);
        await this.users.update(actor.id, {
            passwordHash: newHash,
            tokenVersion: user.tokenVersion + 1,
        });
        await this.recordPasswordHistory(actor.id, password_type_enum_1.PasswordType.LOGIN, newHash);
        await this.authService.revokeAllRefreshTokens(actor.id);
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.LOGIN_PASSWORD_CHANGED,
            module: audit_action_enum_1.AuditModule.SETTINGS,
            recordId: actor.id,
            description: 'Login password changed',
            actor,
            context,
        });
    }
    async changeAccountPassword(dto, actor, context) {
        if (dto.newAccountPassword !== dto.confirmAccountPassword) {
            throw app_exception_1.AppException.badRequest(error_codes_1.ErrorCode.PASSWORDS_MUST_DIFFER, 'New account password and confirmation do not match.');
        }
        const user = await this.users
            .createQueryBuilder('user')
            .addSelect('user.accountPasswordHash')
            .where('user.id = :id', { id: actor.id })
            .getOneOrFail();
        if (user.accountPasswordHash) {
            const currentValid = await this.passwordService.verify(user.accountPasswordHash, dto.currentAccountPassword ?? '');
            if (!currentValid) {
                throw app_exception_1.AppException.badRequest(error_codes_1.ErrorCode.CURRENT_PASSWORD_INCORRECT, 'Current account password is incorrect.');
            }
        }
        this.passwordService.assertStrength(dto.newAccountPassword, 'New account password');
        await this.assertNotReused(actor.id, password_type_enum_1.PasswordType.ACCOUNT, dto.newAccountPassword);
        const newHash = await this.passwordService.hash(dto.newAccountPassword);
        await this.users.update(actor.id, { accountPasswordHash: newHash });
        await this.recordPasswordHistory(actor.id, password_type_enum_1.PasswordType.ACCOUNT, newHash);
        await this.financialUnlock.revokeActiveSessions(actor.id);
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.ACCOUNT_PASSWORD_CHANGED,
            module: audit_action_enum_1.AuditModule.SETTINGS,
            recordId: actor.id,
            description: 'Account password changed — financial sessions revoked',
            actor,
            context,
        });
    }
    async assertNotReused(userId, type, plaintext) {
        const history = await this.passwordHistories.find({
            where: { userId, passwordType: type },
            order: { createdAt: 'DESC' },
            take: app_constants_1.PASSWORD_HISTORY_DEPTH,
        });
        for (const entry of history) {
            if (await this.passwordService.verify(entry.passwordHash, plaintext)) {
                throw app_exception_1.AppException.badRequest(error_codes_1.ErrorCode.PASSWORD_REUSED, `This password was used recently. Choose a different one.`);
            }
        }
    }
    async recordPasswordHistory(userId, type, hash) {
        await this.passwordHistories.insert({ userId, passwordType: type, passwordHash: hash });
        const excess = await this.passwordHistories.find({
            where: { userId, passwordType: type },
            order: { createdAt: 'DESC' },
            skip: app_constants_1.PASSWORD_HISTORY_DEPTH,
        });
        if (excess.length > 0) {
            await this.passwordHistories.delete(excess.map((entry) => entry.id));
        }
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(company_setting_entity_1.CompanySetting)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(password_history_entity_1.PasswordHistory)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        password_service_1.PasswordService,
        auth_service_1.AuthService,
        financial_unlock_service_1.FinancialUnlockService,
        audit_log_service_1.AuditLogService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map