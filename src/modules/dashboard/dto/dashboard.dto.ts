import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DateFilterQueryDto } from 'src/common/dto/date-filter.dto';

export class DashboardQueryDto extends DateFilterQueryDto {}

/**
 * Counts are not financial data — how many clients exist is org structure, not
 * money — so they are returned whether or not the financial session is
 * unlocked. Every `string | null` amount below is `null` while locked; the real
 * figure is never sent with a "locked" flag beside it.
 */
export class DashboardSummaryDto {
  // ── Non-financial ──
  @ApiProperty() totalClients!: number;
  @ApiProperty() activeClients!: number;
  @ApiProperty() inactiveClients!: number;
  @ApiProperty() totalProjects!: number;
  @ApiProperty() activeProjects!: number;
  @ApiProperty() completedProjects!: number;
  @ApiProperty() onHoldProjects!: number;
  @ApiProperty() draftProjects!: number;
  @ApiProperty() cancelledProjects!: number;
  @ApiProperty({ description: 'Projects with a fixed project amount' })
  projectsWithFixedAmount!: number;
  @ApiProperty({ description: 'Monthly/variable projects with no defined amount' })
  projectsWithoutDefinedAmount!: number;

  @ApiProperty() paymentsToday!: number;
  @ApiProperty() paymentsThisWeek!: number;
  @ApiProperty() paymentsThisMonth!: number;
  @ApiProperty() paymentsThisYear!: number;
  @ApiProperty() receiptsToday!: number;
  @ApiProperty() receiptsThisWeek!: number;
  @ApiProperty() receiptsThisMonth!: number;
  @ApiProperty() receiptsThisYear!: number;

  /** Payments inside the selected date filter — the period-scoped headline count. */
  @ApiProperty() paymentsInPeriod!: number;
  @ApiProperty() receiptsInPeriod!: number;

  // ── Financial (null while locked) ──
  @ApiProperty() financialLocked!: boolean;
  @ApiPropertyOptional({ nullable: true, description: 'Fixed-amount projects only.' })
  totalProjectValue!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'All projects, all time.' })
  totalReceived!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Fixed-amount projects only.' })
  totalDue!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Collected on variable projects.' })
  variableReceived!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Collected within the selected period.' })
  receivedInPeriod!: string | null;
}

export class RecentActivityDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() userName!: string | null;
  @ApiProperty() action!: string;
  @ApiProperty({ description: 'Human-readable action label, e.g. "Received Payment"' })
  actionLabel!: string;
  @ApiProperty() module!: string;
  @ApiPropertyOptional() description!: string | null;
  @ApiProperty() createdAt!: Date;
}

export class TopEntityRowDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() secondaryName!: string | null;
  @ApiPropertyOptional({ nullable: true }) amount!: string | null;
}

export class DashboardTopListsDto {
  @ApiProperty() financialLocked!: boolean;
  @ApiProperty({ type: [TopEntityRowDto] }) topClientsByReceived!: TopEntityRowDto[];
  @ApiProperty({ type: [TopEntityRowDto] }) topProjectsByReceived!: TopEntityRowDto[];
  @ApiProperty({ type: [TopEntityRowDto] }) topClientsByOutstanding!: TopEntityRowDto[];
}
