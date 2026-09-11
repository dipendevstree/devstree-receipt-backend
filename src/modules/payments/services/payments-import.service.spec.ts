import * as ExcelJS from 'exceljs';
import { ExcelService } from 'src/common/excel/excel.service';
import { UploadedImportFile } from 'src/common/excel/import-file.util';
import { PaymentMethod } from 'src/common/enums/payment.enum';
import { ProjectStatus } from 'src/common/enums/project-status.enum';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { Money } from 'src/common/utils/money.util';
import { PaymentsImportService } from './payments-import.service';

const HEADERS = [
  'Client',
  'Project',
  'Payment Amount',
  'Payment Date',
  'Payment Method',
  'Transaction Reference',
  'Bank Account',
  'Notes',
];

async function upload(rows: Array<Array<string | number>>): Promise<UploadedImportFile> {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Payments');
  sheet.addRow(HEADERS);
  for (const row of rows) sheet.addRow(row);
  const buffer = Buffer.from(await book.xlsx.writeBuffer());
  return {
    originalname: 'payments.xlsx',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: buffer.length,
    buffer,
  };
}

const CLIENT = { id: 'c1', name: 'John Doe', clientCode: 'CLI-0001' };

/** A fixed-amount project with `due` remaining, or a variable project when due is null. */
function project(id: string, due: string | null, status = ProjectStatus.ACTIVE) {
  return {
    id,
    projectCode: `PRJ-${id}`,
    projectName: id,
    status,
    __due: due,
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

describe('PaymentsImportService', () => {
  let service: PaymentsImportService;
  let payments: { findOne: jest.Mock };
  let references: {
    resolveClient: jest.Mock;
    resolveProject: jest.Mock;
    resolvePaymentMethod: jest.Mock;
    resetCaches: jest.Mock;
  };
  let financials: { totalsForProject: jest.Mock };
  let paymentsService: { createWithin: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let auditLog: { record: jest.Mock };
  let projects: Map<string, ReturnType<typeof project>>;

  beforeEach(() => {
    projects = new Map([
      ['Fixed', project('Fixed', '100000.00')],
      ['Retainer', project('Retainer', null)],
      ['Draft', project('Draft', '5000.00', ProjectStatus.DRAFT)],
    ]);

    payments = { findOne: jest.fn().mockResolvedValue(null) };
    references = {
      resolveClient: jest.fn(async (raw: string) =>
        raw.trim() === CLIENT.name
          ? { ok: true, value: CLIENT }
          : { ok: false, error: 'Client not found.' },
      ),
      resolveProject: jest.fn(async (raw: string) => {
        const found = projects.get(raw.trim());
        return found ? { ok: true, value: found } : { ok: false, error: 'Project not found.' };
      }),
      resolvePaymentMethod: jest.fn(async (raw: string) => {
        const normalized = raw
          .trim()
          .toUpperCase()
          .replace(/[\s-]+/g, '_');
        return Object.values(PaymentMethod).includes(normalized as PaymentMethod)
          ? { ok: true, value: normalized as PaymentMethod }
          : { ok: false, error: 'Payment Method is not recognised.' };
      }),
      resetCaches: jest.fn(),
    };
    financials = {
      totalsForProject: jest.fn(async (target: { __due: string | null }) => ({
        // A variable project has no ceiling — due is null, never zero.
        dueAmount: target.__due === null ? null : Money.fromDecimalString(target.__due),
      })),
    };
    paymentsService = { createWithin: jest.fn().mockResolvedValue('payment-id') };
    dataSource = {
      transaction: jest.fn(async (callback: (manager: unknown) => Promise<number>) =>
        callback({} as unknown),
      ),
    };
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };

    service = new PaymentsImportService(
      new ExcelService(),
      auditLog as never,
      payments as never,
      references as never,
      financials as never,
      paymentsService as never,
      dataSource as never,
    );
  });

  const errorsFor = (result: { errors: Array<{ row: number; field: string; error: string }> }) =>
    result.errors.map((entry) => `${entry.row}:${entry.field}`);

  it('accepts a clean sheet', async () => {
    const result = await service.validate(
      await upload([
        [CLIENT.name, 'Fixed', '40000', '2026-09-01', 'Bank Transfer', 'TXN-1', '', ''],
        [CLIENT.name, 'Fixed', '60000', '2026-09-02', 'UPI', 'TXN-2', '', ''],
      ]),
    );

    expect(result).toMatchObject({ totalRows: 2, validRows: 2, importable: true });
  });

  it('projects the due ceiling across rows of the same file', async () => {
    // 40k + 40k fits inside 100k; the third 40k must fail even though each row
    // is individually affordable against the stored total.
    const result = await service.validate(
      await upload([
        [CLIENT.name, 'Fixed', '40000', '2026-09-01', 'Cash', 'TXN-1', '', ''],
        [CLIENT.name, 'Fixed', '40000', '2026-09-02', 'Cash', 'TXN-2', '', ''],
        [CLIENT.name, 'Fixed', '40000', '2026-09-03', 'Cash', 'TXN-3', '', ''],
      ]),
    );

    expect(result.validRows).toBe(2);
    expect(errorsFor(result)).toEqual(['4:Payment Amount']);
    expect(result.errors[0].error).toMatch(/20000\.00 remaining/);
  });

  it('applies no ceiling to a project with no defined amount', async () => {
    // The whole point: a null due is "not applicable", not "zero remaining".
    const result = await service.validate(
      await upload([
        [CLIENT.name, 'Retainer', '25000', '2026-09-01', 'Cheque', 'TXN-1', '', ''],
        [CLIENT.name, 'Retainer', '99000000', '2026-09-02', 'Cash', 'TXN-2', '', ''],
      ]),
    );

    expect(result.validRows).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects payments against a project that cannot accept them', async () => {
    const result = await service.validate(
      await upload([[CLIENT.name, 'Draft', '1000', '2026-09-01', 'Cash', 'TXN-1', '', '']]),
    );

    expect(result.invalidRows).toBe(1);
    expect(result.errors[0].error).toMatch(/draft and cannot accept payments/i);
  });

  it('reports an unresolved client, project, method and date together', async () => {
    const result = await service.validate(
      await upload([['Ghost', 'Nope', '', 'yesterday', 'Pigeon', '', '', '']]),
    );

    expect(errorsFor(result)).toEqual(
      expect.arrayContaining([
        '2:Payment Amount',
        '2:Payment Date',
        '2:Payment Method',
        '2:Client',
      ]),
    );
  });

  it('flags a transaction reference repeated inside the file', async () => {
    const result = await service.validate(
      await upload([
        [CLIENT.name, 'Retainer', '1000', '2026-09-01', 'Cash', 'TXN-SAME', '', ''],
        [CLIENT.name, 'Retainer', '2000', '2026-09-02', 'Cash', 'TXN-SAME', '', ''],
      ]),
    );

    expect(result.duplicateRows).toBe(1);
    expect(result.errors[0].error).toMatch(/more than once in this file/);
  });

  it('flags a transaction reference that already exists in the database', async () => {
    payments.findOne.mockResolvedValue({ id: 'p1', receipt: { receiptNumber: 'REC-000001' } });

    const result = await service.validate(
      await upload([[CLIENT.name, 'Retainer', '1000', '2026-09-01', 'Cash', 'TXN-OLD', '', '']]),
    );

    expect(result.duplicateRows).toBe(1);
    expect(result.errors[0].error).toMatch(/REC-000001/);
  });

  it('never writes a partial file, even when partial import is requested', async () => {
    const result = await service.import(
      await upload([
        [CLIENT.name, 'Retainer', '1000', '2026-09-01', 'Cash', 'TXN-1', '', ''],
        ['Ghost', 'Retainer', '1000', '2026-09-02', 'Cash', 'TXN-2', '', ''],
      ]),
      ACTOR,
      CONTEXT,
      'VALID_ROWS_ONLY',
    );

    expect(result.importedRows).toBe(0);
    expect(paymentsService.createWithin).not.toHaveBeenCalled();
    expect(result.message).toMatch(/as a whole/i);
  });

  it('writes the whole sheet on one transaction, through the normal payment path', async () => {
    const result = await service.import(
      await upload([
        [CLIENT.name, 'Fixed', '40000', '2026-09-01', 'Bank Transfer', 'TXN-1', '', ''],
        [CLIENT.name, 'Retainer', '25000', '2026-09-02', 'Cash', 'TXN-2', '', ''],
      ]),
      ACTOR,
      CONTEXT,
    );

    expect(result.importedRows).toBe(2);
    // One transaction for the batch, and every row goes through the service that
    // takes the project lock, encrypts the amount and allocates a receipt number.
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(paymentsService.createWithin).toHaveBeenCalledTimes(2);
    expect(paymentsService.createWithin).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ clientId: 'c1', projectId: 'Fixed', amount: '40000' }),
      ACTOR,
      CONTEXT,
    );
  });

  it('keeps no amount in the audit trail', async () => {
    await service.import(
      await upload([[CLIENT.name, 'Retainer', '25000', '2026-09-02', 'Cash', 'TXN-2', '', '']]),
      ACTOR,
      CONTEXT,
    );

    for (const call of auditLog.record.mock.calls) {
      expect(JSON.stringify(call[0])).not.toContain('25000');
    }
  });
});
