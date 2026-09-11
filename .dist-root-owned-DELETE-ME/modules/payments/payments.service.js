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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const document_sequence_entity_1 = require("../../common/entities/document-sequence.entity");
const error_codes_1 = require("../../common/constants/error-codes");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const audit_action_enum_1 = require("../../common/enums/audit-action.enum");
const payment_enum_1 = require("../../common/enums/payment.enum");
const project_status_enum_1 = require("../../common/enums/project-status.enum");
const app_exception_1 = require("../../common/exceptions/app.exception");
const sequence_service_1 = require("../../common/services/sequence.service");
const money_util_1 = require("../../common/utils/money.util");
const audit_log_service_1 = require("../audit-logs/audit-log.service");
const client_entity_1 = require("../clients/entities/client.entity");
const financial_encryption_service_1 = require("../financial/services/financial-encryption.service");
const project_financials_service_1 = require("../financial/services/project-financials.service");
const mask_util_1 = require("../financial/utils/mask.util");
const project_entity_1 = require("../projects/entities/project.entity");
const receipt_entity_1 = require("../receipts/entities/receipt.entity");
const payment_entity_1 = require("./entities/payment.entity");
const SORTABLE = {
    paymentDate: 'payment.payment_date',
    status: 'payment.status',
    createdAt: 'payment.created_at',
};
let PaymentsService = class PaymentsService {
    payments;
    projects;
    clients;
    encryption;
    financials;
    sequences;
    auditLog;
    config;
    dataSource;
    constructor(payments, projects, clients, encryption, financials, sequences, auditLog, config, dataSource) {
        this.payments = payments;
        this.projects = projects;
        this.clients = clients;
        this.encryption = encryption;
        this.financials = financials;
        this.sequences = sequences;
        this.auditLog = auditLog;
        this.config = config;
        this.dataSource = dataSource;
    }
    async findAll(query, unlocked) {
        const builder = this.payments
            .createQueryBuilder('payment')
            .leftJoinAndSelect('payment.client', 'client')
            .leftJoinAndSelect('payment.project', 'project')
            .leftJoinAndSelect('payment.receipt', 'receipt')
            .leftJoinAndSelect('payment.createdByUser', 'createdByUser')
            .where('payment.deleted_at IS NULL');
        if (query.clientId)
            builder.andWhere('payment.client_id = :clientId', { clientId: query.clientId });
        if (query.projectId)
            builder.andWhere('payment.project_id = :projectId', { projectId: query.projectId });
        if (query.status)
            builder.andWhere('payment.status = :status', { status: query.status });
        if (query.paymentMethod) {
            builder.andWhere('payment.payment_method = :method', { method: query.paymentMethod });
        }
        if (query.dateFrom)
            builder.andWhere('payment.payment_date >= :from', { from: query.dateFrom });
        if (query.dateTo)
            builder.andWhere('payment.payment_date <= :to', { to: query.dateTo });
        if (query.search) {
            const term = `%${query.search}%`;
            builder.andWhere(new typeorm_2.Brackets((qb) => qb
                .where('client.name ILIKE :term', { term })
                .orWhere('project.project_name ILIKE :term', { term })
                .orWhere('receipt.receipt_number ILIKE :term', { term })
                .orWhere('payment.transaction_reference ILIKE :term', { term })));
        }
        builder
            .orderBy((0, pagination_dto_1.resolveSortColumn)(query.sortBy, SORTABLE, 'createdAt'), query.sortOrder)
            .skip(query.skip)
            .take(query.limit);
        const [payments, total] = await builder.getManyAndCount();
        const items = payments.map((payment) => this.toResponse(payment, unlocked));
        return pagination_dto_1.PaginatedResult.of(items, total, query.page, query.limit);
    }
    async findOne(id, unlocked) {
        const payment = await this.getOrFail(id);
        return this.toResponse(payment, unlocked);
    }
    async create(dto, actor, context) {
        const amount = money_util_1.Money.fromDecimalString(dto.amount);
        const paymentId = await this.dataSource.transaction(async (manager) => {
            const project = await manager
                .getRepository(project_entity_1.Project)
                .createQueryBuilder('project')
                .setLock('pessimistic_write')
                .where('project.id = :id', { id: dto.projectId })
                .andWhere('project.deleted_at IS NULL')
                .getOne();
            if (!project) {
                throw app_exception_1.AppException.notFound(error_codes_1.ErrorCode.PROJECT_NOT_FOUND, 'Project not found.');
            }
            if (project.clientId !== dto.clientId) {
                throw app_exception_1.AppException.badRequest(error_codes_1.ErrorCode.PROJECT_CLIENT_MISMATCH, 'The selected project does not belong to the selected client.');
            }
            if (project_status_enum_1.PROJECT_STATUSES_BLOCKING_PAYMENT.includes(project.status)) {
                throw app_exception_1.AppException.conflict(error_codes_1.ErrorCode.PROJECT_NOT_ACCEPTING_PAYMENTS, `This project is ${project.status.toLowerCase()} and cannot accept new payments.`);
            }
            const totals = await this.financials.totalsForProject(project, manager);
            const allowOverpayment = this.config.get('business.allowOverpayment', false);
            if (!allowOverpayment) {
                const projected = totals.totalReceived.add(amount);
                if (projected.greaterThan(totals.projectAmount)) {
                    throw app_exception_1.AppException.badRequest(error_codes_1.ErrorCode.PAYMENT_EXCEEDS_DUE, `This payment of ${amount.toDecimalString()} exceeds the remaining due amount of ${totals.dueAmount.toDecimalString()}.`, {
                        projectAmount: totals.projectAmount.toDecimalString(),
                        totalReceived: totals.totalReceived.toDecimalString(),
                        dueAmount: totals.dueAmount.toDecimalString(),
                        attemptedAmount: amount.toDecimalString(),
                    });
                }
            }
            const encrypted = this.encryption.encryptAmount(amount, financial_encryption_service_1.EncryptionContext.PAYMENT_AMOUNT);
            const payment = manager.getRepository(payment_entity_1.Payment).create({
                clientId: dto.clientId,
                projectId: dto.projectId,
                paymentDate: dto.paymentDate,
                ...encrypted,
                paymentMethod: dto.paymentMethod,
                transactionReference: dto.transactionReference ?? null,
                bankAccount: dto.bankAccount ?? null,
                notes: dto.notes ?? null,
                attachmentPath: dto.attachmentPath ?? null,
                status: payment_enum_1.PaymentStatus.VALID,
                createdBy: actor.id,
            });
            const savedPayment = await manager.getRepository(payment_entity_1.Payment).save(payment);
            const receiptNumber = await this.sequences.allocate(manager, document_sequence_entity_1.SequenceKey.RECEIPT);
            const receipt = manager.getRepository(receipt_entity_1.Receipt).create({
                paymentId: savedPayment.id,
                receiptNumber,
                receiptDate: dto.paymentDate,
                generatedBy: actor.id,
            });
            await manager.getRepository(receipt_entity_1.Receipt).save(receipt);
            await this.auditLog.record({
                action: audit_action_enum_1.AuditAction.PAYMENT_CREATED,
                module: audit_action_enum_1.AuditModule.PAYMENTS,
                recordId: savedPayment.id,
                description: `Recorded payment for project ${project.projectName} (receipt ${receiptNumber})`,
                newValue: {
                    projectId: dto.projectId,
                    paymentMethod: dto.paymentMethod,
                    transactionReference: dto.transactionReference,
                },
                actor,
                context,
            }, manager);
            await this.auditLog.record({
                action: audit_action_enum_1.AuditAction.RECEIPT_GENERATED,
                module: audit_action_enum_1.AuditModule.RECEIPTS,
                recordId: receipt.id,
                description: `Generated receipt ${receiptNumber}`,
                actor,
                context,
            }, manager);
            return savedPayment.id;
        });
        return this.findOne(paymentId, false);
    }
    async update(id, dto, actor, context, unlocked) {
        const payment = await this.getOrFail(id);
        if (payment.status !== payment_enum_1.PaymentStatus.VALID) {
            throw app_exception_1.AppException.conflict(error_codes_1.ErrorCode.PAYMENT_ALREADY_VOIDED, 'This payment has been voided and cannot be edited.');
        }
        const before = {
            paymentDate: payment.paymentDate,
            paymentMethod: payment.paymentMethod,
            transactionReference: payment.transactionReference,
        };
        if (dto.paymentDate !== undefined)
            payment.paymentDate = dto.paymentDate;
        if (dto.paymentMethod !== undefined)
            payment.paymentMethod = dto.paymentMethod;
        if (dto.transactionReference !== undefined)
            payment.transactionReference = dto.transactionReference ?? null;
        if (dto.bankAccount !== undefined)
            payment.bankAccount = dto.bankAccount ?? null;
        if (dto.notes !== undefined)
            payment.notes = dto.notes ?? null;
        payment.updatedBy = actor.id;
        await this.payments.save(payment);
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.PAYMENT_UPDATED,
            module: audit_action_enum_1.AuditModule.PAYMENTS,
            recordId: payment.id,
            description: 'Updated payment details',
            oldValue: before,
            newValue: {
                paymentDate: payment.paymentDate,
                paymentMethod: payment.paymentMethod,
                transactionReference: payment.transactionReference,
            },
            actor,
            context,
        });
        return this.findOne(id, unlocked);
    }
    async void(id, dto, actor, context) {
        await this.dataSource.transaction(async (manager) => {
            const payment = await manager
                .getRepository(payment_entity_1.Payment)
                .createQueryBuilder('payment')
                .setLock('pessimistic_write')
                .where('payment.id = :id', { id })
                .getOne();
            if (!payment) {
                throw app_exception_1.AppException.notFound(error_codes_1.ErrorCode.PAYMENT_NOT_FOUND, 'Payment not found.');
            }
            if (payment.status !== payment_enum_1.PaymentStatus.VALID) {
                throw app_exception_1.AppException.conflict(error_codes_1.ErrorCode.PAYMENT_ALREADY_VOIDED, 'This payment has already been voided.');
            }
            payment.status = payment_enum_1.PaymentStatus.VOIDED;
            payment.voidReason = dto.reason;
            payment.voidedAt = new Date();
            payment.voidedBy = actor.id;
            payment.updatedBy = actor.id;
            await manager.getRepository(payment_entity_1.Payment).save(payment);
            await this.auditLog.record({
                action: audit_action_enum_1.AuditAction.PAYMENT_VOIDED,
                module: audit_action_enum_1.AuditModule.PAYMENTS,
                recordId: payment.id,
                description: `Voided payment: ${dto.reason}`,
                actor,
                context,
            }, manager);
        });
    }
    async getOrFail(id) {
        const payment = await this.payments.findOne({
            where: { id, deletedAt: (0, typeorm_2.IsNull)() },
            relations: { client: true, project: true, receipt: true, createdByUser: true },
        });
        if (!payment) {
            throw app_exception_1.AppException.notFound(error_codes_1.ErrorCode.PAYMENT_NOT_FOUND, 'Payment not found.');
        }
        return payment;
    }
    toResponse(payment, unlocked) {
        const amount = this.financials.decryptPaymentAmount(payment);
        return {
            id: payment.id,
            clientId: payment.clientId,
            clientName: payment.client?.name ?? '',
            projectId: payment.projectId,
            projectName: payment.project?.projectName ?? '',
            paymentDate: payment.paymentDate,
            paymentMethod: payment.paymentMethod,
            transactionReference: payment.transactionReference,
            bankAccount: payment.bankAccount,
            notes: payment.notes,
            status: payment.status,
            voidReason: payment.voidReason,
            receiptNumber: payment.receipt?.receiptNumber ?? null,
            financialLocked: !unlocked,
            amount: (0, mask_util_1.maskAmount)(amount, unlocked),
            createdByName: payment.createdByUser?.name ?? null,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
        };
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __param(1, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __param(2, (0, typeorm_1.InjectRepository)(client_entity_1.Client)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        financial_encryption_service_1.FinancialEncryptionService,
        project_financials_service_1.ProjectFinancialsService,
        sequence_service_1.SequenceService,
        audit_log_service_1.AuditLogService,
        config_1.ConfigService,
        typeorm_2.DataSource])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map