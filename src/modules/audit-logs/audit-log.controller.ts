import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { ErrorCode } from 'src/common/constants/error-codes';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PaginatedResult } from 'src/common/dto/pagination.dto';
import { Permission } from 'src/common/enums/permission.enum';
import { AppException } from 'src/common/exceptions/app.exception';
import { AuditLog } from './entities/audit-log.entity';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogController {
  constructor(@InjectRepository(AuditLog) private readonly repository: Repository<AuditLog>) {}

  @Get()
  @RequirePermissions(Permission.AUDIT_LOGS_VIEW)
  @ApiOperation({
    summary: 'List audit entries (financial values are already redacted at write time)',
  })
  async findAll(@Query() query: QueryAuditLogDto): Promise<PaginatedResult<AuditLog>> {
    const where: FindOptionsWhere<AuditLog> = {};
    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = query.action;
    if (query.module) where.module = query.module;

    if (query.dateFrom && query.dateTo) {
      where.createdAt = Between(new Date(query.dateFrom), endOfDay(query.dateTo));
    } else if (query.dateFrom) {
      where.createdAt = MoreThanOrEqual(new Date(query.dateFrom));
    } else if (query.dateTo) {
      where.createdAt = LessThanOrEqual(endOfDay(query.dateTo));
    }

    const [items, total] = await this.repository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: query.skip,
      take: query.limit,
    });

    return PaginatedResult.of(items, total, query.page, query.limit);
  }

  @Get(':id')
  @RequirePermissions(Permission.AUDIT_LOGS_VIEW)
  @ApiOperation({ summary: 'Get a single audit entry' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<AuditLog> {
    const log = await this.repository.findOne({ where: { id } });
    if (!log) {
      throw AppException.notFound(ErrorCode.NOT_FOUND, 'Audit entry not found.');
    }
    return log;
  }
}

function endOfDay(date: string): Date {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}
