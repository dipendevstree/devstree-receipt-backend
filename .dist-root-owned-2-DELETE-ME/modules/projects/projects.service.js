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
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
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
const payment_entity_1 = require("../payments/entities/payment.entity");
const project_entity_1 = require("./entities/project.entity");
const NO_PROJECT_AMOUNT = {
    encryptedAmount: null,
    amountIv: null,
    amountAuthTag: null,
    encryptionKeyVersion: null,
};
const SORTABLE = {
    projectName: 'project.projectName',
    projectCode: 'project.projectCode',
    startDate: 'project.startDate',
    status: 'project.status',
    createdAt: 'project.createdAt',
};
let ProjectsService = class ProjectsService {
    projects;
    clients;
    payments;
    encryption;
    financials;
    sequences;
    auditLog;
    dataSource;
    constructor(projects, clients, payments, encryption, financials, sequences, auditLog, dataSource) {
        this.projects = projects;
        this.clients = clients;
        this.payments = payments;
        this.encryption = encryption;
        this.financials = financials;
        this.sequences = sequences;
        this.auditLog = auditLog;
        this.dataSource = dataSource;
    }
    async findAll(query, unlocked) {
        const builder = this.projects
            .createQueryBuilder('project')
            .leftJoinAndSelect('project.client', 'client')
            .where('project.deleted_at IS NULL');
        if (query.clientId)
            builder.andWhere('project.client_id = :clientId', { clientId: query.clientId });
        if (query.status)
            builder.andWhere('project.status = :status', { status: query.status });
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
        builder
            .orderBy((0, pagination_dto_1.resolveSortColumn)(query.sortBy, SORTABLE, 'createdAt'), query.sortOrder)
            .skip(query.skip)
            .take(query.limit);
        let [projects, total] = await builder.getManyAndCount();
        const totalsMap = await this.financials.totalsForProjects(projects);
        if (query.paymentStatus) {
            projects = projects.filter((project) => totalsMap.get(project.id)?.paymentStatus === query.paymentStatus);
            total = projects.length;
        }
        const items = projects.map((project) => this.toResponse(project, totalsMap.get(project.id) ?? null, unlocked));
        return pagination_dto_1.PaginatedResult.of(items, total, query.page, query.limit);
    }
    async findOne(id, unlocked) {
        const project = await this.getOrFail(id);
        const totals = await this.financials.totalsForProject(project);
        return this.toResponse(project, totals, unlocked);
    }
    async getEntityOrFail(id) {
        return this.getOrFail(id);
    }
    async create(dto, actor, context, unlocked = false) {
        const client = await this.clients.findOne({ where: { id: dto.clientId, deletedAt: (0, typeorm_2.IsNull)() } });
        if (!client) {
            throw app_exception_1.AppException.notFound(error_codes_1.ErrorCode.CLIENT_NOT_FOUND, 'Selected client was not found.');
        }
        const encrypted = dto.projectAmount === undefined || dto.projectAmount === null
            ? NO_PROJECT_AMOUNT
            : this.encryption.encryptAmount(money_util_1.Money.fromDecimalString(dto.projectAmount), financial_encryption_service_1.EncryptionContext.PROJECT_AMOUNT);
        const project = await this.dataSource.transaction(async (manager) => {
            const projectCode = await this.sequences.allocate(manager, document_sequence_entity_1.SequenceKey.PROJECT);
            const entity = manager.getRepository(project_entity_1.Project).create({
                clientId: dto.clientId,
                projectCode,
                projectName: dto.projectName,
                description: dto.description ?? null,
                ...encrypted,
                startDate: dto.startDate ?? null,
                expectedEndDate: dto.expectedEndDate ?? null,
                status: dto.status ?? project_status_enum_1.ProjectStatus.DRAFT,
                notes: dto.notes ?? null,
                createdBy: actor.id,
                updatedBy: actor.id,
            });
            return manager.getRepository(project_entity_1.Project).save(entity);
        });
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.PROJECT_CREATED,
            module: audit_action_enum_1.AuditModule.PROJECTS,
            recordId: project.id,
            description: `Created project ${project.projectName} for client ${client.name}`,
            newValue: {
                projectName: dto.projectName,
                clientId: dto.clientId,
                status: project.status,
                hasProjectAmount: project.hasProjectAmount(),
            },
            actor,
            context,
        });
        project.client = client;
        const totals = await this.financials.totalsForProject(project);
        return this.toResponse(project, totals, unlocked);
    }
    async update(id, dto, actor, context, unlocked) {
        const project = await this.getOrFail(id);
        const before = {
            projectName: project.projectName,
            status: project.status,
            startDate: project.startDate,
            expectedEndDate: project.expectedEndDate,
            hasProjectAmount: project.hasProjectAmount(),
        };
        if (dto.clientId && dto.clientId !== project.clientId) {
            const client = await this.clients.findOne({
                where: { id: dto.clientId, deletedAt: (0, typeorm_2.IsNull)() },
            });
            if (!client) {
                throw app_exception_1.AppException.notFound(error_codes_1.ErrorCode.CLIENT_NOT_FOUND, 'Selected client was not found.');
            }
            project.clientId = dto.clientId;
        }
        if (dto.projectAmount !== undefined) {
            Object.assign(project, dto.projectAmount === null
                ? NO_PROJECT_AMOUNT
                : this.encryption.encryptAmount(money_util_1.Money.fromDecimalString(dto.projectAmount), financial_encryption_service_1.EncryptionContext.PROJECT_AMOUNT));
        }
        if (dto.projectName !== undefined)
            project.projectName = dto.projectName;
        if (dto.description !== undefined)
            project.description = dto.description ?? null;
        if (dto.startDate !== undefined)
            project.startDate = dto.startDate ?? null;
        if (dto.expectedEndDate !== undefined)
            project.expectedEndDate = dto.expectedEndDate ?? null;
        if (dto.status !== undefined)
            project.status = dto.status;
        if (dto.notes !== undefined)
            project.notes = dto.notes ?? null;
        project.updatedBy = actor.id;
        await this.projects.save(project);
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.PROJECT_UPDATED,
            module: audit_action_enum_1.AuditModule.PROJECTS,
            recordId: project.id,
            description: `Updated project ${project.projectName}`,
            oldValue: before,
            newValue: {
                projectName: project.projectName,
                status: project.status,
                hasProjectAmount: project.hasProjectAmount(),
            },
            actor,
            context,
        });
        return this.findOne(id, unlocked);
    }
    async archive(id, actor, context) {
        const project = await this.getOrFail(id);
        const paymentCount = await this.payments.count({
            where: { projectId: id, status: payment_enum_1.PaymentStatus.VALID, deletedAt: (0, typeorm_2.IsNull)() },
        });
        if (paymentCount > 0) {
            throw app_exception_1.AppException.conflict(error_codes_1.ErrorCode.PROJECT_HAS_PAYMENTS, `This project has ${paymentCount} recorded payment(s) and cannot be archived. Cancel it instead.`);
        }
        await this.projects.softDelete(id);
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.PROJECT_ARCHIVED,
            module: audit_action_enum_1.AuditModule.PROJECTS,
            recordId: id,
            description: `Archived project ${project.projectName}`,
            actor,
            context,
        });
    }
    async lookupByClient(clientId) {
        return this.lookup({ clientId, limit: 200 });
    }
    async lookup(query) {
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const builder = this.projects
            .createQueryBuilder('project')
            .leftJoin('project.client', 'client')
            .select([
            'project.id',
            'project.projectName',
            'project.projectCode',
            'project.status',
            'project.clientId',
            'project.encryptedAmount',
            'client.name',
        ])
            .where('project.deleted_at IS NULL');
        if (query.clientId) {
            builder.andWhere('project.client_id = :clientId', { clientId: query.clientId });
        }
        if (query.search) {
            const term = `%${query.search}%`;
            builder.andWhere(new typeorm_2.Brackets((qb) => qb
                .where('project.project_name ILIKE :term', { term })
                .orWhere('project.project_code ILIKE :term', { term })
                .orWhere('client.name ILIKE :term', { term })));
        }
        const projects = await builder
            .orderBy('project.project_name', 'ASC')
            .limit(limit + 1)
            .getMany();
        const hasMore = projects.length > limit;
        return projects.slice(0, limit).map((project, index, all) => ({
            id: project.id,
            name: project.projectName,
            projectCode: project.projectCode,
            status: project.status,
            clientId: project.clientId,
            clientName: project.client?.name ?? '',
            hasProjectAmount: project.hasProjectAmount(),
            hasMore: hasMore && index === all.length - 1 ? true : undefined,
        }));
    }
    async getOrFail(id) {
        const project = await this.projects.findOne({
            where: { id, deletedAt: (0, typeorm_2.IsNull)() },
            relations: { client: true },
        });
        if (!project) {
            throw app_exception_1.AppException.notFound(error_codes_1.ErrorCode.PROJECT_NOT_FOUND, 'Project not found.');
        }
        return project;
    }
    toResponse(project, totals, unlocked) {
        return {
            id: project.id,
            projectCode: project.projectCode,
            projectName: project.projectName,
            description: project.description,
            clientId: project.clientId,
            clientName: project.client?.name ?? '',
            startDate: project.startDate,
            expectedEndDate: project.expectedEndDate,
            status: project.status,
            paymentStatus: totals?.paymentStatus ?? project_status_enum_1.ProjectPaymentStatus.UNPAID,
            notes: project.notes,
            paymentCount: totals?.paymentCount ?? 0,
            financialLocked: !unlocked,
            hasProjectAmount: totals?.hasProjectAmount ?? project.hasProjectAmount(),
            projectAmount: totals ? (0, mask_util_1.maskAmount)(totals.projectAmount, unlocked) : null,
            totalReceived: totals ? (0, mask_util_1.maskAmount)(totals.totalReceived, unlocked) : null,
            dueAmount: totals ? (0, mask_util_1.maskAmount)(totals.dueAmount, unlocked) : null,
            lastPaymentDate: totals?.lastPaymentDate ?? null,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        };
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __param(1, (0, typeorm_1.InjectRepository)(client_entity_1.Client)),
    __param(2, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        financial_encryption_service_1.FinancialEncryptionService,
        project_financials_service_1.ProjectFinancialsService,
        sequence_service_1.SequenceService,
        audit_log_service_1.AuditLogService,
        typeorm_2.DataSource])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map