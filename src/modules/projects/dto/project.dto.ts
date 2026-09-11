import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Validate,
} from 'class-validator';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PaginatedDateFilterQueryDto } from 'src/common/dto/date-filter.dto';
import { ProjectPaymentStatus, ProjectStatus } from 'src/common/enums/project-status.enum';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

/**
 * Project amount is OPTIONAL, so this accepts `null` as a first-class value —
 * that is how an existing amount is cleared and how a monthly/retainer project
 * is created. A blank string is normalised to null by the transform below, so
 * "left the field empty" and "explicitly cleared it" behave identically.
 */
@ValidatorConstraint({ name: 'isOptionalDecimalAmount', async: false })
class IsOptionalDecimalAmountConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    return typeof value === 'string' && /^\d{1,13}(\.\d{1,4})?$/.test(value) && Number(value) > 0;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a positive decimal amount such as "100000.00", or left blank for a project with no fixed amount.`;
  }
}

/** '' / '   ' → null (not defined); anything else is passed through for validation. */
const blankToNull = ({ value }: { value: unknown }) => {
  if (value === null) return null;
  if (typeof value !== 'string') return value;
  return value.trim() === '' ? null : value.trim();
};

export class CreateProjectDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4', { message: 'Select a valid client.' })
  clientId!: string;

  @ApiProperty({ example: 'Website Development' })
  @IsString()
  @IsNotEmpty({ message: 'Project name is required.' })
  @MaxLength(180)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  projectName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(trim)
  description?: string;

  @ApiPropertyOptional({
    example: '1000000.00',
    nullable: true,
    description:
      'Optional. Decimal string — never a float. Omit or send null for projects with no predefined amount (monthly retainers, variable engagements). Such projects accept any number of payments of any valid amount.',
  })
  @IsOptional()
  @Transform(blankToNull)
  @Validate(IsOptionalDecimalAmountConstraint)
  projectAmount?: string | null;

  @ApiPropertyOptional({ example: '2026-01-15' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ enum: ProjectStatus, default: ProjectStatus.DRAFT })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

export class QueryProjectDto extends PaginatedDateFilterQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  clientId?: string;

  @ApiPropertyOptional({
    description: 'true = only projects with a fixed amount, false = only variable projects',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? undefined : ['true', '1', 'yes', true].includes(value),
  )
  @IsBoolean()
  hasAmount?: boolean;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ enum: ProjectPaymentStatus })
  @IsOptional()
  @IsEnum(ProjectPaymentStatus)
  paymentStatus?: ProjectPaymentStatus;
}

export class ProjectResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() projectCode!: string;
  @ApiProperty() projectName!: string;
  @ApiPropertyOptional() description!: string | null;
  @ApiProperty() clientId!: string;
  @ApiProperty() clientName!: string;
  @ApiPropertyOptional() startDate!: string | null;
  @ApiProperty({ enum: ProjectStatus }) status!: ProjectStatus;
  @ApiProperty({ enum: ProjectPaymentStatus }) paymentStatus!: ProjectPaymentStatus;
  @ApiProperty() paymentCount!: number;
  @ApiProperty() financialLocked!: boolean;
  /**
   * Distinguishes "no fixed amount for this project" from "amount hidden
   * because the financial session is locked" — both send `projectAmount: null`,
   * and the UI must render them very differently ("Not Defined" vs "XXX").
   */
  @ApiProperty({ description: 'False for monthly/variable projects with no predefined amount' })
  hasProjectAmount!: boolean;
  @ApiPropertyOptional({ nullable: true }) projectAmount!: string | null;
  @ApiPropertyOptional({ nullable: true }) totalReceived!: string | null;
  @ApiPropertyOptional({
    nullable: true,
    description: 'Always null when hasProjectAmount is false — due is not applicable.',
  })
  dueAmount!: string | null;
  @ApiPropertyOptional({ nullable: true }) lastPaymentDate!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ProjectLookupQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search across project name and code' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Restrict to one client' })
  @IsOptional()
  @IsUUID('4')
  clientId?: string;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? 20 : Number(value)))
  limit?: number;
}

/** Dropdown row — intentionally carries no monetary value of any kind. */
export class ProjectLookupDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() projectCode!: string;
  @ApiProperty({ enum: ProjectStatus }) status!: ProjectStatus;
  @ApiProperty() clientId!: string;
  @ApiProperty() clientName!: string;
  @ApiProperty() hasProjectAmount!: boolean;
  @ApiPropertyOptional({ description: 'Set on the last row when more results exist' })
  hasMore?: boolean;
}
