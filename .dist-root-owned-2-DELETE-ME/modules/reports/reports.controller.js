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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const financial_unlock_decorator_1 = require("../../common/decorators/financial-unlock.decorator");
const permissions_decorator_1 = require("../../common/decorators/permissions.decorator");
const permission_enum_1 = require("../../common/enums/permission.enum");
const date_range_util_1 = require("../../common/utils/date-range.util");
const report_dto_1 = require("./dto/report.dto");
const reports_service_1 = require("./reports.service");
const report_export_service_1 = require("./services/report-export.service");
let ReportsController = class ReportsController {
    reportsService;
    exportService;
    constructor(reportsService, exportService) {
        this.reportsService = reportsService;
        this.exportService = exportService;
    }
    duePayments(query) {
        return this.reportsService.duePayments(query, true);
    }
    async clientCollection(query, format, res) {
        const rows = await this.reportsService.clientCollection(query, true);
        return this.respond(res, format, 'client-collection', rows, [
            { key: 'clientName', header: 'Client' },
            { key: 'projectCount', header: 'Projects' },
            { key: 'fixedProjectCount', header: 'Fixed-Amount Projects' },
            { key: 'variableProjectCount', header: 'Variable Projects' },
            { key: 'totalProjectValue', header: 'Project Value (Fixed)' },
            { key: 'totalReceived', header: 'Received (All)' },
            { key: 'variableReceived', header: 'Received (Variable)' },
            { key: 'totalDue', header: 'Due (Fixed)' },
        ]);
    }
    async projectCollection(query, format, res) {
        const rows = await this.reportsService.projectCollection(query, true);
        const exportable = rows.map((row) => ({
            ...row,
            projectAmount: row.hasProjectAmount ? row.projectAmount : 'Not Defined',
            dueAmount: row.hasProjectAmount ? row.dueAmount : 'N/A',
        }));
        return this.respond(res, format, 'project-collection', exportable, [
            { key: 'clientName', header: 'Client' },
            { key: 'projectCode', header: 'Project Code' },
            { key: 'projectName', header: 'Project' },
            { key: 'projectStatus', header: 'Status' },
            { key: 'projectAmount', header: 'Project Amount' },
            { key: 'totalReceived', header: 'Received' },
            { key: 'dueAmount', header: 'Due' },
        ]);
    }
    async paymentReport(query, format, res) {
        const rows = await this.reportsService.paymentReport(query, true);
        return this.respond(res, format, 'payment-report', rows, [
            { key: 'paymentDate', header: 'Date' },
            { key: 'clientName', header: 'Client' },
            { key: 'projectName', header: 'Project' },
            { key: 'receiptNumber', header: 'Receipt' },
            { key: 'amount', header: 'Amount' },
            { key: 'paymentMethod', header: 'Method' },
            { key: 'transactionReference', header: 'Reference' },
            { key: 'status', header: 'Status' },
            { key: 'createdByName', header: 'Recorded By' },
        ]);
    }
    async monthlyCollection(query, year, format, res) {
        const resolvedYear = resolveYear(year);
        const rows = await this.reportsService.monthlyCollection(resolvedYear, query, true);
        return this.respond(res, format, `monthly-collection-${resolvedYear}`, rows, [
            { key: 'month', header: 'Month' },
            { key: 'paymentCount', header: 'Payments' },
            { key: 'receiptCount', header: 'Receipts' },
            { key: 'totalReceived', header: 'Received' },
        ]);
    }
    clientStatement(clientId) {
        return this.reportsService.clientStatement(clientId, true);
    }
    projectStatement(projectId) {
        return this.reportsService.projectStatement(projectId, true);
    }
    async respond(res, format, filename, rows, columns) {
        if (format === 'csv') {
            const csv = this.exportService.toCsv(columns, rows);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
            res.send(csv);
            return;
        }
        if (format === 'excel') {
            const buffer = await this.exportService.toExcel(filename, columns, rows);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
            res.send(buffer);
            return;
        }
        return rows;
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('due-payments'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.REPORTS_VIEW),
    (0, swagger_1.ApiOperation)({
        summary: 'Projects with an outstanding due amount',
        description: 'Projects without a defined amount are excluded: they have no due by definition, so listing them with a zero would be misleading.',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [report_dto_1.DuePaymentsQueryDto]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "duePayments", null);
__decorate([
    (0, common_1.Get)('client-collection'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.REPORTS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Collection totals grouped by client' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('format')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [report_dto_1.ReportFilterQueryDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "clientCollection", null);
__decorate([
    (0, common_1.Get)('project-collection'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.REPORTS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Collection totals grouped by project' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('format')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [report_dto_1.ReportFilterQueryDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "projectCollection", null);
__decorate([
    (0, common_1.Get)('payments'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.REPORTS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Detailed payment report' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('format')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [report_dto_1.ReportFilterQueryDto, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "paymentReport", null);
__decorate([
    (0, common_1.Get)('monthly-collection'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.REPORTS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Monthly collection totals' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [report_dto_1.ReportFilterQueryDto, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "monthlyCollection", null);
__decorate([
    (0, common_1.Get)('client-statement/:clientId'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.REPORTS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Full statement for a client — all projects and payments' }),
    __param(0, (0, common_1.Param)('clientId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "clientStatement", null);
__decorate([
    (0, common_1.Get)('project-statement/:projectId'),
    (0, permissions_decorator_1.RequirePermissions)(permission_enum_1.Permission.REPORTS_VIEW),
    (0, swagger_1.ApiOperation)({ summary: 'Full statement for a project — every payment and the running due' }),
    __param(0, (0, common_1.Param)('projectId', new common_1.ParseUUIDPipe({ version: '4' }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "projectStatement", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiTags)('Reports'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, financial_unlock_decorator_1.RequireFinancialUnlock)(),
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService,
        report_export_service_1.ReportExportService])
], ReportsController);
function resolveYear(value) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2999) {
        return (0, date_range_util_1.currentYearInAppTimezone)();
    }
    return parsed;
}
//# sourceMappingURL=reports.controller.js.map