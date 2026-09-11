import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from './pagination.dto';
import { DatePreset, DateRange, resolveDateRange } from '../utils/date-range.util';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

/**
 * Mixin-style base for every query DTO that filters by date. Endpoints inherit
 * `datePreset` + `dateFrom`/`dateTo` and call `resolveRange()` — no module
 * re-implements "This Month".
 */
export class DateFilterQueryDto {
  @ApiPropertyOptional({
    enum: DatePreset,
    description: 'Named window. `custom` uses dateFrom/dateTo; `all_time` applies no bound.',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(DatePreset)
  datePreset?: DatePreset;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  dateTo?: string;

  resolveRange(): DateRange {
    return resolveDateRange({
      preset: this.datePreset,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
    });
  }
}

/** Paginated list query that also carries the standard date filter. */
export class PaginatedDateFilterQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DatePreset })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(DatePreset)
  datePreset?: DatePreset;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  dateTo?: string;

  resolveRange(): DateRange {
    return resolveDateRange({
      preset: this.datePreset,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
    });
  }
}
