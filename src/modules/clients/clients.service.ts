import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { SequenceKey } from 'src/common/entities/document-sequence.entity';
import { ErrorCode } from 'src/common/constants/error-codes';
import { PaginatedResult, resolveSortColumn } from 'src/common/dto/pagination.dto';
import { AuditAction, AuditModule } from 'src/common/enums/audit-action.enum';
import { ClientStatus } from 'src/common/enums/client-status.enum';
import { MasterStatus, MasterType } from 'src/common/enums/master-type.enum';
import { AppException } from 'src/common/exceptions/app.exception';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { SequenceService } from 'src/common/services/sequence.service';
import { AuditLogService } from 'src/modules/audit-logs/audit-log.service';
import {
  ClientTotals,
  ProjectFinancialsService,
} from 'src/modules/financial/services/project-financials.service';
import { maskAmount } from 'src/modules/financial/utils/mask.util';
import { MasterItem } from 'src/modules/masters/entities/master-item.entity';
import { Project } from 'src/modules/projects/entities/project.entity';
import { Client } from './entities/client.entity';
import {
  ClientLookupDto,
  ClientLookupQueryDto,
  ClientResponseDto,
  CreateClientDto,
  QueryClientDto,
  UpdateClientDto,
} from './dto/client.dto';

const SORTABLE: Record<string, string> = {
  name: 'client.name',
  clientCode: 'client.clientCode',
  country: 'client.country',
  status: 'client.status',
  createdAt: 'client.createdAt',
};

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(MasterItem) private readonly masters: Repository<MasterItem>,
    private readonly financials: ProjectFinancialsService,
    private readonly sequences: SequenceService,
    private readonly auditLog: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    query: QueryClientDto,
    unlocked: boolean,
  ): Promise<PaginatedResult<ClientResponseDto>> {
    const builder = this.clients.createQueryBuilder('client').where('client.deleted_at IS NULL');

    if (query.status) builder.andWhere('client.status = :status', { status: query.status });
    if (query.country)
      builder.andWhere('client.country ILIKE :country', { country: query.country });

    if (query.search) {
      const term = `%${query.search}%`;
      builder.andWhere(
        new Brackets((qb) =>
          qb
            .where('client.name ILIKE :term', { term })
            .orWhere('client.email ILIKE :term', { term })
            .orWhere('client.phone ILIKE :term', { term })
            .orWhere('client.client_code ILIKE :term', { term }),
        ),
      );
    }

    builder
      .orderBy(resolveSortColumn(query.sortBy, SORTABLE, 'createdAt'), query.sortOrder)
      .skip(query.skip)
      .take(query.limit);

    const [clients, total] = await builder.getManyAndCount();
    const totals = await this.financials.totalsForClients(clients.map((client) => client.id));

    const items = clients.map((client) =>
      this.toResponse(client, unlocked, totals.get(client.id) ?? null),
    );

    return PaginatedResult.of(items, total, query.page, query.limit);
  }

  async findOne(id: string, unlocked: boolean): Promise<ClientResponseDto> {
    const client = await this.getOrFail(id);
    return this.toResponse(client, unlocked, await this.financials.totalsForClient(id));
  }

  async getEntityOrFail(id: string): Promise<Client> {
    return this.getOrFail(id);
  }

  async create(
    dto: CreateClientDto,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<ClientResponseDto> {
    await this.assertEmailAvailable(dto.email);
    if (dto.country) dto.country = await this.resolveCountry(dto.country);

    const client = await this.dataSource.transaction((manager) =>
      this.createWithin(manager, dto, actor),
    );

    await this.auditLog.record({
      action: AuditAction.CLIENT_CREATED,
      module: AuditModule.CLIENTS,
      recordId: client.id,
      description: `Created client ${client.name}`,
      newValue: { ...dto },
      actor,
      context,
    });

    // Re-read so the createdBy/updatedBy relations are populated in the response.
    return this.toResponse(await this.getOrFail(client.id), false, null);
  }

  /**
   * Allocates the client code and inserts the row on the caller's transaction.
   *
   * Shared by the single-record endpoint and the Excel importer so both go
   * through the same sequence allocation and the same attribution rules. The
   * importer needs it on *its* transaction so a failing row rolls the whole
   * batch back.
   */
  async createWithin(
    manager: EntityManager,
    dto: CreateClientDto,
    actor: AuthenticatedUser,
  ): Promise<Client> {
    const clientCode = await this.sequences.allocate(manager, SequenceKey.CLIENT);
    const entity = manager.getRepository(Client).create({
      ...dto,
      clientCode,
      // Attribution always comes from the authenticated session, never the payload.
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    return manager.getRepository(Client).save(entity);
  }

  async update(
    id: string,
    dto: UpdateClientDto,
    actor: AuthenticatedUser,
    context: RequestContext,
    unlocked: boolean,
  ): Promise<ClientResponseDto> {
    const client = await this.getOrFail(id);
    if (dto.email && dto.email !== client.email) {
      await this.assertEmailAvailable(dto.email);
    }
    // Only a changed country is checked, so a client saved before a country
    // was retired from the masters can still have its other details edited.
    if (dto.country && dto.country !== client.country) {
      dto.country = await this.resolveCountry(dto.country);
    }

    const before = { ...client };
    // Apply only the fields that were sent. A DTO class with declared fields
    // carries omitted ones as own `undefined` properties, and assigning those
    // would blank the entity in memory (and in the audit entry) even though the
    // database write skips them. `null` is still applied — it clears a field.
    const changes = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    ) as UpdateClientDto;
    Object.assign(client, changes);
    client.updatedBy = actor.id;
    await this.clients.save(client);

    await this.auditLog.record({
      action: AuditAction.CLIENT_UPDATED,
      module: AuditModule.CLIENTS,
      recordId: client.id,
      description: `Updated client ${client.name}`,
      oldValue: { ...before },
      newValue: { ...changes },
      actor,
      context,
    });

    return this.findOne(id, unlocked);
  }

  /** Soft delete. Refused while the client still has projects. */
  async archive(id: string, actor: AuthenticatedUser, context: RequestContext): Promise<void> {
    const client = await this.getOrFail(id);

    const projectCount = await this.projects.count({
      where: { clientId: id, deletedAt: IsNull() },
    });
    if (projectCount > 0) {
      throw AppException.conflict(
        ErrorCode.CLIENT_HAS_PROJECTS,
        `This client has ${projectCount} active project(s). Archive or reassign them first.`,
      );
    }

    await this.clients.softDelete(id);

    await this.auditLog.record({
      action: AuditAction.CLIENT_ARCHIVED,
      module: AuditModule.CLIENTS,
      recordId: id,
      description: `Archived client ${client.name}`,
      actor,
      context,
    });
  }

  /**
   * Backing endpoint for the searchable client dropdown. Filtering happens in
   * Postgres and the result is capped, so the browser never loads the whole
   * client table just to let someone type three letters. Never carries
   * financial data.
   *
   * `includeInactive` exists for filter dropdowns, which must be able to
   * select an inactive client whose historical payments are still being
   * looked at — the create/edit forms leave it off.
   */
  async lookup(query: ClientLookupQueryDto = {}): Promise<ClientLookupDto[]> {
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const builder = this.clients
      .createQueryBuilder('client')
      .select(['client.id', 'client.name', 'client.clientCode', 'client.status'])
      .where('client.deleted_at IS NULL')
      .orderBy('client.name', 'ASC')
      .limit(limit + 1);

    if (!query.includeInactive) {
      builder.andWhere('client.status = :status', { status: ClientStatus.ACTIVE });
    }

    if (query.search) {
      const term = `%${query.search}%`;
      builder.andWhere(
        new Brackets((qb) =>
          qb
            .where('client.name ILIKE :term', { term })
            .orWhere('client.client_code ILIKE :term', { term })
            .orWhere('client.email ILIKE :term', { term }),
        ),
      );
    }

    const clients = await builder.getMany();
    // One row over the limit signals "there is more" without a COUNT query.
    const hasMore = clients.length > limit;

    return clients.slice(0, limit).map((client, index, all) => ({
      id: client.id,
      name: client.name,
      clientCode: client.clientCode,
      status: client.status,
      hasMore: hasMore && index === all.length - 1 ? true : undefined,
    }));
  }

  private async getOrFail(id: string): Promise<Client> {
    const client = await this.clients.findOne({
      where: { id, deletedAt: IsNull() },
      relations: { createdByUser: true, updatedByUser: true },
    });
    if (!client) {
      throw AppException.notFound(ErrorCode.CLIENT_NOT_FOUND, 'Client not found.');
    }
    return client;
  }

  /**
   * Active country masters keyed by lower-cased name and code, both mapping to
   * the stored country name. Shared with the Excel importer so a form save and
   * an imported row accept exactly the same values.
   */
  async countryLookup(): Promise<Map<string, string>> {
    const countries = await this.masters.find({
      where: { type: MasterType.COUNTRY, status: MasterStatus.ACTIVE, deletedAt: IsNull() },
    });
    const lookup = new Map<string, string>();
    for (const country of countries) {
      lookup.set(country.name.toLowerCase(), country.name);
      lookup.set(country.code.toLowerCase(), country.name);
    }
    return lookup;
  }

  /**
   * Country is reference data owned by Masters → Countries. A value that is not
   * configured there is refused; with no country masters at all there is
   * nothing to check against, so the value is kept as sent.
   */
  private async resolveCountry(raw: string): Promise<string> {
    const lookup = await this.countryLookup();
    if (lookup.size === 0) return raw;

    const match = lookup.get(raw.trim().toLowerCase());
    if (!match) {
      throw AppException.badRequest(
        ErrorCode.VALIDATION_FAILED,
        `"${raw}" is not a configured country. Choose one from Masters → Countries.`,
      );
    }
    return match;
  }

  private async assertEmailAvailable(email?: string | null): Promise<void> {
    if (!email) return;
    const existing = await this.clients.findOne({ where: { email, deletedAt: IsNull() } });
    if (existing) {
      throw AppException.conflict(
        ErrorCode.DUPLICATE_EMAIL,
        'Another client already uses this email address.',
      );
    }
  }

  /**
   * Fixed-amount and variable projects are reported separately. A client with a
   * ₹5,00,000 website project and an open-ended SEO retainer has a real due on
   * the first and none at all on the second — folding them together would
   * either invent a due or hide one.
   */
  private toResponse(
    client: Client,
    unlocked: boolean,
    totals: ClientTotals | null,
  ): ClientResponseDto {
    return {
      id: client.id,
      clientCode: client.clientCode,
      name: client.name,
      email: client.email,
      phone: client.phone,
      country: client.country,
      status: client.status,
      createdByName: client.createdByUser?.name ?? null,
      updatedByName: client.updatedByUser?.name ?? null,
      projectCount: totals?.projectCount ?? 0,
      fixedProjectCount: totals?.fixedProjectCount ?? 0,
      variableProjectCount: totals?.variableProjectCount ?? 0,
      financialLocked: !unlocked,
      totalProjectValue: maskAmount(totals?.totalProjectValue, unlocked),
      totalReceived: maskAmount(totals?.totalReceived, unlocked),
      variableReceived: maskAmount(totals?.variableReceived, unlocked),
      totalDue: maskAmount(totals?.totalDue, unlocked),
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }
}
