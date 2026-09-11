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
const audit_log_service_1 = require("../audit-logs/audit-log.service");
const project_financials_service_1 = require("../financial/services/project-financials.service");
const mask_util_1 = require("../financial/utils/mask.util");
const settings_service_1 = require("../settings/settings.service");
const receipt_entity_1 = require("./entities/receipt.entity");
const receipt_pdf_service_1 = require("./services/receipt-pdf.service");
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
        if (query.search) {
            const term = `%${query.search}%`;
            builder.andWhere(new typeorm_2.Brackets((qb) => qb
                .where('receipt.receipt_number ILIKE :term', { term })
                .orWhere('client.name ILIKE :term', { term })
                .orWhere('project.project_name ILIKE :term', { term })));
        }
        builder.orderBy('receipt.receipt_date', query.sortOrder).skip(query.skip).take(query.limit);
        const [receipts, total] = await builder.getManyAndCount();
        const items = receipts.map((receipt) => this.toResponse(receipt, unlocked));
        return pagination_dto_1.PaginatedResult.of(items, total, query.page, query.limit);
    }
    async findOne(id, unlocked) {
        const receipt = await this.getOrFail(id);
        return this.toResponse(receipt, unlocked);
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
    toResponse(receipt, unlocked) {
        const amount = unlocked ? this.financials.decryptPaymentAmount(receipt.payment) : null;
        return {
            id: receipt.id,
            receiptNumber: receipt.receiptNumber,
            receiptDate: receipt.receiptDate,
            paymentId: receipt.paymentId,
            clientName: receipt.payment?.client?.name ?? '',
            projectName: receipt.payment?.project?.projectName ?? '',
            financialLocked: !unlocked,
            amount: (0, mask_util_1.maskAmount)(amount, unlocked),
            generatedByName: receipt.generatedByUser?.name ?? null,
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