import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import {
  FinancialAccess,
  RequireFinancialUnlock,
} from 'src/common/decorators/financial-unlock.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { RawResponse } from 'src/common/decorators/raw-response.decorator';
import { ReqContext } from 'src/common/decorators/request-context.decorator';
import { PaginatedResult } from 'src/common/dto/pagination.dto';
import { UploadedImportFile } from 'src/common/excel/import-file.util';
import { ImportUpload, sendWorkbook } from 'src/common/excel/import-http';
import { ImportResultDto, ImportValidationResultDto } from 'src/common/excel/import-result.dto';
import { Permission } from 'src/common/enums/permission.enum';
import {
  AuthenticatedUser,
  FinancialAccessContext,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import {
  CreatePaymentDto,
  PaymentResponseDto,
  QueryPaymentDto,
  UpdatePaymentDto,
  VoidPaymentDto,
} from './dto/payment.dto';
import { PaymentsService } from './payments.service';
import { PaymentsImportService } from './services/payments-import.service';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly importService: PaymentsImportService,
  ) {}

  @Get('import-template')
  @RequirePermissions(Permission.PAYMENTS_VIEW)
  @RawResponse()
  @ApiOperation({
    summary: 'Download the demo Excel template for payment import',
    description: 'Column definitions and examples only — no real payment data and no amounts.',
  })
  async importTemplate(@Res() res: Response): Promise<void> {
    sendWorkbook(
      res,
      await this.importService.buildTemplate(),
      this.importService.templateFileName,
    );
  }

  /**
   * Validation reports how much room is left against a project's due amount, so
   * it may only run for a caller whose financial session is unlocked — the same
   * bar the figure itself has to clear anywhere else in the API.
   */
  @Post('import/validate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PAYMENTS_CREATE)
  @RequireFinancialUnlock()
  @ImportUpload()
  @ApiOperation({
    summary: 'Validate a payment import file without writing anything',
    description: 'Requires an unlocked financial session.',
  })
  validateImport(@UploadedFile() file: UploadedImportFile): Promise<ImportValidationResultDto> {
    return this.importService.validate(file);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PAYMENTS_CREATE)
  @RequireFinancialUnlock()
  @ImportUpload()
  @ApiOperation({
    summary: 'Import payments from an Excel file',
    description:
      'All-or-nothing: if any row fails validation nothing is written. Every imported payment is encrypted and receives a receipt, in one transaction. Requires an unlocked financial session.',
  })
  importExcel(
    @UploadedFile() file: UploadedImportFile,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<ImportResultDto> {
    // Payments never import partially, so no mode is accepted here.
    return this.importService.import(file, user, context, 'ALL_OR_NOTHING');
  }

  @Get()
  @RequirePermissions(Permission.PAYMENTS_VIEW)
  @ApiOperation({ summary: 'List payments (amounts masked unless unlocked)' })
  findAll(
    @Query() query: QueryPaymentDto,
    @FinancialAccess() access: FinancialAccessContext,
  ): Promise<PaginatedResult<PaymentResponseDto>> {
    return this.paymentsService.findAll(query, access.unlocked);
  }

  @Get(':id')
  @RequirePermissions(Permission.PAYMENTS_VIEW)
  @ApiOperation({ summary: 'Payment details' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @FinancialAccess() access: FinancialAccessContext,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.findOne(id, access.unlocked);
  }

  @Post()
  @RequirePermissions(Permission.PAYMENTS_CREATE)
  @ApiOperation({
    summary: 'Receive a payment',
    description:
      'Validates the amount against the remaining due, encrypts it, and atomically generates a receipt. The project row is locked for the transaction so concurrent payments cannot overshoot the project amount.',
  })
  create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.create(dto, user, context);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PAYMENTS_UPDATE)
  @ApiOperation({
    summary:
      'Update non-financial payment details (amount is immutable — void and re-enter instead)',
  })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
    @FinancialAccess() access: FinancialAccessContext,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.update(id, dto, user, context, access.unlocked);
  }

  @Post(':id/void')
  @RequirePermissions(Permission.PAYMENTS_VOID)
  @ApiOperation({ summary: 'Void a payment — excluded from totals but kept for audit history' })
  async void(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: VoidPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<{ message: string }> {
    await this.paymentsService.void(id, dto, user, context);
    return { message: 'Payment voided.' };
  }
}
