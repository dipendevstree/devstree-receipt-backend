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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const audit_action_enum_1 = require("../../common/enums/audit-action.enum");
const client_status_enum_1 = require("../../common/enums/client-status.enum");
const payment_enum_1 = require("../../common/enums/payment.enum");
const project_status_enum_1 = require("../../common/enums/project-status.enum");
const date_range_util_1 = require("../../common/utils/date-range.util");
const money_util_1 = require("../../common/utils/money.util");
const audit_log_entity_1 = require("../audit-logs/entities/audit-log.entity");
const client_entity_1 = require("../clients/entities/client.entity");
const project_financials_service_1 = require("../financial/services/project-financials.service");
const mask_util_1 = require("../financial/utils/mask.util");
const master_type_enum_1 = require("../../common/enums/master-type.enum");
const master_item_entity_1 = require("../masters/entities/master-item.entity");
const payment_entity_1 = require("../payments/entities/payment.entity");
const project_entity_1 = require("../projects/entities/project.entity");
const receipt_entity_1 = require("../receipts/entities/receipt.entity");
const PROJECT_STATUS_LABELS = {
    [project_status_enum_1.ProjectStatus.DRAFT]: 'Draft',
    [project_status_enum_1.ProjectStatus.ACTIVE]: 'Active',
    [project_status_enum_1.ProjectStatus.ON_HOLD]: 'On Hold',
    [project_status_enum_1.ProjectStatus.COMPLETED]: 'Completed',
    [project_status_enum_1.ProjectStatus.CANCELLED]: 'Cancelled',
};
const TOP_LIST_SIZE = 5;
let DashboardService = class DashboardService {
    clients;
    projects;
    payments;
    receipts;
    auditLogs;
    masters;
    financials;
    constructor(clients, projects, payments, receipts, auditLogs, masters, financials) {
        this.clients = clients;
        this.projects = projects;
        this.payments = payments;
        this.receipts = receipts;
        this.auditLogs = auditLogs;
        this.masters = masters;
        this.financials = financials;
    }
    async summary(query, unlocked) {
        const period = query.resolveRange();
        const [totalClients, activeClients, projects, paymentsToday, paymentsThisWeek, paymentsThisMonth, paymentsThisYear, receiptsToday, receiptsThisWeek, receiptsThisMonth, receiptsThisYear, paymentsInPeriod, receiptsInPeriod,] = await Promise.all([
            this.clients.count({ where: { deletedAt: (0, typeorm_2.IsNull)() } }),
            this.clients.count({ where: { deletedAt: (0, typeorm_2.IsNull)(), status: client_status_enum_1.ClientStatus.ACTIVE } }),
            this.projects.find({ where: { deletedAt: (0, typeorm_2.IsNull)() } }),
            this.countPayments((0, date_range_util_1.resolveDateRange)({ preset: date_range_util_1.DatePreset.TODAY })),
            this.countPayments((0, date_range_util_1.resolveDateRange)({ preset: date_range_util_1.DatePreset.THIS_WEEK })),
            this.countPayments((0, date_range_util_1.resolveDateRange)({ preset: date_range_util_1.DatePreset.THIS_MONTH })),
            this.countPayments((0, date_range_util_1.resolveDateRange)({ preset: date_range_util_1.DatePreset.THIS_YEAR })),
            this.countReceipts((0, date_range_util_1.resolveDateRange)({ preset: date_range_util_1.DatePreset.TODAY })),
            this.countReceipts((0, date_range_util_1.resolveDateRange)({ preset: date_range_util_1.DatePreset.THIS_WEEK })),
            this.countReceipts((0, date_range_util_1.resolveDateRange)({ preset: date_range_util_1.DatePreset.THIS_MONTH })),
            this.countReceipts((0, date_range_util_1.resolveDateRange)({ preset: date_range_util_1.DatePreset.THIS_YEAR })),
            this.countPayments(period),
            this.countReceipts(period),
        ]);
        const byStatus = (status) => projects.filter((project) => project.status === status).length;
        let totalProjectValue = money_util_1.Money.zero();
        let fixedReceived = money_util_1.Money.zero();
        let variableReceived = money_util_1.Money.zero();
        let receivedInPeriod = money_util_1.Money.zero();
        if (unlocked && projects.length > 0) {
            const totals = await this.financials.totalsForProjects(projects);
            for (const project of projects) {
                const projectTotals = totals.get(project.id);
                if (!projectTotals)
                    continue;
                if (projectTotals.projectAmount === null) {
                    variableReceived = variableReceived.add(projectTotals.totalReceived);
                }
                else {
                    totalProjectValue = totalProjectValue.add(projectTotals.projectAmount);
                    fixedReceived = fixedReceived.add(projectTotals.totalReceived);
                }
            }
            receivedInPeriod = await this.sumPayments(period);
        }
        const totalReceived = fixedReceived.add(variableReceived);
        return {
            totalClients,
            activeClients,
            inactiveClients: totalClients - activeClients,
            totalProjects: projects.length,
            activeProjects: byStatus(project_status_enum_1.ProjectStatus.ACTIVE),
            completedProjects: byStatus(project_status_enum_1.ProjectStatus.COMPLETED),
            onHoldProjects: byStatus(project_status_enum_1.ProjectStatus.ON_HOLD),
            draftProjects: byStatus(project_status_enum_1.ProjectStatus.DRAFT),
            cancelledProjects: byStatus(project_status_enum_1.ProjectStatus.CANCELLED),
            projectsWithFixedAmount: projects.filter((project) => project.hasProjectAmount()).length,
            projectsWithoutDefinedAmount: projects.filter((project) => !project.hasProjectAmount())
                .length,
            paymentsToday,
            paymentsThisWeek,
            paymentsThisMonth,
            paymentsThisYear,
            receiptsToday,
            receiptsThisWeek,
            receiptsThisMonth,
            receiptsThisYear,
            paymentsInPeriod,
            receiptsInPeriod,
            financialLocked: !unlocked,
            totalProjectValue: (0, mask_util_1.maskAmount)(totalProjectValue, unlocked),
            totalReceived: (0, mask_util_1.maskAmount)(totalReceived, unlocked),
            totalDue: (0, mask_util_1.maskAmount)(totalProjectValue.subtract(fixedReceived).clampToZero(), unlocked),
            variableReceived: (0, mask_util_1.maskAmount)(variableReceived, unlocked),
            receivedInPeriod: (0, mask_util_1.maskAmount)(receivedInPeriod, unlocked),
        };
    }
    async monthlyCollection(year, unlocked) {
        const payments = await this.payments.find({
            where: {
                status: payment_enum_1.PaymentStatus.VALID,
                deletedAt: (0, typeorm_2.IsNull)(),
                paymentDate: (0, typeorm_2.Between)(`${year}-01-01`, `${year}-12-31`),
            },
            relations: { receipt: true },
        });
        const buckets = new Map((0, date_range_util_1.monthKeysOfYear)(year).map((key) => [
            key,
            { paymentCount: 0, receiptCount: 0, total: money_util_1.Money.zero() },
        ]));
        for (const payment of payments) {
            const bucket = buckets.get((0, date_range_util_1.monthKeyOf)(payment.paymentDate));
            if (!bucket)
                continue;
            bucket.paymentCount += 1;
            if (payment.receipt)
                bucket.receiptCount += 1;
            if (unlocked)
                bucket.total = bucket.total.add(this.financials.decryptPaymentAmount(payment));
        }
        return [...buckets.entries()].map(([month, bucket]) => ({
            month,
            paymentCount: bucket.paymentCount,
            receiptCount: bucket.receiptCount,
            totalReceived: (0, mask_util_1.maskAmount)(bucket.total, unlocked),
        }));
    }
    async paymentMethodDistribution(query, unlocked) {
        const range = query.resolveRange();
        const payments = await this.payments.find({ where: this.paymentWhere(range) });
        const methodMasters = await this.masters.find({
            where: { type: master_type_enum_1.MasterType.PAYMENT_METHOD, deletedAt: (0, typeorm_2.IsNull)() },
            order: { sortOrder: 'ASC' },
        });
        const labels = new Map(methodMasters.map((item) => [item.code, item.name]));
        const buckets = new Map();
        const order = methodMasters.length
            ? methodMasters.map((item) => item.code)
            : Object.values(payment_enum_1.PaymentMethod);
        for (const code of order)
            buckets.set(code, { count: 0, total: money_util_1.Money.zero() });
        for (const payment of payments) {
            let bucket = buckets.get(payment.paymentMethod);
            if (!bucket) {
                bucket = { count: 0, total: money_util_1.Money.zero() };
                buckets.set(payment.paymentMethod, bucket);
            }
            bucket.count += 1;
            if (unlocked)
                bucket.total = bucket.total.add(this.financials.decryptPaymentAmount(payment));
        }
        return [...buckets.entries()].map(([method, bucket]) => ({
            method,
            label: labels.get(method) ?? method.replace(/_/g, ' '),
            count: bucket.count,
            totalReceived: (0, mask_util_1.maskAmount)(bucket.total, unlocked),
        }));
    }
    async projectStatusDistribution(query) {
        const range = query.resolveRange();
        const builder = this.projects
            .createQueryBuilder('project')
            .select('project.status', 'status')
            .addSelect('COUNT(*)::int', 'count')
            .where('project.deleted_at IS NULL')
            .groupBy('project.status');
        if (range.from)
            builder.andWhere('project.created_at >= :from', { from: range.from });
        if (range.to) {
            builder.andWhere("project.created_at < (:to::date + INTERVAL '1 day')", { to: range.to });
        }
        const rows = (await builder.getRawMany());
        const counts = new Map(rows.map((row) => [row.status, row.count]));
        return Object.values(project_status_enum_1.ProjectStatus).map((status) => ({
            status,
            label: PROJECT_STATUS_LABELS[status],
            count: counts.get(status) ?? 0,
        }));
    }
    async recentActivity(limit = 10) {
        const logs = await this.auditLogs.find({
            relations: { user: true },
            order: { createdAt: 'DESC' },
            take: Math.min(50, Math.max(1, limit)),
        });
        return logs.map((log) => ({
            id: log.id,
            userName: log.user?.name ?? null,
            action: log.action,
            actionLabel: audit_action_enum_1.AUDIT_ACTION_LABELS[log.action] ?? humanise(log.action),
            module: log.module,
            description: log.description ?? null,
            createdAt: log.createdAt,
        }));
    }
    async topLists(query, unlocked) {
        if (!unlocked) {
            return {
                financialLocked: true,
                topClientsByReceived: [],
                topProjectsByReceived: [],
                topClientsByOutstanding: [],
            };
        }
        const projects = await this.projects.find({
            where: { deletedAt: (0, typeorm_2.IsNull)() },
            relations: { client: true },
        });
        const totals = await this.financials.totalsForProjects(projects);
        const projectRows = [];
        const byClient = new Map();
        for (const project of projects) {
            const projectTotals = totals.get(project.id);
            if (!projectTotals)
                continue;
            projectRows.push({
                id: project.id,
                name: project.projectName,
                secondaryName: project.client?.name ?? null,
                amount: projectTotals.totalReceived.toDecimalString(),
            });
            const clientId = project.clientId;
            const bucket = byClient.get(clientId) ?? {
                name: project.client?.name ?? '',
                received: money_util_1.Money.zero(),
                due: money_util_1.Money.zero(),
            };
            bucket.received = bucket.received.add(projectTotals.totalReceived);
            if (projectTotals.dueAmount)
                bucket.due = bucket.due.add(projectTotals.dueAmount);
            byClient.set(clientId, bucket);
        }
        const clientRows = [...byClient.entries()];
        return {
            financialLocked: false,
            topClientsByReceived: clientRows
                .map(([id, bucket]) => ({
                id,
                name: bucket.name,
                secondaryName: null,
                amount: bucket.received.toDecimalString(),
            }))
                .filter((row) => Number(row.amount) > 0)
                .sort(byAmountDesc)
                .slice(0, TOP_LIST_SIZE),
            topProjectsByReceived: projectRows
                .filter((row) => Number(row.amount) > 0)
                .sort(byAmountDesc)
                .slice(0, TOP_LIST_SIZE),
            topClientsByOutstanding: clientRows
                .map(([id, bucket]) => ({
                id,
                name: bucket.name,
                secondaryName: null,
                amount: bucket.due.toDecimalString(),
            }))
                .filter((row) => Number(row.amount) > 0)
                .sort(byAmountDesc)
                .slice(0, TOP_LIST_SIZE),
        };
    }
    paymentWhere(range) {
        const base = { status: payment_enum_1.PaymentStatus.VALID, deletedAt: (0, typeorm_2.IsNull)() };
        if (range.from && range.to) {
            return { ...base, paymentDate: (0, typeorm_2.Between)(range.from, range.to) };
        }
        if (range.from)
            return { ...base, paymentDate: (0, typeorm_2.MoreThanOrEqual)(range.from) };
        if (range.to)
            return { ...base, paymentDate: (0, typeorm_2.LessThanOrEqual)(range.to) };
        return base;
    }
    countPayments(range) {
        return this.payments.count({ where: this.paymentWhere(range) });
    }
    countReceipts(range) {
        const builder = this.receipts.createQueryBuilder('receipt');
        if (range.from)
            builder.andWhere('receipt.receipt_date >= :from', { from: range.from });
        if (range.to)
            builder.andWhere('receipt.receipt_date <= :to', { to: range.to });
        return builder.getCount();
    }
    async sumPayments(range) {
        const payments = await this.payments.find({ where: this.paymentWhere(range) });
        let total = money_util_1.Money.zero();
        for (const payment of payments) {
            total = total.add(this.financials.decryptPaymentAmount(payment));
        }
        return total;
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(client_entity_1.Client)),
    __param(1, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __param(2, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __param(3, (0, typeorm_1.InjectRepository)(receipt_entity_1.Receipt)),
    __param(4, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __param(5, (0, typeorm_1.InjectRepository)(master_item_entity_1.MasterItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        project_financials_service_1.ProjectFinancialsService])
], DashboardService);
function byAmountDesc(a, b) {
    return Number(b.amount ?? 0) - Number(a.amount ?? 0);
}
function humanise(value) {
    return value
        .toLowerCase()
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
//# sourceMappingURL=dashboard.service.js.map