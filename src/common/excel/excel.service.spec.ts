import * as ExcelJS from 'exceljs';
import { AppException } from '../exceptions/app.exception';
import { ExcelService } from './excel.service';
import { ImportTemplateDefinition } from './import-template.interface';

const DEFINITION: ImportTemplateDefinition = {
  module: 'widgets',
  label: 'Widgets',
  sheetName: 'Widgets',
  fileName: 'widgets-template',
  notes: ['Widgets are not real.'],
  columns: [
    { key: 'name', header: 'Name', required: true, type: 'string', example: 'Alpha' },
    { key: 'amount', header: 'Amount', required: false, type: 'decimal', example: '100' },
    { key: 'dueDate', header: 'Due Date', required: false, type: 'date', example: '2026-01-15' },
  ],
};

/** Builds an .xlsx in memory so parsing is exercised against a real workbook. */
async function workbook(rows: unknown[][]): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Sheet1');
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await book.xlsx.writeBuffer());
}

describe('ExcelService', () => {
  const service = new ExcelService();

  describe('buildTemplate', () => {
    it('writes the declared headers, marks required columns and adds an instructions sheet', async () => {
      const buffer = await service.buildTemplate(DEFINITION);

      const book = new ExcelJS.Workbook();
      await book.xlsx.load(buffer as unknown as ArrayBuffer);

      const sheet = book.getWorksheet('Widgets')!;
      expect(sheet.getRow(1).values).toEqual([undefined, 'Name *', 'Amount', 'Due Date']);
      expect(sheet.getRow(2).getCell(1).value).toBe('Alpha');
      expect(book.getWorksheet('Instructions')).toBeDefined();
    });

    it('round-trips through parse — a downloaded template is a valid upload', async () => {
      const template = await service.buildTemplate(DEFINITION);
      const parsed = await service.parse(template, DEFINITION);

      expect(parsed.rows[0].values.name).toBe('Alpha');
      expect(parsed.rows[0].display['Name *']).toBeUndefined();
      expect(parsed.rows[0].display.Name).toBe('Alpha');
    });
  });

  describe('parse', () => {
    it('matches headers regardless of case, spacing and the required marker', async () => {
      const buffer = await workbook([
        ['  name  ', 'AMOUNT', 'due_date'],
        ['Beta', '250', '2026-02-01'],
      ]);

      const parsed = await service.parse(buffer, DEFINITION);
      expect(parsed.rows).toHaveLength(1);
      expect(parsed.rows[0].values).toEqual({
        name: 'Beta',
        amount: '250',
        dueDate: '2026-02-01',
      });
    });

    it('reports the Excel row number so an error points at the right line', async () => {
      const buffer = await workbook([
        ['Name', 'Amount', 'Due Date'],
        ['One', '1', ''],
        ['Two', '2', ''],
      ]);

      const parsed = await service.parse(buffer, DEFINITION);
      expect(parsed.rows.map((row) => row.row)).toEqual([2, 3]);
    });

    it('skips rows whose cells are all blank rather than importing empty records', async () => {
      const buffer = await workbook([
        ['Name', 'Amount', 'Due Date'],
        ['One', '1', ''],
        ['', '', ''],
        ['Two', '2', ''],
      ]);

      const parsed = await service.parse(buffer, DEFINITION);
      expect(parsed.rows.map((row) => row.values.name)).toEqual(['One', 'Two']);
    });

    it('renders a real date cell as an ISO date in the workbook’s own calendar day', async () => {
      const book = new ExcelJS.Workbook();
      const sheet = book.addWorksheet('Sheet1');
      sheet.addRow(['Name', 'Amount', 'Due Date']);
      sheet.addRow(['Dated', '10', new Date(Date.UTC(2026, 8, 10))]);
      const buffer = Buffer.from(await book.xlsx.writeBuffer());

      const parsed = await service.parse(buffer, DEFINITION);
      expect(parsed.rows[0].values.dueDate).toBe('2026-09-10');
    });

    it('reads a numeric cell as its plain text, not as a float', async () => {
      const buffer = await workbook([
        ['Name', 'Amount', 'Due Date'],
        ['Numeric', 25000.5, ''],
      ]);

      const parsed = await service.parse(buffer, DEFINITION);
      expect(parsed.rows[0].values.amount).toBe('25000.5');
    });

    it('rejects a file that is missing a required column', async () => {
      const buffer = await workbook([
        ['Amount', 'Due Date'],
        ['1', ''],
      ]);

      await expect(service.parse(buffer, DEFINITION)).rejects.toBeInstanceOf(AppException);
      await expect(service.parse(buffer, DEFINITION)).rejects.toThrow(/Name/);
    });

    it('rejects a header-only file', async () => {
      const buffer = await workbook([['Name', 'Amount', 'Due Date']]);
      await expect(service.parse(buffer, DEFINITION)).rejects.toThrow(/no data rows/i);
    });

    it('rejects a file that is not a workbook at all', async () => {
      await expect(
        service.parse(Buffer.from('this is not a spreadsheet'), DEFINITION),
      ).rejects.toThrow(/could not be read/i);
    });
  });

  describe('buildErrorReport', () => {
    it('keeps the original columns and appends an Error column', async () => {
      const buffer = await service.buildErrorReport(
        'Widgets',
        ['Name', 'Amount'],
        [{ data: { Name: 'Bad', Amount: 'x' }, error: 'Amount: not a number.' }],
      );

      const book = new ExcelJS.Workbook();
      await book.xlsx.load(buffer as unknown as ArrayBuffer);
      const sheet = book.getWorksheet('Errors')!;

      expect(sheet.getRow(1).values).toEqual([undefined, 'Name', 'Amount', 'Error']);
      expect(sheet.getRow(2).values).toEqual([undefined, 'Bad', 'x', 'Amount: not a number.']);
    });
  });
});
