import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * One row, one field, one reason. Row numbers are the Excel row numbers the
 * administrator sees in the spreadsheet (header is row 1), so an error can be
 * acted on without counting.
 */
export class ImportRowErrorDto {
  @ApiProperty({ example: 5 }) row!: number;
  @ApiProperty({ example: 'Email' }) field!: string;
  @ApiProperty({ example: 'Invalid email address.' }) error!: string;
}

export type ImportRowStatus = 'VALID' | 'INVALID' | 'DUPLICATE';

export class ImportPreviewRowDto {
  @ApiProperty({ example: 2 }) row!: number;
  @ApiProperty({ enum: ['VALID', 'INVALID', 'DUPLICATE'] }) status!: ImportRowStatus;
  /** Cell values keyed by header, exactly as read from the sheet. */
  @ApiProperty({ type: Object }) data!: Record<string, string>;
  @ApiProperty({ type: [ImportRowErrorDto] }) errors!: ImportRowErrorDto[];
}

export class ImportSummaryDto {
  @ApiProperty({ example: 100 }) totalRows!: number;
  @ApiProperty({ example: 92 }) validRows!: number;
  @ApiProperty({ example: 5 }) invalidRows!: number;
  @ApiProperty({ example: 3 }) duplicateRows!: number;
}

export class ImportValidationResultDto extends ImportSummaryDto {
  @ApiProperty({ example: 'clients' }) module!: string;
  @ApiProperty({ example: 'Clients' }) label!: string;
  /** Header row as found in the uploaded file, in order. */
  @ApiProperty({ type: [String] }) headers!: string[];
  @ApiProperty({ type: [ImportPreviewRowDto] }) rows!: ImportPreviewRowDto[];
  @ApiProperty({ type: [ImportRowErrorDto] }) errors!: ImportRowErrorDto[];
  @ApiProperty({
    description: 'True when every row passed validation and the file can be imported as a whole.',
  })
  importable!: boolean;
}

export class ImportResultDto extends ImportValidationResultDto {
  @ApiProperty({ example: 92 }) importedRows!: number;
  @ApiProperty({ example: 8 }) failedRows!: number;
  @ApiProperty({
    example: false,
    description: 'True when invalid rows were skipped and only the valid ones were written.',
  })
  partial!: boolean;
  @ApiPropertyOptional({ example: 'Imported 92 of 100 rows.' }) message?: string;
}
