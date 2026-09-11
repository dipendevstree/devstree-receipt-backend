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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const financial_unlock_decorator_1 = require("../../common/decorators/financial-unlock.decorator");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const permission_enum_1 = require("../../common/enums/permission.enum");
const date_range_util_1 = require("../../common/utils/date-range.util");
const dashboard_service_1 = require("./dashboard.service");
const dashboard_dto_1 = require("./dto/dashboard.dto");
let DashboardController = class DashboardController {
    dashboardService;
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    summary(query, access) {
        return this.dashboardService.summary(query, access.unlocked);
    }
    monthlyCollection(query, access) {
        return this.dashboardService.monthlyCollection(query.year ?? (0, date_range_util_1.currentYearInAppTimezone)(), access.unlocked);
    }
    paymentMethods(query, access) {
        return this.dashboardService.paymentMethodDistribution(query, access.unlocked);
    }
    projectStatuses(query) {
        return this.dashboardService.projectStatusDistribution(query);
    }
    recentActivity(limit) {
        return this.dashboardService.recentActivity(Number(limit) || 10);
    }
    topLists(query, access) {
        return this.dashboardService.topLists(query, access.unlocked);
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('summary'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.CLIENTS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Dashboard statistics (financial figures masked unless unlocked)' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, financial_unlock_decorator_1.FinancialAccess)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_dto_1.DashboardQueryDto, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "summary", null);
__decorate([
    (0, common_1.Get)('monthly-collection'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.REPORTS_VIEW),
    (0, swagger_1.ApiOperation)({
        summary: 'Monthly payment/receipt series for one calendar year',
        description: 'Counts are always returned; amounts require an unlocked financial session and are null otherwise.',
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, financial_unlock_decorator_1.FinancialAccess)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_dto_1.DashboardYearQueryDto, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "monthlyCollection", null);
__decorate([
    (0, common_1.Get)('payment-methods'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.PAYMENTS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Payment count and total per payment method' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, financial_unlock_decorator_1.FinancialAccess)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_dto_1.DashboardQueryDto, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "paymentMethods", null);
__decorate([
    (0, common_1.Get)('project-statuses'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.PROJECTS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Project counts by status — contains no financial data' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_dto_1.DashboardQueryDto]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "projectStatuses", null);
__decorate([
    (0, common_1.Get)('recent-activity'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.CLIENTS_VIEW),
    (0, swagger_1.ApiOperation)({
        summary: 'Recent administrator activity from the audit trail',
        description: 'Names are the real administrators who performed each action. Amounts never appear.',
    }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "recentActivity", null);
__decorate([
    (0, common_1.Get)('top-lists'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.REPORTS_VIEW),
    (0, swagger_1.ApiOperation)({
        summary: 'Top clients/projects by received and outstanding amounts',
        description: 'Returns empty lists while the financial session is locked — even the ordering would leak relative amounts.',
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, financial_unlock_decorator_1.FinancialAccess)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dashboard_dto_1.DashboardQueryDto, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "topLists", null);
exports.DashboardController = DashboardController = __decorate([
    (0, swagger_1.ApiTags)('Dashboard'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('dashboard'),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map