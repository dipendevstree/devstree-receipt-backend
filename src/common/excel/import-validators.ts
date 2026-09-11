import { ImportRowErrorDto } from './import-result.dto';

/**
 * Cell-level checks shared by every module importer.
 *
 * The rules mirror the DTO validators used by the normal create endpoints —
 * an Excel row must clear exactly the same bar as a form submission, so an
 * import can never introduce a record the UI would have refused.
 */
export class RowErrorCollector {
  private readonly errors: ImportRowErrorDto[] = [];

  add(field: string, error: string): void {
    this.errors.push({ row: 0, field, error });
  }

  get list(): ImportRowErrorDto[] {
    return this.errors;
  }

  get hasErrors(): boolean {
    return this.errors.length > 0;
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[0-9+\-\s()]{6,24}$/;
/** Same shape the payment/project DTOs accept: a positive decimal string. */
const DECIMAL_PATTERN = /^\d{1,13}(\.\d{1,4})?$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function requiredText(
  value: string,
  field: string,
  errors: RowErrorCollector,
  maxLength?: number,
): string | null {
  const text = value.trim();
  if (text === '') {
    errors.add(field, `${field} is required.`);
    return null;
  }
  if (maxLength && text.length > maxLength) {
    errors.add(field, `${field} must be ${maxLength} characters or fewer.`);
    return null;
  }
  return text;
}

export function optionalText(
  value: string,
  field: string,
  errors: RowErrorCollector,
  maxLength?: number,
): string | null {
  const text = value.trim();
  if (text === '') return null;
  if (maxLength && text.length > maxLength) {
    errors.add(field, `${field} must be ${maxLength} characters or fewer.`);
    return null;
  }
  return text;
}

export function optionalEmail(
  value: string,
  field: string,
  errors: RowErrorCollector,
): string | null {
  const text = value.trim().toLowerCase();
  if (text === '') return null;
  if (!EMAIL_PATTERN.test(text) || text.length > 180) {
    errors.add(field, `${field} is not a valid email address.`);
    return null;
  }
  return text;
}

export function optionalPhone(
  value: string,
  field: string,
  errors: RowErrorCollector,
): string | null {
  const text = value.trim();
  if (text === '') return null;
  if (!PHONE_PATTERN.test(text)) {
    errors.add(field, `${field} is not a valid phone number.`);
    return null;
  }
  return text;
}

/**
 * Returns a canonical decimal string, never a float — the money layer parses
 * decimal strings and a binary float would round the amount before it was ever
 * encrypted.
 *
 * `undefined` means the cell was blank (which is a legitimate value for an
 * optional amount); `null` means the value was present but invalid.
 */
export function decimalAmount(
  value: string,
  field: string,
  errors: RowErrorCollector,
  options: { required: boolean },
): string | null | undefined {
  const text = value.trim().replace(/,/g, '');

  if (text === '') {
    if (options.required) {
      errors.add(field, `${field} is required.`);
      return null;
    }
    return undefined;
  }

  // Excel hands a plain number cell back as "25000" or "25000.5"; both are fine.
  if (!DECIMAL_PATTERN.test(text)) {
    errors.add(field, `${field} must be a positive amount such as 25000.00.`);
    return null;
  }
  if (Number(text) <= 0) {
    errors.add(field, `${field} must be greater than zero.`);
    return null;
  }
  return text;
}

/**
 * Accepts an ISO date (what a text cell and our template use) or a real Excel
 * date cell, which the parser has already reduced to ISO. Anything ambiguous
 * — 03/04/2026 could be March or April — is refused rather than guessed.
 */
export function isoDate(
  value: string,
  field: string,
  errors: RowErrorCollector,
  options: { required: boolean },
): string | null | undefined {
  const text = value.trim();

  if (text === '') {
    if (options.required) {
      errors.add(field, `${field} is required.`);
      return null;
    }
    return undefined;
  }

  if (!ISO_DATE_PATTERN.test(text)) {
    errors.add(field, `${field} must use the YYYY-MM-DD format (for example 2026-09-10).`);
    return null;
  }

  const parsed = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
    errors.add(field, `${field} is not a real calendar date.`);
    return null;
  }

  return text;
}

export function optionalInteger(
  value: string,
  field: string,
  errors: RowErrorCollector,
  options: { min?: number; max?: number } = {},
): number | undefined {
  const text = value.trim();
  if (text === '') return undefined;

  if (!/^-?\d+$/.test(text)) {
    errors.add(field, `${field} must be a whole number.`);
    return undefined;
  }

  const parsed = Number(text);
  if (options.min !== undefined && parsed < options.min) {
    errors.add(field, `${field} must be ${options.min} or greater.`);
    return undefined;
  }
  if (options.max !== undefined && parsed > options.max) {
    errors.add(field, `${field} must be ${options.max} or less.`);
    return undefined;
  }
  return parsed;
}

/**
 * Resolves a cell to one of a fixed set of codes, accepting either the stored
 * code (ACTIVE, BANK_TRANSFER) or the label an administrator would recognise
 * ("Active", "Bank Transfer").
 */
export function enumValue<T extends string>(
  value: string,
  field: string,
  errors: RowErrorCollector,
  allowed: readonly T[],
  options: { required: boolean; fallback?: T },
): T | undefined {
  const text = value.trim();
  if (text === '') {
    if (options.required) {
      errors.add(field, `${field} is required.`);
      return undefined;
    }
    return options.fallback;
  }

  const normalized = text.toUpperCase().replace(/[\s-]+/g, '_');
  const match = allowed.find((candidate) => candidate.toUpperCase() === normalized);

  if (!match) {
    errors.add(field, `${field} must be one of: ${allowed.join(', ')}.`);
    return undefined;
  }
  return match;
}
