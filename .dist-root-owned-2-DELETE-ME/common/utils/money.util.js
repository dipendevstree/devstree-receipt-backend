"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Money = void 0;
const decimal_js_1 = __importDefault(require("decimal.js"));
class Money {
    minor;
    precision;
    constructor(minor, precision) {
        this.minor = minor;
        this.precision = precision;
    }
    static DEFAULT_PRECISION = 2;
    static MAX_MINOR_UNITS = 10n ** 18n;
    static zero(precision = Money.DEFAULT_PRECISION) {
        return new Money(0n, precision);
    }
    static fromDecimalString(value, precision = Money.DEFAULT_PRECISION) {
        const raw = typeof value === 'number' ? value.toString() : (value ?? '').trim();
        if (raw === '')
            throw new Error('Amount is required.');
        if (!/^-?\d{1,19}(\.\d{1,10})?$/.test(raw)) {
            throw new Error('Amount must be a plain decimal number.');
        }
        const decimal = new decimal_js_1.default(raw);
        if (decimal.decimalPlaces() > precision) {
            throw new Error(`Amount cannot have more than ${precision} decimal places.`);
        }
        const minor = BigInt(decimal.mul(new decimal_js_1.default(10).pow(precision)).toFixed(0));
        if (minor >= Money.MAX_MINOR_UNITS || minor <= -Money.MAX_MINOR_UNITS) {
            throw new Error('Amount is outside the supported range.');
        }
        return new Money(minor, precision);
    }
    static fromMinorUnits(value, precision = Money.DEFAULT_PRECISION) {
        const minor = typeof value === 'bigint' ? value : BigInt(String(value).trim());
        return new Money(minor, precision);
    }
    static sum(values, precision = Money.DEFAULT_PRECISION) {
        return values.reduce((acc, value) => acc.add(value), Money.zero(precision));
    }
    assertSamePrecision(other) {
        if (other.precision !== this.precision) {
            throw new Error('Cannot combine amounts with different currency precision.');
        }
    }
    add(other) {
        this.assertSamePrecision(other);
        return new Money(this.minor + other.minor, this.precision);
    }
    subtract(other) {
        this.assertSamePrecision(other);
        return new Money(this.minor - other.minor, this.precision);
    }
    compare(other) {
        this.assertSamePrecision(other);
        if (this.minor < other.minor)
            return -1;
        if (this.minor > other.minor)
            return 1;
        return 0;
    }
    greaterThan(other) {
        return this.compare(other) === 1;
    }
    lessThan(other) {
        return this.compare(other) === -1;
    }
    equals(other) {
        return this.compare(other) === 0;
    }
    isZero() {
        return this.minor === 0n;
    }
    isNegative() {
        return this.minor < 0n;
    }
    isPositive() {
        return this.minor > 0n;
    }
    clampToZero() {
        return this.minor < 0n ? Money.zero(this.precision) : this;
    }
    negated() {
        return new Money(-this.minor, this.precision);
    }
    getPrecision() {
        return this.precision;
    }
    toMinorUnits() {
        return this.minor.toString();
    }
    toDecimalString() {
        const negative = this.minor < 0n;
        const digits = (negative ? -this.minor : this.minor)
            .toString()
            .padStart(this.precision + 1, '0');
        const whole = digits.slice(0, digits.length - this.precision);
        const fraction = this.precision > 0 ? digits.slice(digits.length - this.precision) : '';
        const body = this.precision > 0 ? `${whole}.${fraction}` : whole;
        return negative ? `-${body}` : body;
    }
    toJSON() {
        return this.toDecimalString();
    }
    toString() {
        return this.toDecimalString();
    }
}
exports.Money = Money;
//# sourceMappingURL=money.util.js.map