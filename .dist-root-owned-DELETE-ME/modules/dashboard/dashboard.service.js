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
const payment_enum_1 = require("../../common/enums/payment.enum");
const money_util_1 = require("../../common/utils/money.util");
const client_entity_1 = require("../clients/entities/client.entity");
const project_financials_service_1 = require("../financial/services/project-financials.service");
const mask_util_1 = require("../financial/utils/mask.util");
const payment_entity_1 = require("../payments/entities/payment.entity");
const project_entity_1 = require("../projects/entities/project.entity");
let DashboardService = class DashboardService {
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
    async summary(unlocked) {
        const [totalClients, projects] = await Promise.all([
            this.clients.count({ where: { deletedAt: (0, typeorm_2.IsNull)() } }),
            this.projects.find({ where: { deletedAt: (0, typeorm_2.IsNull)() } }),
        ]);
        let totalProjectValue = money_util_1.Money.zero();
        let totalReceived = money_util_1.Money.zero();
        if (unlocked && projects.length > 0) {
            const totals = await this.financials.totalsForProjects(projects);
            for (const project of projects) {
                const projectTotals = totals.get(project.id);
                if (!projectTotals)
                    continue;
                totalProjectValue = totalProjectValue.add(projectTotals.projectAmount);
                totalReceived = totalReceived.add(projectTotals.totalReceived);
            }
        }
        const totalDue = totalProjectValue.subtract(totalReceived).clampToZero();
        return {
            totalClients,
            totalProjects: projects.length,
            financialLocked: !unlocked,
            totalProjectValue: unlocked ? (0, mask_util_1.maskAmount)(totalProjectValue, true) : null,
            totalReceived: unlocked ? (0, mask_util_1.maskAmount)(totalReceived, true) : null,
            totalDue: unlocked ? (0, mask_util_1.maskAmount)(totalDue, true) : null,
        };
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
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            buckets.set(key, { count: 0, total: money_util_1.Money.zero() });
        }
        for (const payment of payments) {
            const paymentDate = new Date(payment.paymentDate);
            const key = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
            const bucket = buckets.get(key);
            if (!bucket)
                continue;
            bucket.count += 1;
            if (unlocked) {
                bucket.total = bucket.total.add(this.financials.decryptPaymentAmount(payment));
            }
        }
        return Array.from(buckets.entries()).map(([month, bucket]) => ({
            month,
            paymentCount: bucket.count,
            totalReceived: unlocked ? (0, mask_util_1.maskAmount)(bucket.total, true) : null,
        }));
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(client_entity_1.Client)),
    __param(1, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __param(2, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        project_financials_service_1.ProjectFinancialsService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map