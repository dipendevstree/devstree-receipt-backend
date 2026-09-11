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
exports.MonthlyCollectionPointDto = exports.DashboardSummaryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class DashboardSummaryDto {
    totalClients;
    totalProjects;
    financialLocked;
    totalProjectValue;
    totalReceived;
    totalDue;
}
exports.DashboardSummaryDto = DashboardSummaryDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "totalClients", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], DashboardSummaryDto.prototype, "totalProjects", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], DashboardSummaryDto.prototype, "financialLocked", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], DashboardSummaryDto.prototype, "totalProjectValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], DashboardSummaryDto.prototype, "totalReceived", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], DashboardSummaryDto.prototype, "totalDue", void 0);
class MonthlyCollectionPointDto {
    month;
    paymentCount;
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
    (0, swagger_1.ApiPropertyOptional)({ nullable: true }),
    __metadata("design:type", Object)
], MonthlyCollectionPointDto.prototype, "totalReceived", void 0);
//# sourceMappingURL=dashboard.dto.js.map