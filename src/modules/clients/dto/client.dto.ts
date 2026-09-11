import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { ClientStatus } from 'src/common/enums/client-status.enum';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

/** Trims but keeps an all-whitespace name as '' so IsNotEmpty rejects it. */
const trimName = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const NAME_REQUIRED = 'Client name is required.';

export class CreateClientDto {
  @ApiProperty({ example: 'ABC Pvt Ltd' })
  // Decorators register bottom-up and errors are reported in registration
  // order, so IsNotEmpty sits lowest: a missing or null name reports "required"
  // first rather than a length error that makes no sense for an absent value.
  @MaxLength(160, { message: 'Client name must be 160 characters or fewer.' })
  @IsString({ message: NAME_REQUIRED })
  @IsNotEmpty({ message: NAME_REQUIRED })
  @Transform(trimName)
  name!: string;

  @ApiPropertyOptional({ example: 'accounts@abc.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(180)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || undefined : value,
  )
  email?: string | null;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]{6,24}$/, { message: 'Enter a valid phone number.' })
  @Transform(trim)
  phone?: string | null;

  @ApiPropertyOptional({
    example: 'India',
    description: 'Must match an active country under Masters → Countries (name or code).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(trim)
  country?: string | null;

  @ApiPropertyOptional({ enum: ClientStatus, default: ClientStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;
}

/**
 * Every field is optional on update, and an optional email, phone or country
 * may be sent as `null` to clear it. The name is the exception: it may be
 * omitted, but if it is sent it must be a real value — `IsOptional` alone would
 * wave `null` through and reach the NOT NULL column as a 500.
 */
export class UpdateClientDto extends PartialType(OmitType(CreateClientDto, ['name'] as const)) {
  @ApiPropertyOptional({ example: 'ABC Pvt Ltd' })
  @ValidateIf((_, value) => value !== undefined)
  // Decorators register bottom-up and errors are reported in registration
  // order, so IsNotEmpty sits lowest: a missing or null name reports "required"
  // first rather than a length error that makes no sense for an absent value.
  @MaxLength(160, { message: 'Client name must be 160 characters or fewer.' })
  @IsString({ message: NAME_REQUIRED })
  @IsNotEmpty({ message: NAME_REQUIRED })
  @Transform(trimName)
  name?: string;
}

export class QueryClientDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ClientStatus })
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;
}

/**
 * Financial fields are `null` whenever the caller's financial session is locked.
 * The real figure is never transmitted alongside a "locked" flag.
 */
export class ClientResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() clientCode!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() email!: string | null;
  @ApiPropertyOptional() phone!: string | null;
  @ApiPropertyOptional() country!: string | null;
  @ApiProperty({ enum: ClientStatus }) status!: ClientStatus;
  @ApiPropertyOptional({ description: 'Administrator who created this client' })
  createdByName!: string | null;
  @ApiPropertyOptional({ description: 'Administrator who last updated this client' })
  updatedByName!: string | null;
  @ApiProperty() projectCount!: number;
  @ApiProperty({ description: 'Projects with a defined project amount' })
  fixedProjectCount!: number;
  @ApiProperty({ description: 'Projects with no defined amount (monthly/retainer style)' })
  variableProjectCount!: number;
  @ApiProperty({ example: true }) financialLocked!: boolean;
  @ApiPropertyOptional({
    example: '1000000.00',
    nullable: true,
    description: 'Sum over fixed-amount projects only. Variable projects contribute nothing.',
  })
  totalProjectValue!: string | null;
  @ApiPropertyOptional({
    example: '600000.00',
    nullable: true,
    description: 'Everything collected, across both fixed and variable projects.',
  })
  totalReceived!: string | null;
  @ApiPropertyOptional({
    example: '215000.00',
    nullable: true,
    description: 'Collected against variable projects — has no due counterpart by definition.',
  })
  variableReceived!: string | null;
  @ApiPropertyOptional({
    example: '400000.00',
    nullable: true,
    description:
      'Outstanding on fixed-amount projects only. Variable projects are never counted as due.',
  })
  totalDue!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ClientLookupQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search across name, code and email' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? 20 : Number(value)))
  limit?: number;

  @ApiPropertyOptional({
    default: false,
    description: 'Filter dropdowns need inactive clients too; entry forms do not.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === '' ? false : ['true', '1', 'yes', true].includes(value),
  )
  includeInactive?: boolean;
}

/** Dropdown row — no financial data of any kind. */
export class ClientLookupDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() clientCode!: string;
  @ApiProperty({ enum: ClientStatus }) status!: ClientStatus;
  @ApiPropertyOptional({ description: 'Set on the last row when more results exist' })
  hasMore?: boolean;
}
