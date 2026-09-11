import { Logger } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';
import { AuditAction, AuditModule } from '../enums/audit-action.enum';
import { AppException } from '../exceptions/app.exception';
import { AuthenticatedUser, RequestContext } from '../interfaces/authenticated-user.interface';
import { AuditLogService } from 'src/modules/audit-logs/audit-log.service';
import { ExcelService, ParsedRow } from './excel.service';
import {
  ImportPreviewRowDto,
  ImportResultDto,
  ImportRowErrorDto,
  ImportRowStatus,
  ImportValidationResultDto,
} from './import-result.dto';
import { ImportTemplateDefinition } from './import-template.interface';
import { MAX_IMPORT_ROWS, UploadedImportFile, assertValidImportFile } from './import-file.util';

/** What a module's row validator returns for a single sheet row. */
export interface RowValidation<TPrepared> {
  errors: ImportRowErrorDto[];
  /** Set when the row collides with an existing record or an earlier row. */
  duplicate?: boolean;
  /** Present only when the row is valid — the payload handed to persist(). */
  prepared?: TPrepared;
}

export interface PreparedRow<TPrepared> {
  row: number;
  data: TPrepared;
  display: Record<string, string>;
}

/**
 * Per-file state. `claim` is how a module detects duplicates *within* the
 * uploaded sheet: two rows carrying the same client email are a duplicate even
 * though neither exists in the database yet.
 */
export class ImportRun<TPrepared> {
  readonly accepted: PreparedRow<TPrepared>[] = [];
  private readonly buckets = new Map<string, Set<string>>();

  /** Returns false when an earlier row in this file already claimed the value. */
  claim(bucket: string, value: string): boolean {
    const key = value.trim().toLowerCase();
    if (key === '') return true;

    let seen = this.buckets.get(bucket);
    if (!seen) {
      seen = new Set<string>();
      this.buckets.set(bucket, seen);
    }
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }
}

export type ImportMode = 'ALL_OR_NOTHING' | 'VALID_ROWS_ONLY';

/**
 * Shared Excel import pipeline: validate the file, parse it, validate every row,
 * then either write the whole file or nothing.
 *
 * The default is all-or-nothing because a half-applied import of financial data
 * is worse than no import at all. A module may allow VALID_ROWS_ONLY for
 * reference data where each row stands alone; `allowsPartialImport` is where a
 * module makes that call explicitly rather than by accident.
 *
 * Nothing here decrypts, hashes or logs a value: rows carry only what the
 * administrator typed into the sheet.
 */
export abstract class BaseImportService<TPrepared> {
  protected readonly logger = new Logger(this.constructor.name);

  protected constructor(
    protected readonly excel: ExcelService,
    protected readonly auditLog: AuditLogService,
  ) {}

  protected abstract get definition(): ImportTemplateDefinition;
  protected abstract get auditModule(): AuditModule;

  /** Reference data can be imported row by row; money cannot. */
  protected get allowsPartialImport(): boolean {
    return true;
  }

  /**
   * Validates one row and resolves its references. Implementations must not
   * write anything — validate() calls this without persisting.
   */
  protected abstract prepareRow(
    values: Record<string, string>,
    run: ImportRun<TPrepared>,
    parsed: ParsedRow,
  ): Promise<RowValidation<TPrepared>>;

  /**
   * Writes every prepared row. Implementations own the transaction so the whole
   * batch commits or rolls back together.
   */
  protected abstract persist(
    rows: PreparedRow<TPrepared>[],
    actor: AuthenticatedUser,
    context: RequestContext,
  ): Promise<number>;

  /** Optional per-file warm-up, e.g. loading the master lists a sheet references. */
  protected async beforeRows(_rows: ParsedRow[]): Promise<void> {
    return;
  }

  buildTemplate(): Promise<Buffer> {
    return this.excel.buildTemplate(this.definition);
  }

  get templateFileName(): string {
    return `${this.definition.fileName}.xlsx`;
  }

  get moduleLabel(): string {
    return this.definition.label;
  }

  /** Dry run: parses and validates without touching the database. */
  async validate(file: UploadedImportFile | undefined): Promise<ImportValidationResultDto> {
    const { result } = await this.analyse(file);
    return result;
  }

  async import(
    file: UploadedImportFile | undefined,
    actor: AuthenticatedUser,
    context: RequestContext,
    mode: ImportMode = 'ALL_OR_NOTHING',
  ): Promise<ImportResultDto> {
    const { result, run } = await this.analyse(file);
    const effectiveMode = this.allowsPartialImport ? mode : 'ALL_OR_NOTHING';
    const rejected = result.invalidRows + result.duplicateRows;

    await this.auditLog.record({
      action: AuditAction.IMPORT_STARTED,
      module: this.auditModule,
      recordId: this.definition.module,
      description: `Excel import started for ${this.definition.label} (${result.totalRows} rows)`,
      newValue: {
        module: this.definition.module,
        mode: effectiveMode,
        totalRows: result.totalRows,
        validRows: result.validRows,
        invalidRows: result.invalidRows,
        duplicateRows: result.duplicateRows,
      },
      actor,
      context,
    });

    if (rejected > 0 && effectiveMode === 'ALL_OR_NOTHING') {
      await this.auditLog.record({
        action: AuditAction.IMPORT_FAILED,
        module: this.auditModule,
        recordId: this.definition.module,
        description: `Excel import rejected for ${this.definition.label}: ${rejected} of ${result.totalRows} rows failed validation`,
        newValue: {
          module: this.definition.module,
          totalRows: result.totalRows,
          failedRows: rejected,
        },
        actor,
        context,
      });

      return {
        ...result,
        importedRows: 0,
        failedRows: rejected,
        partial: false,
        message: this.allowsPartialImport
          ? `${rejected} of ${result.totalRows} rows failed validation, so nothing was imported. Fix the errors, or choose to import the valid rows only.`
          : `${rejected} of ${result.totalRows} rows failed validation. ${this.definition.label} must import as a whole, so nothing was imported.`,
      };
    }

    let imported = 0;
    try {
      imported = run.accepted.length === 0 ? 0 : await this.persist(run.accepted, actor, context);
    } catch (error) {
      await this.auditLog.record({
        action: AuditAction.IMPORT_FAILED,
        module: this.auditModule,
        recordId: this.definition.module,
        description: `Excel import failed for ${this.definition.label}`,
        newValue: {
          module: this.definition.module,
          totalRows: result.totalRows,
          // The message is a business-rule failure, never a value from the sheet.
          reason: error instanceof AppException ? error.code : 'INTERNAL_ERROR',
        },
        actor,
        context,
      });
      throw error;
    }

    await this.auditLog.record({
      action: AuditAction.IMPORT_COMPLETED,
      module: this.auditModule,
      recordId: this.definition.module,
      description: `Excel import completed for ${this.definition.label}: ${imported} of ${result.totalRows} rows imported`,
      newValue: {
        module: this.definition.module,
        mode: effectiveMode,
        totalRows: result.totalRows,
        importedRows: imported,
        failedRows: rejected,
      },
      actor,
      context,
    });

    return {
      ...result,
      importedRows: imported,
      failedRows: rejected,
      partial: rejected > 0,
      message:
        rejected > 0
          ? `Imported ${imported} of ${result.totalRows} rows. ${rejected} row(s) were not imported — download the error report to correct them.`
          : `Imported all ${imported} row(s) successfully.`,
    };
  }

  /** Parse + per-row validation, shared by validate() and import(). */
  private async analyse(file: UploadedImportFile | undefined): Promise<{
    result: ImportValidationResultDto;
    run: ImportRun<TPrepared>;
  }> {
    const upload = assertValidImportFile(file);
    const sheet = await this.excel.parse(upload.buffer, this.definition);

    if (sheet.rows.length > MAX_IMPORT_ROWS) {
      throw AppException.badRequest(
        ErrorCode.VALIDATION_FAILED,
        `This file has ${sheet.rows.length} rows. Import at most ${MAX_IMPORT_ROWS} rows at a time.`,
      );
    }

    await this.beforeRows(sheet.rows);

    const run = new ImportRun<TPrepared>();
    const preview: ImportPreviewRowDto[] = [];
    const errors: ImportRowErrorDto[] = [];
    let valid = 0;
    let invalid = 0;
    let duplicate = 0;

    for (const parsed of sheet.rows) {
      const validation = await this.prepareRow(parsed.values, run, parsed);
      const rowErrors = validation.errors.map((error) => ({ ...error, row: parsed.row }));

      let status: ImportRowStatus = 'VALID';
      if (rowErrors.length > 0) {
        status = validation.duplicate ? 'DUPLICATE' : 'INVALID';
        if (validation.duplicate) duplicate += 1;
        else invalid += 1;
        errors.push(...rowErrors);
      } else if (validation.prepared !== undefined) {
        valid += 1;
        run.accepted.push({
          row: parsed.row,
          data: validation.prepared,
          display: parsed.display,
        });
      } else {
        // A validator returning neither errors nor a payload is a programming
        // error; failing the row is safer than silently dropping it.
        status = 'INVALID';
        invalid += 1;
        const failure = { row: parsed.row, field: '—', error: 'Row could not be prepared.' };
        rowErrors.push(failure);
        errors.push(failure);
      }

      preview.push({ row: parsed.row, status, data: parsed.display, errors: rowErrors });
    }

    return {
      run,
      result: {
        module: this.definition.module,
        label: this.definition.label,
        headers: sheet.headers,
        totalRows: sheet.rows.length,
        validRows: valid,
        invalidRows: invalid,
        duplicateRows: duplicate,
        rows: preview,
        errors,
        importable: invalid === 0 && duplicate === 0,
      },
    };
  }
}
