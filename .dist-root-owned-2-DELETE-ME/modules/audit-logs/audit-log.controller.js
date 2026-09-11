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
exports.AuditLogController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const swagger_1 = require("@nestjs/swagger");
const typeorm_2 = require("typeorm");
const error_codes_1 = require("../../common/constants/error-codes");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const permission_enum_1 = require("../../common/enums/permission.enum");
const app_exception_1 = require("../../common/exceptions/app.exception");
const audit_log_entity_1 = require("./entities/audit-log.entity");
const query_audit_log_dto_1 = require("./dto/query-audit-log.dto");
let AuditLogController = class AuditLogController {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async findAll(query) {
        const where = {};
        if (query.userId)
            where.userId = query.userId;
        if (query.action)
            where.action = query.action;
        if (query.module)
            where.module = query.module;
        if (query.dateFrom && query.dateTo) {
            where.createdAt = (0, typeorm_2.Between)(new Date(query.dateFrom), endOfDay(query.dateTo));
        }
        else if (query.dateFrom) {
            where.createdAt = (0, typeorm_2.MoreThanOrEqual)(new Date(query.dateFrom));
        }
        else if (query.dateTo) {
            where.createdAt = (0, typeorm_2.LessThanOrEqual)(endOfDay(query.dateTo));
        }
        const [items, total] = await this.repository.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            skip: query.skip,
            take: query.limit,
        });
        return pagination_dto_1.PaginatedResult.of(items, total, query.page, query.limit);
    }
    async findOne(id) {
        const log = await this.repository.findOne({ where: { id } });
        if (!log) {
            throw app_exception_1.AppException.notFound(error_codes_1.ErrorCode.NOT_FOUND, 'Audit entry not found.');
        }
        return log;
    }
};
exports.AuditLogController = AuditLogController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.AUDIT_LOGS_VIEW),
    (0, swagger_1.ApiOperation)({
        summary: 'List audit entries (financial values are already redacted at write time)',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_audit_log_dto_1.QueryAuditLogDto]),
    __metadata("design:returntype", Promise)
], AuditLogController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.AUDIT_LOGS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single audit entry' }),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuditLogController.prototype, "findOne", null);
exports.AuditLogController = AuditLogController = __decorate([
    (0, swagger_1.ApiTags)('Audit Logs'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('audit-logs'),
    __param(0, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AuditLogController);
function endOfDay(date) {
    const value = new Date(date);
    value.setHours(23, 59, 59, 999);
    return value;
}
//# sourceMappingURL=audit-log.controller.js.map