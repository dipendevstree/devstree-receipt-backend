import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginatedDateFilterQueryDto } from 'src/common/dto/date-filter.dto';
import { ClientStatus } from 'src/common/enums/client-status.enum';
import { PaymentMethod, PaymentStatus } from 'src/common/enums/payment.enum';
import { ProjectPaymentStatus, ProjectStatus } from 'src/common/enums/project-status.enum';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

const toBool = ({ value }: { value: unknown }) =>
  value === undefined || value === ''
    ? undefined
    : ['true', '1', 'yes', true].includes(value as never);

/**
 * One filter shape for every collection-style report. Each report ignores the
 * dimensions that do not apply to it, but the query-string contract is
 * identical everywhere — the same `?datePreset=this_month&clientId=…` link
 * works across all of them.
 */
export class ReportFilterQueryDto extends PaginatedDateFilterQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  clientId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  projectId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Administrator who recorded the payment' })
  @IsOptional()
  @IsUUID('4')
  createdBy?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @Transform(trim)
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @Transform(trim)
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @Transform(trim)
  @IsEnum(ProjectStatus)
  projectStatus?: ProjectStatus;

  @ApiPropertyOptional({ enum: ClientStatus })
  @IsOptional()
  @Transform(trim)
  @IsEnum(ClientStatus)
  clientStatus?: ClientStatus;

  @ApiPropertyOptional({ enum: ProjectPaymentStatus })
  @IsOptional()
  @Transform(trim)
  @IsEnum(ProjectPaymentStatus)
  projectPaymentStatus?: ProjectPaymentStatus;

  @ApiPropertyOptional({
    description: 'true = fixed-amount projects only, false = variable projects only',
  })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  hasAmount?: boolean;

  @ApiPropertyOptional({ description: 'Minimum amount. Applied after decryption.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  minAmount?: string;

  @ApiPropertyOptional({ description: 'Maximum amount. Applied after decryption.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  maxAmount?: string;

  @ApiPropertyOptional({ description: 'Free-text across client / project / receipt / reference' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  declare search?: string;
}

/** Kept as a distinct name because the due-payments screen links to it directly. */
export class DuePaymentsQueryDto extends ReportFilterQueryDto {}

export class DuePaymentRowDto {
  @ApiProperty() clientId!: string;
  @ApiProperty() clientName!: string;
  @ApiProperty() projectId!: string;
  @ApiProperty() projectName!: string;
  @ApiProperty({ description: 'False ⇒ render "Not Defined", never ₹0.' })
  hasProjectAmount!: boolean;
  @ApiPropertyOptional({ nullable: true }) projectAmount!: string | null;
  @ApiPropertyOptional({ nullable: true }) totalReceived!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Null ⇒ "N/A".' })
  dueAmount!: string | null;
  @ApiPropertyOptional() lastPaymentDate!: string | null;
  @ApiProperty({ enum: ProjectPaymentStatus }) paymentStatus!: ProjectPaymentStatus;
  @ApiProperty({ enum: ProjectStatus }) projectStatus!: ProjectStatus;
}

export class ClientCollectionRowDto {
  @ApiProperty() clientId!: string;
  @ApiProperty() clientName!: string;
  @ApiProperty() projectCount!: number;
  @ApiProperty() fixedProjectCount!: number;
  @ApiProperty() variableProjectCount!: number;
  @ApiPropertyOptional({ nullable: true, description: 'Fixed-amount projects only.' })
  totalProjectValue!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'All projects.' })
  totalReceived!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Variable projects only.' })
  variableReceived!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Fixed-amount projects only.' })
  totalDue!: string | null;
}

export class ProjectCollectionRowDto {
  @ApiProperty() clientId!: string;
  @ApiProperty() clientName!: string;
  @ApiProperty() projectId!: string;
  @ApiProperty() projectCode!: string;
  @ApiProperty() projectName!: string;
  @ApiProperty({ enum: ProjectStatus }) projectStatus!: ProjectStatus;
  @ApiProperty() hasProjectAmount!: boolean;
  @ApiPropertyOptional({ nullable: true }) projectAmount!: string | null;
  @ApiPropertyOptional({ nullable: true }) totalReceived!: string | null;
  @ApiPropertyOptional({ nullable: true }) dueAmount!: string | null;
}

export class PaymentReportRowDto {
  @ApiProperty() paymentId!: string;
  @ApiProperty() paymentDate!: string;
  @ApiProperty() clientName!: string;
  @ApiProperty() projectName!: string;
  @ApiPropertyOptional() receiptNumber!: string | null;
  @ApiPropertyOptional({ nullable: true }) amount!: string | null;
  @ApiProperty() paymentMethod!: string;
  @ApiProperty({ enum: PaymentStatus }) status!: PaymentStatus;
  @ApiPropertyOptional() transactionReference!: string | null;
  @ApiPropertyOptional() createdByName!: string | null;
}

export class MonthlyCollectionRowDto {
  @ApiProperty() month!: string;
  @ApiProperty() paymentCount!: number;
  @ApiProperty() receiptCount!: number;
  @ApiPropertyOptional({ nullable: true }) totalReceived!: string | null;
}

export class StatementProjectDto {
  @ApiProperty() projectId!: string;
  @ApiProperty() projectName!: string;
  @ApiProperty() hasProjectAmount!: boolean;
  @ApiPropertyOptional({ nullable: true }) projectAmount!: string | null;
  @ApiPropertyOptional({ nullable: true }) totalReceived!: string | null;
  @ApiPropertyOptional({ nullable: true }) dueAmount!: string | null;
  @ApiProperty({ type: [PaymentReportRowDto] }) payments!: PaymentReportRowDto[];
}

export class ClientStatementDto {
  @ApiProperty() clientId!: string;
  @ApiProperty() clientName!: string;
  @ApiProperty({ type: [StatementProjectDto] }) projects!: StatementProjectDto[];
  @ApiProperty() fixedProjectCount!: number;
  @ApiProperty() variableProjectCount!: number;
  @ApiPropertyOptional({ nullable: true, description: 'Fixed-amount projects only.' })
  totalProjectValue!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'All projects.' })
  totalReceived!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Variable projects only.' })
  variableReceived!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Fixed-amount projects only.' })
  totalDue!: string | null;
}

export class ProjectStatementDto {
  @ApiProperty() projectId!: string;
  @ApiProperty() projectName!: string;
  @ApiProperty() clientId!: string;
  @ApiProperty() clientName!: string;
  @ApiProperty() hasProjectAmount!: boolean;
  @ApiPropertyOptional({ nullable: true }) projectAmount!: string | null;
  @ApiPropertyOptional({ nullable: true }) totalReceived!: string | null;
  @ApiPropertyOptional({ nullable: true }) dueAmount!: string | null;
  @ApiProperty({ type: [PaymentReportRowDto] }) payments!: PaymentReportRowDto[];
}
