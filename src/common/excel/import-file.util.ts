import { ErrorCode } from '../constants/error-codes';
import { AppException } from '../exceptions/app.exception';

/** 5 MB is far beyond any realistic bulk sheet and keeps a parse bounded in memory. */
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;

/** Guard against a workbook that would hold a transaction open for minutes. */
export const MAX_IMPORT_ROWS = 2000;

export const ACCEPTED_IMPORT_EXTENSIONS = ['.xlsx', '.xls'] as const;

/**
 * `.xlsx` is the only format ExcelJS can read reliably; legacy `.xls` is the
 * OLE2 binary format and is not supported by the parser, so it is rejected up
 * front with an explanation rather than failing later as a corrupt file.
 */
export const ACCEPTED_IMPORT_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'application/octet-stream',
] as const;

export interface UploadedImportFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Frontend checks are a convenience; this is the authoritative gate. It runs
 * before a single cell is read, so an oversized or wrong-typed upload never
 * reaches the parser.
 */
export function assertValidImportFile(file: UploadedImportFile | undefined): UploadedImportFile {
  if (!file || !file.buffer || file.size === 0) {
    throw AppException.badRequest(
      ErrorCode.VALIDATION_FAILED,
      'Select an Excel file (.xlsx) to import.',
    );
  }

  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw AppException.badRequest(
      ErrorCode.VALIDATION_FAILED,
      `The file is larger than the ${Math.round(MAX_IMPORT_FILE_BYTES / (1024 * 1024))} MB limit.`,
    );
  }

  const name = (file.originalname ?? '').toLowerCase();
  const extension = name.slice(name.lastIndexOf('.'));

  if (extension === '.xls') {
    throw AppException.badRequest(
      ErrorCode.VALIDATION_FAILED,
      'The legacy .xls format is not supported. Open the file in Excel and save it as .xlsx.',
    );
  }

  if (extension !== '.xlsx') {
    throw AppException.badRequest(ErrorCode.VALIDATION_FAILED, 'Only .xlsx files can be imported.');
  }

  // An .xlsx is a ZIP container; anything else with the extension is not one.
  const signature = file.buffer.subarray(0, 2).toString('ascii');
  if (signature !== 'PK') {
    throw AppException.badRequest(
      ErrorCode.VALIDATION_FAILED,
      'This file is not a valid .xlsx workbook. It may be corrupted or renamed from another format.',
    );
  }

  return file;
}
