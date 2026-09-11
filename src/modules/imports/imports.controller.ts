import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RawResponse } from 'src/common/decorators/raw-response.decorator';
import { ExcelService } from 'src/common/excel/excel.service';
import { sendWorkbook } from 'src/common/excel/import-http';
import { ErrorReportRequestDto } from './dto/error-report.dto';

/**
 * Shared endpoint behind every module's "Download Error Excel" button.
 *
 * Rendering the failed rows is pure formatting, identical for every module, so
 * it lives here once instead of six times. Nothing is read from the database.
 */
@ApiTags('Imports')
@ApiBearerAuth()
@Controller('imports')
export class ImportsController {
  constructor(private readonly excel: ExcelService) {}

  @Post('error-report')
  @HttpCode(HttpStatus.OK)
  @RawResponse()
  @ApiOperation({
    summary: 'Download the failed rows of an import as an Excel file',
    description:
      'Returns the submitted rows with an appended Error column so the sheet can be corrected and re-imported.',
  })
  async errorReport(@Body() dto: ErrorReportRequestDto, @Res() res: Response): Promise<void> {
    const buffer = await this.excel.buildErrorReport(dto.label, dto.headers, dto.rows);
    const slug = dto.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    sendWorkbook(res, buffer, `devstree-${slug || 'import'}-errors.xlsx`);
  }
}
