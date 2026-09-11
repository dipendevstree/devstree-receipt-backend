import * as ExcelJS from 'exceljs';
import { ExcelService } from 'src/common/excel/excel.service';
import { UploadedImportFile } from 'src/common/excel/import-file.util';
import { ProjectStatus } from 'src/common/enums/project-status.enum';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { ProjectsImportService } from './projects-import.service';

const HEADERS = ['Client', 'Project Name', 'Description', 'Project Amount', 'Start Date', 'Status'];

async function upload(rows: Array<Array<string | number>>): Promise<UploadedImportFile> {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Projects');
  sheet.addRow(HEADERS);
  for (const row of rows) sheet.addRow(row);
  const buffer = Buffer.from(await book.xlsx.writeBuffer());
  return {
    originalname: 'projects.xlsx',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: buffer.length,
    buffer,
  };
}

const CLIENT = { id: 'c1', name: 'John Doe', clientCode: 'CLI-0001' };

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

describe('ProjectsImportService', () => {
  let service: ProjectsImportService;
  let existingProject: unknown;
  let references: { resolveClient: jest.Mock };
  let projectsService: { createWithin: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let auditLog: { record: jest.Mock };

  beforeEach(() => {
    existingProject = null;

    const builder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockImplementation(async () => existingProject),
    };

    references = {
      resolveClient: jest.fn(async (raw: string) =>
        raw.trim() === CLIENT.name
          ? { ok: true, value: CLIENT }
          : { ok: false, error: `Client "${raw}" was not found.` },
      ),
    };
    projectsService = {
      createWithin: jest.fn(async (_manager, dto) => ({
        id: 'p1',
        projectName: dto.projectName,
        clientId: dto.clientId,
        status: dto.status,
        hasProjectAmount: () => dto.projectAmount !== undefined && dto.projectAmount !== null,
      })),
    };
    dataSource = {
      transaction: jest.fn(async (callback: (manager: unknown) => Promise<number>) =>
        callback({} as unknown),
      ),
    };
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };

    service = new ProjectsImportService(
      new ExcelService(),
      auditLog as never,
      { createQueryBuilder: jest.fn(() => builder) } as never,
      references as never,
      projectsService as never,
      dataSource as never,
    );
  });

  it('treats a blank Project Amount as "no fixed amount", never as zero', async () => {
    await service.import(
      await upload([[CLIENT.name, 'Retainer', '', '', '', 'ACTIVE']]),
      ACTOR,
      CONTEXT,
    );

    const [, dto] = projectsService.createWithin.mock.calls[0];
    expect(dto.projectAmount).toBeUndefined();
    expect(dto.projectAmount).not.toBe('0');
    expect(dto.projectAmount).not.toBe(0);
    expect(dto.projectAmount).not.toBeNull();
  });

  it('does not make Project Amount mandatory', async () => {
    const result = await service.validate(
      await upload([[CLIENT.name, 'Retainer', '', '', '', '']]),
    );

    expect(result).toMatchObject({ validRows: 1, invalidRows: 0, importable: true });
  });

  it('passes a supplied amount through as a decimal string', async () => {
    await service.import(
      await upload([[CLIENT.name, 'Fixed Site', '', '50000.50', '', 'ACTIVE']]),
      ACTOR,
      CONTEXT,
    );

    const [, dto] = projectsService.createWithin.mock.calls[0];
    expect(dto.projectAmount).toBe('50000.50');
  });

  it('rejects a non-positive amount rather than storing it', async () => {
    const result = await service.validate(await upload([[CLIENT.name, 'Bad', '', '-100', '', '']]));

    expect(result.invalidRows).toBe(1);
    expect(result.errors[0].field).toBe('Project Amount');
  });

  it('defaults the status to DRAFT when the cell is blank', async () => {
    await service.import(
      await upload([[CLIENT.name, 'No Status', '', '', '', '']]),
      ACTOR,
      CONTEXT,
    );

    const [, dto] = projectsService.createWithin.mock.calls[0];
    expect(dto.status).toBe(ProjectStatus.DRAFT);
  });

  it('reports an unknown client instead of creating one', async () => {
    const result = await service.validate(
      await upload([['Ghost Ltd', 'Anything', '', '', '', '']]),
    );

    expect(result.invalidRows).toBe(1);
    expect(result.errors[0].error).toMatch(/was not found/);
  });

  it('does not accept the removed Expected End Date or Notes columns as data', async () => {
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet('Projects');
    sheet.addRow([...HEADERS, 'Expected End Date', 'Notes']);
    sheet.addRow([CLIENT.name, 'Legacy Sheet', '', '', '', 'ACTIVE', '2026-12-31', 'old note']);
    const buffer = Buffer.from(await book.xlsx.writeBuffer());

    await service.import(
      { originalname: 'p.xlsx', mimetype: 'x', size: buffer.length, buffer },
      ACTOR,
      CONTEXT,
    );

    const [, dto] = projectsService.createWithin.mock.calls[0];
    expect(dto).not.toHaveProperty('expectedEndDate');
    expect(dto).not.toHaveProperty('notes');
  });

  it('flags a project name repeated for the same client in the file', async () => {
    const result = await service.validate(
      await upload([
        [CLIENT.name, 'Website', '', '', '', ''],
        [CLIENT.name, 'website', '', '', '', ''],
      ]),
    );

    expect(result.duplicateRows).toBe(1);
    expect(result.errors[0].error).toMatch(/more than once/);
  });

  it('flags a project the client already has', async () => {
    existingProject = { projectCode: 'PRJ-0002' };

    const result = await service.validate(await upload([[CLIENT.name, 'Website', '', '', '', '']]));

    expect(result.duplicateRows).toBe(1);
    expect(result.errors[0].error).toMatch(/PRJ-0002/);
  });

  it('writes the batch on a single transaction', async () => {
    await service.import(
      await upload([
        [CLIENT.name, 'One', '', '1000', '', ''],
        [CLIENT.name, 'Two', '', '', '', ''],
      ]),
      ACTOR,
      CONTEXT,
    );

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(projectsService.createWithin).toHaveBeenCalledTimes(2);
  });

  it('keeps the project amount out of the audit trail', async () => {
    await service.import(
      await upload([[CLIENT.name, 'One', '', '123456', '', '']]),
      ACTOR,
      CONTEXT,
    );

    for (const call of auditLog.record.mock.calls) {
      expect(JSON.stringify(call[0])).not.toContain('123456');
    }
  });
});
