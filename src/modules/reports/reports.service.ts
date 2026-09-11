import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { ErrorCode } from 'src/common/constants/error-codes';
import { PaginatedResult, resolveSortColumn } from 'src/common/dto/pagination.dto';
import { PaymentStatus } from 'src/common/enums/payment.enum';
import { AppException } from 'src/common/exceptions/app.exception';
import { monthKeyOf, monthKeysOfYear } from 'src/common/utils/date-range.util';
import { Money } from 'src/common/utils/money.util';
import { Client } from 'src/modules/clients/entities/client.entity';
import {
  ProjectFinancialsService,
  ProjectTotals,
} from 'src/modules/financial/services/project-financials.service';
import { maskAmount } from 'src/modules/financial/utils/mask.util';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import { Project } from 'src/modules/projects/entities/project.entity';
import {
  ClientCollectionRowDto,
  ClientStatementDto,
  DuePaymentRowDto,
  DuePaymentsQueryDto,
  MonthlyCollectionRowDto,
  PaymentReportRowDto,
  ProjectCollectionRowDto,
  ProjectStatementDto,
  ReportFilterQueryDto,
} from './dto/report.dto';

const PAYMENT_SORTABLE: Record<string, string> = {
  paymentDate: 'payment.paymentDate',
  clientName: 'client.name',
  projectName: 'project.projectName',
  paymentMethod: 'payment.paymentMethod',
  createdAt: 'payment.createdAt',
};

/**
 * Every report here is filter-composable: the same `ReportFilterQueryDto`
 * drives all of them, and each report applies the subset of dimensions that
 * makes sense for its grain.
 *
 * Projects with no defined amount are reported honestly: `projectAmount` is
 * null (rendered "Not Defined"), `dueAmount` is null (rendered "N/A"), and
 * their zero project value never inflates or deflates a client-level total.
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    private readonly financials: ProjectFinancialsService,
  ) {}

  async duePayments(
    query: DuePaymentsQueryDto,
    unlocked: boolean,
  ): Promise<PaginatedResult<DuePaymentRowDto>> {
    const projects = await this.filteredProjects(query);
    const totalsMap = await this.financials.totalsForProjects(projects);
    const range = this.amountRange(query);

    let rows: DuePaymentRowDto[] = projects
      .map((project) => {
        const totals = totalsMap.get(project.id);
        if (!totals) return null;

        // A variable project can never be "due" anything, so it has no place
        // on a due-payments report. It is excluded rather than shown with a
        // fabricated zero.
        if (totals.dueAmount === null || !totals.dueAmount.isPositive()) return null;
        if (query.projectPaymentStatus && totals.paymentStatus !== query.projectPaymentStatus) {
          return null;
        }
        if (range && !this.withinRange(totals.dueAmount, range)) return null;

        return this.toDueRow(project, totals, unlocked);
      })
      .filter((row): row is DuePaymentRowDto => row !== null);

    const total = rows.length;
    rows = rows.slice(query.skip, query.skip + query.limit);
    return PaginatedResult.of(rows, total, query.page, query.limit);
  }

  async clientCollection(
    query: ReportFilterQueryDto,
    unlocked: boolean,
  ): Promise<ClientCollectionRowDto[]> {
    const builder = this.clients
      .createQueryBuilder('client')
      .where('client.deleted_at IS NULL')
      .orderBy('client.name', 'ASC');

    if (query.clientId) builder.andWhere('client.id = :clientId', { clientId: query.clientId });
    if (query.clientStatus)
      builder.andWhere('client.status = :clientStatus', { clientStatus: query.clientStatus });
    if (query.search) {
      const term = `%${query.search}%`;
      builder.andWhere(new Brackets((qb) => qb.where('client.name ILIKE :term', { term })));
    }

    const clients = await builder.getMany();
    const totals = await this.financials.totalsForClients(clients.map((c) => c.id));

    return clients.map((client) => {
      const t = totals.get(client.id);
      return {
        clientId: client.id,
        clientName: client.name,
        projectCount: t?.projectCount ?? 0,
        fixedProjectCount: t?.fixedProjectCount ?? 0,
        variableProjectCount: t?.variableProjectCount ?? 0,
        totalProjectValue: maskAmount(t?.totalProjectValue, unlocked),
        totalReceived: maskAmount(t?.totalReceived, unlocked),
        variableReceived: maskAmount(t?.variableReceived, unlocked),
        totalDue: maskAmount(t?.totalDue, unlocked),
      };
    });
  }

  async projectCollection(
    query: ReportFilterQueryDto,
    unlocked: boolean,
  ): Promise<ProjectCollectionRowDto[]> {
    const projects = await this.filteredProjects(query);
    const totals = await this.financials.totalsForProjects(projects);

    return projects
      .map((project) => {
        const t = totals.get(project.id);
        if (query.projectPaymentStatus && t?.paymentStatus !== query.projectPaymentStatus) {
          return null;
        }
        return {
          clientId: project.clientId,
          clientName: project.client?.name ?? '',
          projectId: project.id,
          projectCode: project.projectCode,
          projectName: project.projectName,
          projectStatus: project.status,
          hasProjectAmount: t?.hasProjectAmount ?? project.hasProjectAmount(),
          projectAmount: maskAmount(t?.projectAmount ?? null, unlocked),
          totalReceived: maskAmount(t?.totalReceived, unlocked),
          dueAmount: maskAmount(t?.dueAmount ?? null, unlocked),
        };
      })
      .filter((row): row is ProjectCollectionRowDto => row !== null);
  }

  async paymentReport(
    query: ReportFilterQueryDto,
    unlocked: boolean,
  ): Promise<PaymentReportRowDto[]> {
    const builder = this.paymentQuery(query);

    builder.orderBy(
      resolveSortColumn(query.sortBy, PAYMENT_SORTABLE, 'paymentDate'),
      query.sortOrder ?? 'DESC',
    );

    let payments = await builder.getMany();

    const range = this.amountRange(query);
    if (range) {
      payments = payments.filter((payment) =>
        this.withinRange(this.financials.decryptPaymentAmount(payment), range),
      );
    }

    return payments.map((payment) => this.toPaymentRow(payment, unlocked));
  }

  /**
   * Monthly buckets for one calendar year. The bucket key comes from the
   * stored `date` string rather than a re-parsed Date, so a payment dated
   * 2026-01-01 lands in January no matter what timezone the server runs in.
   */
  async monthlyCollection(
    year: number,
    query: ReportFilterQueryDto,
    unlocked: boolean,
  ): Promise<MonthlyCollectionRowDto[]> {
    const builder = this.paymentQuery(query, { skipDateRange: true })
      .andWhere('payment.payment_date >= :yearStart', { yearStart: `${year}-01-01` })
      .andWhere('payment.payment_date <= :yearEnd', { yearEnd: `${year}-12-31` });

    const payments = await builder.getMany();

    const buckets = new Map(
      monthKeysOfYear(year).map((key) => [
        key,
        { paymentCount: 0, receiptCount: 0, total: Money.zero() },
      ]),
    );

    for (const payment of payments) {
      const bucket = buckets.get(monthKeyOf(payment.paymentDate));
      if (!bucket) continue;
      bucket.paymentCount += 1;
      if (payment.receipt) bucket.receiptCount += 1;
      if (unlocked) bucket.total = bucket.total.add(this.financials.decryptPaymentAmount(payment));
    }

    return [...buckets.entries()].map(([month, bucket]) => ({
      month,
      paymentCount: bucket.paymentCount,
      receiptCount: bucket.receiptCount,
      totalReceived: maskAmount(bucket.total, unlocked),
    }));
  }

  async clientStatement(clientId: string, unlocked: boolean): Promise<ClientStatementDto> {
    const client = await this.clients.findOne({ where: { id: clientId, deletedAt: IsNull() } });
    if (!client) {
      throw AppException.notFound(ErrorCode.CLIENT_NOT_FOUND, 'Client not found.');
    }

    const projects = await this.projects.find({
      where: { clientId, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
    const totalsMap = await this.financials.totalsForProjects(projects);

    const projectDtos = await Promise.all(
      projects.map(async (project) => {
        const payments = await this.payments.find({
          where: { projectId: project.id, status: PaymentStatus.VALID, deletedAt: IsNull() },
          relations: { client: true, project: true, receipt: true, createdByUser: true },
          order: { paymentDate: 'ASC' },
        });
        const totals = totalsMap.get(project.id);

        return {
          projectId: project.id,
          projectName: project.projectName,
          hasProjectAmount: totals?.hasProjectAmount ?? project.hasProjectAmount(),
          projectAmount: maskAmount(totals?.projectAmount ?? null, unlocked),
          totalReceived: maskAmount(totals?.totalReceived, unlocked),
          dueAmount: maskAmount(totals?.dueAmount ?? null, unlocked),
          payments: payments.map((payment) => this.toPaymentRow(payment, unlocked)),
        };
      }),
    );

    // Client-level roll-up keeps the two kinds of project apart on purpose —
    // see §39. Folding a variable project's collections into a "due"
    // calculation would report money owed that nobody owes.
    const clientTotals = await this.financials.totalsForClient(clientId);

    return {
      clientId: client.id,
      clientName: client.name,
      projects: projectDtos,
      fixedProjectCount: clientTotals.fixedProjectCount,
      variableProjectCount: clientTotals.variableProjectCount,
      totalProjectValue: maskAmount(clientTotals.totalProjectValue, unlocked),
      totalReceived: maskAmount(clientTotals.totalReceived, unlocked),
      variableReceived: maskAmount(clientTotals.variableReceived, unlocked),
      totalDue: maskAmount(clientTotals.totalDue, unlocked),
    };
  }

  async projectStatement(projectId: string, unlocked: boolean): Promise<ProjectStatementDto> {
    const project = await this.projects.findOne({
      where: { id: projectId, deletedAt: IsNull() },
      relations: { client: true },
    });
    if (!project) {
      throw AppException.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found.');
    }

    const [totals, payments] = await Promise.all([
      this.financials.totalsForProject(project),
      this.payments.find({
        where: { projectId, status: PaymentStatus.VALID, deletedAt: IsNull() },
        relations: { client: true, project: true, receipt: true, createdByUser: true },
        order: { paymentDate: 'ASC' },
      }),
    ]);

    return {
      projectId: project.id,
      projectName: project.projectName,
      clientId: project.clientId,
      clientName: project.client?.name ?? '',
      hasProjectAmount: totals.hasProjectAmount,
      projectAmount: maskAmount(totals.projectAmount, unlocked),
      totalReceived: maskAmount(totals.totalReceived, unlocked),
      dueAmount: maskAmount(totals.dueAmount, unlocked),
      payments: payments.map((payment) => this.toPaymentRow(payment, unlocked)),
    };
  }

  // ── shared query building ────────────────────────────────────

  private paymentQuery(
    query: ReportFilterQueryDto,
    options: { skipDateRange?: boolean } = {},
  ): SelectQueryBuilder<Payment> {
    const builder = this.payments
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.client', 'client')
      .leftJoinAndSelect('payment.project', 'project')
      .leftJoinAndSelect('payment.receipt', 'receipt')
      .leftJoinAndSelect('payment.createdByUser', 'createdByUser')
      .where('payment.deleted_at IS NULL')
      // Reports default to valid payments; an explicit status filter overrides.
      .andWhere('payment.status = :status', {
        status: query.paymentStatus ?? PaymentStatus.VALID,
      });

    if (query.clientId)
      builder.andWhere('payment.client_id = :clientId', { clientId: query.clientId });
    if (query.projectId)
      builder.andWhere('payment.project_id = :projectId', { projectId: query.projectId });
    if (query.createdBy)
      builder.andWhere('payment.created_by = :createdBy', { createdBy: query.createdBy });
    if (query.paymentMethod)
      builder.andWhere('payment.payment_method = :method', { method: query.paymentMethod });
    if (query.projectStatus)
      builder.andWhere('project.status = :projectStatus', { projectStatus: query.projectStatus });

    if (!options.skipDateRange) {
      const range = query.resolveRange();
      if (range.from) builder.andWhere('payment.payment_date >= :from', { from: range.from });
      if (range.to) builder.andWhere('payment.payment_date <= :to', { to: range.to });
    }

    if (query.search) {
      const term = `%${query.search}%`;
      builder.andWhere(
        new Brackets((qb) =>
          qb
            .where('client.name ILIKE :term', { term })
            .orWhere('project.project_name ILIKE :term', { term })
            .orWhere('receipt.receipt_number ILIKE :term', { term })
            .orWhere('payment.transaction_reference ILIKE :term', { term }),
        ),
      );
    }

    return builder;
  }

  private async filteredProjects(query: ReportFilterQueryDto): Promise<Project[]> {
    const builder = this.projects
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.client', 'client')
      .where('project.deleted_at IS NULL');

    if (query.clientId)
      builder.andWhere('project.client_id = :clientId', { clientId: query.clientId });
    if (query.projectId)
      builder.andWhere('project.id = :projectId', { projectId: query.projectId });
    if (query.projectStatus)
      builder.andWhere('project.status = :projectStatus', { projectStatus: query.projectStatus });
    if (query.clientStatus)
      builder.andWhere('client.status = :clientStatus', { clientStatus: query.clientStatus });
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

    return builder.orderBy('project.createdAt', 'DESC').getMany();
  }

  /** Amount bounds are only meaningful post-decryption — see PaymentsService. */
  private amountRange(
    query: ReportFilterQueryDto,
  ): { min: Money | null; max: Money | null } | null {
    if (!query.minAmount && !query.maxAmount) return null;
    return {
      min: query.minAmount ? Money.fromDecimalString(query.minAmount) : null,
      max: query.maxAmount ? Money.fromDecimalString(query.maxAmount) : null,
    };
  }

  private withinRange(amount: Money, range: { min: Money | null; max: Money | null }): boolean {
    if (range.min && amount.lessThan(range.min)) return false;
    if (range.max && amount.greaterThan(range.max)) return false;
    return true;
  }

  private toDueRow(project: Project, totals: ProjectTotals, unlocked: boolean): DuePaymentRowDto {
    return {
      clientId: project.clientId,
      clientName: project.client?.name ?? '',
      projectId: project.id,
      projectName: project.projectName,
      hasProjectAmount: totals.hasProjectAmount,
      projectAmount: maskAmount(totals.projectAmount, unlocked),
      totalReceived: maskAmount(totals.totalReceived, unlocked),
      dueAmount: maskAmount(totals.dueAmount, unlocked),
      lastPaymentDate: totals.lastPaymentDate,
      paymentStatus: totals.paymentStatus,
      projectStatus: project.status,
    };
  }

  private toPaymentRow(payment: Payment, unlocked: boolean): PaymentReportRowDto {
    const amount = unlocked ? this.financials.decryptPaymentAmount(payment) : null;
    return {
      paymentId: payment.id,
      paymentDate: payment.paymentDate,
      clientName: payment.client?.name ?? '',
      projectName: payment.project?.projectName ?? '',
      receiptNumber: payment.receipt?.receiptNumber ?? null,
      amount: maskAmount(amount, unlocked),
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      transactionReference: payment.transactionReference,
      createdByName: payment.createdByUser?.name ?? null,
    };
  }
}
