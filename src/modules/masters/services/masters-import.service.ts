import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import {
  BaseImportService,
  ImportRun,
  PreparedRow,
  RowValidation,
} from 'src/common/excel/base-import.service';
import { ExcelService } from 'src/common/excel/excel.service';
import { ImportTemplateDefinition } from 'src/common/excel/import-template.interface';
import {
  RowErrorCollector,
  enumValue,
  optionalInteger,
  optionalText,
  requiredText,
} from 'src/common/excel/import-validators';
import { AuditAction, AuditModule } from 'src/common/enums/audit-action.enum';
import {
  MASTER_SLUG_BY_TYPE,
  MASTER_TYPE_LABELS,
  MasterStatus,
  MasterType,
} from 'src/common/enums/master-type.enum';
import {
  AuthenticatedUser,
  RequestContext,
} from 'src/common/interfaces/authenticated-user.interface';
import { AuditLogService } from 'src/modules/audit-logs/audit-log.service';
import { MasterItem } from '../entities/master-item.entity';

interface PreparedMaster {
  name: string;
  code: string;
  description: string | null;
  status: MasterStatus;
  sortOrder: number;
}

/** Per-type example values, so the Currencies template does not suggest a country. */
const EXAMPLES: Record<MasterType, { first: [string, string]; second: [string, string] }> = {
  [MasterType.COUNTRY]: { first: ['India', 'IN'], second: ['Singapore', 'SG'] },
  [MasterType.CURRENCY]: { first: ['Indian Rupee', 'INR'], second: ['US Dollar', 'USD'] },
  [MasterType.PAYMENT_METHOD]: {
    first: ['Bank Transfer', 'BANK_TRANSFER'],
    second: ['Cheque', 'CHEQUE'],
  },
  [MasterType.PROJECT_STATUS]: { first: ['Active', 'ACTIVE'], second: ['On Hold', 'ON_HOLD'] },
  [MasterType.PAYMENT_STATUS]: { first: ['Valid', 'VALID'], second: ['Voided', 'VOIDED'] },
  [MasterType.RECEIPT_STATUS]: {
    first: ['Generated', 'GENERATED'],
    second: ['Cancelled', 'CANCELLED'],
  },
  [MasterType.CLIENT_STATUS]: { first: ['Active', 'ACTIVE'], second: ['Inactive', 'INACTIVE'] },
};

function buildTemplate(type: MasterType): ImportTemplateDefinition {
  const label = MASTER_TYPE_LABELS[type];
  const slug = MASTER_SLUG_BY_TYPE[type];
  const example = EXAMPLES[type];

  return {
    module: `masters/${slug}`,
    label,
    sheetName: label.slice(0, 31),
    fileName: `devstree-${slug}-import-template`,
    notes: [
      'Code is the stable identifier other records point at. It cannot be changed after import.',
      'Codes must be unique within this collection. Rows whose code already exists are reported as duplicates and are not imported.',
      'Imported records are never marked as system records, so they can be edited or deleted afterwards.',
      'Statuses and payment methods that the application understands are seeded already — importing a new code here adds a label, it does not teach the application a new behaviour.',
    ],
    columns: [
      {
        key: 'name',
        header: 'Name',
        required: true,
        type: 'string',
        example: example.first[0],
        secondExample: example.second[0],
        maxLength: 120,
        description: 'Label shown in dropdowns and on screen.',
        width: 28,
      },
      {
        key: 'code',
        header: 'Code',
        required: true,
        type: 'string',
        example: example.first[1],
        secondExample: example.second[1],
        maxLength: 64,
        format: 'Uppercase A–Z, 0–9 and underscores',
        description: 'Unique within this collection. Referenced by other records.',
        width: 22,
      },
      {
        key: 'description',
        header: 'Description',
        required: false,
        type: 'string',
        example: '',
        secondExample: '',
        maxLength: 255,
        width: 34,
      },
      {
        key: 'status',
        header: 'Status',
        required: false,
        type: 'enum',
        example: 'ACTIVE',
        secondExample: 'ACTIVE',
        allowedValues: Object.values(MasterStatus),
        description: 'Defaults to ACTIVE. Inactive records stay linked but leave the dropdowns.',
        width: 14,
      },
      {
        key: 'sortOrder',
        header: 'Sort Order',
        required: false,
        type: 'integer',
        example: '10',
        secondExample: '20',
        format: 'Whole number, 0 or greater',
        description: 'Controls dropdown ordering. Defaults to 0.',
        width: 14,
      },
    ],
  };
}

/**
 * Import for one master collection.
 *
 * `metadata` is deliberately not importable: it is free-form JSON whose shape
 * differs per collection (currency symbol and precision, country dial code),
 * and a flat spreadsheet column cannot express it safely. Imported rows get
 * `metadata: null` and can be completed in the master editor.
 */
class MasterTypeImportService extends BaseImportService<PreparedMaster> {
  private readonly template: ImportTemplateDefinition;

  constructor(
    private readonly type: MasterType,
    excel: ExcelService,
    auditLog: AuditLogService,
    private readonly masters: Repository<MasterItem>,
    private readonly dataSource: DataSource,
  ) {
    super(excel, auditLog);
    this.template = buildTemplate(type);
  }

  protected get definition(): ImportTemplateDefinition {
    return this.template;
  }

  protected get auditModule(): AuditModule {
    return AuditModule.MASTERS;
  }

  protected async prepareRow(
    values: Record<string, string>,
    run: ImportRun<PreparedMaster>,
  ): Promise<RowValidation<PreparedMaster>> {
    const errors = new RowErrorCollector();

    const name = requiredText(values.name ?? '', 'Name', errors, 120);
    const description = optionalText(values.description ?? '', 'Description', errors, 255);
    const status = enumValue(values.status ?? '', 'Status', errors, Object.values(MasterStatus), {
      required: false,
      fallback: MasterStatus.ACTIVE,
    });
    const sortOrder = optionalInteger(values.sortOrder ?? '', 'Sort Order', errors, { min: 0 });

    const rawCode = (values.code ?? '').trim().toUpperCase();
    let code: string | null = null;
    if (rawCode === '') {
      errors.add('Code', 'Code is required.');
    } else if (rawCode.length > 64) {
      errors.add('Code', 'Code must be 64 characters or fewer.');
    } else if (!/^[A-Z0-9_]+$/.test(rawCode)) {
      errors.add('Code', 'Code must contain only uppercase letters, numbers and underscores.');
    } else {
      code = rawCode;
    }

    if (errors.hasErrors || !name || !code) return { errors: errors.list };

    if (!run.claim('code', code)) {
      return {
        duplicate: true,
        errors: [
          { row: 0, field: 'Code', error: `Code "${code}" appears more than once in this file.` },
        ],
      };
    }

    const existing = await this.masters.findOne({
      where: { type: this.type, code, deletedAt: IsNull() },
    });
    if (existing) {
      return {
        duplicate: true,
        errors: [
          {
            row: 0,
            field: 'Code',
            error: `A record with code "${code}" already exists in ${MASTER_TYPE_LABELS[this.type]} ("${existing.name}").`,
          },
        ],
      };
    }

    return {
      errors: [],
      prepared: {
        name,
        code,
        description: description ?? null,
        status: status ?? MasterStatus.ACTIVE,
        sortOrder: sortOrder ?? 0,
      },
    };
  }

  protected async persist(
    rows: PreparedRow<PreparedMaster>[],
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(MasterItem);

      for (const row of rows) {
        const saved = await repository.save(
          repository.create({
            type: this.type,
            ...row.data,
            metadata: null,
            // Only the seed marks records as system-owned; an import never can.
            isSystem: false,
            createdBy: actor.id,
            updatedBy: actor.id,
          }),
        );

        await this.auditLog.record(
          {
            action: AuditAction.MASTER_CREATED,
            module: AuditModule.MASTERS,
            recordId: saved.id,
            description: `Imported ${this.type} master "${saved.name}" (${saved.code}) from Excel (row ${row.row})`,
            newValue: {
              type: this.type,
              name: saved.name,
              code: saved.code,
              status: saved.status,
              source: 'EXCEL_IMPORT',
            },
            actor,
            context,
          },
          manager,
        );
      }
      return rows.length;
    });
  }
}

/**
 * Masters are one table discriminated by `type`, so one importer is built per
 * collection on demand rather than registering six near-identical providers.
 */
@Injectable()
export class MastersImportService {
  private readonly cache = new Map<MasterType, MasterTypeImportService>();

  constructor(
    private readonly excel: ExcelService,
    private readonly auditLog: AuditLogService,
    @InjectRepository(MasterItem) private readonly masters: Repository<MasterItem>,
    private readonly dataSource: DataSource,
  ) {}

  forType(type: MasterType): BaseImportService<PreparedMaster> {
    let importer = this.cache.get(type);
    if (!importer) {
      importer = new MasterTypeImportService(
        type,
        this.excel,
        this.auditLog,
        this.masters,
        this.dataSource,
      );
      this.cache.set(type, importer);
    }
    return importer;
  }
}
