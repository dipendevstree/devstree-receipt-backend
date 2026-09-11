import {
  Body,
  Controller,
  Delete,
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
import { FinancialAccess } from 'src/common/decorators/financial-unlock.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { RawResponse } from 'src/common/decorators/raw-response.decorator';
import { ReqContext } from 'src/common/decorators/request-context.decorator';
import { PaginatedResult } from 'src/common/dto/pagination.dto';
import { ImportResultDto, ImportValidationResultDto } from 'src/common/excel/import-result.dto';
import { ImportOptionsDto, ImportUpload, sendWorkbook } from 'src/common/excel/import-http';
import { UploadedImportFile } from 'src/common/excel/import-file.util';
import { Permission } from 'src/common/enums/permission.enum';
import {
  AuthenticatedUser,
  FinancialAccessContext,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { ClientsService } from './clients.service';
import { ClientsImportService } from './services/clients-import.service';
import {
  ClientLookupDto,
  ClientLookupQueryDto,
  ClientResponseDto,
  CreateClientDto,
  QueryClientDto,
  UpdateClientDto,
} from './dto/client.dto';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly importService: ClientsImportService,
  ) {}

  @Get('import-template')
  @RequirePermissions(Permission.CLIENTS_VIEW)
  @RawResponse()
  @ApiOperation({
    summary: 'Download the demo Excel template for client import',
    description:
      'Generated from the current column definition, with example rows and an instructions sheet. Contains no real client data.',
  })
  async importTemplate(@Res() res: Response): Promise<void> {
    sendWorkbook(
      res,
      await this.importService.buildTemplate(),
      this.importService.templateFileName,
    );
  }

  @Post('import/validate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.CLIENTS_CREATE)
  @ImportUpload()
  @ApiOperation({
    summary: 'Validate a client import file without writing anything',
    description: 'Returns the preview, per-row status and every validation error.',
  })
  validateImport(@UploadedFile() file: UploadedImportFile): Promise<ImportValidationResultDto> {
    return this.importService.validate(file);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.CLIENTS_CREATE)
  @ImportUpload()
  @ApiOperation({
    summary: 'Import clients from an Excel file',
    description:
      'Re-validates the file server-side, then writes every valid row in one transaction. Invalid and duplicate rows are reported, never silently skipped.',
  })
  importExcel(
    @UploadedFile() file: UploadedImportFile,
    @Body() options: ImportOptionsDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<ImportResultDto> {
    return this.importService.import(file, user, context, options.mode);
  }

  @Get()
  @RequirePermissions(Permission.CLIENTS_VIEW)
  @ApiOperation({ summary: 'List clients (financial totals masked unless unlocked)' })
  findAll(
    @Query() query: QueryClientDto,
    @FinancialAccess() access: FinancialAccessContext,
  ): Promise<PaginatedResult<ClientResponseDto>> {
    return this.clientsService.findAll(query, access.unlocked);
  }

  @Get('lookup')
  @RequirePermissions(Permission.CLIENTS_VIEW)
  @ApiOperation({
    summary: 'Searchable client list for select inputs — no financial data',
    description:
      'Backs every client dropdown in the UI. Search runs in Postgres and the result is capped, so large client tables never reach the browser.',
  })
  lookup(@Query() query: ClientLookupQueryDto): Promise<ClientLookupDto[]> {
    return this.clientsService.lookup(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.CLIENTS_VIEW)
  @ApiOperation({ summary: 'Client details with financial summary' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @FinancialAccess() access: FinancialAccessContext,
  ): Promise<ClientResponseDto> {
    return this.clientsService.findOne(id, access.unlocked);
  }

  @Post()
  @RequirePermissions(Permission.CLIENTS_CREATE)
  @ApiOperation({ summary: 'Create a client' })
  create(
    @Body() dto: CreateClientDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<ClientResponseDto> {
    return this.clientsService.create(dto, user, context);
  }

  @Patch(':id')
  @RequirePermissions(Permission.CLIENTS_UPDATE)
  @ApiOperation({ summary: 'Update a client' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
    @FinancialAccess() access: FinancialAccessContext,
  ): Promise<ClientResponseDto> {
    return this.clientsService.update(id, dto, user, context, access.unlocked);
  }

  @Delete(':id')
  @RequirePermissions(Permission.CLIENTS_DELETE)
  @ApiOperation({ summary: 'Archive a client (soft delete; blocked while it has active projects)' })
  async archive(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<{ message: string }> {
    await this.clientsService.archive(id, user, context);
    return { message: 'Client archived.' };
  }
}
