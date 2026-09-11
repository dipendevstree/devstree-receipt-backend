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
exports.MastersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const error_codes_1 = require("../../common/constants/error-codes");
const pagination_dto_1 = require("../../common/dto/pagination.dto");
const audit_action_enum_1 = require("../../common/enums/audit-action.enum");
const master_type_enum_1 = require("../../common/enums/master-type.enum");
const app_exception_1 = require("../../common/exceptions/app.exception");
const audit_log_service_1 = require("../audit-logs/audit-log.service");
const master_item_entity_1 = require("./entities/master-item.entity");
const SORTABLE = {
    name: 'master.name',
    code: 'master.code',
    sortOrder: 'master.sortOrder',
    status: 'master.status',
    createdAt: 'master.createdAt',
};
let MastersService = class MastersService {
    masters;
    auditLog;
    constructor(masters, auditLog) {
        this.masters = masters;
        this.auditLog = auditLog;
    }
    async findAll(type, query) {
        const builder = this.masters
            .createQueryBuilder('master')
            .leftJoinAndSelect('master.createdByUser', 'createdByUser')
            .leftJoinAndSelect('master.updatedByUser', 'updatedByUser')
            .where('master.deleted_at IS NULL')
            .andWhere('master.type = :type', { type });
        if (query.status)
            builder.andWhere('master.status = :status', { status: query.status });
        if (query.search) {
            const term = `%${query.search}%`;
            builder.andWhere(new typeorm_2.Brackets((qb) => qb
                .where('master.name ILIKE :term', { term })
                .orWhere('master.code ILIKE :term', { term })));
        }
        builder
            .orderBy((0, pagination_dto_1.resolveSortColumn)(query.sortBy, SORTABLE, 'sortOrder'), query.sortOrder)
            .addOrderBy('master.name', 'ASC')
            .skip(query.skip)
            .take(query.limit);
        const [items, total] = await builder.getManyAndCount();
        return pagination_dto_1.PaginatedResult.of(items.map(toResponse), total, query.page, query.limit);
    }
    async options(type) {
        const items = await this.masters.find({
            where: { type, status: master_type_enum_1.MasterStatus.ACTIVE, deletedAt: (0, typeorm_2.IsNull)() },
            order: { sortOrder: 'ASC', name: 'ASC' },
        });
        return items.map((item) => ({
            id: item.id,
            name: item.name,
            code: item.code,
            metadata: item.metadata,
        }));
    }
    async findOne(id) {
        return toResponse(await this.getOrFail(id));
    }
    async create(type, dto, actor, context) {
        await this.assertCodeAvailable(type, dto.code);
        const item = this.masters.create({
            type,
            name: dto.name,
            code: dto.code,
            description: dto.description ?? null,
            status: dto.status ?? master_type_enum_1.MasterStatus.ACTIVE,
            sortOrder: dto.sortOrder ?? 0,
            metadata: dto.metadata ?? null,
            isSystem: false,
            createdBy: actor.id,
            updatedBy: actor.id,
        });
        const saved = await this.masters.save(item);
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.MASTER_CREATED,
            module: audit_action_enum_1.AuditModule.MASTERS,
            recordId: saved.id,
            description: `Created ${type} master "${saved.name}" (${saved.code})`,
            newValue: { type, name: dto.name, code: dto.code, status: saved.status },
            actor,
            context,
        });
        return toResponse(await this.getOrFail(saved.id));
    }
    async update(id, dto, actor, context) {
        const item = await this.getOrFail(id);
        const before = {
            name: item.name,
            code: item.code,
            status: item.status,
            sortOrder: item.sortOrder,
        };
        if (dto.code && dto.code !== item.code) {
            if (item.isSystem) {
                throw app_exception_1.AppException.conflict(error_codes_1.ErrorCode.CONFLICT, 'The code of a system master cannot be changed because existing records reference it.');
            }
            await this.assertCodeAvailable(item.type, dto.code);
            item.code = dto.code;
        }
        if (dto.name !== undefined)
            item.name = dto.name;
        if (dto.description !== undefined)
            item.description = dto.description ?? null;
        if (dto.status !== undefined)
            item.status = dto.status;
        if (dto.sortOrder !== undefined)
            item.sortOrder = dto.sortOrder;
        if (dto.metadata !== undefined)
            item.metadata = dto.metadata ?? null;
        item.updatedBy = actor.id;
        const saved = await this.masters.save(item);
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.MASTER_UPDATED,
            module: audit_action_enum_1.AuditModule.MASTERS,
            recordId: saved.id,
            description: `Updated ${saved.type} master "${saved.name}"`,
            oldValue: before,
            newValue: {
                name: saved.name,
                code: saved.code,
                status: saved.status,
                sortOrder: saved.sortOrder,
            },
            actor,
            context,
        });
        return toResponse(await this.getOrFail(saved.id));
    }
    async remove(id, actor, context) {
        const item = await this.getOrFail(id);
        if (item.isSystem) {
            throw app_exception_1.AppException.conflict(error_codes_1.ErrorCode.CONFLICT, 'System masters cannot be deleted. Deactivate the record instead.');
        }
        await this.masters.softDelete(id);
        await this.auditLog.record({
            action: audit_action_enum_1.AuditAction.MASTER_DELETED,
            module: audit_action_enum_1.AuditModule.MASTERS,
            recordId: id,
            description: `Deleted ${item.type} master "${item.name}"`,
            oldValue: { name: item.name, code: item.code },
            actor,
            context,
        });
    }
    async getOrFail(id) {
        const item = await this.masters.findOne({
            where: { id, deletedAt: (0, typeorm_2.IsNull)() },
            relations: { createdByUser: true, updatedByUser: true },
        });
        if (!item) {
            throw app_exception_1.AppException.notFound(error_codes_1.ErrorCode.NOT_FOUND, 'Master record not found.');
        }
        return item;
    }
    async assertCodeAvailable(type, code) {
        const existing = await this.masters.findOne({ where: { type, code, deletedAt: (0, typeorm_2.IsNull)() } });
        if (existing) {
            throw app_exception_1.AppException.conflict(error_codes_1.ErrorCode.DUPLICATE_CODE, `A ${type.toLowerCase().replace('_', ' ')} master with code "${code}" already exists.`);
        }
    }
};
exports.MastersService = MastersService;
exports.MastersService = MastersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(master_item_entity_1.MasterItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        audit_log_service_1.AuditLogService])
], MastersService);
function toResponse(item) {
    return {
        id: item.id,
        type: item.type,
        name: item.name,
        code: item.code,
        description: item.description,
        status: item.status,
        sortOrder: item.sortOrder,
        isSystem: item.isSystem,
        metadata: item.metadata,
        createdByName: item.createdByUser?.name ?? null,
        updatedByName: item.updatedByUser?.name ?? null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}
//# sourceMappingURL=masters.service.js.map