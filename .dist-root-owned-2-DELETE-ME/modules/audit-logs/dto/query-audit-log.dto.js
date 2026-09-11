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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryAuditLogDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const pagination_dto_1 = require("../../../common/dto/pagination.dto");
const audit_action_enum_1 = require("../../../common/enums/audit-action.enum");
class QueryAuditLogDto extends pagination_dto_1.PaginationQueryDto {
    userId;
    action;
    module;
    dateFrom;
    dateTo;
}
exports.QueryAuditLogDto = QueryAuditLogDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ format: 'uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], QueryAuditLogDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: audit_action_enum_1.AuditAction }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(audit_action_enum_1.AuditAction),
    __metadata("design:type", String)
], QueryAuditLogDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: audit_action_enum_1.AuditModule }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(audit_action_enum_1.AuditModule),
    __metadata("design:type", String)
], QueryAuditLogDto.prototype, "module", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-01-01' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], QueryAuditLogDto.prototype, "dateFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-12-31' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], QueryAuditLogDto.prototype, "dateTo", void 0);
//# sourceMappingURL=query-audit-log.dto.js.map