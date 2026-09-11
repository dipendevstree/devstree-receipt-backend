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
exports.ProjectResponseDto = exports.QueryProjectDto = exports.UpdateProjectDto = exports.CreateProjectDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const class_validator_2 = require("class-validator");
const pagination_dto_1 = require("../../../common/dto/pagination.dto");
const project_status_enum_1 = require("../../../common/enums/project-status.enum");
const trim = ({ value }) => typeof value === 'string' ? value.trim() || undefined : value;
let IsDecimalAmountConstraint = class IsDecimalAmountConstraint {
    validate(value) {
        return typeof value === 'string' && /^\d{1,13}(\.\d{1,4})?$/.test(value) && Number(value) > 0;
    }
    defaultMessage(args) {
        return `${args.property} must be a positive decimal amount, e.g. "100000.00".`;
    }
};
IsDecimalAmountConstraint = __decorate([
    (0, class_validator_2.ValidatorConstraint)({ name: 'isDecimalAmount', async: false })
], IsDecimalAmountConstraint);
class CreateProjectDto {
    clientId;
    projectName;
    description;
    projectAmount;
    startDate;
    expectedEndDate;
    status;
    notes;
}
exports.CreateProjectDto = CreateProjectDto;
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    (0, class_validator_1.IsUUID)('4', { message: 'Select a valid client.' }),
    __metadata("design:type", String)
], CreateProjectDto.prototype, "clientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Website Development' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Project name is required.' }),
    (0, class_validator_1.MaxLength)(180),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], CreateProjectDto.prototype, "projectName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], CreateProjectDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '1000000.00', description: 'Decimal string — never a float' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Validate)(IsDecimalAmountConstraint),
    __metadata("design:type", String)
], CreateProjectDto.prototype, "projectAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-01-15' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateProjectDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-06-30' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateProjectDto.prototype, "expectedEndDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: project_status_enum_1.ProjectStatus, default: project_status_enum_1.ProjectStatus.DRAFT }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(project_status_enum_1.ProjectStatus),
    __metadata("design:type", String)
], CreateProjectDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], CreateProjectDto.prototype, "notes", void 0);
class UpdateProjectDto extends (0, swagger_1.PartialType)(CreateProjectDto) {
}
exports.UpdateProjectDto = UpdateProjectDto;
class QueryProjectDto extends pagination_dto_1.PaginationQueryDto {
    clientId;
    status;
    paymentStatus;
}
exports.QueryProjectDto = QueryProjectDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ format: 'uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], QueryProjectDto.prototype, "clientId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: project_status_enum_1.ProjectStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(project_status_enum_1.ProjectStatus),
    __metadata("design:type", String)
], QueryProjectDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: project_status_enum_1.ProjectPaymentStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(project_status_enum_1.ProjectPaymentStatus),
    __metadata("design:type", String)
], QueryProjectDto.prototype, "paymentStatus", void 0);
class ProjectResponseDto {
    id;
    projectCode;
    projectName;
    description;
    clientId;
    clientName;
    startDate;
    expectedEndDate;
    status;
    paymentStatus;
    notes;
    paymentCount;
    financialLocked;
    projectAmount;
    totalReceived;
    dueAmount;
    lastPaymentDate;
    createdAt;
    updatedAt;
}
exports.ProjectResponseDto = ProjectResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProjectResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProjectResponseDto.prototype, "projectCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProjectResponseDto.prototype, "projectName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ProjectResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProjectResponseDto.prototype, "clientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProjectResponseDto.prototype, "clientName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ProjectResponseDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ProjectResponseDto.prototype, "expectedEndDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: project_status_enum_1.ProjectStatus }),
    __metadata("design:type", String)
], ProjectResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: project_status_enum_1.ProjectPaymentStatus }),
    __metadata("design:type", String)
], ProjectResponseDto.prototype, "paymentStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ProjectResponseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ProjectResponseDto.prototype, "paymentCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], ProjectResponseDto.prototype, "financialLocked", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ProjectResponseDto.prototype, "projectAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ProjectResponseDto.prototype, "totalReceived", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ProjectResponseDto.prototype, "dueAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ProjectResponseDto.prototype, "lastPaymentDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], ProjectResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], ProjectResponseDto.prototype, "updatedAt", void 0);
//# sourceMappingURL=project.dto.js.map