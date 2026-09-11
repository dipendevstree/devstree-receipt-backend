import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { ImportMode } from './base-import.service';
import { MAX_IMPORT_FILE_BYTES } from './import-file.util';

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Uploads are held in memory and never written to disk: an import sheet is
 * business data, and a temp file would outlive the request that was authorised
 * to read it. The size cap is enforced by multer here and re-checked in
 * assertValidImportFile.
 */
export const ImportUpload = () =>
  applyDecorators(
    UseInterceptors(
      FileInterceptor('file', {
        storage: memoryStorage(),
        limits: { fileSize: MAX_IMPORT_FILE_BYTES, files: 1 },
      }),
    ),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['file'],
        properties: {
          file: { type: 'string', format: 'binary', description: '.xlsx workbook' },
          mode: {
            type: 'string',
            enum: ['ALL_OR_NOTHING', 'VALID_ROWS_ONLY'],
            description:
              'ALL_OR_NOTHING (default) imports nothing unless every row is valid. Ignored by modules that must import atomically.',
          },
        },
      },
    }),
  );

export class ImportOptionsDto {
  @ApiPropertyOptional({ enum: ['ALL_OR_NOTHING', 'VALID_ROWS_ONLY'] })
  @IsOptional()
  @IsIn(['ALL_OR_NOTHING', 'VALID_ROWS_ONLY'])
  mode?: ImportMode;
}

/** Streams a generated workbook as a download. Used by template and error-report routes. */
export function sendWorkbook(res: Response, buffer: Buffer, fileName: string): void {
  res.setHeader('Content-Type', XLSX_CONTENT_TYPE);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', buffer.length);
  res.end(buffer);
}
