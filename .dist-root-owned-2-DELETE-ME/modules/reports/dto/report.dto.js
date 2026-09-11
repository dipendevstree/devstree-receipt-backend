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
exports.ProjectStatementDto = exports.ClientStatementDto = exports.StatementProjectDto = exports.MonthlyCollectionRowDto = exports.PaymentReportRowDto = exports.ProjectCollectionRowDto = exports.ClientCollectionRowDto = exports.DuePaymentRowDto = exports.DuePaymentsQueryDto = exports.ReportFilterQueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const date_filter_dto_1 = require("../../../common/dto/date-filter.dto");
const client_status_enum_1 = require("../../../common/enums/client-status.enum");
const payment_enum_1 = require("../../../common/enums/payment.enum");
const project_status_enum_1 = require("../../../common/enums/project-status.enum");
const trim = ({ value }) => typeof value === 'string' ? value.trim() || undefined : value;
const toBool = ({ value }) => value === undefined || value === ''
    ? undefined
    : ['true', '1', 'yes', true].includes(value);
class ReportFilterQueryDto extends date_filter_dto_1.PaginatedDateFilterQueryDto {
    clientId;
    projectId;
    createdBy;
    paymentMethod;
    paymentStatus;
    projectStatus;
    clientStatus;
    projectPaymentStatus;
    hasAmount;
    minAmount;
    maxAmount;
}
exports.ReportFilterQueryDto = ReportFilterQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ format: 'uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], ReportFilterQueryDto.prototype, "clientId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ format: 'uuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], ReportFilterQueryDto.prototype, "projectId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ format: 'uuid', description: 'Administrator who recorded the payment' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4'),
    __metadata("design:type", String)
], ReportFilterQueryDto.prototype, "createdBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: payment_enum_1.PaymentMethod }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.IsEnum)(payment_enum_1.PaymentMethod),
    __metadata("design:type", String)
], ReportFilterQueryDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: payment_enum_1.PaymentStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.IsEnum)(payment_enum_1.PaymentStatus),
    __metadata("design:type", String)
], ReportFilterQueryDto.prototype, "paymentStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: project_status_enum_1.ProjectStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.IsEnum)(project_status_enum_1.ProjectStatus),
    __metadata("design:type", String)
], ReportFilterQueryDto.prototype, "projectStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_status_enum_1.ClientStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.IsEnum)(client_status_enum_1.ClientStatus),
    __metadata("design:type", String)
], ReportFilterQueryDto.prototype, "clientStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: project_status_enum_1.ProjectPaymentStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.IsEnum)(project_status_enum_1.ProjectPaymentStatus),
    __metadata("design:type", String)
], ReportFilterQueryDto.prototype, "projectPaymentStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'true = fixed-amount projects only, false = variable projects only',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(toBool),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ReportFilterQueryDto.prototype, "hasAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Minimum amount. Applied after decryption.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], ReportFilterQueryDto.prototype, "minAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Maximum amount. Applied after decryption.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(trim),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], ReportFilterQueryDto.prototype, "maxAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Free-text across client / project / receipt / reference' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    (0, class_transformer_1.Transform)(trim),
    __metadata("design:type", String)
], ReportFilterQueryDto.prototype, "search", void 0);
class DuePaymentsQueryDto extends ReportFilterQueryDto {
}
exports.DuePaymentsQueryDto = DuePaymentsQueryDto;
class DuePaymentRowDto {
    clientId;
    clientName;
    projectId;
    projectName;
    hasProjectAmount;
    projectAmount;
    totalReceived;
    dueAmount;
    lastPaymentDate;
    paymentStatus;
    projectStatus;
}
exports.DuePaymentRowDto = DuePaymentRowDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DuePaymentRowDto.prototype, "clientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DuePaymentRowDto.prototype, "clientName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DuePaymentRowDto.prototype, "projectId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], DuePaymentRowDto.prototype, "projectName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'False ⇒ render "Not Defined", never ₹0.' }),
    __metadata("design:type", Boolean)
], DuePaymentRowDto.prototype, "hasProjectAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], DuePaymentRowDto.prototype, "projectAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], DuePaymentRowDto.prototype, "totalReceived", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, description: 'Null ⇒ "N/A".' }),
    __metadata("design:type", Object)
], DuePaymentRowDto.prototype, "dueAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], DuePaymentRowDto.prototype, "lastPaymentDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: project_status_enum_1.ProjectPaymentStatus }),
    __metadata("design:type", String)
], DuePaymentRowDto.prototype, "paymentStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: project_status_enum_1.ProjectStatus }),
    __metadata("design:type", String)
], DuePaymentRowDto.prototype, "projectStatus", void 0);
class ClientCollectionRowDto {
    clientId;
    clientName;
    projectCount;
    fixedProjectCount;
    variableProjectCount;
    totalProjectValue;
    totalReceived;
    variableReceived;
    totalDue;
}
exports.ClientCollectionRowDto = ClientCollectionRowDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ClientCollectionRowDto.prototype, "clientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ClientCollectionRowDto.prototype, "clientName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ClientCollectionRowDto.prototype, "projectCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ClientCollectionRowDto.prototype, "fixedProjectCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ClientCollectionRowDto.prototype, "variableProjectCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, description: 'Fixed-amount projects only.' }),
    __metadata("design:type", Object)
], ClientCollectionRowDto.prototype, "totalProjectValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, description: 'All projects.' }),
    __metadata("design:type", Object)
], ClientCollectionRowDto.prototype, "totalReceived", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, description: 'Variable projects only.' }),
    __metadata("design:type", Object)
], ClientCollectionRowDto.prototype, "variableReceived", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, description: 'Fixed-amount projects only.' }),
    __metadata("design:type", Object)
], ClientCollectionRowDto.prototype, "totalDue", void 0);
class ProjectCollectionRowDto {
    clientId;
    clientName;
    projectId;
    projectCode;
    projectName;
    projectStatus;
    hasProjectAmount;
    projectAmount;
    totalReceived;
    dueAmount;
}
exports.ProjectCollectionRowDto = ProjectCollectionRowDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProjectCollectionRowDto.prototype, "clientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProjectCollectionRowDto.prototype, "clientName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProjectCollectionRowDto.prototype, "projectId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProjectCollectionRowDto.prototype, "projectCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProjectCollectionRowDto.prototype, "projectName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: project_status_enum_1.ProjectStatus }),
    __metadata("design:type", String)
], ProjectCollectionRowDto.prototype, "projectStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], ProjectCollectionRowDto.prototype, "hasProjectAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ProjectCollectionRowDto.prototype, "projectAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ProjectCollectionRowDto.prototype, "totalReceived", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ProjectCollectionRowDto.prototype, "dueAmount", void 0);
class PaymentReportRowDto {
    paymentId;
    paymentDate;
    clientName;
    projectName;
    receiptNumber;
    amount;
    paymentMethod;
    status;
    transactionReference;
    createdByName;
}
exports.PaymentReportRowDto = PaymentReportRowDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentReportRowDto.prototype, "paymentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentReportRowDto.prototype, "paymentDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentReportRowDto.prototype, "clientName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentReportRowDto.prototype, "projectName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], PaymentReportRowDto.prototype, "receiptNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], PaymentReportRowDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PaymentReportRowDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: payment_enum_1.PaymentStatus }),
    __metadata("design:type", String)
], PaymentReportRowDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], PaymentReportRowDto.prototype, "transactionReference", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], PaymentReportRowDto.prototype, "createdByName", void 0);
class MonthlyCollectionRowDto {
    month;
    paymentCount;
    receiptCount;
    totalReceived;
}
exports.MonthlyCollectionRowDto = MonthlyCollectionRowDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], MonthlyCollectionRowDto.prototype, "month", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], MonthlyCollectionRowDto.prototype, "paymentCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], MonthlyCollectionRowDto.prototype, "receiptCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], MonthlyCollectionRowDto.prototype, "totalReceived", void 0);
class StatementProjectDto {
    projectId;
    projectName;
    hasProjectAmount;
    projectAmount;
    totalReceived;
    dueAmount;
    payments;
}
exports.StatementProjectDto = StatementProjectDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], StatementProjectDto.prototype, "projectId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], StatementProjectDto.prototype, "projectName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], StatementProjectDto.prototype, "hasProjectAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], StatementProjectDto.prototype, "projectAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], StatementProjectDto.prototype, "totalReceived", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], StatementProjectDto.prototype, "dueAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [PaymentReportRowDto] }),
    __metadata("design:type", Array)
], StatementProjectDto.prototype, "payments", void 0);
class ClientStatementDto {
    clientId;
    clientName;
    projects;
    fixedProjectCount;
    variableProjectCount;
    totalProjectValue;
    totalReceived;
    variableReceived;
    totalDue;
}
exports.ClientStatementDto = ClientStatementDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ClientStatementDto.prototype, "clientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ClientStatementDto.prototype, "clientName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [StatementProjectDto] }),
    __metadata("design:type", Array)
], ClientStatementDto.prototype, "projects", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ClientStatementDto.prototype, "fixedProjectCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ClientStatementDto.prototype, "variableProjectCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, description: 'Fixed-amount projects only.' }),
    __metadata("design:type", Object)
], ClientStatementDto.prototype, "totalProjectValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, description: 'All projects.' }),
    __metadata("design:type", Object)
], ClientStatementDto.prototype, "totalReceived", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, description: 'Variable projects only.' }),
    __metadata("design:type", Object)
], ClientStatementDto.prototype, "variableReceived", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, description: 'Fixed-amount projects only.' }),
    __metadata("design:type", Object)
], ClientStatementDto.prototype, "totalDue", void 0);
class ProjectStatementDto {
    projectId;
    projectName;
    clientId;
    clientName;
    hasProjectAmount;
    projectAmount;
    totalReceived;
    dueAmount;
    payments;
}
exports.ProjectStatementDto = ProjectStatementDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProjectStatementDto.prototype, "projectId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProjectStatementDto.prototype, "projectName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProjectStatementDto.prototype, "clientId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProjectStatementDto.prototype, "clientName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], ProjectStatementDto.prototype, "hasProjectAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ProjectStatementDto.prototype, "projectAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ProjectStatementDto.prototype, "totalReceived", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], ProjectStatementDto.prototype, "dueAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [PaymentReportRowDto] }),
    __metadata("design:type", Array)
], ProjectStatementDto.prototype, "payments", void 0);
//# sourceMappingURL=report.dto.js.map