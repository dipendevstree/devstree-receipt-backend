import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { AUDIT_ACTION_LABELS } from 'src/common/enums/audit-action.enum';
import { ClientStatus } from 'src/common/enums/client-status.enum';
import { PaymentStatus } from 'src/common/enums/payment.enum';
import { ProjectStatus } from 'src/common/enums/project-status.enum';
import { DatePreset, DateRange, resolveDateRange } from 'src/common/utils/date-range.util';
import { Money } from 'src/common/utils/money.util';
import { AuditLog } from 'src/modules/audit-logs/entities/audit-log.entity';
import { Client } from 'src/modules/clients/entities/client.entity';
import { ProjectFinancialsService } from 'src/modules/financial/services/project-financials.service';
import { maskAmount } from 'src/modules/financial/utils/mask.util';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import { Project } from 'src/modules/projects/entities/project.entity';
import { Receipt } from 'src/modules/receipts/entities/receipt.entity';
import {
  DashboardQueryDto,
  DashboardSummaryDto,
  DashboardTopListsDto,
  RecentActivityDto,
  TopEntityRowDto,
} from './dto/dashboard.dto';

const TOP_LIST_SIZE = 5;

/**
 * Dashboard aggregation.
 *
 * Two rules govern everything here:
 *
 *  1. **Nothing decrypted leaves this class while locked.** Amounts are only
 *     decrypted inside `if (unlocked)` branches, and every monetary field goes
 *     out through `maskAmount`. Counts are computed regardless — how many
 *     payments were recorded today is not a monetary disclosure.
 *  2. **A project with no defined amount contributes no project value and no
 *     due.** Its collections still count toward "received", which is why
 *     `totalReceived` and `totalProjectValue - totalReceived` are deliberately
 *     not the same arithmetic.
 */
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Receipt) private readonly receipts: Repository<Receipt>,
    @InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>,
    private readonly financials: ProjectFinancialsService,
  ) {}

  async summary(query: DashboardQueryDto, unlocked: boolean): Promise<DashboardSummaryDto> {
    const period = query.resolveRange();

    const [
      totalClients,
      activeClients,
      projects,
      paymentsToday,
      paymentsThisWeek,
      paymentsThisMonth,
      paymentsThisYear,
      receiptsToday,
      receiptsThisWeek,
      receiptsThisMonth,
      receiptsThisYear,
      paymentsInPeriod,
      receiptsInPeriod,
    ] = await Promise.all([
      this.clients.count({ where: { deletedAt: IsNull() } }),
      this.clients.count({ where: { deletedAt: IsNull(), status: ClientStatus.ACTIVE } }),
      this.projects.find({ where: { deletedAt: IsNull() } }),
      this.countPayments(resolveDateRange({ preset: DatePreset.TODAY })),
      this.countPayments(resolveDateRange({ preset: DatePreset.THIS_WEEK })),
      this.countPayments(resolveDateRange({ preset: DatePreset.THIS_MONTH })),
      this.countPayments(resolveDateRange({ preset: DatePreset.THIS_YEAR })),
      this.countReceipts(resolveDateRange({ preset: DatePreset.TODAY })),
      this.countReceipts(resolveDateRange({ preset: DatePreset.THIS_WEEK })),
      this.countReceipts(resolveDateRange({ preset: DatePreset.THIS_MONTH })),
      this.countReceipts(resolveDateRange({ preset: DatePreset.THIS_YEAR })),
      this.countPayments(period),
      this.countReceipts(period),
    ]);

    const byStatus = (status: ProjectStatus) =>
      projects.filter((project) => project.status === status).length;

    let totalProjectValue = Money.zero();
    let fixedReceived = Money.zero();
    let variableReceived = Money.zero();
    let receivedInPeriod = Money.zero();

    if (unlocked && projects.length > 0) {
      const totals = await this.financials.totalsForProjects(projects);
      for (const project of projects) {
        const projectTotals = totals.get(project.id);
        if (!projectTotals) continue;

        if (projectTotals.projectAmount === null) {
          variableReceived = variableReceived.add(projectTotals.totalReceived);
        } else {
          totalProjectValue = totalProjectValue.add(projectTotals.projectAmount);
          fixedReceived = fixedReceived.add(projectTotals.totalReceived);
        }
      }

      receivedInPeriod = await this.sumPayments(period);
    }

    const totalReceived = fixedReceived.add(variableReceived);

    return {
      totalClients,
      activeClients,
      inactiveClients: totalClients - activeClients,
      totalProjects: projects.length,
      activeProjects: byStatus(ProjectStatus.ACTIVE),
      completedProjects: byStatus(ProjectStatus.COMPLETED),
      onHoldProjects: byStatus(ProjectStatus.ON_HOLD),
      draftProjects: byStatus(ProjectStatus.DRAFT),
      cancelledProjects: byStatus(ProjectStatus.CANCELLED),
      projectsWithFixedAmount: projects.filter((project) => project.hasProjectAmount()).length,
      projectsWithoutDefinedAmount: projects.filter((project) => !project.hasProjectAmount())
        .length,

      paymentsToday,
      paymentsThisWeek,
      paymentsThisMonth,
      paymentsThisYear,
      receiptsToday,
      receiptsThisWeek,
      receiptsThisMonth,
      receiptsThisYear,
      paymentsInPeriod,
      receiptsInPeriod,

      financialLocked: !unlocked,
      totalProjectValue: maskAmount(totalProjectValue, unlocked),
      totalReceived: maskAmount(totalReceived, unlocked),
      // Due exists only where a project amount exists. Variable collections are
      // excluded from both sides of this subtraction.
      totalDue: maskAmount(totalProjectValue.subtract(fixedReceived).clampToZero(), unlocked),
      variableReceived: maskAmount(variableReceived, unlocked),
      receivedInPeriod: maskAmount(receivedInPeriod, unlocked),
    };
  }

  /**
   * Recent admin activity, straight from the audit trail so the names are the
   * real administrators who performed the actions. Amounts never appear:
   * AuditLogService already redacts monetary fields before they are persisted,
   * and only the description/action text is surfaced here.
   */
  async recentActivity(limit = 10): Promise<RecentActivityDto[]> {
    const logs = await this.auditLogs.find({
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take: Math.min(50, Math.max(1, limit)),
    });

    return logs.map((log) => ({
      id: log.id,
      userName: log.user?.name ?? null,
      action: log.action,
      actionLabel: AUDIT_ACTION_LABELS[log.action] ?? humanise(log.action),
      module: log.module,
      description: log.description ?? null,
      createdAt: log.createdAt,
    }));
  }

  /**
   * Top clients/projects. Ranking requires comparing decrypted amounts, so
   * while locked this returns empty lists rather than an order that would
   * itself leak the relative sizes.
   */
  async topLists(query: DashboardQueryDto, unlocked: boolean): Promise<DashboardTopListsDto> {
    if (!unlocked) {
      return {
        financialLocked: true,
        topClientsByReceived: [],
        topProjectsByReceived: [],
        topClientsByOutstanding: [],
      };
    }

    const projects = await this.projects.find({
      where: { deletedAt: IsNull() },
      relations: { client: true },
    });
    const totals = await this.financials.totalsForProjects(projects);

    const projectRows: TopEntityRowDto[] = [];
    const byClient = new Map<string, { name: string; received: Money; due: Money }>();

    for (const project of projects) {
      const projectTotals = totals.get(project.id);
      if (!projectTotals) continue;

      projectRows.push({
        id: project.id,
        name: project.projectName,
        secondaryName: project.client?.name ?? null,
        amount: projectTotals.totalReceived.toDecimalString(),
      });

      const clientId = project.clientId;
      const bucket = byClient.get(clientId) ?? {
        name: project.client?.name ?? '',
        received: Money.zero(),
        due: Money.zero(),
      };
      bucket.received = bucket.received.add(projectTotals.totalReceived);
      // Only fixed-amount projects can be outstanding.
      if (projectTotals.dueAmount) bucket.due = bucket.due.add(projectTotals.dueAmount);
      byClient.set(clientId, bucket);
    }

    const clientRows = [...byClient.entries()];

    return {
      financialLocked: false,
      topClientsByReceived: clientRows
        .map(([id, bucket]) => ({
          id,
          name: bucket.name,
          secondaryName: null,
          amount: bucket.received.toDecimalString(),
        }))
        .filter((row) => Number(row.amount) > 0)
        .sort(byAmountDesc)
        .slice(0, TOP_LIST_SIZE),
      topProjectsByReceived: projectRows
        .filter((row) => Number(row.amount) > 0)
        .sort(byAmountDesc)
        .slice(0, TOP_LIST_SIZE),
      topClientsByOutstanding: clientRows
        .map(([id, bucket]) => ({
          id,
          name: bucket.name,
          secondaryName: null,
          amount: bucket.due.toDecimalString(),
        }))
        .filter((row) => Number(row.amount) > 0)
        .sort(byAmountDesc)
        .slice(0, TOP_LIST_SIZE),
    };
  }

  // ── helpers ──────────────────────────────────────────────────

  private paymentWhere(range: DateRange) {
    const base = { status: PaymentStatus.VALID, deletedAt: IsNull() };
    if (range.from && range.to) {
      return { ...base, paymentDate: Between(range.from, range.to) };
    }
    if (range.from) return { ...base, paymentDate: MoreThanOrEqual(range.from) };
    if (range.to) return { ...base, paymentDate: LessThanOrEqual(range.to) };
    return base;
  }

  private countPayments(range: DateRange): Promise<number> {
    return this.payments.count({ where: this.paymentWhere(range) });
  }

  private countReceipts(range: DateRange): Promise<number> {
    const builder = this.receipts.createQueryBuilder('receipt');
    if (range.from) builder.andWhere('receipt.receipt_date >= :from', { from: range.from });
    if (range.to) builder.andWhere('receipt.receipt_date <= :to', { to: range.to });
    return builder.getCount();
  }

  /** Caller must have already checked `unlocked` — this decrypts. */
  private async sumPayments(range: DateRange): Promise<Money> {
    const payments = await this.payments.find({ where: this.paymentWhere(range) });
    let total = Money.zero();
    for (const payment of payments) {
      total = total.add(this.financials.decryptPaymentAmount(payment));
    }
    return total;
  }
}

function byAmountDesc(a: TopEntityRowDto, b: TopEntityRowDto): number {
  return Number(b.amount ?? 0) - Number(a.amount ?? 0);
}

function humanise(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
