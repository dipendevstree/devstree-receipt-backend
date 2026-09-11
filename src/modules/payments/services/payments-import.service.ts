import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import {
  BaseImportService,
  ImportRun,
  PreparedRow,
  RowValidation,
} from 'src/common/excel/base-import.service';
import { ExcelService, ParsedRow } from 'src/common/excel/excel.service';
import { ImportTemplateDefinition } from 'src/common/excel/import-template.interface';
import {
  RowErrorCollector,
  decimalAmount,
  isoDate,
  optionalText,
} from 'src/common/excel/import-validators';
import { AuditModule } from 'src/common/enums/audit-action.enum';
import { PaymentMethod, PaymentStatus } from 'src/common/enums/payment.enum';
import { PROJECT_STATUSES_BLOCKING_PAYMENT } from 'src/common/enums/project-status.enum';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { Money } from 'src/common/utils/money.util';
import { AuditLogService } from 'src/modules/audit-logs/audit-log.service';
import { ProjectFinancialsService } from 'src/modules/financial/services/project-financials.service';
import { ImportReferenceService } from 'src/modules/imports/services/import-reference.service';
import { Project } from 'src/modules/projects/entities/project.entity';
import { CreatePaymentDto } from '../dto/payment.dto';
import { Payment } from '../entities/payment.entity';
import { PaymentsService } from '../payments.service';

const PAYMENT_TEMPLATE: ImportTemplateDefinition = {
  module: 'payments',
  label: 'Payments',
  sheetName: 'Payments',
  fileName: 'devstree-payments-import-template',
  notes: [
    'Payments import as a whole or not at all. If any row fails validation, nothing is written.',
    'A receipt is generated automatically for every imported payment — do not include receipt numbers.',
    'The client and project must already exist, and the project must belong to the client.',
    'Projects with a fixed amount reject payments that would exceed the remaining due amount.',
    'Projects with no fixed amount (blank Project Amount) accept any number of valid payments and have no due ceiling.',
    'Payments cannot be imported against DRAFT or CANCELLED projects.',
    'Amounts are encrypted on save. They are never stored or exported in plain text.',
  ],
  columns: [
    {
      key: 'client',
      header: 'Client',
      required: true,
      type: 'string',
      example: 'John Doe',
      secondExample: 'CLI-0002',
      description: 'Client name, email or client code.',
      width: 26,
    },
    {
      key: 'project',
      header: 'Project',
      required: true,
      type: 'string',
      example: 'Website Development',
      secondExample: 'PRJ-0002',
      description: 'Project name or project code. Must belong to the client in the same row.',
      width: 30,
    },
    {
      key: 'amount',
      header: 'Payment Amount',
      required: true,
      type: 'decimal',
      example: '25000',
      secondExample: '15000.50',
      format: 'Positive number, e.g. 25000 or 25000.00',
      description: 'Required. Must be greater than zero.',
      width: 18,
    },
    {
      key: 'paymentDate',
      header: 'Payment Date',
      required: true,
      type: 'date',
      example: '2026-09-10',
      secondExample: '2026-09-12',
      format: 'YYYY-MM-DD',
      description: 'Required.',
      width: 16,
    },
    {
      key: 'paymentMethod',
      header: 'Payment Method',
      required: true,
      type: 'enum',
      example: 'Bank Transfer',
      secondExample: 'UPI',
      allowedValues: Object.values(PaymentMethod),
      description:
        'Code or the label configured under Masters → Payment Methods, e.g. BANK_TRANSFER or "Bank Transfer".',
      width: 20,
    },
    {
      key: 'transactionReference',
      header: 'Transaction Reference',
      required: false,
      type: 'string',
      example: 'TXN123456',
      secondExample: '',
      maxLength: 120,
      description: 'Used to detect duplicate payments. Strongly recommended.',
      width: 24,
    },
    {
      key: 'bankAccount',
      header: 'Bank Account',
      required: false,
      type: 'string',
      example: 'HDFC ****1234',
      secondExample: '',
      maxLength: 120,
      width: 20,
    },
    {
      key: 'notes',
      header: 'Notes',
      required: false,
      type: 'string',
      example: 'First milestone',
      secondExample: '',
      maxLength: 2000,
      width: 30,
    },
  ],
};

/**
 * Bulk payment import — the only importer that touches money.
 *
 * Three things make it different from the others:
 *
 *  1. It is strictly all-or-nothing (`allowsPartialImport = false`). A sheet
 *     that half-applies leaves a client's ledger wrong, and there is no
 *     "delete the payment" to undo it with — payments are voided, not removed.
 *
 *  2. Validation projects the due ceiling forward across the file. Three rows
 *     of 40,000 against a project with 100,000 remaining must fail on the third
 *     row here, not at insert time, so the administrator sees which row is the
 *     problem before anything is written.
 *
 *  3. Persistence goes through PaymentsService.createWithin on a single
 *     transaction, so every row still takes the project row lock, re-derives the
 *     due amount from ciphertext, encrypts its own amount and allocates a
 *     receipt number from the sequence. The in-file projection is a preview;
 *     that path remains the authority.
 */
@Injectable()
export class PaymentsImportService extends BaseImportService<CreatePaymentDto> {
  /** Running total per project for the file being validated. */
  private projected = new Map<string, Money>();
  /** Remaining headroom per project at the start of the file; null = no ceiling. */
  private ceilings = new Map<string, Money | null>();

  constructor(
    excel: ExcelService,
    auditLog: AuditLogService,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    private readonly references: ImportReferenceService,
    private readonly financials: ProjectFinancialsService,
    private readonly paymentsService: PaymentsService,
    private readonly dataSource: DataSource,
  ) {
    super(excel, auditLog);
  }

  protected get definition(): ImportTemplateDefinition {
    return PAYMENT_TEMPLATE;
  }

  protected get auditModule(): AuditModule {
    return AuditModule.PAYMENTS;
  }

  /** Money never imports partially. */
  protected get allowsPartialImport(): boolean {
    return false;
  }

  protected async beforeRows(_rows: ParsedRow[]): Promise<void> {
    this.projected = new Map();
    this.ceilings = new Map();
    this.references.resetCaches();
  }

  protected async prepareRow(
    values: Record<string, string>,
    run: ImportRun<CreatePaymentDto>,
  ): Promise<RowValidation<CreatePaymentDto>> {
    const errors = new RowErrorCollector();

    const amount = decimalAmount(values.amount ?? '', 'Payment Amount', errors, { required: true });
    const paymentDate = isoDate(values.paymentDate ?? '', 'Payment Date', errors, {
      required: true,
    });
    const transactionReference = optionalText(
      values.transactionReference ?? '',
      'Transaction Reference',
      errors,
      120,
    );
    const bankAccount = optionalText(values.bankAccount ?? '', 'Bank Account', errors, 120);
    const notes = optionalText(values.notes ?? '', 'Notes', errors, 2000);

    const method = await this.references.resolvePaymentMethod(values.paymentMethod ?? '');
    if (!method.ok) errors.add('Payment Method', method.error);

    const client = await this.references.resolveClient(values.client ?? '');
    if (!client.ok) errors.add('Client', client.error);

    let target: Project | null = null;
    if (client.ok) {
      const project = await this.references.resolveProject(values.project ?? '', client.value.id);
      if (!project.ok) {
        errors.add('Project', project.error);
      } else if (PROJECT_STATUSES_BLOCKING_PAYMENT.includes(project.value.status)) {
        errors.add(
          'Project',
          `Project ${project.value.projectCode} is ${project.value.status.toLowerCase()} and cannot accept payments.`,
        );
      } else {
        target = project.value;
      }
    }

    if (errors.hasErrors || !target || !amount || !method.ok || !client.ok) {
      return { errors: errors.list };
    }

    if (transactionReference) {
      const duplicate = await this.findDuplicateReference(transactionReference, run);
      if (duplicate) {
        return {
          duplicate: true,
          errors: [{ row: 0, field: 'Transaction Reference', error: duplicate }],
        };
      }
    }

    const ceilingError = await this.checkAgainstDue(target, amount);
    if (ceilingError) {
      return { errors: [{ row: 0, field: 'Payment Amount', error: ceilingError }] };
    }

    return {
      errors: [],
      prepared: {
        clientId: client.value.id,
        projectId: target.id,
        paymentDate: paymentDate as string,
        amount,
        paymentMethod: method.value,
        transactionReference: transactionReference ?? undefined,
        bankAccount: bankAccount ?? undefined,
        notes: notes ?? undefined,
      },
    };
  }

  protected async persist(
    rows: PreparedRow<CreatePaymentDto>[],
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<number> {
    // One transaction for the whole sheet: payment rows, receipt rows, receipt
    // number allocation and audit entries commit together or not at all.
    return this.dataSource.transaction(async (manager) => {
      for (const row of rows) {
        await this.paymentsService.createWithin(manager, row.data, actor, context);
      }
      return rows.length;
    });
  }

  /**
   * Rejects a payment that would push a fixed-amount project past its value,
   * counting the rows already accepted from the same file.
   *
   * A project with no fixed amount has no ceiling at all — `dueAmount` is null
   * by design, and the rule simply does not apply. Treating that as a zero
   * ceiling would block every retainer payment in the sheet.
   */
  private async checkAgainstDue(project: Project, amount: string): Promise<string | null> {
    const projectId = project.id;

    if (!this.ceilings.has(projectId)) {
      const totals = await this.financials.totalsForProject(project);
      this.ceilings.set(projectId, totals.dueAmount);
    }

    const ceiling = this.ceilings.get(projectId) ?? null;
    const value = Money.fromDecimalString(amount);
    const alreadyPlanned = this.projected.get(projectId) ?? Money.zero();
    const projected = alreadyPlanned.add(value);

    if (ceiling !== null && projected.greaterThan(ceiling)) {
      const remaining = ceiling.subtract(alreadyPlanned);
      this.projected.set(projectId, projected);
      return `This payment exceeds the remaining due amount for the project (${remaining.toDecimalString()} remaining, including earlier rows in this file).`;
    }

    this.projected.set(projectId, projected);
    return null;
  }

  private async findDuplicateReference(
    reference: string,
    run: ImportRun<CreatePaymentDto>,
  ): Promise<string | null> {
    if (!run.claim('transactionReference', reference)) {
      return `Transaction reference "${reference}" appears more than once in this file.`;
    }

    const existing = await this.payments.findOne({
      where: {
        transactionReference: reference,
        status: PaymentStatus.VALID,
        deletedAt: IsNull(),
      },
      relations: { receipt: true },
    });

    if (existing) {
      const receipt = existing.receipt?.receiptNumber;
      return receipt
        ? `A payment with this transaction reference already exists (receipt ${receipt}).`
        : 'A payment with this transaction reference already exists.';
    }
    return null;
  }
}
