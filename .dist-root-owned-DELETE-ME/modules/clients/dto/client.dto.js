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
exports.ClientResponseDto = exports.QueryClientDto = exports.UpdateClientDto = exports.CreateClientDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const pagination_dto_1 = require("../../../common/dto/pagination.dto");
const client_status_enum_1 = require("../../../common/enums/client-status.enum");
const trim = ({ value }) => typeof value === 'string' ? value.trim() || undefined : value;
class CreateClientDto {
    name;
    companyName;
    email;
    phone;
    alternatePhone;
    country;
    address;
    city;
    state;
    postalCode;
    taxNumber;
    notes;
    status;
}
exports.CreateClientDto = CreateClientDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ABC Pvt Ltd' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Client name is required.' }),
    (0, class_validator_1.MaxLength)(160),
    (0, class_transformer_1.Transform)(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], CreateClientDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(160),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], CreateClientDto.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'accounts@abc.com' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)({}, { message: 'Enter a valid email address.' }),
    (0, class_validator_1.MaxLength)(180),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() || undefined : value),
    __metadata("design:type", String)
], CreateClientDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '9876543210' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[0-9+\-\s()]{6,24}$/, { message: 'Enter a valid phone number.' }),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], CreateClientDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[0-9+\-\s()]{6,24}$/, { message: 'Enter a valid alternate phone number.' }),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], CreateClientDto.prototype, "alternatePhone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'India' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], CreateClientDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], CreateClientDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], CreateClientDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], CreateClientDto.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], CreateClientDto.prototype, "postalCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'GST / VAT / Tax registration number' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(40),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], CreateClientDto.prototype, "taxNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], CreateClientDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_status_enum_1.ClientStatus, default: client_status_enum_1.ClientStatus.ACTIVE }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_status_enum_1.ClientStatus),
    __metadata("design:type", String)
], CreateClientDto.prototype, "status", void 0);
class UpdateClientDto extends (0, swagger_1.PartialType)(CreateClientDto) {
}
exports.UpdateClientDto = UpdateClientDto;
class QueryClientDto extends pagination_dto_1.PaginationQueryDto {
    status;
    country;
}
exports.QueryClientDto = QueryClientDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_status_enum_1.ClientStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_status_enum_1.ClientStatus),
    __metadata("design:type", String)
], QueryClientDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], QueryClientDto.prototype, "country", void 0);
class ClientResponseDto {
    id;
    clientCode;
    name;
    companyName;
    email;
    phone;
    alternatePhone;
    country;
    address;
    city;
    state;
    postalCode;
    taxNumber;
    notes;
    status;
    projectCount;
    financialLocked;
    totalProjectValue;
    totalReceived;
    totalDue;
    createdAt;
    updatedAt;
}
exports.ClientResponseDto = ClientResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ClientResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ClientResponseDto.prototype, "clientCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ClientResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ClientResponseDto.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ClientResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ClientResponseDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ClientResponseDto.prototype, "alternatePhone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ClientResponseDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ClientResponseDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ClientResponseDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ClientResponseDto.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ClientResponseDto.prototype, "postalCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ClientResponseDto.prototype, "taxNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ClientResponseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_status_enum_1.ClientStatus }),
    __metadata("design:type", String)
], ClientResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ClientResponseDto.prototype, "projectCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], ClientResponseDto.prototype, "financialLocked", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '1000000.00', nullable: true }),
    __metadata("design:type", Object)
], ClientResponseDto.prototype, "totalProjectValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '600000.00', nullable: true }),
    __metadata("design:type", Object)
], ClientResponseDto.prototype, "totalReceived", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '400000.00', nullable: true }),
    __metadata("design:type", Object)
], ClientResponseDto.prototype, "totalDue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], ClientResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], ClientResponseDto.prototype, "updatedAt", void 0);
//# sourceMappingURL=client.dto.js.map