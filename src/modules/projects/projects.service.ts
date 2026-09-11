import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { SequenceKey } from 'src/common/entities/document-sequence.entity';
import { ErrorCode } from 'src/common/constants/error-codes';
import { PaginatedResult, resolveSortColumn } from 'src/common/dto/pagination.dto';
import { AuditAction, AuditModule } from 'src/common/enums/audit-action.enum';
import { PaymentStatus } from 'src/common/enums/payment.enum';
import { ProjectPaymentStatus, ProjectStatus } from 'src/common/enums/project-status.enum';
import { AppException } from 'src/common/exceptions/app.exception';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { SequenceService } from 'src/common/services/sequence.service';
import { Money } from 'src/common/utils/money.util';
import { AuditLogService } from 'src/modules/audit-logs/audit-log.service';
import { Client } from 'src/modules/clients/entities/client.entity';
import {
  EncryptionContext,
  FinancialEncryptionService,
} from 'src/modules/financial/services/financial-encryption.service';
import {
  ProjectFinancialsService,
  ProjectTotals,
} from 'src/modules/financial/services/project-financials.service';
import { maskAmount } from 'src/modules/financial/utils/mask.util';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import {
  CreateProjectDto,
  ProjectLookupDto,
  ProjectLookupQueryDto,
  ProjectResponseDto,
  QueryProjectDto,
  UpdateProjectDto,
} from './dto/project.dto';
import { Project } from './entities/project.entity';

/** The stored shape of "this project has no defined amount". */
const NO_PROJECT_AMOUNT = {
  encryptedAmount: null,
  amountIv: null,
  amountAuthTag: null,
  encryptionKeyVersion: null,
} as const;

const SORTABLE: Record<string, string> = {
  projectName: 'project.projectName',
  projectCode: 'project.projectCode',
  startDate: 'project.startDate',
  status: 'project.status',
  createdAt: 'project.createdAt',
};

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    private readonly encryption: FinancialEncryptionService,
    private readonly financials: ProjectFinancialsService,
    private readonly sequences: SequenceService,
    private readonly auditLog: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    query: QueryProjectDto,
    unlocked: boolean,
  ): Promise<PaginatedResult<ProjectResponseDto>> {
    const builder = this.projects
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.client', 'client')
      .where('project.deleted_at IS NULL');

    if (query.clientId)
      builder.andWhere('project.client_id = :clientId', { clientId: query.clientId });
    if (query.status) builder.andWhere('project.status = :status', { status: query.status });

    if (query.hasAmount !== undefined) {
      builder.andWhere(
        query.hasAmount
          ? 'project.encrypted_amount IS NOT NULL'
          : 'project.encrypted_amount IS NULL',
      );
    }

    const range = query.resolveRange();
    if (range.from)
      builder.andWhere('project.created_at >= :createdFrom', { createdFrom: range.from });
    if (range.to) {
      // created_at is a timestamptz; `<= '2026-09-09'` would drop that whole day.
      builder.andWhere("project.created_at < (:createdTo::date + INTERVAL '1 day')", {
        createdTo: range.to,
      });
    }

    if (query.search) {
      const term = `%${query.search}%`;
      builder.andWhere(
        new Brackets((qb) =>
          qb
            .where('project.project_name ILIKE :term', { term })
            .orWhere('project.project_code ILIKE :term', { term })
            .orWhere('client.name ILIKE :term', { term }),
        ),
      );
    }

    builder
      .orderBy(resolveSortColumn(query.sortBy, SORTABLE, 'createdAt'), query.sortOrder)
      .skip(query.skip)
      .take(query.limit);

    let [projects, total] = await builder.getManyAndCount();
    const totalsMap = await this.financials.totalsForProjects(projects);

    if (query.paymentStatus) {
      projects = projects.filter(
        (project) => totalsMap.get(project.id)?.paymentStatus === query.paymentStatus,
      );
      total = projects.length;
    }

    const items = projects.map((project) =>
      this.toResponse(project, totalsMap.get(project.id) ?? null, unlocked),
    );

    return PaginatedResult.of(items, total, query.page, query.limit);
  }

  async findOne(id: string, unlocked: boolean): Promise<ProjectResponseDto> {
    const project = await this.getOrFail(id);
    const totals = await this.financials.totalsForProject(project);
    return this.toResponse(project, totals, unlocked);
  }

  async getEntityOrFail(id: string): Promise<Project> {
    return this.getOrFail(id);
  }

  async create(
    dto: CreateProjectDto,
    actor: AuthenticatedUser,
    context: RequestContext,
    unlocked = false,
  ): Promise<ProjectResponseDto> {
    const client = await this.clients.findOne({ where: { id: dto.clientId, deletedAt: IsNull() } });
    if (!client) {
      throw AppException.notFound(ErrorCode.CLIENT_NOT_FOUND, 'Selected client was not found.');
    }

    const project = await this.dataSource.transaction((manager) =>
      this.createWithin(manager, dto, actor),
    );

    await this.auditLog.record({
      action: AuditAction.PROJECT_CREATED,
      module: AuditModule.PROJECTS,
      recordId: project.id,
      description: `Created project ${project.projectName} for client ${client.name}`,
      newValue: {
        projectName: dto.projectName,
        clientId: dto.clientId,
        status: project.status,
        // The value itself is redacted by the audit service; whether one exists
        // at all is not financial data and is worth having in the trail.
        hasProjectAmount: project.hasProjectAmount(),
      },
      actor,
      context,
    });

    project.client = client;
    const totals = await this.financials.totalsForProject(project);
    return this.toResponse(project, totals, unlocked);
  }

  /**
   * Encrypts the amount, allocates the project code and inserts the row on the
   * caller's transaction. Shared by the single-record endpoint and the Excel
   * importer so a bulk-created project is stored exactly like a form-created
   * one — including the NULL-ciphertext encoding of "no fixed amount".
   */
  async createWithin(
    manager: EntityManager,
    dto: CreateProjectDto,
    actor: AuthenticatedUser,
  ): Promise<Project> {
    // Project amount is optional. When it is absent all four ciphertext columns
    // stay NULL, which is how "no predefined amount" is stored — an encrypted
    // zero would be a different, and wrong, business state.
    const encrypted =
      dto.projectAmount === undefined || dto.projectAmount === null
        ? NO_PROJECT_AMOUNT
        : this.encryption.encryptAmount(
            Money.fromDecimalString(dto.projectAmount),
            EncryptionContext.PROJECT_AMOUNT,
          );

    const projectCode = await this.sequences.allocate(manager, SequenceKey.PROJECT);
    const entity = manager.getRepository(Project).create({
      clientId: dto.clientId,
      projectCode,
      projectName: dto.projectName,
      description: dto.description ?? null,
      ...encrypted,
      startDate: dto.startDate ?? null,
      status: dto.status ?? ProjectStatus.DRAFT,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    return manager.getRepository(Project).save(entity);
  }

  async update(
    id: string,
    dto: UpdateProjectDto,
    actor: AuthenticatedUser,
    context: RequestContext,
    unlocked: boolean,
  ): Promise<ProjectResponseDto> {
    const project = await this.getOrFail(id);
    const before = {
      projectName: project.projectName,
      status: project.status,
      startDate: project.startDate,
      hasProjectAmount: project.hasProjectAmount(),
    };

    if (dto.clientId && dto.clientId !== project.clientId) {
      const client = await this.clients.findOne({
        where: { id: dto.clientId, deletedAt: IsNull() },
      });
      if (!client) {
        throw AppException.notFound(ErrorCode.CLIENT_NOT_FOUND, 'Selected client was not found.');
      }
      project.clientId = dto.clientId;
    }

    if (dto.projectAmount !== undefined) {
      // null clears the amount and turns the project into a variable one;
      // omitting the key entirely leaves whatever is stored untouched.
      Object.assign(
        project,
        dto.projectAmount === null
          ? NO_PROJECT_AMOUNT
          : this.encryption.encryptAmount(
              Money.fromDecimalString(dto.projectAmount),
              EncryptionContext.PROJECT_AMOUNT,
            ),
      );
    }

    if (dto.projectName !== undefined) project.projectName = dto.projectName;
    if (dto.description !== undefined) project.description = dto.description ?? null;
    if (dto.startDate !== undefined) project.startDate = dto.startDate ?? null;
    if (dto.status !== undefined) project.status = dto.status;
    project.updatedBy = actor.id;

    await this.projects.save(project);

    await this.auditLog.record({
      action: AuditAction.PROJECT_UPDATED,
      module: AuditModule.PROJECTS,
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

  async archive(id: string, actor: AuthenticatedUser, context: RequestContext): Promise<void> {
    const project = await this.getOrFail(id);

    const paymentCount = await this.payments.count({
      where: { projectId: id, status: PaymentStatus.VALID, deletedAt: IsNull() },
    });
    if (paymentCount > 0) {
      throw AppException.conflict(
        ErrorCode.PROJECT_HAS_PAYMENTS,
        `This project has ${paymentCount} recorded payment(s) and cannot be archived. Cancel it instead.`,
      );
    }

    await this.projects.softDelete(id);

    await this.auditLog.record({
      action: AuditAction.PROJECT_ARCHIVED,
      module: AuditModule.PROJECTS,
      recordId: id,
      description: `Archived project ${project.projectName}`,
      actor,
      context,
    });
  }

  async lookupByClient(clientId: string): Promise<ProjectLookupDto[]> {
    return this.lookup({ clientId, limit: 200 });
  }

  /**
   * Backing endpoint for the searchable project dropdown. Deliberately capped
   * and server-filtered so the browser never receives thousands of projects,
   * and deliberately free of any financial field.
   */
  async lookup(query: ProjectLookupQueryDto): Promise<ProjectLookupDto[]> {
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
      builder.andWhere(
        new Brackets((qb) =>
          qb
            .where('project.project_name ILIKE :term', { term })
            .orWhere('project.project_code ILIKE :term', { term })
            .orWhere('client.name ILIKE :term', { term }),
        ),
      );
    }

    const projects = await builder
      .orderBy('project.project_name', 'ASC')
      .limit(limit + 1)
      .getMany();

    // One extra row tells the client there is more to search for without a
    // second COUNT query.
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

  private async getOrFail(id: string): Promise<Project> {
    const project = await this.projects.findOne({
      where: { id, deletedAt: IsNull() },
      relations: { client: true },
    });
    if (!project) {
      throw AppException.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found.');
    }
    return project;
  }

  private toResponse(
    project: Project,
    totals: ProjectTotals | null,
    unlocked: boolean,
  ): ProjectResponseDto {
    return {
      id: project.id,
      projectCode: project.projectCode,
      projectName: project.projectName,
      description: project.description,
      clientId: project.clientId,
      clientName: project.client?.name ?? '',
      startDate: project.startDate,
      status: project.status,
      paymentStatus: totals?.paymentStatus ?? ProjectPaymentStatus.UNPAID,
      paymentCount: totals?.paymentCount ?? 0,
      financialLocked: !unlocked,
      // Sent whether locked or not: "this project has no fixed amount" is a
      // structural fact, not a financial figure, and the UI needs it to choose
      // between "Not Defined" and the XXX mask.
      hasProjectAmount: totals?.hasProjectAmount ?? project.hasProjectAmount(),
      projectAmount: totals ? maskAmount(totals.projectAmount, unlocked) : null,
      totalReceived: totals ? maskAmount(totals.totalReceived, unlocked) : null,
      dueAmount: totals ? maskAmount(totals.dueAmount, unlocked) : null,
      lastPaymentDate: totals?.lastPaymentDate ?? null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
