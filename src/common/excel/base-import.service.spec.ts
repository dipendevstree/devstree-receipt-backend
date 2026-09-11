import * as ExcelJS from 'exceljs';
import { AuditAction, AuditModule } from '../enums/audit-action.enum';
import { AuthenticatedUser, RequestContext } from '../interfaces/authenticated-user.interface';
import { AuditLogService } from 'src/modules/audit-logs/audit-log.service';
import { BaseImportService, ImportRun, PreparedRow, RowValidation } from './base-import.service';
import { ExcelService } from './excel.service';
import { ImportTemplateDefinition } from './import-template.interface';
import { UploadedImportFile } from './import-file.util';

const DEFINITION: ImportTemplateDefinition = {
  module: 'widgets',
  label: 'Widgets',
  sheetName: 'Widgets',
  fileName: 'widgets',
  columns: [
    { key: 'code', header: 'Code', required: true, type: 'string', example: 'A1' },
    { key: 'name', header: 'Name', required: true, type: 'string', example: 'Alpha' },
  ],
};

interface Widget {
  code: string;
  name: string;
}

/**
 * A minimal importer standing in for a real module: a row is valid when it has
 * both cells, and a code repeated inside the file is a duplicate.
 */
class TestImportService extends BaseImportService<Widget> {
  readonly persisted: PreparedRow<Widget>[] = [];
  partialAllowed = true;
  persistShouldThrow = false;

  constructor(excel: ExcelService, auditLog: AuditLogService) {
    super(excel, auditLog);
  }

  protected get definition(): ImportTemplateDefinition {
    return DEFINITION;
  }

  protected get auditModule(): AuditModule {
    return AuditModule.MASTERS;
  }

  protected get allowsPartialImport(): boolean {
    return this.partialAllowed;
  }

  protected async prepareRow(
    values: Record<string, string>,
    run: ImportRun<Widget>,
  ): Promise<RowValidation<Widget>> {
    if (!values.name) {
      return { errors: [{ row: 0, field: 'Name', error: 'Name is required.' }] };
    }
    if (!run.claim('code', values.code)) {
      return {
        duplicate: true,
        errors: [{ row: 0, field: 'Code', error: 'Duplicate code in file.' }],
      };
    }
    return { errors: [], prepared: { code: values.code, name: values.name } };
  }

  protected async persist(rows: PreparedRow<Widget>[]): Promise<number> {
    if (this.persistShouldThrow) throw new Error('database exploded');
    this.persisted.push(...rows);
    return rows.length;
  }
}

async function upload(rows: string[][]): Promise<UploadedImportFile> {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Sheet1');
  sheet.addRow(['Code', 'Name']);
  for (const row of rows) sheet.addRow(row);
  const buffer = Buffer.from(await book.xlsx.writeBuffer());

  return {
    originalname: 'widgets.xlsx',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: buffer.length,
    buffer,
  };
}

const ACTOR: AuthenticatedUser = {
  id: 'user-1',
  name: 'Test Admin',
  email: 'admin@example.com',
  phone: null,
  roleId: 'role-1',
  roleName: 'ADMIN',
  permissions: [],
  tokenId: 'token-1',
};

const CONTEXT: RequestContext = { ipAddress: '127.0.0.1', userAgent: 'jest' };

describe('BaseImportService', () => {
  let service: TestImportService;
  let auditLog: { record: jest.Mock };

  const MIXED = [
    ['A1', 'Alpha'],
    ['A2', ''], // invalid
    ['A1', 'Alpha again'], // duplicate
    ['A3', 'Gamma'],
  ];

  const actionsRecorded = (): AuditAction[] =>
    auditLog.record.mock.calls.map((call) => (call[0] as { action: AuditAction }).action);

  beforeEach(() => {
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };
    service = new TestImportService(new ExcelService(), auditLog as unknown as AuditLogService);
  });

  describe('validate', () => {
    it('classifies every row and writes nothing', async () => {
      const result = await service.validate(await upload(MIXED));

      expect(result).toMatchObject({
        module: 'widgets',
        totalRows: 4,
        validRows: 2,
        invalidRows: 1,
        duplicateRows: 1,
        importable: false,
      });
      expect(result.rows.map((row) => row.status)).toEqual([
        'VALID',
        'INVALID',
        'DUPLICATE',
        'VALID',
      ]);
      expect(service.persisted).toHaveLength(0);
      expect(auditLog.record).not.toHaveBeenCalled();
    });

    it('anchors each error to the row number shown in Excel', async () => {
      const result = await service.validate(await upload(MIXED));
      expect(result.errors.map((error) => error.row)).toEqual([3, 4]);
    });

    it('marks a wholly valid file as importable', async () => {
      const result = await service.validate(await upload([['A1', 'Alpha']]));
      expect(result.importable).toBe(true);
    });
  });

  describe('import', () => {
    it('writes nothing when any row fails and the mode is all-or-nothing', async () => {
      const result = await service.import(await upload(MIXED), ACTOR, CONTEXT);

      expect(result.importedRows).toBe(0);
      expect(result.failedRows).toBe(2);
      expect(result.partial).toBe(false);
      expect(service.persisted).toHaveLength(0);
      expect(actionsRecorded()).toEqual([AuditAction.IMPORT_STARTED, AuditAction.IMPORT_FAILED]);
    });

    it('writes only the valid rows when partial import is requested', async () => {
      const result = await service.import(await upload(MIXED), ACTOR, CONTEXT, 'VALID_ROWS_ONLY');

      expect(result.importedRows).toBe(2);
      expect(result.failedRows).toBe(2);
      expect(result.partial).toBe(true);
      expect(service.persisted.map((row) => row.data.code)).toEqual(['A1', 'A3']);
      // Failed rows are reported, never silently dropped.
      expect(result.rows.filter((row) => row.status !== 'VALID')).toHaveLength(2);
      expect(actionsRecorded()).toEqual([AuditAction.IMPORT_STARTED, AuditAction.IMPORT_COMPLETED]);
    });

    it('ignores a partial-import request from a module that forbids it', async () => {
      service.partialAllowed = false;

      const result = await service.import(await upload(MIXED), ACTOR, CONTEXT, 'VALID_ROWS_ONLY');

      expect(result.importedRows).toBe(0);
      expect(service.persisted).toHaveLength(0);
      expect(result.message).toMatch(/as a whole/i);
    });

    it('imports a clean file and reports the counts', async () => {
      const result = await service.import(
        await upload([
          ['A1', 'Alpha'],
          ['A2', 'Beta'],
        ]),
        ACTOR,
        CONTEXT,
      );

      expect(result).toMatchObject({ importedRows: 2, failedRows: 0, partial: false });
      expect(actionsRecorded()).toEqual([AuditAction.IMPORT_STARTED, AuditAction.IMPORT_COMPLETED]);
    });

    it('records the authenticated actor on every audit entry', async () => {
      await service.import(await upload([['A1', 'Alpha']]), ACTOR, CONTEXT);

      for (const call of auditLog.record.mock.calls) {
        expect(call[0]).toMatchObject({ actor: ACTOR, context: CONTEXT });
      }
    });

    it('records a failure and rethrows when persistence fails', async () => {
      service.persistShouldThrow = true;

      await expect(service.import(await upload([['A1', 'Alpha']]), ACTOR, CONTEXT)).rejects.toThrow(
        'database exploded',
      );

      expect(actionsRecorded()).toEqual([AuditAction.IMPORT_STARTED, AuditAction.IMPORT_FAILED]);
    });

    it('rejects a file that is not an .xlsx before parsing it', async () => {
      const file = await upload([['A1', 'Alpha']]);
      await expect(
        service.import({ ...file, originalname: 'widgets.csv' }, ACTOR, CONTEXT),
      ).rejects.toThrow(/Only \.xlsx/);
      expect(auditLog.record).not.toHaveBeenCalled();
    });

    it('rejects a missing file', async () => {
      await expect(service.import(undefined, ACTOR, CONTEXT)).rejects.toThrow(/Select an Excel/);
    });
  });
});
