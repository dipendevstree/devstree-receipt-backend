import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
}

/**
 * Server-side tabular export shared by every report. Called only after the
 * controller has already verified permission + financial unlock, so the rows
 * it receives are whatever the caller decided was safe to hand over.
 */
@Injectable()
export class ReportExportService {
  toCsv(columns: ExportColumn[], rows: Array<Record<string, unknown>>): string {
    const escape = (value: unknown): string => {
      const text = value === null || value === undefined ? '' : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const header = columns.map((column) => escape(column.header)).join(',');
    const lines = rows.map((row) => columns.map((column) => escape(row[column.key])).join(','));
    return [header, ...lines].join('\r\n');
  }

  async toExcel(
    sheetName: string,
    columns: ExportColumn[],
    rows: Array<Record<string, unknown>>,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Devstree Receipt System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(sheetName.slice(0, 31));
    sheet.columns = columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width ?? 20,
    }));
    sheet.getRow(1).font = { bold: true };
    sheet.addRows(rows);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
