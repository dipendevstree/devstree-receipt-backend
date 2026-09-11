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
exports.DashboardTopListsDto = exports.TopEntityRowDto = exports.RecentActivityDto = exports.ProjectStatusStatDto = exports.PaymentMethodStatDto = exports.MonthlyCollectionPointDto = exports.DashboardSummaryDto = exports.DashboardYearQueryDto = exports.DashboardQueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const date_filter_dto_1 = require("../../../common/dto/date-filter.dto");
const project_status_enum_1 = require("../../../common/enums/project-status.enum");
class DashboardQueryDto extends date_filter_dto_1.DateFilterQueryDto {
}
exports.DashboardQueryDto = DashboardQueryDto;
class DashboardYearQueryDto extends date_filter_dto_1.DateFilterQueryDto {
    year;
}
exports.DashboardYearQueryDto = DashboardYearQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 2026, description: 'Calendar year for the monthly series' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => (value === undefined || value === '' ? undefined : Number(value))),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(2000),
    (0, class_validator_1.Max)(2999),
    __metadata("design:type", Number)
], DashboardYearQueryDto.prototype, "year", void 0);
class DashboardSummaryDto {
    totalClients;
    activeClients;
    inactiveClients;
    totalProjects;
    activeProjects;
    completedProjects;
    onHoldProjects;
    draftProjects;
    cancelledProjects;
    projectsWithFixedAmount;
    projectsWithoutDefinedAmount;
    paymentsToday;
    paymentsThisWeek;
    paymentsThisMonth;
    paymentsThisYear;
    receiptsToday;
    receiptsThisWeek;
    receiptsThisMonth;
    receiptsThisYear;
    paymentsInPeriod;
    receiptsInPeriod;
    financialLocked;
    totalProjectValue;
    totalReceived;
    totalDue;
    variableReceived;
    receivedInPeriod;
}
exports.DashboardSummaryDto = DashboardSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "totalClients", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "activeClients", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "inactiveClients", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "totalProjects", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "activeProjects", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "completedProjects", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "onHoldProjects", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "draftProjects", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "cancelledProjects", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Projects with a fixed project amount' }),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "projectsWithFixedAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Monthly/variable projects with no defined amount' }),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "projectsWithoutDefinedAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "paymentsToday", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "paymentsThisWeek", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "paymentsThisMonth", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "paymentsThisYear", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "receiptsToday", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "receiptsThisWeek", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "receiptsThisMonth", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "receiptsThisYear", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "paymentsInPeriod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "receiptsInPeriod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], DashboardSummaryDto.prototype, "financialLocked", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, description: 'Fixed-amount projects only.' }),
    __metadata("design:type", Object)
], DashboardSummaryDto.prototype, "totalProjectValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, description: 'All projects, all time.' }),
    __metadata("design:type", Object)
], DashboardSummaryDto.prototype, "totalReceived", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, description: 'Fixed-amount projects only.' }),
    __metadata("design:type", Object)
], DashboardSummaryDto.prototype, "totalDue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, description: 'Collected on variable projects.' }),
    __metadata("design:type", Object)
], DashboardSummaryDto.prototype, "variableReceived", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true, description: 'Collected within the selected period.' }),
    __metadata("design:type", Object)
], DashboardSummaryDto.prototype, "receivedInPeriod", void 0);
class MonthlyCollectionPointDto {
    month;
    paymentCount;
    receiptCount;
    totalReceived;
}
exports.MonthlyCollectionPointDto = MonthlyCollectionPointDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-01' }),
    __metadata("design:type", String)
], MonthlyCollectionPointDto.prototype, "month", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], MonthlyCollectionPointDto.prototype, "paymentCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], MonthlyCollectionPointDto.prototype, "receiptCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], MonthlyCollectionPointDto.prototype, "totalReceived", void 0);
class PaymentMethodStatDto {
    method;
    label;
    count;
    totalReceived;
}
exports.PaymentMethodStatDto = PaymentMethodStatDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'BANK_TRANSFER' }),
    __metadata("design:type", String)
], PaymentMethodStatDto.prototype, "method", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Bank Transfer' }),
    __metadata("design:type", String)
], PaymentMethodStatDto.prototype, "label", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], PaymentMethodStatDto.prototype, "count", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], PaymentMethodStatDto.prototype, "totalReceived", void 0);
class ProjectStatusStatDto {
    status;
    label;
    count;
}
exports.ProjectStatusStatDto = ProjectStatusStatDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: project_status_enum_1.ProjectStatus }),
    __metadata("design:type", String)
], ProjectStatusStatDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ProjectStatusStatDto.prototype, "label", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], ProjectStatusStatDto.prototype, "count", void 0);
class RecentActivityDto {
    id;
    userName;
    action;
    actionLabel;
    module;
    description;
    createdAt;
}
exports.RecentActivityDto = RecentActivityDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RecentActivityDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], RecentActivityDto.prototype, "userName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RecentActivityDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Human-readable action label, e.g. "Received Payment"' }),
    __metadata("design:type", String)
], RecentActivityDto.prototype, "actionLabel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], RecentActivityDto.prototype, "module", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], RecentActivityDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], RecentActivityDto.prototype, "createdAt", void 0);
class TopEntityRowDto {
    id;
    name;
    secondaryName;
    amount;
}
exports.TopEntityRowDto = TopEntityRowDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TopEntityRowDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TopEntityRowDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    __metadata("design:type", Object)
], TopEntityRowDto.prototype, "secondaryName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], TopEntityRowDto.prototype, "amount", void 0);
class DashboardTopListsDto {
    financialLocked;
    topClientsByReceived;
    topProjectsByReceived;
    topClientsByOutstanding;
}
exports.DashboardTopListsDto = DashboardTopListsDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], DashboardTopListsDto.prototype, "financialLocked", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [TopEntityRowDto] }),
    __metadata("design:type", Array)
], DashboardTopListsDto.prototype, "topClientsByReceived", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [TopEntityRowDto] }),
    __metadata("design:type", Array)
], DashboardTopListsDto.prototype, "topProjectsByReceived", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [TopEntityRowDto] }),
    __metadata("design:type", Array)
], DashboardTopListsDto.prototype, "topClientsByOutstanding", void 0);
//# sourceMappingURL=dashboard.dto.js.map