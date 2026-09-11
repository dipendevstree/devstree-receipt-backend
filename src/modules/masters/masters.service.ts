import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository } from 'typeorm';
import { ErrorCode } from 'src/common/constants/error-codes';
import { PaginatedResult, resolveSortColumn } from 'src/common/dto/pagination.dto';
import { AuditAction, AuditModule } from 'src/common/enums/audit-action.enum';
import { MasterStatus, MasterType } from 'src/common/enums/master-type.enum';
import { AppException } from 'src/common/exceptions/app.exception';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { AuditLogService } from 'src/modules/audit-logs/audit-log.service';
import {
  CreateMasterItemDto,
  MasterItemResponseDto,
  MasterOptionDto,
  QueryMasterItemDto,
  UpdateMasterItemDto,
} from './dto/master.dto';
import { MasterItem } from './entities/master-item.entity';

const SORTABLE: Record<string, string> = {
  name: 'master.name',
  code: 'master.code',
  sortOrder: 'master.sortOrder',
  status: 'master.status',
  createdAt: 'master.createdAt',
};

@Injectable()
export class MastersService {
  constructor(
    @InjectRepository(MasterItem) private readonly masters: Repository<MasterItem>,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll(
    type: MasterType,
    query: QueryMasterItemDto,
  ): Promise<PaginatedResult<MasterItemResponseDto>> {
    const builder = this.masters
      .createQueryBuilder('master')
      .leftJoinAndSelect('master.createdByUser', 'createdByUser')
      .leftJoinAndSelect('master.updatedByUser', 'updatedByUser')
      .where('master.deleted_at IS NULL')
      .andWhere('master.type = :type', { type });

    if (query.status) builder.andWhere('master.status = :status', { status: query.status });

    if (query.search) {
      const term = `%${query.search}%`;
      builder.andWhere(
        new Brackets((qb) =>
          qb
            .where('master.name ILIKE :term', { term })
            .orWhere('master.code ILIKE :term', { term }),
        ),
      );
    }

    builder
      .orderBy(resolveSortColumn(query.sortBy, SORTABLE, 'sortOrder'), query.sortOrder)
      .addOrderBy('master.name', 'ASC')
      .skip(query.skip)
      .take(query.limit);

    const [items, total] = await builder.getManyAndCount();
    return PaginatedResult.of(items.map(toResponse), total, query.page, query.limit);
  }

  /** Active rows only — this is what the frontend dropdowns consume. */
  async options(type: MasterType): Promise<MasterOptionDto[]> {
    const items = await this.masters.find({
      where: { type, status: MasterStatus.ACTIVE, deletedAt: IsNull() },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      code: item.code,
      metadata: item.metadata,
    }));
  }

  async findOne(id: string): Promise<MasterItemResponseDto> {
    return toResponse(await this.getOrFail(id));
  }

  async create(
    type: MasterType,
    dto: CreateMasterItemDto,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<MasterItemResponseDto> {
    await this.assertCodeAvailable(type, dto.code);

    const item = this.masters.create({
      type,
      name: dto.name,
      code: dto.code,
      description: dto.description ?? null,
      status: dto.status ?? MasterStatus.ACTIVE,
      sortOrder: dto.sortOrder ?? 0,
      metadata: dto.metadata ?? null,
      isSystem: false,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    const saved = await this.masters.save(item);

    await this.auditLog.record({
      action: AuditAction.MASTER_CREATED,
      module: AuditModule.MASTERS,
      recordId: saved.id,
      description: `Created ${type} master "${saved.name}" (${saved.code})`,
      newValue: { type, name: dto.name, code: dto.code, status: saved.status },
      actor,
      context,
    });

    // Re-read so the createdBy/updatedBy relations are populated in the response.
    return toResponse(await this.getOrFail(saved.id));
  }

  async update(
    id: string,
    dto: UpdateMasterItemDto,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<MasterItemResponseDto> {
    const item = await this.getOrFail(id);
    const before = {
      name: item.name,
      code: item.code,
      status: item.status,
      sortOrder: item.sortOrder,
    };

    if (dto.code && dto.code !== item.code) {
      if (item.isSystem) {
        // Other tables store this code; renaming it would orphan those rows.
        throw AppException.conflict(
          ErrorCode.CONFLICT,
          'The code of a system master cannot be changed because existing records reference it.',
        );
      }
      await this.assertCodeAvailable(item.type, dto.code);
      item.code = dto.code;
    }

    if (dto.name !== undefined) item.name = dto.name;
    if (dto.description !== undefined) item.description = dto.description ?? null;
    if (dto.status !== undefined) item.status = dto.status;
    if (dto.sortOrder !== undefined) item.sortOrder = dto.sortOrder;
    if (dto.metadata !== undefined) item.metadata = dto.metadata ?? null;
    item.updatedBy = actor.id;

    const saved = await this.masters.save(item);

    await this.auditLog.record({
      action: AuditAction.MASTER_UPDATED,
      module: AuditModule.MASTERS,
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

  async remove(id: string, actor: AuthenticatedUser, context: RequestContext): Promise<void> {
    const item = await this.getOrFail(id);

    if (item.isSystem) {
      throw AppException.conflict(
        ErrorCode.CONFLICT,
        'System masters cannot be deleted. Deactivate the record instead.',
      );
    }

    await this.masters.softDelete(id);

    await this.auditLog.record({
      action: AuditAction.MASTER_DELETED,
      module: AuditModule.MASTERS,
      recordId: id,
      description: `Deleted ${item.type} master "${item.name}"`,
      oldValue: { name: item.name, code: item.code },
      actor,
      context,
    });
  }

  private async getOrFail(id: string): Promise<MasterItem> {
    const item = await this.masters.findOne({
      where: { id, deletedAt: IsNull() },
      relations: { createdByUser: true, updatedByUser: true },
    });
    if (!item) {
      throw AppException.notFound(ErrorCode.NOT_FOUND, 'Master record not found.');
    }
    return item;
  }

  private async assertCodeAvailable(type: MasterType, code: string): Promise<void> {
    const existing = await this.masters.findOne({ where: { type, code, deletedAt: IsNull() } });
    if (existing) {
      throw AppException.conflict(
        ErrorCode.DUPLICATE_CODE,
        `A ${type.toLowerCase().replace('_', ' ')} master with code "${code}" already exists.`,
      );
    }
  }
}

function toResponse(item: MasterItem): MasterItemResponseDto {
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
