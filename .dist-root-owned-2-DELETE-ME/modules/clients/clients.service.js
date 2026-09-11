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
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const document_sequence_entity_1 = require("../../common/entities/document-sequence.entity");
const error_codes_1 = require("../../common/constants/error-codes");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const audit_action_enum_1 = require("../../common/enums/audit-action.enum");
const client_status_enum_1 = require("../../common/enums/client-status.enum");
const app_exception_1 = require("../../common/exceptions/app.exception");
const sequence_service_1 = require("../../common/services/sequence.service");
const audit_log_service_1 = require("../audit-logs/audit-log.service");
const project_financials_service_1 = require("../financial/services/project-financials.service");
const mask_util_1 = require("../financial/utils/mask.util");
const project_entity_1 = require("../projects/entities/project.entity");
const client_entity_1 = require("./entities/client.entity");
const SORTABLE = {
    name: 'client.name',
    clientCode: 'client.clientCode',
    companyName: 'client.companyName',
    country: 'client.country',
    status: 'client.status',
    createdAt: 'client.createdAt',
};
let ClientsService = class ClientsService {
    clients;
    projects;
    financials;
    sequences;
    auditLog;
    dataSource;
    constructor(clients, projects, financials, sequences, auditLog, dataSource) {
        this.clients = clients;
        this.projects = projects;
        this.financials = financials;
        this.sequences = sequences;
        this.auditLog = auditLog;
        this.dataSource = dataSource;
    }
    async findAll(query, unlocked) {
        const builder = this.clients.createQueryBuilder('client').where('client.deleted_at IS NULL');
        if (query.status)
            builder.andWhere('client.status = :status', { status: query.status });
        if (query.country)
            builder.andWhere('client.country ILIKE :country', { country: query.country });
        if (query.search) {
            const term = `%${query.search}%`;
            builder.andWhere(new typeorm_2.Brackets((qb) => qb
                .where('client.name ILIKE :term', { term })
                .orWhere('client.company_name ILIKE :term', { term })
                .orWhere('client.email ILIKE :term', { term })
                .orWhere('client.phone ILIKE :term', { term })
                .orWhere('client.client_code ILIKE :term', { term })));
        }
        builder
            .orderBy((0, pagination_dto_1.resolveSortColumn)(query.sortBy, SORTABLE, 'createdAt'), query.sortOrder)
            .skip(query.skip)
            .take(query.limit);
        const [clients, total] = await builder.getManyAndCount();
        const totals = await this.financials.totalsForClients(clients.map((client) => client.id));
        const items = clients.map((client) => this.toResponse(client, unlocked, totals.get(client.id) ?? null));
        return pagination_dto_1.PaginatedResult.of(items, total, query.page, query.limit);
    }
    async findOne(id, unlocked) {
        const client = await this.getOrFail(id);
        return this.toResponse(client, unlocked, await this.financials.totalsForClient(id));
    }
    async getEntityOrFail(id) {
        return this.getOrFail(id);
    }
    async create(dto, actor, context) {
        await this.assertEmailAvailable(dto.email);
        const client = await this.dataSource.transaction(async (manager) => {
            const clientCode = await this.sequences.allocate(manager, document_sequence_entity_1.SequenceKey.CLIENT);
            const entity = manager.getRepository(client_entity_1.Client).create({
                ...dto,
                clientCode,
                createdBy: actor.id,
                updatedBy: actor.id,
            });
            return manager.getRepository(client_entity_1.Client).save(entity);
        });
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.CLIENT_CREATED,
            module: audit_action_enum_1.AuditModule.CLIENTS,
            recordId: client.id,
            description: `Created client ${client.name}`,
            newValue: { ...dto },
            actor,
            context,
        });
        return this.toResponse(await this.getOrFail(client.id), false, null);
    }
    async update(id, dto, actor, context, unlocked) {
        const client = await this.getOrFail(id);
        if (dto.email && dto.email !== client.email) {
            await this.assertEmailAvailable(dto.email);
        }
        const before = { ...client };
        Object.assign(client, dto);
        client.updatedBy = actor.id;
        await this.clients.save(client);
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.CLIENT_UPDATED,
            module: audit_action_enum_1.AuditModule.CLIENTS,
            recordId: client.id,
            description: `Updated client ${client.name}`,
            oldValue: { ...before },
            newValue: { ...dto },
            actor,
            context,
        });
        return this.findOne(id, unlocked);
    }
    async archive(id, actor, context) {
        const client = await this.getOrFail(id);
        const projectCount = await this.projects.count({
            where: { clientId: id, deletedAt: (0, typeorm_2.IsNull)() },
        });
        if (projectCount > 0) {
            throw app_exception_1.AppException.conflict(error_codes_1.ErrorCode.CLIENT_HAS_PROJECTS, `This client has ${projectCount} active project(s). Archive or reassign them first.`);
        }
        await this.clients.softDelete(id);
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.CLIENT_ARCHIVED,
            module: audit_action_enum_1.AuditModule.CLIENTS,
            recordId: id,
            description: `Archived client ${client.name}`,
            actor,
            context,
        });
    }
    async lookup(query = {}) {
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
        const builder = this.clients
            .createQueryBuilder('client')
            .select([
            'client.id',
            'client.name',
            'client.companyName',
            'client.clientCode',
            'client.status',
        ])
            .where('client.deleted_at IS NULL')
            .orderBy('client.name', 'ASC')
            .limit(limit + 1);
        if (!query.includeInactive) {
            builder.andWhere('client.status = :status', { status: client_status_enum_1.ClientStatus.ACTIVE });
        }
        if (query.search) {
            const term = `%${query.search}%`;
            builder.andWhere(new typeorm_2.Brackets((qb) => qb
                .where('client.name ILIKE :term', { term })
                .orWhere('client.company_name ILIKE :term', { term })
                .orWhere('client.client_code ILIKE :term', { term })
                .orWhere('client.email ILIKE :term', { term })));
        }
        const clients = await builder.getMany();
        const hasMore = clients.length > limit;
        return clients.slice(0, limit).map((client, index, all) => ({
            id: client.id,
            name: client.name,
            companyName: client.companyName,
            clientCode: client.clientCode,
            status: client.status,
            hasMore: hasMore && index === all.length - 1 ? true : undefined,
        }));
    }
    async getOrFail(id) {
        const client = await this.clients.findOne({
            where: { id, deletedAt: (0, typeorm_2.IsNull)() },
            relations: { createdByUser: true, updatedByUser: true },
        });
        if (!client) {
            throw app_exception_1.AppException.notFound(error_codes_1.ErrorCode.CLIENT_NOT_FOUND, 'Client not found.');
        }
        return client;
    }
    async assertEmailAvailable(email) {
        if (!email)
            return;
        const existing = await this.clients.findOne({ where: { email, deletedAt: (0, typeorm_2.IsNull)() } });
        if (existing) {
            throw app_exception_1.AppException.conflict(error_codes_1.ErrorCode.DUPLICATE_EMAIL, 'Another client already uses this email address.');
        }
    }
    toResponse(client, unlocked, totals) {
        return {
            id: client.id,
            clientCode: client.clientCode,
            name: client.name,
            companyName: client.companyName,
            email: client.email,
            phone: client.phone,
            alternatePhone: client.alternatePhone,
            country: client.country,
            address: client.address,
            city: client.city,
            state: client.state,
            postalCode: client.postalCode,
            taxNumber: client.taxNumber,
            notes: client.notes,
            status: client.status,
            createdByName: client.createdByUser?.name ?? null,
            updatedByName: client.updatedByUser?.name ?? null,
            projectCount: totals?.projectCount ?? 0,
            fixedProjectCount: totals?.fixedProjectCount ?? 0,
            variableProjectCount: totals?.variableProjectCount ?? 0,
            financialLocked: !unlocked,
            totalProjectValue: (0, mask_util_1.maskAmount)(totals?.totalProjectValue, unlocked),
            totalReceived: (0, mask_util_1.maskAmount)(totals?.totalReceived, unlocked),
            variableReceived: (0, mask_util_1.maskAmount)(totals?.variableReceived, unlocked),
            totalDue: (0, mask_util_1.maskAmount)(totals?.totalDue, unlocked),
            createdAt: client.createdAt,
            updatedAt: client.updatedAt,
        };
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(client_entity_1.Client)),
    __param(1, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        project_financials_service_1.ProjectFinancialsService,
        sequence_service_1.SequenceService,
        audit_log_service_1.AuditLogService,
        typeorm_2.DataSource])
], ClientsService);
//# sourceMappingURL=clients.service.js.map