import { Controller, Get, Param, ParseUUIDPipe, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RequireFinancialUnlock } from 'src/common/decorators/financial-unlock.decorator';
import { FinancialAccess } from 'src/common/decorators/financial-unlock.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { RawResponse } from 'src/common/decorators/raw-response.decorator';
import { ReqContext } from 'src/common/decorators/request-context.decorator';
import { PaginatedResult } from 'src/common/dto/pagination.dto';
import { Permission } from 'src/common/enums/permission.enum';
import {
  AuthenticatedUser,
  FinancialAccessContext,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { QueryReceiptDto, ReceiptResponseDto } from './dto/receipt.dto';
import { ReceiptsService } from './receipts.service';

@ApiTags('Receipts')
@ApiBearerAuth()
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get()
  @RequirePermissions(Permission.RECEIPTS_VIEW)
  @ApiOperation({ summary: 'List receipts' })
  findAll(
    @Query() query: QueryReceiptDto,
    @FinancialAccess() access: FinancialAccessContext,
  ): Promise<PaginatedResult<ReceiptResponseDto>> {
    return this.receiptsService.findAll(query, access.unlocked);
  }

  @Get(':id')
  @RequirePermissions(Permission.RECEIPTS_VIEW)
  @ApiOperation({ summary: 'Receipt details' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @FinancialAccess() access: FinancialAccessContext,
  ): Promise<ReceiptResponseDto> {
    return this.receiptsService.findOne(id, access.unlocked);
  }

  @Get(':id/pdf')
  @RequirePermissions(Permission.RECEIPTS_PRINT)
  @RequireFinancialUnlock()
  @RawResponse()
  @ApiOperation({
    summary: 'Download the receipt as a printable A4 PDF (requires financial unlock)',
  })
  async downloadPdf(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
    @Res() res: Response,
  ): Promise<void> {
    const { stream, filename } = await this.receiptsService.renderPdf(id, user, context);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    stream.pipe(res);
  }

  @Get(':id/print')
  @RequirePermissions(Permission.RECEIPTS_PRINT)
  @RequireFinancialUnlock()
  @RawResponse()
  @ApiOperation({ summary: 'Same as /pdf but forces a download (used by the Print button)' })
  async printPdf(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
    @Res() res: Response,
  ): Promise<void> {
    const { stream, filename } = await this.receiptsService.renderPdf(id, user, context);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    stream.pipe(res);
  }
}
