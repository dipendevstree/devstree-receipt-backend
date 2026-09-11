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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const error_codes_1 = require("../../common/constants/error-codes");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const payment_enum_1 = require("../../common/enums/payment.enum");
const app_exception_1 = require("../../common/exceptions/app.exception");
const money_util_1 = require("../../common/utils/money.util");
const client_entity_1 = require("../clients/entities/client.entity");
const project_financials_service_1 = require("../financial/services/project-financials.service");
const mask_util_1 = require("../financial/utils/mask.util");
const payment_entity_1 = require("../payments/entities/payment.entity");
const project_entity_1 = require("../projects/entities/project.entity");
let ReportsService = class ReportsService {
    clients;
    projects;
    payments;
    financials;
    constructor(clients, projects, payments, financials) {
        this.clients = clients;
        this.projects = projects;
        this.payments = payments;
        this.financials = financials;
    }
    async duePayments(query, unlocked) {
        const builder = this.projects
            .createQueryBuilder('project')
            .leftJoinAndSelect('project.client', 'client')
            .where('project.deleted_at IS NULL');
        if (query.clientId)
            builder.andWhere('project.client_id = :clientId', { clientId: query.clientId });
        if (query.projectStatus)
            builder.andWhere('project.status = :status', { status: query.projectStatus });
        const projects = await builder.orderBy('project.created_at', 'DESC').getMany();
        const totalsMap = await this.financials.totalsForProjects(projects);
        let rows = projects
            .map((project) => {
            const totals = totalsMap.get(project.id);
            if (!totals || !totals.dueAmount.isPositive())
                return null;
            if (query.paymentStatus && totals.paymentStatus !== query.paymentStatus)
                return null;
            return {
                clientId: project.clientId,
                clientName: project.client?.name ?? '',
                projectId: project.id,
                projectName: project.projectName,
                projectAmount: (0, mask_util_1.maskAmount)(totals.projectAmount, unlocked),
                totalReceived: (0, mask_util_1.maskAmount)(totals.totalReceived, unlocked),
                dueAmount: (0, mask_util_1.maskAmount)(totals.dueAmount, unlocked),
                lastPaymentDate: totals.lastPaymentDate,
                paymentStatus: totals.paymentStatus,
                projectStatus: project.status,
            };
        })
            .filter((row) => row !== null);
        const total = rows.length;
        rows = rows.slice(query.skip, query.skip + query.limit);
        return pagination_dto_1.PaginatedResult.of(rows, total, query.page, query.limit);
    }
    async clientCollection(unlocked) {
        const clients = await this.clients.find({
            where: { deletedAt: (0, typeorm_2.IsNull)() },
            order: { name: 'ASC' },
        });
        const totals = await this.financials.totalsForClients(clients.map((c) => c.id));
        return clients.map((client) => {
            const t = totals.get(client.id);
            return {
                clientId: client.id,
                clientName: client.name,
                projectCount: t?.projectCount ?? 0,
                totalProjectValue: t ? (0, mask_util_1.maskAmount)(t.totalProjectValue, unlocked) : null,
                totalReceived: t ? (0, mask_util_1.maskAmount)(t.totalReceived, unlocked) : null,
                totalDue: t ? (0, mask_util_1.maskAmount)(t.totalDue, unlocked) : null,
            };
        });
    }
    async projectCollection(unlocked) {
        const projects = await this.projects.find({
            where: { deletedAt: (0, typeorm_2.IsNull)() },
            relations: { client: true },
            order: { createdAt: 'DESC' },
        });
        const totals = await this.financials.totalsForProjects(projects);
        return projects.map((project) => {
            const t = totals.get(project.id);
            return {
                clientId: project.clientId,
                clientName: project.client?.name ?? '',
                projectId: project.id,
                projectName: project.projectName,
                projectAmount: t ? (0, mask_util_1.maskAmount)(t.projectAmount, unlocked) : null,
                totalReceived: t ? (0, mask_util_1.maskAmount)(t.totalReceived, unlocked) : null,
                dueAmount: t ? (0, mask_util_1.maskAmount)(t.dueAmount, unlocked) : null,
            };
        });
    }
    async paymentReport(query, unlocked) {
        const builder = this.payments
            .createQueryBuilder('payment')
            .leftJoinAndSelect('payment.client', 'client')
            .leftJoinAndSelect('payment.project', 'project')
            .leftJoinAndSelect('payment.receipt', 'receipt')
            .where('payment.deleted_at IS NULL')
            .andWhere('payment.status = :status', { status: payment_enum_1.PaymentStatus.VALID });
        if (query.clientId)
            builder.andWhere('payment.client_id = :clientId', { clientId: query.clientId });
        if (query.projectId)
            builder.andWhere('payment.project_id = :projectId', { projectId: query.projectId });
        if (query.dateFrom)
            builder.andWhere('payment.payment_date >= :from', { from: query.dateFrom });
        if (query.dateTo)
            builder.andWhere('payment.payment_date <= :to', { to: query.dateTo });
        builder.orderBy((0, pagination_dto_1.resolveSortColumn)(query.sortBy, { paymentDate: 'payment.payment_date' }, 'paymentDate'), query.sortOrder ?? 'DESC');
        const payments = await builder.getMany();
        return payments.map((payment) => this.toPaymentRow(payment, unlocked));
    }
    async monthlyCollection(months, unlocked) {
        const since = new Date();
        since.setMonth(since.getMonth() - (months - 1));
        since.setDate(1);
        const payments = await this.payments.find({
            where: { status: payment_enum_1.PaymentStatus.VALID, deletedAt: (0, typeorm_2.IsNull)() },
        });
        const buckets = new Map();
        for (let i = 0; i < months; i++) {
            const date = new Date(since);
            date.setMonth(date.getMonth() + i);
            buckets.set(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, {
                count: 0,
                total: money_util_1.Money.zero(),
            });
        }
        for (const payment of payments) {
            const paymentDate = new Date(payment.paymentDate);
            const key = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
            const bucket = buckets.get(key);
            if (!bucket)
                continue;
            bucket.count += 1;
            if (unlocked)
                bucket.total = bucket.total.add(this.financials.decryptPaymentAmount(payment));
        }
        return Array.from(buckets.entries()).map(([month, bucket]) => ({
            month,
            paymentCount: bucket.count,
            totalReceived: unlocked ? (0, mask_util_1.maskAmount)(bucket.total, true) : null,
        }));
    }
    async clientStatement(clientId, unlocked) {
        const client = await this.clients.findOne({ where: { id: clientId, deletedAt: (0, typeorm_2.IsNull)() } });
        if (!client) {
            throw app_exception_1.AppException.notFound(error_codes_1.ErrorCode.CLIENT_NOT_FOUND, 'Client not found.');
        }
        const projects = await this.projects.find({
            where: { clientId, deletedAt: (0, typeorm_2.IsNull)() },
            order: { createdAt: 'ASC' },
        });
        const totalsMap = await this.financials.totalsForProjects(projects);
        const projectDtos = await Promise.all(projects.map(async (project) => {
            const payments = await this.payments.find({
                where: { projectId: project.id, status: payment_enum_1.PaymentStatus.VALID, deletedAt: (0, typeorm_2.IsNull)() },
                relations: { client: true, project: true, receipt: true },
                order: { paymentDate: 'ASC' },
            });
            const totals = totalsMap.get(project.id);
            return {
                projectId: project.id,
                projectName: project.projectName,
                projectAmount: totals ? (0, mask_util_1.maskAmount)(totals.projectAmount, unlocked) : null,
                totalReceived: totals ? (0, mask_util_1.maskAmount)(totals.totalReceived, unlocked) : null,
                dueAmount: totals ? (0, mask_util_1.maskAmount)(totals.dueAmount, unlocked) : null,
                payments: payments.map((payment) => this.toPaymentRow(payment, unlocked)),
            };
        }));
        let totalProjectValue = money_util_1.Money.zero();
        let totalReceived = money_util_1.Money.zero();
        for (const project of projects) {
            const totals = totalsMap.get(project.id);
            if (!totals)
                continue;
            totalProjectValue = totalProjectValue.add(totals.projectAmount);
            totalReceived = totalReceived.add(totals.totalReceived);
        }
        return {
            clientId: client.id,
            clientName: client.name,
            projects: projectDtos,
            totalProjectValue: unlocked ? (0, mask_util_1.maskAmount)(totalProjectValue, true) : null,
            totalReceived: unlocked ? (0, mask_util_1.maskAmount)(totalReceived, true) : null,
            totalDue: unlocked
                ? (0, mask_util_1.maskAmount)(totalProjectValue.subtract(totalReceived).clampToZero(), true)
                : null,
        };
    }
    async projectStatement(projectId, unlocked) {
        const project = await this.projects.findOne({
            where: { id: projectId, deletedAt: (0, typeorm_2.IsNull)() },
            relations: { client: true },
        });
        if (!project) {
            throw app_exception_1.AppException.notFound(error_codes_1.ErrorCode.PROJECT_NOT_FOUND, 'Project not found.');
        }
        const [totals, payments] = await Promise.all([
            this.financials.totalsForProject(project),
            this.payments.find({
                where: { projectId, status: payment_enum_1.PaymentStatus.VALID, deletedAt: (0, typeorm_2.IsNull)() },
                relations: { client: true, project: true, receipt: true },
                order: { paymentDate: 'ASC' },
            }),
        ]);
        return {
            projectId: project.id,
            projectName: project.projectName,
            clientId: project.clientId,
            clientName: project.client?.name ?? '',
            projectAmount: (0, mask_util_1.maskAmount)(totals.projectAmount, unlocked),
            totalReceived: (0, mask_util_1.maskAmount)(totals.totalReceived, unlocked),
            dueAmount: (0, mask_util_1.maskAmount)(totals.dueAmount, unlocked),
            payments: payments.map((payment) => this.toPaymentRow(payment, unlocked)),
        };
    }
    toPaymentRow(payment, unlocked) {
        const amount = unlocked ? this.financials.decryptPaymentAmount(payment) : null;
        return {
            paymentDate: payment.paymentDate,
            clientName: payment.client?.name ?? '',
            projectName: payment.project?.projectName ?? '',
            receiptNumber: payment.receipt?.receiptNumber ?? null,
            amount: (0, mask_util_1.maskAmount)(amount, unlocked),
            paymentMethod: payment.paymentMethod,
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(client_entity_1.Client)),
    __param(1, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __param(2, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        project_financials_service_1.ProjectFinancialsService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map