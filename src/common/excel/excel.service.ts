import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ErrorCode } from '../constants/error-codes';
import { AppException } from '../exceptions/app.exception';
import {
  ImportColumn,
  ImportTemplateDefinition,
  normalizeHeader,
} from './import-template.interface';

/** One data row lifted out of a worksheet, with the sheet row number preserved. */
export interface ParsedRow {
  /** Excel row number as displayed to the user (header occupies row 1). */
  row: number;
  /** Coerced values keyed by ImportColumn.key. Blank cells are ''. */
  values: Record<string, string>;
  /** The same values keyed by header text — used for the preview and error export. */
  display: Record<string, string>;
}

export interface ParsedSheet {
  headers: string[];
  rows: ParsedRow[];
}

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F3A5F' },
};

/**
 * The single place Excel is generated and read in this system.
 *
 * Modules never touch ExcelJS directly: they describe their columns as an
 * ImportTemplateDefinition and this service produces the demo workbook, reads
 * uploads back, and renders the error report. Adding a column to a module means
 * editing one array, not three files.
 */
@Injectable()
export class ExcelService {
  /**
   * Demo workbook: a data sheet carrying the exact headers the importer expects
   * plus two example rows, and an instructions sheet describing every field.
   * Nothing here is read from the database, so a template can never leak real
   * client, payment or credential data.
   */
  async buildTemplate(definition: ImportTemplateDefinition): Promise<Buffer> {
    const workbook = this.newWorkbook();

    const sheet = workbook.addWorksheet(definition.sheetName.slice(0, 31));
    sheet.columns = definition.columns.map((column) => ({
      header: this.headerLabel(column),
      key: column.key,
      width: column.width ?? Math.max(16, this.headerLabel(column).length + 4),
    }));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = HEADER_FILL;
    headerRow.alignment = { vertical: 'middle' };
    headerRow.height = 22;

    sheet.addRow(this.exampleRow(definition.columns, 'example'));
    sheet.addRow(this.exampleRow(definition.columns, 'secondExample'));
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: definition.columns.length },
    };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    this.addInstructionsSheet(workbook, definition);

    return this.toBuffer(workbook);
  }

  /**
   * Reads an uploaded workbook against a template.
   *
   * Structural problems (unreadable file, empty sheet, missing required
   * headers) are rejected here as a whole-file failure — there is no useful
   * row-level report to produce when the shape itself is wrong.
   */
  async parse(buffer: Buffer, definition: ImportTemplateDefinition): Promise<ParsedSheet> {
    const workbook = new ExcelJS.Workbook();

    try {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    } catch {
      throw AppException.badRequest(
        ErrorCode.VALIDATION_FAILED,
        'This file could not be read as an Excel workbook. Re-save it as .xlsx and try again.',
      );
    }

    const sheet = workbook.worksheets.find((candidate) => candidate.rowCount > 0);
    if (!sheet) {
      throw AppException.badRequest(ErrorCode.VALIDATION_FAILED, 'The uploaded workbook is empty.');
    }

    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    const columnByIndex = new Map<number, ImportColumn>();
    const byNormalizedHeader = new Map(
      definition.columns.map((column) => [normalizeHeader(column.header), column]),
    );

    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = this.cellToString(cell.value).trim();
      headers[colNumber - 1] = text;
      const column = byNormalizedHeader.get(normalizeHeader(text));
      if (column) columnByIndex.set(colNumber, column);
    });

    const found = new Set([...columnByIndex.values()].map((column) => column.key));
    const missing = definition.columns
      .filter((column) => column.required && !found.has(column.key))
      .map((column) => column.header);

    if (missing.length > 0) {
      throw AppException.badRequest(
        ErrorCode.VALIDATION_FAILED,
        `The file is missing required column(s): ${missing.join(', ')}. Download the demo Excel for the expected format.`,
        { missingColumns: missing },
      );
    }

    const rows: ParsedRow[] = [];

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      const values: Record<string, string> = {};
      const display: Record<string, string> = {};
      let hasContent = false;

      for (const [colNumber, column] of columnByIndex) {
        const raw = this.cellToString(row.getCell(colNumber).value).trim();
        values[column.key] = raw;
        display[column.header] = raw;
        if (raw !== '') hasContent = true;
      }

      // Excel keeps formatting-only rows alive long after their content is gone;
      // importing them would create a run of empty records.
      if (hasContent) rows.push({ row: rowNumber, values, display });
    });

    if (rows.length === 0) {
      throw AppException.badRequest(
        ErrorCode.VALIDATION_FAILED,
        'The uploaded file contains headers but no data rows.',
      );
    }

    return { headers: headers.filter(Boolean), rows };
  }

  /**
   * Error report: the administrator's own rows, in their original columns, with
   * an Error column appended so the file can be corrected and re-uploaded.
   */
  async buildErrorReport(
    label: string,
    headers: string[],
    rows: Array<{ data: Record<string, string>; error: string }>,
  ): Promise<Buffer> {
    const workbook = this.newWorkbook();
    const sheet = workbook.addWorksheet('Errors');

    const columns = [...headers, 'Error'];
    sheet.columns = columns.map((header) => ({
      header,
      key: header,
      width: header === 'Error' ? 60 : Math.max(16, header.length + 4),
    }));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = HEADER_FILL;

    for (const entry of rows) {
      const record: Record<string, string> = {};
      for (const header of headers) record[header] = entry.data[header] ?? '';
      record.Error = entry.error;
      sheet.addRow(record);
    }

    sheet.getColumn('Error').font = { color: { argb: 'FFB00020' } };
    sheet.getColumn('Error').alignment = { wrapText: true, vertical: 'top' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const info = workbook.addWorksheet('About');
    info.columns = [{ header: 'Import Error Report', key: 'line', width: 100 }];
    info.getRow(1).font = { bold: true };
    for (const line of [
      `Module: ${label}`,
      'Each row below failed validation and was NOT imported.',
      'Fix the values described in the Error column, delete the Error column, and upload the file again.',
      'Rows that imported successfully are not listed here.',
    ]) {
      info.addRow({ line });
    }

    return this.toBuffer(workbook);
  }

  private addInstructionsSheet(
    workbook: ExcelJS.Workbook,
    definition: ImportTemplateDefinition,
  ): void {
    const sheet = workbook.addWorksheet('Instructions');
    sheet.columns = [
      { header: 'Column', key: 'column', width: 26 },
      { header: 'Required', key: 'required', width: 12 },
      { header: 'Type', key: 'type', width: 14 },
      { header: 'Format / Allowed Values', key: 'format', width: 46 },
      { header: 'Notes', key: 'notes', width: 62 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = HEADER_FILL;

    for (const column of definition.columns) {
      sheet.addRow({
        column: column.header,
        required: column.required ? 'Required' : 'Optional',
        type: column.type,
        format:
          column.allowedValues && column.allowedValues.length > 0
            ? column.allowedValues.join(', ')
            : (column.format ?? ''),
        notes: column.description ?? '',
      });
    }

    if (definition.notes?.length) {
      sheet.addRow({});
      const title = sheet.addRow({ column: 'Import rules' });
      title.font = { bold: true };
      for (const note of definition.notes) sheet.addRow({ column: '', required: '', notes: note });
    }

    sheet.getColumn('notes').alignment = { wrapText: true, vertical: 'top' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  private headerLabel(column: ImportColumn): string {
    return column.required ? `${column.header} *` : column.header;
  }

  private exampleRow(
    columns: ImportColumn[],
    field: 'example' | 'secondExample',
  ): Record<string, string> {
    const row: Record<string, string> = {};
    for (const column of columns) {
      row[column.key] = (field === 'example' ? column.example : column.secondExample) ?? '';
    }
    return row;
  }

  /**
   * Excel cells are not plain scalars — a cell can hold rich text, a hyperlink,
   * a formula with a cached result, a date, or an error. Everything is reduced
   * to the trimmed text the administrator sees, so downstream validation only
   * ever deals with strings.
   */
  private cellToString(value: ExcelJS.CellValue): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return this.formatDate(value);
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);

    if (typeof value === 'object') {
      const candidate = value as unknown as Record<string, unknown>;
      if ('text' in candidate && typeof candidate.text === 'string') return candidate.text;
      if ('richText' in candidate && Array.isArray(candidate.richText)) {
        return (candidate.richText as Array<{ text?: string }>)
          .map((part) => part.text ?? '')
          .join('');
      }
      if ('result' in candidate) return this.cellToString(candidate.result as ExcelJS.CellValue);
      if ('error' in candidate) return '';
      if ('hyperlink' in candidate && typeof candidate.hyperlink === 'string') {
        return candidate.hyperlink;
      }
    }

    return String(value);
  }

  /**
   * A date cell read by ExcelJS carries no timezone of its own — the workbook
   * stores a naive calendar date. Reading it back in UTC returns the day the
   * user typed; using local time would shift it by one for anyone west of GMT.
   */
  private formatDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private newWorkbook(): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Devstree Receipt System';
    workbook.created = new Date();
    return workbook;
  }

  private async toBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
