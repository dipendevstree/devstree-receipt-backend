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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const error_codes_1 = require("../../common/constants/error-codes");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const audit_action_enum_1 = require("../../common/enums/audit-action.enum");
const user_status_enum_1 = require("../../common/enums/user-status.enum");
const app_exception_1 = require("../../common/exceptions/app.exception");
const audit_log_service_1 = require("../audit-logs/audit-log.service");
const auth_service_1 = require("../auth/auth.service");
const password_service_1 = require("../auth/services/password.service");
const financial_unlock_service_1 = require("../financial/services/financial-unlock.service");
const role_entity_1 = require("../roles/entities/role.entity");
const user_entity_1 = require("./entities/user.entity");
let UsersService = class UsersService {
    users;
    roles;
    passwordService;
    authService;
    financialUnlock;
    auditLog;
    constructor(users, roles, passwordService, authService, financialUnlock, auditLog) {
        this.users = users;
        this.roles = roles;
        this.passwordService = passwordService;
        this.authService = authService;
        this.financialUnlock = financialUnlock;
        this.auditLog = auditLog;
    }
    async findAll(query) {
        const builder = this.users
            .createQueryBuilder('user')
            .addSelect('user.account_password_hash')
            .leftJoinAndSelect('user.role', 'role')
            .where('user.deleted_at IS NULL');
        if (query.status)
            builder.andWhere('user.status = :status', { status: query.status });
        if (query.roleId)
            builder.andWhere('user.role_id = :roleId', { roleId: query.roleId });
        if (query.search) {
            builder.andWhere('(user.name ILIKE :term OR user.email ILIKE :term)', {
                term: `%${query.search}%`,
            });
        }
        builder.orderBy('user.created_at', query.sortOrder).skip(query.skip).take(query.limit);
        const [users, total] = await builder.getManyAndCount();
        return pagination_dto_1.PaginatedResult.of(users.map((user) => this.toResponse(user)), total, query.page, query.limit);
    }
    async findOne(id) {
        return this.toResponse(await this.getOrFail(id));
    }
    async create(dto, actor, context) {
        const existing = await this.users.findOne({ where: { email: dto.email } });
        if (existing) {
            throw app_exception_1.AppException.conflict(error_codes_1.ErrorCode.DUPLICATE_EMAIL, 'A user with this email already exists.');
        }
        const role = await this.roles.findOne({ where: { id: dto.roleId } });
        if (!role) {
            throw app_exception_1.AppException.badRequest(error_codes_1.ErrorCode.NOT_FOUND, 'Selected role was not found.');
        }
        this.passwordService.assertStrength(dto.password, 'Password');
        const user = this.users.create({
            name: dto.name,
            email: dto.email,
            phone: dto.phone ?? null,
            passwordHash: await this.passwordService.hash(dto.password),
            roleId: dto.roleId,
            status: dto.status ?? user_status_enum_1.UserStatus.ACTIVE,
        });
        const saved = await this.users.save(user);
        saved.role = role;
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.USER_CREATED,
            module: audit_action_enum_1.AuditModule.USERS,
            recordId: saved.id,
            description: `Created user ${saved.name} (${saved.email})`,
            newValue: { name: dto.name, email: dto.email, roleId: dto.roleId },
            actor,
            context,
        });
        return this.toResponse(saved);
    }
    async update(id, dto, actor, context) {
        const user = await this.getOrFail(id);
        const before = { name: user.name, roleId: user.roleId, status: user.status };
        if (dto.roleId && dto.roleId !== user.roleId) {
            const role = await this.roles.findOne({ where: { id: dto.roleId } });
            if (!role) {
                throw app_exception_1.AppException.badRequest(error_codes_1.ErrorCode.NOT_FOUND, 'Selected role was not found.');
            }
            user.roleId = dto.roleId;
        }
        if (dto.name !== undefined)
            user.name = dto.name;
        if (dto.phone !== undefined)
            user.phone = dto.phone ?? null;
        const deactivating = dto.status === user_status_enum_1.UserStatus.INACTIVE || dto.status === user_status_enum_1.UserStatus.SUSPENDED;
        if (dto.status !== undefined)
            user.status = dto.status;
        await this.users.save(user);
        if (deactivating) {
            await this.authService.revokeAllRefreshTokens(user.id);
            await this.financialUnlock.revokeActiveSessions(user.id);
        }
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.USER_UPDATED,
            module: audit_action_enum_1.AuditModule.USERS,
            recordId: user.id,
            description: `Updated user ${user.name}`,
            oldValue: before,
            newValue: { name: user.name, roleId: user.roleId, status: user.status },
            actor,
            context,
        });
        return this.findOne(id);
    }
    async archive(id, actor, context) {
        if (id === actor.id) {
            throw app_exception_1.AppException.badRequest(error_codes_1.ErrorCode.VALIDATION_FAILED, 'You cannot deactivate your own account.');
        }
        const user = await this.getOrFail(id);
        await this.users.softDelete(id);
        await this.authService.revokeAllRefreshTokens(id);
        await this.financialUnlock.revokeActiveSessions(id);
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.USER_ARCHIVED,
            module: audit_action_enum_1.AuditModule.USERS,
            recordId: id,
            description: `Archived user ${user.name}`,
            actor,
            context,
        });
    }
    async getOrFail(id) {
        const user = await this.users
            .createQueryBuilder('user')
            .addSelect('user.account_password_hash')
            .leftJoinAndSelect('user.role', 'role')
            .where('user.id = :id', { id })
            .andWhere('user.deleted_at IS NULL')
            .getOne();
        if (!user) {
            throw app_exception_1.AppException.notFound(error_codes_1.ErrorCode.NOT_FOUND, 'User not found.');
        }
        return user;
    }
    toResponse(user) {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            roleId: user.roleId,
            roleName: user.role?.name ?? '',
            status: user.status,
            lastLoginAt: user.lastLoginAt,
            hasAccountPassword: Boolean(user.accountPasswordHash),
            createdAt: user.createdAt,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(role_entity_1.Role)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        password_service_1.PasswordService,
        auth_service_1.AuthService,
        financial_unlock_service_1.FinancialUnlockService,
        audit_log_service_1.AuditLogService])
], UsersService);
//# sourceMappingURL=users.service.js.map