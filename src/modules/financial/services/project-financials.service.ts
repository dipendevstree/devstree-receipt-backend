import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, Repository } from 'typeorm';
import { PaymentStatus } from 'src/common/enums/payment.enum';
import { ProjectPaymentStatus } from 'src/common/enums/project-status.enum';
import { EncryptedAmountColumns } from 'src/common/entities/base.entity';
import { Money } from 'src/common/utils/money.util';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import { Project } from 'src/modules/projects/entities/project.entity';
import { EncryptionContext, FinancialEncryptionService } from './financial-encryption.service';

export interface ProjectTotals {
  projectId: string;
  /** null when the project has no defined amount — never coerce this to zero. */
  projectAmount: Money | null;
  hasProjectAmount: boolean;
  totalReceived: Money;
  /** null when there is no project amount to subtract from. Displayed as "N/A". */
  dueAmount: Money | null;
  paymentStatus: ProjectPaymentStatus;
  paymentCount: number;
  lastPaymentDate: string | null;
}

export interface ClientTotals {
  clientId: string;
  projectCount: number;
  /** Projects with a defined amount. */
  fixedProjectCount: number;
  /** Projects with no defined amount (monthly/retainer style). */
  variableProjectCount: number;
  /** Sum over fixed-amount projects only — variable projects contribute nothing. */
  totalProjectValue: Money;
  /** Everything actually collected, across both kinds of project. */
  totalReceived: Money;
  /** Collected against fixed-amount projects only — the figure `totalDue` relates to. */
  fixedReceived: Money;
  /** Collected against variable projects. Has no due counterpart by definition. */
  variableReceived: Money;
  /** Outstanding on fixed-amount projects only. Variable projects are never counted as due. */
  totalDue: Money;
}

/**
 * Derives every financial total from ciphertext at read time.
 *
 * Received and due amounts are never persisted: storing them would create a
 * second source of truth that can drift from the payment rows. Only VALID
 * payments contribute — voided and cancelled ones are excluded by the query.
 *
 * Projects without a defined amount are first-class here. Their due is `null`,
 * not zero, and their (non-existent) project value never enters a client- or
 * company-wide total. Treating NULL as 0 would report a variable project that
 * has collected ₹2,15,000 as ₹2,15,000 *overpaid*.
 */
@Injectable()
export class ProjectFinancialsService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    private readonly encryption: FinancialEncryptionService,
  ) {}

  /** Returns null for a project with no defined amount. */
  decryptProjectAmount(project: Project, precision = Money.DEFAULT_PRECISION): Money | null {
    if (!project.hasProjectAmount()) return null;
    return this.encryption.decryptAmount(
      project as unknown as EncryptedAmountColumns,
      EncryptionContext.PROJECT_AMOUNT,
      precision,
    );
  }

  decryptPaymentAmount(payment: Payment, precision = Money.DEFAULT_PRECISION): Money {
    return this.encryption.decryptAmount(payment, EncryptionContext.PAYMENT_AMOUNT, precision);
  }

  /** Totals for one project. Pass a transactional manager when inside a payment transaction. */
  async totalsForProject(
    project: Project,
    manager?: EntityManager,
    precision = Money.DEFAULT_PRECISION,
  ): Promise<ProjectTotals> {
    const repository = manager ? manager.getRepository(Payment) : this.payments;
    const payments = await repository.find({
      where: { projectId: project.id, status: PaymentStatus.VALID, deletedAt: IsNull() },
      order: { paymentDate: 'DESC' },
    });

    return this.buildTotals(project, payments, precision);
  }

  /** Batched variant — one query for a page of projects instead of N. */
  async totalsForProjects(
    projects: Project[],
    manager?: EntityManager,
    precision = Money.DEFAULT_PRECISION,
  ): Promise<Map<string, ProjectTotals>> {
    const result = new Map<string, ProjectTotals>();
    if (projects.length === 0) return result;

    const repository = manager ? manager.getRepository(Payment) : this.payments;
    const payments = await repository.find({
      where: {
        projectId: In(projects.map((project) => project.id)),
        status: PaymentStatus.VALID,
        deletedAt: IsNull(),
      },
      order: { paymentDate: 'DESC' },
    });

    const grouped = new Map<string, Payment[]>();
    for (const payment of payments) {
      const bucket = grouped.get(payment.projectId);
      if (bucket) bucket.push(payment);
      else grouped.set(payment.projectId, [payment]);
    }

    for (const project of projects) {
      result.set(project.id, this.buildTotals(project, grouped.get(project.id) ?? [], precision));
    }
    return result;
  }

  async totalsForClient(
    clientId: string,
    manager?: EntityManager,
    precision = Money.DEFAULT_PRECISION,
  ): Promise<ClientTotals> {
    const projectRepository = manager ? manager.getRepository(Project) : this.projects;
    const projects = await projectRepository.find({ where: { clientId, deletedAt: IsNull() } });
    const totals = await this.totalsForProjects(projects, manager, precision);

    const bucket = emptyClientTotals(clientId, precision);
    for (const project of projects) {
      const projectTotals = totals.get(project.id);
      if (!projectTotals) continue;
      accumulate(bucket, projectTotals);
    }
    finalise(bucket);
    return bucket;
  }

  /** Batched client aggregation — two queries for a whole page of clients. */
  async totalsForClients(
    clientIds: string[],
    manager?: EntityManager,
    precision = Money.DEFAULT_PRECISION,
  ): Promise<Map<string, ClientTotals>> {
    const result = new Map<string, ClientTotals>();
    if (clientIds.length === 0) return result;

    for (const clientId of clientIds) {
      result.set(clientId, emptyClientTotals(clientId, precision));
    }

    const projectRepository = manager ? manager.getRepository(Project) : this.projects;
    const projects = await projectRepository.find({
      where: { clientId: In(clientIds), deletedAt: IsNull() },
    });
    const projectTotals = await this.totalsForProjects(projects, manager, precision);

    for (const project of projects) {
      const totals = projectTotals.get(project.id);
      const bucket = result.get(project.clientId);
      if (!totals || !bucket) continue;
      accumulate(bucket, totals);
    }

    for (const bucket of result.values()) finalise(bucket);
    return result;
  }

  private buildTotals(project: Project, payments: Payment[], precision: number): ProjectTotals {
    const projectAmount = this.decryptProjectAmount(project, precision);

    let totalReceived = Money.zero(precision);
    for (const payment of payments) {
      totalReceived = totalReceived.add(this.decryptPaymentAmount(payment, precision));
    }

    return {
      projectId: project.id,
      projectAmount,
      hasProjectAmount: projectAmount !== null,
      totalReceived,
      // No project amount ⇒ no due. `null - payments` is not a number, and it
      // is certainly not `0 - payments`.
      dueAmount:
        projectAmount === null ? null : projectAmount.subtract(totalReceived).clampToZero(),
      paymentStatus: this.resolvePaymentStatus(projectAmount, totalReceived),
      paymentCount: payments.length,
      lastPaymentDate: payments.length > 0 ? payments[0].paymentDate : null,
    };
  }

  private resolvePaymentStatus(
    projectAmount: Money | null,
    totalReceived: Money,
  ): ProjectPaymentStatus {
    if (projectAmount === null) return ProjectPaymentStatus.VARIABLE;
    if (totalReceived.isZero()) return ProjectPaymentStatus.UNPAID;
    if (totalReceived.greaterThan(projectAmount)) return ProjectPaymentStatus.OVERPAID;
    if (totalReceived.equals(projectAmount)) return ProjectPaymentStatus.FULLY_PAID;
    return ProjectPaymentStatus.PARTIALLY_PAID;
  }
}

function emptyClientTotals(clientId: string, precision: number): ClientTotals {
  return {
    clientId,
    projectCount: 0,
    fixedProjectCount: 0,
    variableProjectCount: 0,
    totalProjectValue: Money.zero(precision),
    totalReceived: Money.zero(precision),
    fixedReceived: Money.zero(precision),
    variableReceived: Money.zero(precision),
    totalDue: Money.zero(precision),
  };
}

function accumulate(bucket: ClientTotals, totals: ProjectTotals): void {
  bucket.projectCount += 1;
  bucket.totalReceived = bucket.totalReceived.add(totals.totalReceived);

  if (totals.projectAmount === null) {
    bucket.variableProjectCount += 1;
    bucket.variableReceived = bucket.variableReceived.add(totals.totalReceived);
    return;
  }

  bucket.fixedProjectCount += 1;
  bucket.totalProjectValue = bucket.totalProjectValue.add(totals.projectAmount);
  bucket.fixedReceived = bucket.fixedReceived.add(totals.totalReceived);
}

function finalise(bucket: ClientTotals): void {
  // Only fixed-amount projects can be "due" anything.
  bucket.totalDue = bucket.totalProjectValue.subtract(bucket.fixedReceived).clampToZero();
}
