import { Money } from './money.util';

describe('Money', () => {
  it('parses a decimal string into minor units without float error', () => {
    const money = Money.fromDecimalString('1250.50');
    expect(money.toMinorUnits()).toBe('125050');
    expect(money.toDecimalString()).toBe('1250.50');
  });

  it('rejects more decimal places than the configured precision', () => {
    expect(() => Money.fromDecimalString('10.999')).toThrow();
  });

  it('rejects malformed input', () => {
    expect(() => Money.fromDecimalString('abc')).toThrow();
    expect(() => Money.fromDecimalString('')).toThrow();
  });

  it('adds and subtracts without floating point drift', () => {
    const a = Money.fromDecimalString('0.10');
    const b = Money.fromDecimalString('0.20');
    expect(a.add(b).toDecimalString()).toBe('0.30');
  });

  it('sums many small amounts exactly (float would drift)', () => {
    const values = Array.from({ length: 10 }, () => Money.fromDecimalString('0.10'));
    expect(Money.sum(values).toDecimalString()).toBe('1.00');
  });

  it('clamps a negative result to zero for due-amount calculations', () => {
    const projectAmount = Money.fromDecimalString('100.00');
    const overReceived = Money.fromDecimalString('150.00');
    expect(projectAmount.subtract(overReceived).clampToZero().toDecimalString()).toBe('0.00');
  });

  it('compares amounts correctly', () => {
    const small = Money.fromDecimalString('10.00');
    const large = Money.fromDecimalString('20.00');
    expect(small.lessThan(large)).toBe(true);
    expect(large.greaterThan(small)).toBe(true);
    expect(small.equals(Money.fromDecimalString('10.00'))).toBe(true);
  });

  it('round-trips through minor units', () => {
    const money = Money.fromDecimalString('999999.99');
    const restored = Money.fromMinorUnits(money.toMinorUnits());
    expect(restored.toDecimalString()).toBe('999999.99');
  });

  it('rejects combining amounts of different precision', () => {
    const a = Money.fromDecimalString('10.00', 2);
    const b = Money.fromDecimalString('10.000', 3);
    expect(() => a.add(b)).toThrow();
  });
});
