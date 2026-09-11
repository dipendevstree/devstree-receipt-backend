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
import { UploadedImportFile } from 'src/common/excel/import-file.util';
import { ImportOptionsDto, ImportUpload, sendWorkbook } from 'src/common/excel/import-http';
import { ImportResultDto, ImportValidationResultDto } from 'src/common/excel/import-result.dto';
import { Permission } from 'src/common/enums/permission.enum';
import {
  AuthenticatedUser,
  FinancialAccessContext,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import {
  CreateProjectDto,
  ProjectLookupDto,
  ProjectLookupQueryDto,
  ProjectResponseDto,
  QueryProjectDto,
  UpdateProjectDto,
} from './dto/project.dto';
import { ProjectsService } from './projects.service';
import { ProjectsImportService } from './services/projects-import.service';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly importService: ProjectsImportService,
  ) {}

  @Get('import-template')
  @RequirePermissions(Permission.PROJECTS_VIEW)
  @RawResponse()
  @ApiOperation({
    summary: 'Download the demo Excel template for project import',
    description:
      'Project Amount is an optional column: the template ships one example row with a fixed amount and one retainer row with the cell left blank.',
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
  @RequirePermissions(Permission.PROJECTS_CREATE)
  @ImportUpload()
  @ApiOperation({ summary: 'Validate a project import file without writing anything' })
  validateImport(@UploadedFile() file: UploadedImportFile): Promise<ImportValidationResultDto> {
    return this.importService.validate(file);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PROJECTS_CREATE)
  @ImportUpload()
  @ApiOperation({
    summary: 'Import projects from an Excel file',
    description:
      'A blank Project Amount creates a project with no predefined amount — it is never stored as zero.',
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
  @RequirePermissions(Permission.PROJECTS_VIEW)
  @ApiOperation({ summary: 'List projects (financial totals masked unless unlocked)' })
  findAll(
    @Query() query: QueryProjectDto,
    @FinancialAccess() access: FinancialAccessContext,
  ): Promise<PaginatedResult<ProjectResponseDto>> {
    return this.projectsService.findAll(query, access.unlocked);
  }

  @Get('lookup')
  @RequirePermissions(Permission.PROJECTS_VIEW)
  @ApiOperation({
    summary: 'Searchable project list for select inputs — server-side filtered, no financial data',
    description:
      'Backs every project dropdown in the UI. Filtering happens in Postgres so the browser never loads the full project table.',
  })
  lookup(@Query() query: ProjectLookupQueryDto): Promise<ProjectLookupDto[]> {
    return this.projectsService.lookup(query);
  }

  @Get('by-client/:clientId')
  @RequirePermissions(Permission.PROJECTS_VIEW)
  @ApiOperation({ summary: 'Lightweight project list for a client — used by Receive Payment' })
  lookupByClient(
    @Param('clientId', new ParseUUIDPipe({ version: '4' })) clientId: string,
  ): Promise<ProjectLookupDto[]> {
    return this.projectsService.lookupByClient(clientId);
  }

  @Get(':id')
  @RequirePermissions(Permission.PROJECTS_VIEW)
  @ApiOperation({ summary: 'Project details with financial summary' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @FinancialAccess() access: FinancialAccessContext,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.findOne(id, access.unlocked);
  }

  @Post()
  @RequirePermissions(Permission.PROJECTS_CREATE)
  @ApiOperation({
    summary: 'Create a project',
    description:
      'The project amount is optional and, when supplied, is encrypted before storage. Projects created without one accept payments of any valid amount.',
  })
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
    @FinancialAccess() access: FinancialAccessContext,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.create(dto, user, context, access.unlocked);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PROJECTS_UPDATE)
  @ApiOperation({ summary: 'Update a project' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
    @FinancialAccess() access: FinancialAccessContext,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.update(id, dto, user, context, access.unlocked);
  }

  @Delete(':id')
  @RequirePermissions(Permission.PROJECTS_DELETE)
  @ApiOperation({ summary: 'Archive a project (blocked while it has recorded payments)' })
  async archive(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ReqContext() context: RequestContext,
  ): Promise<{ message: string }> {
    await this.projectsService.archive(id, user, context);
    return { message: 'Project archived.' };
  }
}
