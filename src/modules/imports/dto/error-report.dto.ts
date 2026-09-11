import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { MAX_IMPORT_ROWS } from 'src/common/excel/import-file.util';

export class ErrorReportRowDto {
  @ApiProperty({ type: Object, description: 'Original cell values keyed by header' })
  @IsObject()
  data!: Record<string, string>;

  @ApiProperty({ example: 'Email: Invalid email address.' })
  @IsString()
  @MaxLength(2000)
  error!: string;
}

/**
 * Renders the failed rows the caller was just shown back into a workbook.
 *
 * The payload is the administrator's own upload echoed back, so it carries no
 * data they did not already have. It is still bounded and validated: this
 * endpoint writes a file from client-supplied strings and must not become a way
 * to make the server assemble an arbitrarily large workbook.
 */
export class ErrorReportRequestDto {
  @ApiProperty({ example: 'Clients' })
  @IsString()
  @MaxLength(120)
  label!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  headers!: string[];

  @ApiProperty({ type: [ErrorReportRowDto] })
  @IsArray()
  @ArrayMaxSize(MAX_IMPORT_ROWS)
  @ValidateNested({ each: true })
  @Type(() => ErrorReportRowDto)
  rows!: ErrorReportRowDto[];
}
