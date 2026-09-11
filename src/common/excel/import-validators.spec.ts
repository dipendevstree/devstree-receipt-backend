import {
  RowErrorCollector,
  decimalAmount,
  enumValue,
  isoDate,
  optionalEmail,
  optionalInteger,
  optionalPhone,
  optionalText,
  requiredText,
} from './import-validators';

describe('import validators', () => {
  let errors: RowErrorCollector;

  beforeEach(() => {
    errors = new RowErrorCollector();
  });

  describe('decimalAmount', () => {
    it('distinguishes "blank" from "invalid" for an optional amount', () => {
      // undefined = the cell was empty, which for an optional amount is a
      // legitimate value meaning "no amount defined" — never zero.
      expect(decimalAmount('', 'Project Amount', errors, { required: false })).toBeUndefined();
      expect(errors.hasErrors).toBe(false);

      expect(decimalAmount('abc', 'Project Amount', errors, { required: false })).toBeNull();
      expect(errors.hasErrors).toBe(true);
    });

    it('never coerces a blank optional amount to zero', () => {
      const result = decimalAmount('   ', 'Project Amount', errors, { required: false });
      expect(result).toBeUndefined();
      expect(result).not.toBe('0');
      expect(result).not.toBe(0);
    });

    it('requires a value when the column is mandatory', () => {
      expect(decimalAmount('', 'Payment Amount', errors, { required: true })).toBeNull();
      expect(errors.list[0].error).toMatch(/required/i);
    });

    it('accepts plain and thousand-separated decimals', () => {
      expect(decimalAmount('25000', 'Amount', errors, { required: true })).toBe('25000');
      expect(decimalAmount('25000.50', 'Amount', errors, { required: true })).toBe('25000.50');
      expect(decimalAmount('1,25,000', 'Amount', errors, { required: true })).toBe('125000');
      expect(errors.hasErrors).toBe(false);
    });

    it('rejects zero and negative amounts', () => {
      expect(decimalAmount('0', 'Amount', errors, { required: true })).toBeNull();
      expect(decimalAmount('-5', 'Amount', errors, { required: true })).toBeNull();
      expect(errors.list).toHaveLength(2);
    });
  });

  describe('isoDate', () => {
    it('accepts an ISO date', () => {
      expect(isoDate('2026-09-10', 'Payment Date', errors, { required: true })).toBe('2026-09-10');
      expect(errors.hasErrors).toBe(false);
    });

    it('refuses an ambiguous format rather than guessing the month', () => {
      expect(isoDate('03/04/2026', 'Payment Date', errors, { required: true })).toBeNull();
      expect(errors.list[0].error).toMatch(/YYYY-MM-DD/);
    });

    it('refuses a date that does not exist', () => {
      expect(isoDate('2026-02-30', 'Payment Date', errors, { required: true })).toBeNull();
      expect(errors.list[0].error).toMatch(/real calendar date/i);
    });

    it('treats a blank optional date as absent', () => {
      expect(isoDate('', 'Start Date', errors, { required: false })).toBeUndefined();
      expect(errors.hasErrors).toBe(false);
    });
  });

  describe('enumValue', () => {
    const allowed = ['ACTIVE', 'ON_HOLD'] as const;

    it('accepts the stored code and the human label alike', () => {
      expect(enumValue('ACTIVE', 'Status', errors, allowed, { required: false })).toBe('ACTIVE');
      expect(enumValue('on hold', 'Status', errors, allowed, { required: false })).toBe('ON_HOLD');
      expect(enumValue('On-Hold', 'Status', errors, allowed, { required: false })).toBe('ON_HOLD');
      expect(errors.hasErrors).toBe(false);
    });

    it('falls back when the cell is blank and the column is optional', () => {
      expect(
        enumValue('', 'Status', errors, allowed, { required: false, fallback: 'ACTIVE' }),
      ).toBe('ACTIVE');
    });

    it('lists the allowed values when the cell does not match', () => {
      expect(enumValue('WHATEVER', 'Status', errors, allowed, { required: false })).toBeUndefined();
      expect(errors.list[0].error).toMatch(/ACTIVE, ON_HOLD/);
    });
  });

  describe('text and contact fields', () => {
    it('requires a value and enforces the column length', () => {
      expect(requiredText('', 'Name', errors)).toBeNull();
      expect(requiredText('x'.repeat(200), 'Name', errors, 160)).toBeNull();
      expect(requiredText('  Acme  ', 'Name', errors, 160)).toBe('Acme');
      expect(errors.list).toHaveLength(2);
    });

    it('treats a blank optional field as absent', () => {
      expect(optionalText('   ', 'Notes', errors)).toBeNull();
      expect(errors.hasErrors).toBe(false);
    });

    it('normalises and validates email addresses', () => {
      expect(optionalEmail('  John@Example.COM ', 'Email', errors)).toBe('john@example.com');
      expect(optionalEmail('not-an-email', 'Email', errors)).toBeNull();
      expect(errors.list).toHaveLength(1);
    });

    it('validates phone numbers against the same rule the form uses', () => {
      expect(optionalPhone('+91 98250 11223', 'Mobile', errors)).toBe('+91 98250 11223');
      expect(optionalPhone('abc', 'Mobile', errors)).toBeNull();
      expect(errors.list).toHaveLength(1);
    });

    it('validates integers and their bounds', () => {
      expect(optionalInteger('10', 'Sort Order', errors, { min: 0 })).toBe(10);
      expect(optionalInteger('', 'Sort Order', errors, { min: 0 })).toBeUndefined();
      expect(optionalInteger('-1', 'Sort Order', errors, { min: 0 })).toBeUndefined();
      expect(optionalInteger('1.5', 'Sort Order', errors, { min: 0 })).toBeUndefined();
      expect(errors.list).toHaveLength(2);
    });
  });
});
