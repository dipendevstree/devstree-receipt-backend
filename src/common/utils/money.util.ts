import Decimal from 'decimal.js';

/**
 * Money is handled as an integer number of minor units (paise/cents) held in a
 * bigint. No float arithmetic ever touches a monetary value: input strings are
 * parsed with decimal.js, converted to minor units, and only rendered back to a
 * decimal string at the API boundary.
 */
export class Money {
  private constructor(
    private readonly minor: bigint,
    private readonly precision: number,
  ) {}

  static readonly DEFAULT_PRECISION = 2;
  static readonly MAX_MINOR_UNITS = 10n ** 18n; // guards against absurd inputs

  static zero(precision = Money.DEFAULT_PRECISION): Money {
    return new Money(0n, precision);
  }

  /** Parses a user/API supplied decimal amount such as "1250.50". */
  static fromDecimalString(value: string | number, precision = Money.DEFAULT_PRECISION): Money {
    const raw = typeof value === 'number' ? value.toString() : (value ?? '').trim();
    if (raw === '') throw new Error('Amount is required.');
    if (!/^-?\d{1,19}(\.\d{1,10})?$/.test(raw)) {
      throw new Error('Amount must be a plain decimal number.');
    }

    const decimal = new Decimal(raw);
    if (decimal.decimalPlaces() > precision) {
      throw new Error(`Amount cannot have more than ${precision} decimal places.`);
    }

    const minor = BigInt(decimal.mul(new Decimal(10).pow(precision)).toFixed(0));
    if (minor >= Money.MAX_MINOR_UNITS || minor <= -Money.MAX_MINOR_UNITS) {
      throw new Error('Amount is outside the supported range.');
    }
    return new Money(minor, precision);
  }

  /** Rehydrates from the canonical persisted representation (minor units string). */
  static fromMinorUnits(value: string | bigint, precision = Money.DEFAULT_PRECISION): Money {
    const minor = typeof value === 'bigint' ? value : BigInt(String(value).trim());
    return new Money(minor, precision);
  }

  static sum(values: Money[], precision = Money.DEFAULT_PRECISION): Money {
    return values.reduce((acc, value) => acc.add(value), Money.zero(precision));
  }

  private assertSamePrecision(other: Money): void {
    if (other.precision !== this.precision) {
      throw new Error('Cannot combine amounts with different currency precision.');
    }
  }

  add(other: Money): Money {
    this.assertSamePrecision(other);
    return new Money(this.minor + other.minor, this.precision);
  }

  subtract(other: Money): Money {
    this.assertSamePrecision(other);
    return new Money(this.minor - other.minor, this.precision);
  }

  compare(other: Money): -1 | 0 | 1 {
    this.assertSamePrecision(other);
    if (this.minor < other.minor) return -1;
    if (this.minor > other.minor) return 1;
    return 0;
  }

  greaterThan(other: Money): boolean {
    return this.compare(other) === 1;
  }

  lessThan(other: Money): boolean {
    return this.compare(other) === -1;
  }

  equals(other: Money): boolean {
    return this.compare(other) === 0;
  }

  isZero(): boolean {
    return this.minor === 0n;
  }

  isNegative(): boolean {
    return this.minor < 0n;
  }

  isPositive(): boolean {
    return this.minor > 0n;
  }

  /** Never negative — used for "due" figures where overpayment clamps to zero. */
  clampToZero(): Money {
    return this.minor < 0n ? Money.zero(this.precision) : this;
  }

  negated(): Money {
    return new Money(-this.minor, this.precision);
  }

  getPrecision(): number {
    return this.precision;
  }

  /** Canonical storage form — this is what gets encrypted. */
  toMinorUnits(): string {
    return this.minor.toString();
  }

  /** API form, e.g. "1250.50". */
  toDecimalString(): string {
    const negative = this.minor < 0n;
    const digits = (negative ? -this.minor : this.minor)
      .toString()
      .padStart(this.precision + 1, '0');
    const whole = digits.slice(0, digits.length - this.precision);
    const fraction = this.precision > 0 ? digits.slice(digits.length - this.precision) : '';
    const body = this.precision > 0 ? `${whole}.${fraction}` : whole;
    return negative ? `-${body}` : body;
  }

  toJSON(): string {
    return this.toDecimalString();
  }

  toString(): string {
    return this.toDecimalString();
  }
}
