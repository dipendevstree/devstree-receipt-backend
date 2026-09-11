import { Controller, Get, Param, ParseUUIDPipe, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RequireFinancialUnlock } from 'src/common/decorators/financial-unlock.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PaginatedResult } from 'src/common/dto/pagination.dto';
import { Permission } from 'src/common/enums/permission.enum';
import { currentYearInAppTimezone } from 'src/common/utils/date-range.util';
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
import { ReportsService } from './reports.service';
import { ExportColumn, ReportExportService } from './services/report-export.service';

type ExportFormat = 'csv' | 'excel';

/**
 * Every route here requires an active financial unlock session — reports and
 * exports are financial data, not just the on-screen figures (§28, §71, §72).
 */
@ApiTags('Reports')
@ApiBearerAuth()
@RequireFinancialUnlock()
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly exportService: ReportExportService,
  ) {}

  @Get('due-payments')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({
    summary: 'Projects with an outstanding due amount',
    description:
      'Projects without a defined amount are excluded: they have no due by definition, so listing them with a zero would be misleading.',
  })
  duePayments(@Query() query: DuePaymentsQueryDto): Promise<PaginatedResult<DuePaymentRowDto>> {
    return this.reportsService.duePayments(query, true);
  }

  @Get('client-collection')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Collection totals grouped by client' })
  async clientCollection(
    @Query() query: ReportFilterQueryDto,
    @Query('format') format: ExportFormat | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ClientCollectionRowDto[] | void> {
    const rows = await this.reportsService.clientCollection(query, true);
    return this.respond(res, format, 'client-collection', rows, [
      { key: 'clientName', header: 'Client' },
      { key: 'projectCount', header: 'Projects' },
      { key: 'fixedProjectCount', header: 'Fixed-Amount Projects' },
      { key: 'variableProjectCount', header: 'Variable Projects' },
      { key: 'totalProjectValue', header: 'Project Value (Fixed)' },
      { key: 'totalReceived', header: 'Received (All)' },
      { key: 'variableReceived', header: 'Received (Variable)' },
      { key: 'totalDue', header: 'Due (Fixed)' },
    ]);
  }

  @Get('project-collection')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Collection totals grouped by project' })
  async projectCollection(
    @Query() query: ReportFilterQueryDto,
    @Query('format') format: ExportFormat | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ProjectCollectionRowDto[] | void> {
    const rows = await this.reportsService.projectCollection(query, true);
    // Exports print "Not Defined" / "N/A" for variable projects rather than a
    // blank cell a spreadsheet would happily read as zero.
    const exportable = rows.map((row) => ({
      ...row,
      projectAmount: row.hasProjectAmount ? row.projectAmount : 'Not Defined',
      dueAmount: row.hasProjectAmount ? row.dueAmount : 'N/A',
    }));
    return this.respond(res, format, 'project-collection', exportable, [
      { key: 'clientName', header: 'Client' },
      { key: 'projectCode', header: 'Project Code' },
      { key: 'projectName', header: 'Project' },
      { key: 'projectStatus', header: 'Status' },
      { key: 'projectAmount', header: 'Project Amount' },
      { key: 'totalReceived', header: 'Received' },
      { key: 'dueAmount', header: 'Due' },
    ]) as Promise<ProjectCollectionRowDto[] | void>;
  }

  @Get('payments')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Detailed payment report' })
  async paymentReport(
    @Query() query: ReportFilterQueryDto,
    @Query('format') format: ExportFormat | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PaymentReportRowDto[] | void> {
    const rows = await this.reportsService.paymentReport(query, true);
    return this.respond(res, format, 'payment-report', rows, [
      { key: 'paymentDate', header: 'Date' },
      { key: 'clientName', header: 'Client' },
      { key: 'projectName', header: 'Project' },
      { key: 'receiptNumber', header: 'Receipt' },
      { key: 'amount', header: 'Amount' },
      { key: 'paymentMethod', header: 'Method' },
      { key: 'transactionReference', header: 'Reference' },
      { key: 'status', header: 'Status' },
      { key: 'createdByName', header: 'Recorded By' },
    ]);
  }

  @Get('monthly-collection')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Monthly collection totals' })
  async monthlyCollection(
    @Query() query: ReportFilterQueryDto,
    @Query('year') year: string | undefined,
    @Query('format') format: ExportFormat | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MonthlyCollectionRowDto[] | void> {
    const resolvedYear = resolveYear(year);
    const rows = await this.reportsService.monthlyCollection(resolvedYear, query, true);
    return this.respond(res, format, `monthly-collection-${resolvedYear}`, rows, [
      { key: 'month', header: 'Month' },
      { key: 'paymentCount', header: 'Payments' },
      { key: 'receiptCount', header: 'Receipts' },
      { key: 'totalReceived', header: 'Received' },
    ]);
  }

  @Get('client-statement/:clientId')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Full statement for a client — all projects and payments' })
  clientStatement(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
  ): Promise<ClientStatementDto> {
    return this.reportsService.clientStatement(clientId, true);
  }

  @Get('project-statement/:projectId')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Full statement for a project — every payment and the running due' })
  projectStatement(
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
  ): Promise<ProjectStatementDto> {
    return this.reportsService.projectStatement(projectId, true);
  }

  /** Streams CSV/Excel when `format` is given; otherwise returns JSON via the normal envelope. */
  private async respond<T extends object>(
    res: Response,
    format: ExportFormat | undefined,
    filename: string,
    rows: T[],
    columns: ExportColumn[],
  ): Promise<T[] | void> {
    if (format === 'csv') {
      const csv = this.exportService.toCsv(
        columns,
        rows as unknown as Array<Record<string, unknown>>,
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
      return;
    }

    if (format === 'excel') {
      const buffer = await this.exportService.toExcel(
        filename,
        columns,
        rows as unknown as Array<Record<string, unknown>>,
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.send(buffer);
      return;
    }

    return rows;
  }
}

/** Query `year` for the monthly report; defaults to the current app-timezone year. */
function resolveYear(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2999) {
    return currentYearInAppTimezone();
  }
  return parsed;
}
