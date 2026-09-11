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
exports.MasterOptionDto = exports.MasterItemResponseDto = exports.QueryMasterItemDto = exports.UpdateMasterItemDto = exports.CreateMasterItemDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const pagination_dto_1 = require("../../../common/dto/pagination.dto");
const master_type_enum_1 = require("../../../common/enums/master-type.enum");
class CreateMasterItemDto {
    name;
    code;
    description;
    status;
    sortOrder;
    metadata;
}
exports.CreateMasterItemDto = CreateMasterItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Bank Transfer' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Name is required.' }),
    (0, class_validator_1.MaxLength)(120),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], CreateMasterItemDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'BANK_TRANSFER', description: 'Uppercase A–Z, 0–9 and underscores' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Code is required.' }),
    (0, class_validator_1.MaxLength)(64),
    (0, class_validator_1.Matches)(/^[A-Z0-9_]+$/, {
        message: 'Code must contain only uppercase letters, numbers and underscores.',
    }),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)),
    __metadata("design:type", String)
], CreateMasterItemDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value)),
    __metadata("design:type", String)
], CreateMasterItemDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: master_type_enum_1.MasterStatus, default: master_type_enum_1.MasterStatus.ACTIVE }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(master_type_enum_1.MasterStatus),
    __metadata("design:type", String)
], CreateMasterItemDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value === undefined || value === '' ? 0 : Number(value))),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMasterItemDto.prototype, "sortOrder", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Object, description: 'Type-specific extras, e.g. currency symbol' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateMasterItemDto.prototype, "metadata", void 0);
class UpdateMasterItemDto extends (0, swagger_1.PartialType)(CreateMasterItemDto) {
}
exports.UpdateMasterItemDto = UpdateMasterItemDto;
class QueryMasterItemDto extends pagination_dto_1.PaginationQueryDto {
    status;
}
exports.QueryMasterItemDto = QueryMasterItemDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: master_type_enum_1.MasterStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(master_type_enum_1.MasterStatus),
    __metadata("design:type", String)
], QueryMasterItemDto.prototype, "status", void 0);
class MasterItemResponseDto {
    id;
    type;
    name;
    code;
    description;
    status;
    sortOrder;
    isSystem;
    metadata;
    createdByName;
    updatedByName;
    createdAt;
    updatedAt;
}
exports.MasterItemResponseDto = MasterItemResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MasterItemResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: master_type_enum_1.MasterType }),
    __metadata("design:type", String)
], MasterItemResponseDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MasterItemResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MasterItemResponseDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], MasterItemResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: master_type_enum_1.MasterStatus }),
    __metadata("design:type", String)
], MasterItemResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], MasterItemResponseDto.prototype, "sortOrder", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], MasterItemResponseDto.prototype, "isSystem", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Object }),
    __metadata("design:type", Object)
], MasterItemResponseDto.prototype, "metadata", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], MasterItemResponseDto.prototype, "createdByName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], MasterItemResponseDto.prototype, "updatedByName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], MasterItemResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], MasterItemResponseDto.prototype, "updatedAt", void 0);
class MasterOptionDto {
    id;
    name;
    code;
    metadata;
}
exports.MasterOptionDto = MasterOptionDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MasterOptionDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MasterOptionDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MasterOptionDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Object }),
    __metadata("design:type", Object)
], MasterOptionDto.prototype, "metadata", void 0);
//# sourceMappingURL=master.dto.js.map