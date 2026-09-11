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
exports.ProjectFinancialsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_enum_1 = require("../../../common/enums/payment.enum");
const project_status_enum_1 = require("../../../common/enums/project-status.enum");
const money_util_1 = require("../../../common/utils/money.util");
const payment_entity_1 = require("../../payments/entities/payment.entity");
const project_entity_1 = require("../../projects/entities/project.entity");
const financial_encryption_service_1 = require("./financial-encryption.service");
let ProjectFinancialsService = class ProjectFinancialsService {
    projects;
    payments;
    encryption;
    constructor(projects, payments, encryption) {
        this.projects = projects;
        this.payments = payments;
        this.encryption = encryption;
    }
    decryptProjectAmount(project, precision = money_util_1.Money.DEFAULT_PRECISION) {
        return this.encryption.decryptAmount(project, financial_encryption_service_1.EncryptionContext.PROJECT_AMOUNT, precision);
    }
    decryptPaymentAmount(payment, precision = money_util_1.Money.DEFAULT_PRECISION) {
        return this.encryption.decryptAmount(payment, financial_encryption_service_1.EncryptionContext.PAYMENT_AMOUNT, precision);
    }
    async totalsForProject(project, manager, precision = money_util_1.Money.DEFAULT_PRECISION) {
        const repository = manager ? manager.getRepository(payment_entity_1.Payment) : this.payments;
        const payments = await repository.find({
            where: { projectId: project.id, status: payment_enum_1.PaymentStatus.VALID, deletedAt: (0, typeorm_2.IsNull)() },
            order: { paymentDate: 'DESC' },
        });
        return this.buildTotals(project, payments, precision);
    }
    async totalsForProjects(projects, manager, precision = money_util_1.Money.DEFAULT_PRECISION) {
        const result = new Map();
        if (projects.length === 0)
            return result;
        const repository = manager ? manager.getRepository(payment_entity_1.Payment) : this.payments;
        const payments = await repository.find({
            where: {
                projectId: (0, typeorm_2.In)(projects.map((project) => project.id)),
                status: payment_enum_1.PaymentStatus.VALID,
                deletedAt: (0, typeorm_2.IsNull)(),
            },
            order: { paymentDate: 'DESC' },
        });
        const grouped = new Map();
        for (const payment of payments) {
            const bucket = grouped.get(payment.projectId);
            if (bucket)
                bucket.push(payment);
            else
                grouped.set(payment.projectId, [payment]);
        }
        for (const project of projects) {
            result.set(project.id, this.buildTotals(project, grouped.get(project.id) ?? [], precision));
        }
        return result;
    }
    async totalsForClient(clientId, manager, precision = money_util_1.Money.DEFAULT_PRECISION) {
        const projectRepository = manager ? manager.getRepository(project_entity_1.Project) : this.projects;
        const projects = await projectRepository.find({ where: { clientId, deletedAt: (0, typeorm_2.IsNull)() } });
        const totals = await this.totalsForProjects(projects, manager, precision);
        let totalProjectValue = money_util_1.Money.zero(precision);
        let totalReceived = money_util_1.Money.zero(precision);
        for (const project of projects) {
            const projectTotals = totals.get(project.id);
            if (!projectTotals)
                continue;
            totalProjectValue = totalProjectValue.add(projectTotals.projectAmount);
            totalReceived = totalReceived.add(projectTotals.totalReceived);
        }
        return {
            clientId,
            projectCount: projects.length,
            totalProjectValue,
            totalReceived,
            totalDue: totalProjectValue.subtract(totalReceived).clampToZero(),
        };
    }
    async totalsForClients(clientIds, manager, precision = money_util_1.Money.DEFAULT_PRECISION) {
        const result = new Map();
        if (clientIds.length === 0)
            return result;
        for (const clientId of clientIds) {
            result.set(clientId, {
                clientId,
                projectCount: 0,
                totalProjectValue: money_util_1.Money.zero(precision),
                totalReceived: money_util_1.Money.zero(precision),
                totalDue: money_util_1.Money.zero(precision),
            });
        }
        const projectRepository = manager ? manager.getRepository(project_entity_1.Project) : this.projects;
        const projects = await projectRepository.find({
            where: { clientId: (0, typeorm_2.In)(clientIds), deletedAt: (0, typeorm_2.IsNull)() },
        });
        const projectTotals = await this.totalsForProjects(projects, manager, precision);
        for (const project of projects) {
            const totals = projectTotals.get(project.id);
            const bucket = result.get(project.clientId);
            if (!totals || !bucket)
                continue;
            bucket.projectCount += 1;
            bucket.totalProjectValue = bucket.totalProjectValue.add(totals.projectAmount);
            bucket.totalReceived = bucket.totalReceived.add(totals.totalReceived);
        }
        for (const bucket of result.values()) {
            bucket.totalDue = bucket.totalProjectValue.subtract(bucket.totalReceived).clampToZero();
        }
        return result;
    }
    buildTotals(project, payments, precision) {
        const projectAmount = this.decryptProjectAmount(project, precision);
        let totalReceived = money_util_1.Money.zero(precision);
        for (const payment of payments) {
            totalReceived = totalReceived.add(this.decryptPaymentAmount(payment, precision));
        }
        const dueAmount = projectAmount.subtract(totalReceived);
        return {
            projectId: project.id,
            projectAmount,
            totalReceived,
            dueAmount: dueAmount.clampToZero(),
            paymentStatus: this.resolvePaymentStatus(projectAmount, totalReceived),
            paymentCount: payments.length,
            lastPaymentDate: payments.length > 0 ? payments[0].paymentDate : null,
        };
    }
    resolvePaymentStatus(projectAmount, totalReceived) {
        if (totalReceived.isZero())
            return project_status_enum_1.ProjectPaymentStatus.UNPAID;
        if (totalReceived.greaterThan(projectAmount))
            return project_status_enum_1.ProjectPaymentStatus.OVERPAID;
        if (totalReceived.equals(projectAmount))
            return project_status_enum_1.ProjectPaymentStatus.FULLY_PAID;
        return project_status_enum_1.ProjectPaymentStatus.PARTIALLY_PAID;
    }
};
exports.ProjectFinancialsService = ProjectFinancialsService;
exports.ProjectFinancialsService = ProjectFinancialsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __param(1, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        financial_encryption_service_1.FinancialEncryptionService])
], ProjectFinancialsService);
//# sourceMappingURL=project-financials.service.js.map