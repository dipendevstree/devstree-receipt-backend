/**
 * Declarative description of a module's Excel import contract.
 *
 * One definition drives three things that must never drift apart: the demo
 * workbook an administrator downloads, the header validation applied to an
 * upload, and the per-cell coercion performed before business validation. A
 * module therefore describes its columns once, here, instead of restating them
 * in a generator, a parser and a validator.
 */

export type ImportColumnType = 'string' | 'integer' | 'decimal' | 'date' | 'enum';

export interface ImportColumn {
  /** Canonical field name used by the module's row validator. */
  key: string;
  /** Header text written to (and expected in) the first sheet row. */
  header: string;
  required: boolean;
  type: ImportColumnType;
  /** Value written to the first demo row. Never real customer data. */
  example: string;
  /** Value for the second demo row — shows a variation (blank, other status…). */
  secondExample?: string;
  /** Shown on the Instructions sheet. Explains the rule, not just the type. */
  description?: string;
  /**
   * Reference/dropdown values printed on the Instructions sheet. Left undefined
   * for columns resolved dynamically against the database (client, project…),
   * which the module's validator handles instead.
   */
  allowedValues?: string[];
  maxLength?: number;
  /** Human-readable format hint, e.g. 'YYYY-MM-DD'. */
  format?: string;
  width?: number;
}

export interface ImportTemplateDefinition {
  /** Slug used in routes, audit entries and file names, e.g. 'clients'. */
  module: string;
  /** Display label, e.g. 'Clients'. */
  label: string;
  sheetName: string;
  /** Base file name without extension. */
  fileName: string;
  /** Rules an administrator needs before filling the sheet in. */
  notes?: string[];
  columns: ImportColumn[];
}

/** Normalises a header cell so 'Client Name *', 'client name' and 'CLIENT_NAME' all match. */
export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/[^a-z0-9]/g, '');
}
