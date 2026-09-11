import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { MasterStatus, MasterType } from 'src/common/enums/master-type.enum';

export class CreateMasterItemDto {
  @ApiProperty({ example: 'Bank Transfer' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required.' })
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @ApiProperty({ example: 'BANK_TRANSFER', description: 'Uppercase A–Z, 0–9 and underscores' })
  @IsString()
  @IsNotEmpty({ message: 'Code is required.' })
  @MaxLength(64)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Code must contain only uppercase letters, numbers and underscores.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  description?: string;

  @ApiPropertyOptional({ enum: MasterStatus, default: MasterStatus.ACTIVE })
  @IsOptional()
  @IsEnum(MasterStatus)
  status?: MasterStatus;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? 0 : Number(value)))
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: Object, description: 'Type-specific extras, e.g. currency symbol' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/** `code` is intentionally omitted — see MastersService.update. */
export class UpdateMasterItemDto extends PartialType(CreateMasterItemDto) {}

export class QueryMasterItemDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: MasterStatus })
  @IsOptional()
  @IsEnum(MasterStatus)
  status?: MasterStatus;
}

export class MasterItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: MasterType }) type!: MasterType;
  @ApiProperty() name!: string;
  @ApiProperty() code!: string;
  @ApiPropertyOptional() description!: string | null;
  @ApiProperty({ enum: MasterStatus }) status!: MasterStatus;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() isSystem!: boolean;
  @ApiPropertyOptional({ type: Object }) metadata!: Record<string, unknown> | null;
  @ApiPropertyOptional() createdByName!: string | null;
  @ApiPropertyOptional() updatedByName!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

/** Trimmed shape used to populate dropdowns. */
export class MasterOptionDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() code!: string;
  @ApiPropertyOptional({ type: Object }) metadata!: Record<string, unknown> | null;
}
