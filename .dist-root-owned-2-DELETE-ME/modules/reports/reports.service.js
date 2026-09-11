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
const date_range_util_1 = require("../../common/utils/date-range.util");
const money_util_1 = require("../../common/utils/money.util");
const client_entity_1 = require("../clients/entities/client.entity");
const project_financials_service_1 = require("../financial/services/project-financials.service");
const mask_util_1 = require("../financial/utils/mask.util");
const payment_entity_1 = require("../payments/entities/payment.entity");
const project_entity_1 = require("../projects/entities/project.entity");
const PAYMENT_SORTABLE = {
    paymentDate: 'payment.paymentDate',
    clientName: 'client.name',
    projectName: 'project.projectName',
    paymentMethod: 'payment.paymentMethod',
    createdAt: 'payment.createdAt',
};
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
        const projects = await this.filteredProjects(query);
        const totalsMap = await this.financials.totalsForProjects(projects);
        const range = this.amountRange(query);
        let rows = projects
            .map((project) => {
            const totals = totalsMap.get(project.id);
            if (!totals)
                return null;
            if (totals.dueAmount === null || !totals.dueAmount.isPositive())
                return null;
            if (query.projectPaymentStatus && totals.paymentStatus !== query.projectPaymentStatus) {
                return null;
            }
            if (range && !this.withinRange(totals.dueAmount, range))
                return null;
            return this.toDueRow(project, totals, unlocked);
        })
            .filter((row) => row !== null);
        const total = rows.length;
        rows = rows.slice(query.skip, query.skip + query.limit);
        return pagination_dto_1.PaginatedResult.of(rows, total, query.page, query.limit);
    }
    async clientCollection(query, unlocked) {
        const builder = this.clients
            .createQueryBuilder('client')
            .where('client.deleted_at IS NULL')
            .orderBy('client.name', 'ASC');
        if (query.clientId)
            builder.andWhere('client.id = :clientId', { clientId: query.clientId });
        if (query.clientStatus)
            builder.andWhere('client.status = :clientStatus', { clientStatus: query.clientStatus });
        if (query.search) {
            const term = `%${query.search}%`;
            builder.andWhere(new typeorm_2.Brackets((qb) => qb
                .where('client.name ILIKE :term', { term })
                .orWhere('client.company_name ILIKE :term', { term })));
        }
        const clients = await builder.getMany();
        const totals = await this.financials.totalsForClients(clients.map((c) => c.id));
        return clients.map((client) => {
            const t = totals.get(client.id);
            return {
                clientId: client.id,
                clientName: client.name,
                projectCount: t?.projectCount ?? 0,
                fixedProjectCount: t?.fixedProjectCount ?? 0,
                variableProjectCount: t?.variableProjectCount ?? 0,
                totalProjectValue: (0, mask_util_1.maskAmount)(t?.totalProjectValue, unlocked),
                totalReceived: (0, mask_util_1.maskAmount)(t?.totalReceived, unlocked),
                variableReceived: (0, mask_util_1.maskAmount)(t?.variableReceived, unlocked),
                totalDue: (0, mask_util_1.maskAmount)(t?.totalDue, unlocked),
            };
        });
    }
    async projectCollection(query, unlocked) {
        const projects = await this.filteredProjects(query);
        const totals = await this.financials.totalsForProjects(projects);
        return projects
            .map((project) => {
            const t = totals.get(project.id);
            if (query.projectPaymentStatus && t?.paymentStatus !== query.projectPaymentStatus) {
                return null;
            }
            return {
                clientId: project.clientId,
                clientName: project.client?.name ?? '',
                projectId: project.id,
                projectCode: project.projectCode,
                projectName: project.projectName,
                projectStatus: project.status,
                hasProjectAmount: t?.hasProjectAmount ?? project.hasProjectAmount(),
                projectAmount: (0, mask_util_1.maskAmount)(t?.projectAmount ?? null, unlocked),
                totalReceived: (0, mask_util_1.maskAmount)(t?.totalReceived, unlocked),
                dueAmount: (0, mask_util_1.maskAmount)(t?.dueAmount ?? null, unlocked),
            };
        })
            .filter((row) => row !== null);
    }
    async paymentReport(query, unlocked) {
        const builder = this.paymentQuery(query);
        builder.orderBy((0, pagination_dto_1.resolveSortColumn)(query.sortBy, PAYMENT_SORTABLE, 'paymentDate'), query.sortOrder ?? 'DESC');
        let payments = await builder.getMany();
        const range = this.amountRange(query);
        if (range) {
            payments = payments.filter((payment) => this.withinRange(this.financials.decryptPaymentAmount(payment), range));
        }
        return payments.map((payment) => this.toPaymentRow(payment, unlocked));
    }
    async monthlyCollection(year, query, unlocked) {
        const builder = this.paymentQuery(query, { skipDateRange: true })
            .andWhere('payment.payment_date >= :yearStart', { yearStart: `${year}-01-01` })
            .andWhere('payment.payment_date <= :yearEnd', { yearEnd: `${year}-12-31` });
        const payments = await builder.getMany();
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
                relations: { client: true, project: true, receipt: true, createdByUser: true },
                order: { paymentDate: 'ASC' },
            });
            const totals = totalsMap.get(project.id);
            return {
                projectId: project.id,
                projectName: project.projectName,
                hasProjectAmount: totals?.hasProjectAmount ?? project.hasProjectAmount(),
                projectAmount: (0, mask_util_1.maskAmount)(totals?.projectAmount ?? null, unlocked),
                totalReceived: (0, mask_util_1.maskAmount)(totals?.totalReceived, unlocked),
                dueAmount: (0, mask_util_1.maskAmount)(totals?.dueAmount ?? null, unlocked),
                payments: payments.map((payment) => this.toPaymentRow(payment, unlocked)),
            };
        }));
        const clientTotals = await this.financials.totalsForClient(clientId);
        return {
            clientId: client.id,
            clientName: client.name,
            projects: projectDtos,
            fixedProjectCount: clientTotals.fixedProjectCount,
            variableProjectCount: clientTotals.variableProjectCount,
            totalProjectValue: (0, mask_util_1.maskAmount)(clientTotals.totalProjectValue, unlocked),
            totalReceived: (0, mask_util_1.maskAmount)(clientTotals.totalReceived, unlocked),
            variableReceived: (0, mask_util_1.maskAmount)(clientTotals.variableReceived, unlocked),
            totalDue: (0, mask_util_1.maskAmount)(clientTotals.totalDue, unlocked),
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
                relations: { client: true, project: true, receipt: true, createdByUser: true },
                order: { paymentDate: 'ASC' },
            }),
        ]);
        return {
            projectId: project.id,
            projectName: project.projectName,
            clientId: project.clientId,
            clientName: project.client?.name ?? '',
            hasProjectAmount: totals.hasProjectAmount,
            projectAmount: (0, mask_util_1.maskAmount)(totals.projectAmount, unlocked),
            totalReceived: (0, mask_util_1.maskAmount)(totals.totalReceived, unlocked),
            dueAmount: (0, mask_util_1.maskAmount)(totals.dueAmount, unlocked),
            payments: payments.map((payment) => this.toPaymentRow(payment, unlocked)),
        };
    }
    paymentQuery(query, options = {}) {
        const builder = this.payments
            .createQueryBuilder('payment')
            .leftJoinAndSelect('payment.client', 'client')
            .leftJoinAndSelect('payment.project', 'project')
            .leftJoinAndSelect('payment.receipt', 'receipt')
            .leftJoinAndSelect('payment.createdByUser', 'createdByUser')
            .where('payment.deleted_at IS NULL')
            .andWhere('payment.status = :status', {
            status: query.paymentStatus ?? payment_enum_1.PaymentStatus.VALID,
        });
        if (query.clientId)
            builder.andWhere('payment.client_id = :clientId', { clientId: query.clientId });
        if (query.projectId)
            builder.andWhere('payment.project_id = :projectId', { projectId: query.projectId });
        if (query.createdBy)
            builder.andWhere('payment.created_by = :createdBy', { createdBy: query.createdBy });
        if (query.paymentMethod)
            builder.andWhere('payment.payment_method = :method', { method: query.paymentMethod });
        if (query.projectStatus)
            builder.andWhere('project.status = :projectStatus', { projectStatus: query.projectStatus });
        if (!options.skipDateRange) {
            const range = query.resolveRange();
            if (range.from)
                builder.andWhere('payment.payment_date >= :from', { from: range.from });
            if (range.to)
                builder.andWhere('payment.payment_date <= :to', { to: range.to });
        }
        if (query.search) {
            const term = `%${query.search}%`;
            builder.andWhere(new typeorm_2.Brackets((qb) => qb
                .where('client.name ILIKE :term', { term })
                .orWhere('project.project_name ILIKE :term', { term })
                .orWhere('receipt.receipt_number ILIKE :term', { term })
                .orWhere('payment.transaction_reference ILIKE :term', { term })));
        }
        return builder;
    }
    async filteredProjects(query) {
        const builder = this.projects
            .createQueryBuilder('project')
            .leftJoinAndSelect('project.client', 'client')
            .where('project.deleted_at IS NULL');
        if (query.clientId)
            builder.andWhere('project.client_id = :clientId', { clientId: query.clientId });
        if (query.projectId)
            builder.andWhere('project.id = :projectId', { projectId: query.projectId });
        if (query.projectStatus)
            builder.andWhere('project.status = :projectStatus', { projectStatus: query.projectStatus });
        if (query.clientStatus)
            builder.andWhere('client.status = :clientStatus', { clientStatus: query.clientStatus });
        if (query.hasAmount !== undefined) {
            builder.andWhere(query.hasAmount
                ? 'project.encrypted_amount IS NOT NULL'
                : 'project.encrypted_amount IS NULL');
        }
        const range = query.resolveRange();
        if (range.from)
            builder.andWhere('project.created_at >= :createdFrom', { createdFrom: range.from });
        if (range.to) {
            builder.andWhere("project.created_at < (:createdTo::date + INTERVAL '1 day')", {
                createdTo: range.to,
            });
        }
        if (query.search) {
            const term = `%${query.search}%`;
            builder.andWhere(new typeorm_2.Brackets((qb) => qb
                .where('project.project_name ILIKE :term', { term })
                .orWhere('project.project_code ILIKE :term', { term })
                .orWhere('client.name ILIKE :term', { term })));
        }
        return builder.orderBy('project.createdAt', 'DESC').getMany();
    }
    amountRange(query) {
        if (!query.minAmount && !query.maxAmount)
            return null;
        return {
            min: query.minAmount ? money_util_1.Money.fromDecimalString(query.minAmount) : null,
            max: query.maxAmount ? money_util_1.Money.fromDecimalString(query.maxAmount) : null,
        };
    }
    withinRange(amount, range) {
        if (range.min && amount.lessThan(range.min))
            return false;
        if (range.max && amount.greaterThan(range.max))
            return false;
        return true;
    }
    toDueRow(project, totals, unlocked) {
        return {
            clientId: project.clientId,
            clientName: project.client?.name ?? '',
            projectId: project.id,
            projectName: project.projectName,
            hasProjectAmount: totals.hasProjectAmount,
            projectAmount: (0, mask_util_1.maskAmount)(totals.projectAmount, unlocked),
            totalReceived: (0, mask_util_1.maskAmount)(totals.totalReceived, unlocked),
            dueAmount: (0, mask_util_1.maskAmount)(totals.dueAmount, unlocked),
            lastPaymentDate: totals.lastPaymentDate,
            paymentStatus: totals.paymentStatus,
            projectStatus: project.status,
        };
    }
    toPaymentRow(payment, unlocked) {
        const amount = unlocked ? this.financials.decryptPaymentAmount(payment) : null;
        return {
            paymentId: payment.id,
            paymentDate: payment.paymentDate,
            clientName: payment.client?.name ?? '',
            projectName: payment.project?.projectName ?? '',
            receiptNumber: payment.receipt?.receiptNumber ?? null,
            amount: (0, mask_util_1.maskAmount)(amount, unlocked),
            paymentMethod: payment.paymentMethod,
            status: payment.status,
            transactionReference: payment.transactionReference,
            createdByName: payment.createdByUser?.name ?? null,
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