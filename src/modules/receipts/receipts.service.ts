import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { ErrorCode } from 'src/common/constants/error-codes';
import { PaginatedResult, resolveSortColumn } from 'src/common/dto/pagination.dto';
import { AuditAction, AuditModule } from 'src/common/enums/audit-action.enum';
import { AppException } from 'src/common/exceptions/app.exception';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { amountInWords } from 'src/common/utils/amount-in-words.util';
import { Money } from 'src/common/utils/money.util';
import { AuditLogService } from 'src/modules/audit-logs/audit-log.service';
import {
  ProjectFinancialsService,
  ProjectTotals,
} from 'src/modules/financial/services/project-financials.service';
import { maskAmount } from 'src/modules/financial/utils/mask.util';
import { CompanySetting } from 'src/modules/settings/entities/company-setting.entity';
import { SettingsService } from 'src/modules/settings/settings.service';
import { QueryReceiptDto, ReceiptResponseDto } from './dto/receipt.dto';
import { Receipt } from './entities/receipt.entity';
import { ReceiptPdfData, ReceiptPdfService } from './services/receipt-pdf.service';

/** Sort allow-list — anything else falls back to receiptDate. */
const SORTABLE: Record<string, string> = {
  receiptDate: 'receipt.receiptDate',
  receiptNumber: 'receipt.receiptNumber',
  clientName: 'client.name',
  projectName: 'project.projectName',
  createdAt: 'receipt.createdAt',
};

@Injectable()
export class ReceiptsService {
  constructor(
    @InjectRepository(Receipt) private readonly receipts: Repository<Receipt>,
    private readonly financials: ProjectFinancialsService,
    private readonly pdfService: ReceiptPdfService,
    private readonly settingsService: SettingsService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll(
    query: QueryReceiptDto,
    unlocked: boolean,
  ): Promise<PaginatedResult<ReceiptResponseDto>> {
    const builder = this.receipts
      .createQueryBuilder('receipt')
      .leftJoinAndSelect('receipt.payment', 'payment')
      .leftJoinAndSelect('payment.client', 'client')
      .leftJoinAndSelect('payment.project', 'project')
      .leftJoinAndSelect('receipt.generatedByUser', 'generatedByUser');

    if (query.clientId)
      builder.andWhere('payment.client_id = :clientId', { clientId: query.clientId });
    if (query.projectId)
      builder.andWhere('payment.project_id = :projectId', { projectId: query.projectId });
    if (query.receiptNumber) {
      builder.andWhere('receipt.receipt_number ILIKE :receiptNumber', {
        receiptNumber: `%${query.receiptNumber}%`,
      });
    }
    if (query.receiptStatus) {
      builder.andWhere('receipt.status = :receiptStatus', { receiptStatus: query.receiptStatus });
    }
    if (query.generatedBy) {
      builder.andWhere('receipt.generated_by = :generatedBy', { generatedBy: query.generatedBy });
    }
    if (query.paymentMethod) {
      builder.andWhere('payment.payment_method = :paymentMethod', {
        paymentMethod: query.paymentMethod,
      });
    }
    if (query.paymentStatus) {
      builder.andWhere('payment.status = :paymentStatus', { paymentStatus: query.paymentStatus });
    }
    if (query.transactionReference) {
      builder.andWhere('payment.transaction_reference ILIKE :reference', {
        reference: `%${query.transactionReference}%`,
      });
    }

    const range = query.resolveRange();
    if (range.from) builder.andWhere('receipt.receipt_date >= :from', { from: range.from });
    if (range.to) builder.andWhere('receipt.receipt_date <= :to', { to: range.to });

    if (query.search) {
      const term = `%${query.search}%`;
      builder.andWhere(
        new Brackets((qb) =>
          qb
            .where('receipt.receipt_number ILIKE :term', { term })
            .orWhere('client.name ILIKE :term', { term })
            .orWhere('project.project_name ILIKE :term', { term })
            .orWhere('payment.transaction_reference ILIKE :term', { term }),
        ),
      );
    }

    builder.orderBy(resolveSortColumn(query.sortBy, SORTABLE, 'receiptDate'), query.sortOrder);
    // Receipts written in one transaction (a batch import) share the same
    // created_at to the microsecond. Receipt numbers are allocated in order and
    // zero-padded, so they break the tie deterministically in the same direction
    // — otherwise "the five newest" could come back in an arbitrary order.
    builder.addOrderBy('receipt.receiptNumber', query.sortOrder);

    // Amounts are ciphertext, so a min/max filter cannot be a SQL predicate.
    // It runs after decryption and only while unlocked — otherwise the filter
    // would leak the very figures the lock exists to hide.
    const amountFilter = this.resolveAmountFilter(query, unlocked);

    if (!amountFilter) {
      const [receipts, total] = await builder.skip(query.skip).take(query.limit).getManyAndCount();
      return PaginatedResult.of(
        await this.toResponses(receipts, unlocked),
        total,
        query.page,
        query.limit,
      );
    }

    const all = await builder.getMany();
    const matching = all.filter((receipt) => {
      if (!receipt.payment) return false;
      const amount = this.financials.decryptPaymentAmount(receipt.payment);
      if (amountFilter.min && amount.lessThan(amountFilter.min)) return false;
      if (amountFilter.max && amount.greaterThan(amountFilter.max)) return false;
      return true;
    });

    const page = matching.slice(query.skip, query.skip + query.limit);
    return PaginatedResult.of(
      await this.toResponses(page, unlocked),
      matching.length,
      query.page,
      query.limit,
    );
  }

  async findOne(id: string, unlocked: boolean): Promise<ReceiptResponseDto> {
    const receipt = await this.getOrFail(id);
    const [response] = await this.toResponses([receipt], unlocked);
    return response;
  }

  /** PDF rendering requires an unlocked financial session — enforced by the controller guard. */
  async renderPdf(
    id: string,
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<{ stream: NodeJS.ReadableStream; filename: string }> {
    const receipt = await this.getOrFail(id);
    const payment = receipt.payment;

    const [projectTotals, company] = await Promise.all([
      this.financials.totalsForProject(payment.project),
      this.settingsService.getCompanySettings(),
    ]);
    const paymentAmount = this.financials.decryptPaymentAmount(payment);

    const data: ReceiptPdfData = {
      receipt,
      payment,
      paymentAmount,
      // null here means "this project has no defined amount"; the renderer
      // prints "Not Defined" / "N/A" rather than a fabricated zero.
      projectAmount: projectTotals.projectAmount,
      totalReceived: projectTotals.totalReceived,
      dueAmount: projectTotals.dueAmount,
      company: company as CompanySetting,
      generatedByName: receipt.generatedByUser?.name ?? null,
    };

    await this.auditLog.record({
      action: AuditAction.RECEIPT_DOWNLOADED,
      module: AuditModule.RECEIPTS,
      recordId: receipt.id,
      description: `Downloaded receipt ${receipt.receiptNumber}`,
      actor,
      context,
    });

    return {
      stream: this.pdfService.render(data),
      filename: `${receipt.receiptNumber}.pdf`,
    };
  }

  private resolveAmountFilter(
    query: QueryReceiptDto,
    unlocked: boolean,
  ): { min: Money | null; max: Money | null } | null {
    if (!unlocked) return null;
    if (!query.minAmount && !query.maxAmount) return null;
    return {
      min: query.minAmount ? Money.fromDecimalString(query.minAmount) : null,
      max: query.maxAmount ? Money.fromDecimalString(query.maxAmount) : null,
    };
  }

  private async getOrFail(id: string): Promise<Receipt> {
    const receipt = await this.receipts.findOne({
      where: { id },
      relations: {
        payment: { client: true, project: true },
        generatedByUser: true,
      },
    });
    if (!receipt) {
      throw AppException.notFound(ErrorCode.RECEIPT_NOT_FOUND, 'Receipt not found.');
    }
    return receipt;
  }

  /**
   * Batched so a page of receipts costs one payments query per distinct
   * project rather than one per row.
   */
  private async toResponses(receipts: Receipt[], unlocked: boolean): Promise<ReceiptResponseDto[]> {
    // One settings read per page rather than per row.
    const company = await this.settingsService.getCompanySettings();
    const projects = new Map(
      receipts
        .map((receipt) => receipt.payment?.project)
        .filter((project): project is NonNullable<typeof project> => Boolean(project))
        .map((project) => [project.id, project]),
    );
    const totals = await this.financials.totalsForProjects([...projects.values()]);

    return receipts.map((receipt) =>
      this.toResponse(receipt, unlocked, totals, company.currency || 'INR'),
    );
  }

  private toResponse(
    receipt: Receipt,
    unlocked: boolean,
    totalsByProject: Map<string, ProjectTotals>,
    currency: string,
  ): ReceiptResponseDto {
    const payment = receipt.payment;
    const amount = payment ? this.financials.decryptPaymentAmount(payment) : null;
    const totals = payment?.projectId ? totalsByProject.get(payment.projectId) : undefined;

    return {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      receiptDate: receipt.receiptDate,
      status: receipt.status,
      paymentId: receipt.paymentId,

      clientId: payment?.clientId ?? '',
      clientName: payment?.client?.name ?? '',
      clientEmail: payment?.client?.email ?? null,
      clientPhone: payment?.client?.phone ?? null,

      projectId: payment?.projectId ?? '',
      projectName: payment?.project?.projectName ?? '',
      projectCode: payment?.project?.projectCode ?? null,

      paymentDate: payment?.paymentDate ?? receipt.receiptDate,
      paymentMethod: payment?.paymentMethod as ReceiptResponseDto['paymentMethod'],
      paymentStatus: payment?.status as ReceiptResponseDto['paymentStatus'],
      transactionReference: payment?.transactionReference ?? null,

      financialLocked: !unlocked,
      amount: maskAmount(amount, unlocked),
      // Spelling out the amount would disclose it just as plainly as the
      // figure, so it follows the same lock.
      amountInWords:
        unlocked && amount ? amountInWords(amount.toDecimalString(), { currency }) : null,

      hasProjectAmount: totals?.hasProjectAmount ?? false,
      projectAmount: maskAmount(totals?.projectAmount ?? null, unlocked),
      projectTotalReceived: maskAmount(totals?.totalReceived ?? null, unlocked),
      projectDueAmount: maskAmount(totals?.dueAmount ?? null, unlocked),

      generatedByName: receipt.generatedByUser?.name ?? null,
      notes: payment?.notes ?? null,
      createdAt: receipt.createdAt,
    };
  }
}
