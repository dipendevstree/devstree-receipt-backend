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
exports.ChangeAccountPasswordDto = exports.ChangeLoginPasswordDto = exports.UpdateCompanySettingsDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const trim = ({ value }) => typeof value === 'string' ? value.trim() || undefined : value;
class UpdateCompanySettingsDto {
    companyName;
    email;
    phone;
    website;
    address;
    city;
    state;
    postalCode;
    country;
    taxNumber;
    currency;
    currencySymbol;
    currencyPrecision;
    dateFormat;
    receiptFooterNote;
    authorizedSignatory;
}
exports.UpdateCompanySettingsDto = UpdateCompanySettingsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(160),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], UpdateCompanySettingsDto.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], UpdateCompanySettingsDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(24),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], UpdateCompanySettingsDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(180),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], UpdateCompanySettingsDto.prototype, "website", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], UpdateCompanySettingsDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], UpdateCompanySettingsDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], UpdateCompanySettingsDto.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], UpdateCompanySettingsDto.prototype, "postalCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(80),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], UpdateCompanySettingsDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(40),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], UpdateCompanySettingsDto.prototype, "taxNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'INR' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(8),
    __metadata("design:type", String)
], UpdateCompanySettingsDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '₹' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(8),
    __metadata("design:type", String)
], UpdateCompanySettingsDto.prototype, "currencySymbol", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 0, maximum: 6 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(6),
    __metadata("design:type", Number)
], UpdateCompanySettingsDto.prototype, "currencyPrecision", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'dd MMM yyyy' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(32),
    __metadata("design:type", String)
], UpdateCompanySettingsDto.prototype, "dateFormat", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], UpdateCompanySettingsDto.prototype, "receiptFooterNote", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], UpdateCompanySettingsDto.prototype, "authorizedSignatory", void 0);
class ChangeLoginPasswordDto {
    currentPassword;
    newPassword;
    confirmPassword;
}
exports.ChangeLoginPasswordDto = ChangeLoginPasswordDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChangeLoginPasswordDto.prototype, "currentPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ minLength: 10 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], ChangeLoginPasswordDto.prototype, "newPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChangeLoginPasswordDto.prototype, "confirmPassword", void 0);
class ChangeAccountPasswordDto {
    currentAccountPassword;
    newAccountPassword;
    confirmAccountPassword;
}
exports.ChangeAccountPasswordDto = ChangeAccountPasswordDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Omit only when no account password has ever been set' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChangeAccountPasswordDto.prototype, "currentAccountPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ minLength: 10 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], ChangeAccountPasswordDto.prototype, "newAccountPassword", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChangeAccountPasswordDto.prototype, "confirmAccountPassword", void 0);
//# sourceMappingURL=settings.dto.js.map