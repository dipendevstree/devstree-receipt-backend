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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ErrorCode } from 'src/common/constants/error-codes';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { RawResponse } from 'src/common/decorators/raw-response.decorator';
import { ReqContext } from 'src/common/decorators/request-context.decorator';
import { PaginatedResult } from 'src/common/dto/pagination.dto';
import { UploadedImportFile } from 'src/common/excel/import-file.util';
import { ImportOptionsDto, ImportUpload, sendWorkbook } from 'src/common/excel/import-http';
import { ImportResultDto, ImportValidationResultDto } from 'src/common/excel/import-result.dto';
import {
  MASTER_TYPE_BY_SLUG,
  MASTER_TYPE_LABELS,
  MasterType,
} from 'src/common/enums/master-type.enum';
import { Permission } from 'src/common/enums/permission.enum';
import { AppException } from 'src/common/exceptions/app.exception';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import {
  CreateMasterItemDto,
  MasterItemResponseDto,
  MasterOptionDto,
  QueryMasterItemDto,
  UpdateMasterItemDto,
} from './dto/master.dto';
import { MastersService } from './masters.service';
import { MastersImportService } from './services/masters-import.service';

const TYPE_PARAM = {
  name: 'type',
  enum: Object.keys(MASTER_TYPE_BY_SLUG),
  description: 'Master collection slug',
};

@ApiTags('Masters')
@ApiBearerAuth()
@Controller('masters')
export class MastersController {
  constructor(
    private readonly mastersService: MastersService,
    private readonly importService: MastersImportService,
  ) {}

  @Get()
  @RequirePermissions(Permission.MASTERS_VIEW)
  @ApiOperation({ summary: 'List the available master collections' })
  listTypes(): Array<{ slug: string; type: MasterType; label: string }> {
    return Object.entries(MASTER_TYPE_BY_SLUG).map(([slug, type]) => ({
      slug,
      type,
      label: MASTER_TYPE_LABELS[type],
    }));
  }

  @Get(':type')
  @RequirePermissions(Permission.MASTERS_VIEW)
  @ApiParam(TYPE_PARAM)
  @ApiOperation({ summary: 'List records in a master collection' })
  findAll(
    @Param('type') type: string,
    @Query() query: QueryMasterItemDto,
  ): Promise<PaginatedResult<MasterItemResponseDto>> {
    return this.mastersService.findAll(resolveType(type), query);
  }

  @Get(':type/import-template')
  @RequirePermissions(Permission.MASTERS_VIEW)
  @ApiParam(TYPE_PARAM)
  @RawResponse()
  @ApiOperation({
    summary: 'Download the demo Excel template for this master collection',
    description: 'Columns and examples are generated per collection — no real data is included.',
  })
  async importTemplate(@Param('type') type: string, @Res() res: Response): Promise<void> {
    const importer = this.importService.forType(resolveType(type));
    sendWorkbook(res, await importer.buildTemplate(), importer.templateFileName);
  }

  @Post(':type/import/validate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.MASTERS_CREATE)
  @ApiParam(TYPE_PARAM)
  @ImportUpload()
  @ApiOperation({ summary: 'Validate a master import file without writing anything' })
  validateImport(
    @Param('type') type: string,
    @UploadedFile() file: UploadedImportFile,
  ): Promise<ImportValidationResultDto> {
    return this.importService.forType(resolveType(type)).validate(file);
  }

  @Post(':type/import')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.MASTERS_CREATE)
  @ApiParam(TYPE_PARAM)
  @ImportUpload()
  @ApiOperation({
    summary: 'Import records into a master collection from an Excel file',
    description: 'Imported records are never marked as system records.',
  })
  importExcel(
    @Param('type') type: string,
    @UploadedFile() file: UploadedImportFile,
    @Body() options: ImportOptionsDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<ImportResultDto> {
    return this.importService.forType(resolveType(type)).import(file, user, context, options.mode);
  }

  @Get(':type/options')
  @RequirePermissions(Permission.MASTERS_VIEW)
  @ApiParam(TYPE_PARAM)
  @ApiOperation({
    summary: 'Active records only, for populating dropdowns',
    description: 'The frontend must source every dropdown from here rather than hardcoding values.',
  })
  options(@Param('type') type: string): Promise<MasterOptionDto[]> {
    return this.mastersService.options(resolveType(type));
  }

  @Post(':type')
  @RequirePermissions(Permission.MASTERS_CREATE)
  @ApiParam(TYPE_PARAM)
  @ApiOperation({ summary: 'Create a master record' })
  create(
    @Param('type') type: string,
    @Body() dto: CreateMasterItemDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<MasterItemResponseDto> {
    return this.mastersService.create(resolveType(type), dto, user, context);
  }

  @Get('record/:id')
  @RequirePermissions(Permission.MASTERS_VIEW)
  @ApiOperation({ summary: 'Get a single master record' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<MasterItemResponseDto> {
    return this.mastersService.findOne(id);
  }

  @Patch('record/:id')
  @RequirePermissions(Permission.MASTERS_UPDATE)
  @ApiOperation({ summary: 'Update a master record' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateMasterItemDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<MasterItemResponseDto> {
    return this.mastersService.update(id, dto, user, context);
  }

  @Delete('record/:id')
  @RequirePermissions(Permission.MASTERS_DELETE)
  @ApiOperation({ summary: 'Delete a master record (system records must be deactivated instead)' })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<{ message: string }> {
    await this.mastersService.remove(id, user, context);
    return { message: 'Master record deleted.' };
  }
}

function resolveType(slug: string): MasterType {
  const type = MASTER_TYPE_BY_SLUG[slug];
  if (!type) {
    throw AppException.notFound(
      ErrorCode.NOT_FOUND,
      `Unknown master collection "${slug}". Valid collections: ${Object.keys(MASTER_TYPE_BY_SLUG).join(', ')}.`,
    );
  }
  return type;
}
