import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  EntityManager,
  IsNull,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { SequenceKey } from 'src/common/entities/document-sequence.entity';
import { ErrorCode } from 'src/common/constants/error-codes';
import { PaginatedResult, resolveSortColumn } from 'src/common/dto/pagination.dto';
import { AuditAction, AuditModule } from 'src/common/enums/audit-action.enum';
import { PaymentStatus } from 'src/common/enums/payment.enum';
import { PROJECT_STATUSES_BLOCKING_PAYMENT } from 'src/common/enums/project-status.enum';
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
import { ProjectFinancialsService } from 'src/modules/financial/services/project-financials.service';
import { maskAmount } from 'src/modules/financial/utils/mask.util';
import { Project } from 'src/modules/projects/entities/project.entity';
import { Receipt } from 'src/modules/receipts/entities/receipt.entity';
import {
  CreatePaymentDto,
  PaymentResponseDto,
  QueryPaymentDto,
  UpdatePaymentDto,
  VoidPaymentDto,
} from './dto/payment.dto';
import { Payment } from './entities/payment.entity';

/**
 * Allow-list for `?sortBy=`. Anything outside it falls back to createdAt, so a
 * crafted sort parameter can never reach the ORDER BY clause verbatim.
 * `amount` is absent on purpose — it is ciphertext, and sorting ciphertext
 * lexicographically would silently produce nonsense ordering.
 */
const SORTABLE: Record<string, string> = {
  paymentDate: 'payment.paymentDate',
  status: 'payment.status',
  paymentMethod: 'payment.paymentMethod',
  receiptNumber: 'receipt.receiptNumber',
  clientName: 'client.name',
  projectName: 'project.projectName',
  createdAt: 'payment.createdAt',
};

/**
 * Owns the one transaction that matters most in this system: recording a
 * payment. See §43 of the build spec — the project row is locked for the
 * duration of the transaction so two simultaneous payments can never both pass
 * the "does this exceed the due amount" check.
 */
@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    private readonly encryption: FinancialEncryptionService,
    private readonly financials: ProjectFinancialsService,
    private readonly sequences: SequenceService,
    private readonly auditLog: AuditLogService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    query: QueryPaymentDto,
    unlocked: boolean,
  ): Promise<PaginatedResult<PaymentResponseDto>> {
    const builder = this.payments
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.client', 'client')
      .leftJoinAndSelect('payment.project', 'project')
      .leftJoinAndSelect('payment.receipt', 'receipt')
      .leftJoinAndSelect('payment.createdByUser', 'createdByUser')
      .leftJoinAndSelect('payment.updatedByUser', 'updatedByUser')
      .where('payment.deleted_at IS NULL');

    this.applyFilters(builder, query);

    builder.orderBy(resolveSortColumn(query.sortBy, SORTABLE, 'createdAt'), query.sortOrder);

    // Amount range is the one filter SQL cannot express, because the amounts
    // are ciphertext. It is applied after decryption, which means the page
    // must be assembled in memory for those requests — and only when the
    // financial session is unlocked, so a locked client cannot use the filter
    // as an oracle to probe hidden amounts.
    const amountFilter = this.resolveAmountFilter(query, unlocked);

    if (!amountFilter) {
      const [payments, total] = await builder.skip(query.skip).take(query.limit).getManyAndCount();
      return PaginatedResult.of(
        payments.map((payment) => this.toResponse(payment, unlocked)),
        total,
        query.page,
        query.limit,
      );
    }

    const all = await builder.getMany();
    const matching = all.filter((payment) => {
      const amount = this.financials.decryptPaymentAmount(payment);
      if (amountFilter.min && amount.lessThan(amountFilter.min)) return false;
      if (amountFilter.max && amount.greaterThan(amountFilter.max)) return false;
      return true;
    });

    const page = matching.slice(query.skip, query.skip + query.limit);
    return PaginatedResult.of(
      page.map((payment) => this.toResponse(payment, unlocked)),
      matching.length,
      query.page,
      query.limit,
    );
  }

  /** Shared by the payment list and the payment report so the two never drift. */
  applyFilters(builder: SelectQueryBuilder<Payment>, query: QueryPaymentDto): void {
    if (query.clientId)
      builder.andWhere('payment.client_id = :clientId', { clientId: query.clientId });
    if (query.projectId)
      builder.andWhere('payment.project_id = :projectId', { projectId: query.projectId });
    if (query.status) builder.andWhere('payment.status = :status', { status: query.status });
    if (query.paymentMethod) {
      builder.andWhere('payment.payment_method = :method', { method: query.paymentMethod });
    }
    if (query.createdBy) {
      builder.andWhere('payment.created_by = :createdBy', { createdBy: query.createdBy });
    }
    if (query.receiptNumber) {
      builder.andWhere('receipt.receipt_number ILIKE :receiptNumber', {
        receiptNumber: `%${query.receiptNumber}%`,
      });
    }
    if (query.transactionReference) {
      builder.andWhere('payment.transaction_reference ILIKE :reference', {
        reference: `%${query.transactionReference}%`,
      });
    }

    const range = query.resolveRange();
    if (range.from) builder.andWhere('payment.payment_date >= :from', { from: range.from });
    if (range.to) builder.andWhere('payment.payment_date <= :to', { to: range.to });

    if (query.search) {
      const term = `%${query.search}%`;
      builder.andWhere(
        new Brackets((qb) =>
          qb
            .where('client.name ILIKE :term', { term })
            .orWhere('project.project_name ILIKE :term', { term })
            .orWhere('project.project_code ILIKE :term', { term })
            .orWhere('receipt.receipt_number ILIKE :term', { term })
            .orWhere('payment.transaction_reference ILIKE :term', { term }),
        ),
      );
    }
  }

  private resolveAmountFilter(
    query: QueryPaymentDto,
    unlocked: boolean,
  ): { min: Money | null; max: Money | null } | null {
    if (!unlocked) return null;
    if (!query.minAmount && !query.maxAmount) return null;
    return {
      min: query.minAmount ? Money.fromDecimalString(query.minAmount) : null,
      max: query.maxAmount ? Money.fromDecimalString(query.maxAmount) : null,
    };
  }

  async findOne(id: string, unlocked: boolean): Promise<PaymentResponseDto> {
    const payment = await this.getOrFail(id);
    return this.toResponse(payment, unlocked);
  }

  /**
   * The core transaction: lock the project, recompute the due amount from
   * ciphertext, validate, encrypt, insert the payment, allocate a receipt
   * number, insert the receipt, and write the audit trail — all atomically.
   */
  async create(
    dto: CreatePaymentDto,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<PaymentResponseDto> {
    const paymentId = await this.dataSource.transaction(async (manager) =>
      this.createWithin(manager, dto, actor, context),
    );

    return this.findOne(paymentId, false);
  }

  /**
   * The payment transaction body, executed on a caller-supplied manager.
   *
   * `create()` wraps it in its own transaction; the Excel importer runs a whole
   * sheet through it inside a single transaction so a batch of payments either
   * lands completely or not at all. Either way each row still takes the project
   * row lock, re-derives the due amount from ciphertext, encrypts its own
   * amount and allocates a receipt number from the sequence — the guarantees do
   * not weaken just because the row arrived from a spreadsheet.
   *
   * Returns the new payment id.
   */
  async createWithin(
    manager: EntityManager,
    dto: CreatePaymentDto,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<string> {
    const amount = Money.fromDecimalString(dto.amount);

    // Row lock: any concurrent payment for the same project blocks here until
    // this transaction commits or rolls back, making the due-amount check safe.
    const project = await manager
      .getRepository(Project)
      .createQueryBuilder('project')
      .setLock('pessimistic_write')
      .where('project.id = :id', { id: dto.projectId })
      .andWhere('project.deleted_at IS NULL')
      .getOne();

    if (!project) {
      throw AppException.notFound(ErrorCode.PROJECT_NOT_FOUND, 'Project not found.');
    }
    if (project.clientId !== dto.clientId) {
      throw AppException.badRequest(
        ErrorCode.PROJECT_CLIENT_MISMATCH,
        'The selected project does not belong to the selected client.',
      );
    }
    if (PROJECT_STATUSES_BLOCKING_PAYMENT.includes(project.status)) {
      throw AppException.conflict(
        ErrorCode.PROJECT_NOT_ACCEPTING_PAYMENTS,
        `This project is ${project.status.toLowerCase()} and cannot accept new payments.`,
      );
    }

    const totals = await this.financials.totalsForProject(project, manager);
    const allowOverpayment = this.config.get<boolean>('business.allowOverpayment', false);

    // The ceiling check only exists because there is a ceiling. A project
    // with no defined amount (monthly retainer, variable engagement) has
    // none, so any valid positive amount is accepted — for any number of
    // payments. Every other rule below still applies: authorisation,
    // encryption, receipt generation and the audit trail are unchanged.
    if (!allowOverpayment && totals.projectAmount !== null && totals.dueAmount !== null) {
      const projected = totals.totalReceived.add(amount);
      if (projected.greaterThan(totals.projectAmount)) {
        throw AppException.badRequest(
          ErrorCode.PAYMENT_EXCEEDS_DUE,
          `This payment of ${amount.toDecimalString()} exceeds the remaining due amount of ${totals.dueAmount.toDecimalString()}.`,
          {
            projectAmount: totals.projectAmount.toDecimalString(),
            totalReceived: totals.totalReceived.toDecimalString(),
            dueAmount: totals.dueAmount.toDecimalString(),
            attemptedAmount: amount.toDecimalString(),
          },
        );
      }
    }

    const encrypted = this.encryption.encryptAmount(amount, EncryptionContext.PAYMENT_AMOUNT);

    const payment = manager.getRepository(Payment).create({
      clientId: dto.clientId,
      projectId: dto.projectId,
      paymentDate: dto.paymentDate,
      ...encrypted,
      paymentMethod: dto.paymentMethod,
      transactionReference: dto.transactionReference ?? null,
      bankAccount: dto.bankAccount ?? null,
      notes: dto.notes ?? null,
      attachmentPath: dto.attachmentPath ?? null,
      status: PaymentStatus.VALID,
      createdBy: actor.id,
    });
    const savedPayment = await manager.getRepository(Payment).save(payment);

    const receiptNumber = await this.sequences.allocate(manager, SequenceKey.RECEIPT);
    const receipt = manager.getRepository(Receipt).create({
      paymentId: savedPayment.id,
      receiptNumber,
      receiptDate: dto.paymentDate,
      generatedBy: actor.id,
    });
    await manager.getRepository(Receipt).save(receipt);

    await this.auditLog.record(
      {
        action: AuditAction.PAYMENT_CREATED,
        module: AuditModule.PAYMENTS,
        recordId: savedPayment.id,
        description: `Recorded payment for project ${project.projectName} (receipt ${receiptNumber})`,
        newValue: {
          projectId: dto.projectId,
          paymentMethod: dto.paymentMethod,
          transactionReference: dto.transactionReference,
        },
        actor,
        context,
      },
      manager,
    );

    await this.auditLog.record(
      {
        action: AuditAction.RECEIPT_GENERATED,
        module: AuditModule.RECEIPTS,
        recordId: receipt.id,
        description: `Generated receipt ${receiptNumber}`,
        actor,
        context,
      },
      manager,
    );

    return savedPayment.id;
  }

  async update(
    id: string,
    dto: UpdatePaymentDto,
    actor: AuthenticatedUser,
    context: RequestContext,
    unlocked: boolean,
  ): Promise<PaymentResponseDto> {
    const payment = await this.getOrFail(id);

    if (payment.status !== PaymentStatus.VALID) {
      throw AppException.conflict(
        ErrorCode.PAYMENT_ALREADY_VOIDED,
        'This payment has been voided and cannot be edited.',
      );
    }

    const before = {
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      transactionReference: payment.transactionReference,
    };

    if (dto.paymentDate !== undefined) payment.paymentDate = dto.paymentDate;
    if (dto.paymentMethod !== undefined) payment.paymentMethod = dto.paymentMethod;
    if (dto.transactionReference !== undefined)
      payment.transactionReference = dto.transactionReference ?? null;
    if (dto.bankAccount !== undefined) payment.bankAccount = dto.bankAccount ?? null;
    if (dto.notes !== undefined) payment.notes = dto.notes ?? null;
    payment.updatedBy = actor.id;

    await this.payments.save(payment);

    await this.auditLog.record({
      action: AuditAction.PAYMENT_UPDATED,
      module: AuditModule.PAYMENTS,
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

  /** Payments are voided, never hard-deleted, so history and receipts stay intact. */
  async void(
    id: string,
    dto: VoidPaymentDto,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const payment = await manager
        .getRepository(Payment)
        .createQueryBuilder('payment')
        .setLock('pessimistic_write')
        .where('payment.id = :id', { id })
        .getOne();

      if (!payment) {
        throw AppException.notFound(ErrorCode.PAYMENT_NOT_FOUND, 'Payment not found.');
      }
      if (payment.status !== PaymentStatus.VALID) {
        throw AppException.conflict(
          ErrorCode.PAYMENT_ALREADY_VOIDED,
          'This payment has already been voided.',
        );
      }

      payment.status = PaymentStatus.VOIDED;
      payment.voidReason = dto.reason;
      payment.voidedAt = new Date();
      payment.voidedBy = actor.id;
      payment.updatedBy = actor.id;
      await manager.getRepository(Payment).save(payment);

      await this.auditLog.record(
        {
          action: AuditAction.PAYMENT_VOIDED,
          module: AuditModule.PAYMENTS,
          recordId: payment.id,
          description: `Voided payment: ${dto.reason}`,
          actor,
          context,
        },
        manager,
      );
    });
  }

  private async getOrFail(id: string): Promise<Payment> {
    const payment = await this.payments.findOne({
      where: { id, deletedAt: IsNull() },
      relations: {
        client: true,
        project: true,
        receipt: true,
        createdByUser: true,
        updatedByUser: true,
        voidedByUser: true,
      },
    });
    if (!payment) {
      throw AppException.notFound(ErrorCode.PAYMENT_NOT_FOUND, 'Payment not found.');
    }
    return payment;
  }

  private toResponse(payment: Payment, unlocked: boolean): PaymentResponseDto {
    const amount = this.financials.decryptPaymentAmount(payment);
    const project = payment.project;

    // A variable project has no amount to show. `hasProjectAmount: false` tells
    // the UI to print "Not Defined" rather than the ₹0 a naive null-coalesce
    // would produce.
    const hasProjectAmount = project ? project.hasProjectAmount() : false;
    const projectAmount =
      hasProjectAmount && unlocked && project
        ? this.financials.decryptProjectAmount(project)
        : null;

    return {
      id: payment.id,

      clientId: payment.clientId,
      clientName: payment.client?.name ?? '',
      clientEmail: payment.client?.email ?? null,
      clientPhone: payment.client?.phone ?? null,

      projectId: payment.projectId,
      projectName: project?.projectName ?? '',
      projectCode: project?.projectCode ?? null,
      hasProjectAmount,
      projectAmount: maskAmount(projectAmount, unlocked),

      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      transactionReference: payment.transactionReference,
      bankAccount: payment.bankAccount,
      notes: payment.notes,
      status: payment.status,
      voidReason: payment.voidReason,
      financialLocked: !unlocked,
      amount: maskAmount(amount, unlocked),

      receiptId: payment.receipt?.id ?? null,
      receiptNumber: payment.receipt?.receiptNumber ?? null,
      receiptDate: payment.receipt?.receiptDate ?? null,

      createdByName: payment.createdByUser?.name ?? null,
      updatedByName: payment.updatedByUser?.name ?? null,
      voidedByName: payment.voidedByUser?.name ?? null,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
