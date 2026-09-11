import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FinancialAccess } from 'src/common/decorators/financial-unlock.decorator';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { Permission } from 'src/common/enums/permission.enum';
import { FinancialAccessContext } from 'src/common/interfaces/authenticated-user.interface';
import { DashboardService } from './dashboard.service';
import {
  DashboardQueryDto,
  DashboardSummaryDto,
  DashboardTopListsDto,
  RecentActivityDto,
} from './dto/dashboard.dto';

/**
 * Every endpoint here accepts the standard `datePreset` / `dateFrom` /
 * `dateTo` filter, so the whole dashboard moves together when the period
 * selector changes. Financial figures are masked unless the caller holds an
 * active financial unlock session — counts are not masked, because a count is
 * not a monetary disclosure.
 */
@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @RequirePermissions(Permission.CLIENTS_VIEW)
  @ApiOperation({ summary: 'Dashboard statistics (financial figures masked unless unlocked)' })
  summary(
    @Query() query: DashboardQueryDto,
    @FinancialAccess() access: FinancialAccessContext,
  ): Promise<DashboardSummaryDto> {
    return this.dashboardService.summary(query, access.unlocked);
  }

  @Get('recent-activity')
  @RequirePermissions(Permission.CLIENTS_VIEW)
  @ApiOperation({
    summary: 'Recent administrator activity from the audit trail',
    description:
      'Names are the real administrators who performed each action. Amounts never appear.',
  })
  recentActivity(@Query('limit') limit?: string): Promise<RecentActivityDto[]> {
    return this.dashboardService.recentActivity(Number(limit) || 10);
  }

  @Get('top-lists')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({
    summary: 'Top clients/projects by received and outstanding amounts',
    description:
      'Returns empty lists while the financial session is locked — even the ordering would leak relative amounts.',
  })
  topLists(
    @Query() query: DashboardQueryDto,
    @FinancialAccess() access: FinancialAccessContext,
  ): Promise<DashboardTopListsDto> {
    return this.dashboardService.topLists(query, access.unlocked);
  }
}
