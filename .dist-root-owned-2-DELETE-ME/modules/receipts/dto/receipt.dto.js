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
exports.ReceiptResponseDto = exports.QueryReceiptDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const class_validator_2 = require("class-validator");
const date_filter_dto_1 = require("../../../common/dto/date-filter.dto");
const master_type_enum_1 = require("../../../common/enums/master-type.enum");
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
class QueryReceiptDto extends date_filter_dto_1.PaginatedDateFilterQueryDto {
    clientId;
    projectId;
    receiptNumber;
    paymentMethod;
    paymentStatus;
    receiptStatus;
    generatedBy;
    transactionReference;
    minAmount;
    maxAmount;
}
exports.QueryReceiptDto = QueryReceiptDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ format: 'uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], QueryReceiptDto.prototype, "clientId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ format: 'uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], QueryReceiptDto.prototype, "projectId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Exact or partial receipt number' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(32),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], QueryReceiptDto.prototype, "receiptNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: payment_enum_1.PaymentMethod }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.IsEnum)(payment_enum_1.PaymentMethod),
    __metadata("design:type", String)
], QueryReceiptDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: payment_enum_1.PaymentStatus, description: 'Status of the underlying payment' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.IsEnum)(payment_enum_1.PaymentStatus),
    __metadata("design:type", String)
], QueryReceiptDto.prototype, "paymentStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: master_type_enum_1.ReceiptStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.IsEnum)(master_type_enum_1.ReceiptStatus),
    __metadata("design:type", String)
], QueryReceiptDto.prototype, "receiptStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ format: 'uuid', description: 'Administrator who generated the receipt' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], QueryReceiptDto.prototype, "generatedBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], QueryReceiptDto.prototype, "transactionReference", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Applied post-decryption; requires financial unlock.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.Validate)(IsDecimalAmountConstraint),
    __metadata("design:type", String)
], QueryReceiptDto.prototype, "minAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Applied post-decryption; requires financial unlock.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.Validate)(IsDecimalAmountConstraint),
    __metadata("design:type", String)
], QueryReceiptDto.prototype, "maxAmount", void 0);
class ReceiptResponseDto {
    id;
    receiptNumber;
    receiptDate;
    status;
    paymentId;
    clientId;
    clientName;
    clientCompanyName;
    clientEmail;
    clientPhone;
    projectId;
    projectName;
    projectCode;
    paymentDate;
    paymentMethod;
    paymentStatus;
    transactionReference;
    financialLocked;
    amount;
    amountInWords;
    hasProjectAmount;
    projectAmount;
    projectTotalReceived;
    projectDueAmount;
    generatedByName;
    notes;
    createdAt;
}
exports.ReceiptResponseDto = ReceiptResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReceiptResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReceiptResponseDto.prototype, "receiptNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReceiptResponseDto.prototype, "receiptDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: master_type_enum_1.ReceiptStatus }),
    __metadata("design:type", String)
], ReceiptResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReceiptResponseDto.prototype, "paymentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReceiptResponseDto.prototype, "clientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReceiptResponseDto.prototype, "clientName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ReceiptResponseDto.prototype, "clientCompanyName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ReceiptResponseDto.prototype, "clientEmail", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ReceiptResponseDto.prototype, "clientPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReceiptResponseDto.prototype, "projectId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReceiptResponseDto.prototype, "projectName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ReceiptResponseDto.prototype, "projectCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ReceiptResponseDto.prototype, "paymentDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: payment_enum_1.PaymentMethod }),
    __metadata("design:type", String)
], ReceiptResponseDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: payment_enum_1.PaymentStatus }),
    __metadata("design:type", String)
], ReceiptResponseDto.prototype, "paymentStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ReceiptResponseDto.prototype, "transactionReference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], ReceiptResponseDto.prototype, "financialLocked", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ReceiptResponseDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        nullable: true,
        description: 'The payment amount spelled out. Derived from the amount, so it is withheld while locked for exactly the same reason the figure is.',
    }),
    __metadata("design:type", Object)
], ReceiptResponseDto.prototype, "amountInWords", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'False for variable projects — render "Not Defined", never ₹0.' }),
    __metadata("design:type", Boolean)
], ReceiptResponseDto.prototype, "hasProjectAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ReceiptResponseDto.prototype, "projectAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ReceiptResponseDto.prototype, "projectTotalReceived", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, description: 'Null when hasProjectAmount is false.' }),
    __metadata("design:type", Object)
], ReceiptResponseDto.prototype, "projectDueAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ReceiptResponseDto.prototype, "generatedByName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], ReceiptResponseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], ReceiptResponseDto.prototype, "createdAt", void 0);
//# sourceMappingURL=receipt.dto.js.map