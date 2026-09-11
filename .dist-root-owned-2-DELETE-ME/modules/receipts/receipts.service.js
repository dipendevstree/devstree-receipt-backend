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
exports.ReceiptsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const error_codes_1 = require("../../common/constants/error-codes");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const audit_action_enum_1 = require("../../common/enums/audit-action.enum");
const app_exception_1 = require("../../common/exceptions/app.exception");
const amount_in_words_util_1 = require("../../common/utils/amount-in-words.util");
const money_util_1 = require("../../common/utils/money.util");
const audit_log_service_1 = require("../audit-logs/audit-log.service");
const project_financials_service_1 = require("../financial/services/project-financials.service");
const mask_util_1 = require("../financial/utils/mask.util");
const settings_service_1 = require("../settings/settings.service");
const receipt_entity_1 = require("./entities/receipt.entity");
const receipt_pdf_service_1 = require("./services/receipt-pdf.service");
const SORTABLE = {
    receiptDate: 'receipt.receiptDate',
    receiptNumber: 'receipt.receiptNumber',
    clientName: 'client.name',
    projectName: 'project.projectName',
    createdAt: 'receipt.createdAt',
};
let ReceiptsService = class ReceiptsService {
    receipts;
    financials;
    pdfService;
    settingsService;
    auditLog;
    constructor(receipts, financials, pdfService, settingsService, auditLog) {
        this.receipts = receipts;
        this.financials = financials;
        this.pdfService = pdfService;
        this.settingsService = settingsService;
        this.auditLog = auditLog;
    }
    async findAll(query, unlocked) {
        const builder = this.receipts
            .createQueryBuilder('receipt')
            .leftJoinAndSelect('receipt.payment', 'payment')
            .leftJoinAndSelect('payment.client', 'client')
            .leftJoinAndSelect('payment.project', 'project')
            .leftJoinAndSelect('receipt.generatedByUser', 'generatedByUser');
        if (query.clientId)
            builder.andWhere('payment.client_id = :clientId', { clientId: query.clientId });
        if (query.projectId)
            builder.andWhere('payment.project_id = :projectId', { projectId: query.projectId });
        if (query.receiptNumber) {
            builder.andWhere('receipt.receipt_number ILIKE :receiptNumber', {
                receiptNumber: `%${query.receiptNumber}%`,
            });
        }
        if (query.receiptStatus) {
            builder.andWhere('receipt.status = :receiptStatus', { receiptStatus: query.receiptStatus });
        }
        if (query.generatedBy) {
            builder.andWhere('receipt.generated_by = :generatedBy', { generatedBy: query.generatedBy });
        }
        if (query.paymentMethod) {
            builder.andWhere('payment.payment_method = :paymentMethod', {
                paymentMethod: query.paymentMethod,
            });
        }
        if (query.paymentStatus) {
            builder.andWhere('payment.status = :paymentStatus', { paymentStatus: query.paymentStatus });
        }
        if (query.transactionReference) {
            builder.andWhere('payment.transaction_reference ILIKE :reference', {
                reference: `%${query.transactionReference}%`,
            });
        }
        const range = query.resolveRange();
        if (range.from)
            builder.andWhere('receipt.receipt_date >= :from', { from: range.from });
        if (range.to)
            builder.andWhere('receipt.receipt_date <= :to', { to: range.to });
        if (query.search) {
            const term = `%${query.search}%`;
            builder.andWhere(new typeorm_2.Brackets((qb) => qb
                .where('receipt.receipt_number ILIKE :term', { term })
                .orWhere('client.name ILIKE :term', { term })
                .orWhere('client.company_name ILIKE :term', { term })
                .orWhere('project.project_name ILIKE :term', { term })
                .orWhere('payment.transaction_reference ILIKE :term', { term })));
        }
        builder.orderBy((0, pagination_dto_1.resolveSortColumn)(query.sortBy, SORTABLE, 'receiptDate'), query.sortOrder);
        const amountFilter = this.resolveAmountFilter(query, unlocked);
        if (!amountFilter) {
            const [receipts, total] = await builder.skip(query.skip).take(query.limit).getManyAndCount();
            return pagination_dto_1.PaginatedResult.of(await this.toResponses(receipts, unlocked), total, query.page, query.limit);
        }
        const all = await builder.getMany();
        const matching = all.filter((receipt) => {
            if (!receipt.payment)
                return false;
            const amount = this.financials.decryptPaymentAmount(receipt.payment);
            if (amountFilter.min && amount.lessThan(amountFilter.min))
                return false;
            if (amountFilter.max && amount.greaterThan(amountFilter.max))
                return false;
            return true;
        });
        const page = matching.slice(query.skip, query.skip + query.limit);
        return pagination_dto_1.PaginatedResult.of(await this.toResponses(page, unlocked), matching.length, query.page, query.limit);
    }
    async findOne(id, unlocked) {
        const receipt = await this.getOrFail(id);
        const [response] = await this.toResponses([receipt], unlocked);
        return response;
    }
    async renderPdf(id, actor, context) {
        const receipt = await this.getOrFail(id);
        const payment = receipt.payment;
        const [projectTotals, company] = await Promise.all([
            this.financials.totalsForProject(payment.project),
            this.settingsService.getCompanySettings(),
        ]);
        const paymentAmount = this.financials.decryptPaymentAmount(payment);
        const data = {
            receipt,
            payment,
            paymentAmount,
            projectAmount: projectTotals.projectAmount,
            totalReceived: projectTotals.totalReceived,
            dueAmount: projectTotals.dueAmount,
            company: company,
            generatedByName: receipt.generatedByUser?.name ?? null,
        };
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.RECEIPT_DOWNLOADED,
            module: audit_action_enum_1.AuditModule.RECEIPTS,
            recordId: receipt.id,
            description: `Downloaded receipt ${receipt.receiptNumber}`,
            actor,
            context,
        });
        return {
            stream: this.pdfService.render(data),
            filename: `${receipt.receiptNumber}.pdf`,
        };
    }
    resolveAmountFilter(query, unlocked) {
        if (!unlocked)
            return null;
        if (!query.minAmount && !query.maxAmount)
            return null;
        return {
            min: query.minAmount ? money_util_1.Money.fromDecimalString(query.minAmount) : null,
            max: query.maxAmount ? money_util_1.Money.fromDecimalString(query.maxAmount) : null,
        };
    }
    async getOrFail(id) {
        const receipt = await this.receipts.findOne({
            where: { id },
            relations: {
                payment: { client: true, project: true },
                generatedByUser: true,
            },
        });
        if (!receipt) {
            throw app_exception_1.AppException.notFound(error_codes_1.ErrorCode.RECEIPT_NOT_FOUND, 'Receipt not found.');
        }
        return receipt;
    }
    async toResponses(receipts, unlocked) {
        const company = await this.settingsService.getCompanySettings();
        const projects = new Map(receipts
            .map((receipt) => receipt.payment?.project)
            .filter((project) => Boolean(project))
            .map((project) => [project.id, project]));
        const totals = await this.financials.totalsForProjects([...projects.values()]);
        return receipts.map((receipt) => this.toResponse(receipt, unlocked, totals, company.currency || 'INR'));
    }
    toResponse(receipt, unlocked, totalsByProject, currency) {
        const payment = receipt.payment;
        const amount = payment ? this.financials.decryptPaymentAmount(payment) : null;
        const totals = payment?.projectId ? totalsByProject.get(payment.projectId) : undefined;
        return {
            id: receipt.id,
            receiptNumber: receipt.receiptNumber,
            receiptDate: receipt.receiptDate,
            status: receipt.status,
            paymentId: receipt.paymentId,
            clientId: payment?.clientId ?? '',
            clientName: payment?.client?.name ?? '',
            clientCompanyName: payment?.client?.companyName ?? null,
            clientEmail: payment?.client?.email ?? null,
            clientPhone: payment?.client?.phone ?? null,
            projectId: payment?.projectId ?? '',
            projectName: payment?.project?.projectName ?? '',
            projectCode: payment?.project?.projectCode ?? null,
            paymentDate: payment?.paymentDate ?? receipt.receiptDate,
            paymentMethod: payment?.paymentMethod,
            paymentStatus: payment?.status,
            transactionReference: payment?.transactionReference ?? null,
            financialLocked: !unlocked,
            amount: (0, mask_util_1.maskAmount)(amount, unlocked),
            amountInWords: unlocked && amount ? (0, amount_in_words_util_1.amountInWords)(amount.toDecimalString(), { currency }) : null,
            hasProjectAmount: totals?.hasProjectAmount ?? false,
            projectAmount: (0, mask_util_1.maskAmount)(totals?.projectAmount ?? null, unlocked),
            projectTotalReceived: (0, mask_util_1.maskAmount)(totals?.totalReceived ?? null, unlocked),
            projectDueAmount: (0, mask_util_1.maskAmount)(totals?.dueAmount ?? null, unlocked),
            generatedByName: receipt.generatedByUser?.name ?? null,
            notes: payment?.notes ?? null,
            createdAt: receipt.createdAt,
        };
    }
};
exports.ReceiptsService = ReceiptsService;
exports.ReceiptsService = ReceiptsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(receipt_entity_1.Receipt)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        project_financials_service_1.ProjectFinancialsService,
        receipt_pdf_service_1.ReceiptPdfService,
        settings_service_1.SettingsService,
        audit_log_service_1.AuditLogService])
], ReceiptsService);
//# sourceMappingURL=receipts.service.js.map