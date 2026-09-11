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
exports.PaymentResponseDto = exports.QueryPaymentDto = exports.VoidPaymentDto = exports.UpdatePaymentDto = exports.CreatePaymentDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const class_validator_2 = require("class-validator");
const pagination_dto_1 = require("../../../common/dto/pagination.dto");
const payment_enum_1 = require("../../../common/enums/payment.enum");
const trim = ({ value }) => typeof value === 'string' ? value.trim() || undefined : value;
let IsDecimalAmountConstraint = class IsDecimalAmountConstraint {
    validate(value) {
        return typeof value === 'string' && /^\d{1,13}(\.\d{1,4})?$/.test(value) && Number(value) > 0;
    }
    defaultMessage(args) {
        return `${args.property} must be a positive decimal amount, e.g. "25000.00".`;
    }
};
IsDecimalAmountConstraint = __decorate([
    (0, class_validator_2.ValidatorConstraint)({ name: 'isDecimalAmount', async: false })
], IsDecimalAmountConstraint);
class CreatePaymentDto {
    clientId;
    projectId;
    paymentDate;
    amount;
    paymentMethod;
    transactionReference;
    bankAccount;
    notes;
    attachmentPath;
}
exports.CreatePaymentDto = CreatePaymentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    (0, class_validator_1.IsUUID)('4', { message: 'Select a valid client.' }),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "clientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    (0, class_validator_1.IsUUID)('4', { message: 'Select a valid project.' }),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "projectId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-01-20' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "paymentDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '25000.00' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Validate)(IsDecimalAmountConstraint),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: payment_enum_1.PaymentMethod }),
    (0, class_validator_1.IsEnum)(payment_enum_1.PaymentMethod),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "transactionReference", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "bankAccount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Path/key of a previously uploaded attachment' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "attachmentPath", void 0);
class UpdatePaymentBaseDto {
    paymentDate;
    paymentMethod;
    transactionReference;
    bankAccount;
    notes;
}
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-01-20' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdatePaymentBaseDto.prototype, "paymentDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: payment_enum_1.PaymentMethod }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(payment_enum_1.PaymentMethod),
    __metadata("design:type", String)
], UpdatePaymentBaseDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], UpdatePaymentBaseDto.prototype, "transactionReference", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], UpdatePaymentBaseDto.prototype, "bankAccount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], UpdatePaymentBaseDto.prototype, "notes", void 0);
class UpdatePaymentDto extends (0, swagger_1.PartialType)(UpdatePaymentBaseDto) {
}
exports.UpdatePaymentDto = UpdatePaymentDto;
class VoidPaymentDto {
    reason;
}
exports.VoidPaymentDto = VoidPaymentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Duplicate entry — recorded in error' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'A reason is required to void a payment.' }),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], VoidPaymentDto.prototype, "reason", void 0);
class QueryPaymentDto extends pagination_dto_1.PaginationQueryDto {
    clientId;
    projectId;
    status;
    paymentMethod;
    dateFrom;
    dateTo;
}
exports.QueryPaymentDto = QueryPaymentDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ format: 'uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], QueryPaymentDto.prototype, "clientId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ format: 'uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], QueryPaymentDto.prototype, "projectId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: payment_enum_1.PaymentStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(payment_enum_1.PaymentStatus),
    __metadata("design:type", String)
], QueryPaymentDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: payment_enum_1.PaymentMethod }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(payment_enum_1.PaymentMethod),
    __metadata("design:type", String)
], QueryPaymentDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-01-01' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], QueryPaymentDto.prototype, "dateFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-12-31' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], QueryPaymentDto.prototype, "dateTo", void 0);
class PaymentResponseDto {
    id;
    clientId;
    clientName;
    projectId;
    projectName;
    paymentDate;
    paymentMethod;
    transactionReference;
    bankAccount;
    notes;
    status;
    voidReason;
    receiptNumber;
    financialLocked;
    amount;
    createdByName;
    createdAt;
    updatedAt;
}
exports.PaymentResponseDto = PaymentResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "clientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "clientName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "projectId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "projectName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "paymentDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: payment_enum_1.PaymentMethod }),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], PaymentResponseDto.prototype, "transactionReference", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], PaymentResponseDto.prototype, "bankAccount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], PaymentResponseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: payment_enum_1.PaymentStatus }),
    __metadata("design:type", String)
], PaymentResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], PaymentResponseDto.prototype, "voidReason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], PaymentResponseDto.prototype, "receiptNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], PaymentResponseDto.prototype, "financialLocked", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], PaymentResponseDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], PaymentResponseDto.prototype, "createdByName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], PaymentResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], PaymentResponseDto.prototype, "updatedAt", void 0);
//# sourceMappingURL=payment.dto.js.map