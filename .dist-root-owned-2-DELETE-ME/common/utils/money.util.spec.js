"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const money_util_1 = require("./money.util");
describe('Money', () => {
    it('parses a decimal string into minor units without float error', () => {
        const money = money_util_1.Money.fromDecimalString('1250.50');
        expect(money.toMinorUnits()).toBe('125050');
        expect(money.toDecimalString()).toBe('1250.50');
    });
    it('rejects more decimal places than the configured precision', () => {
        expect(() => money_util_1.Money.fromDecimalString('10.999')).toThrow();
    });
    it('rejects malformed input', () => {
        expect(() => money_util_1.Money.fromDecimalString('abc')).toThrow();
        expect(() => money_util_1.Money.fromDecimalString('')).toThrow();
    });
    it('adds and subtracts without floating point drift', () => {
        const a = money_util_1.Money.fromDecimalString('0.10');
        const b = money_util_1.Money.fromDecimalString('0.20');
        expect(a.add(b).toDecimalString()).toBe('0.30');
    });
    it('sums many small amounts exactly (float would drift)', () => {
        const values = Array.from({ length: 10 }, () => money_util_1.Money.fromDecimalString('0.10'));
        expect(money_util_1.Money.sum(values).toDecimalString()).toBe('1.00');
    });
    it('clamps a negative result to zero for due-amount calculations', () => {
        const projectAmount = money_util_1.Money.fromDecimalString('100.00');
        const overReceived = money_util_1.Money.fromDecimalString('150.00');
        expect(projectAmount.subtract(overReceived).clampToZero().toDecimalString()).toBe('0.00');
    });
    it('compares amounts correctly', () => {
        const small = money_util_1.Money.fromDecimalString('10.00');
        const large = money_util_1.Money.fromDecimalString('20.00');
        expect(small.lessThan(large)).toBe(true);
        expect(large.greaterThan(small)).toBe(true);
        expect(small.equals(money_util_1.Money.fromDecimalString('10.00'))).toBe(true);
    });
    it('round-trips through minor units', () => {
        const money = money_util_1.Money.fromDecimalString('999999.99');
        const restored = money_util_1.Money.fromMinorUnits(money.toMinorUnits());
        expect(restored.toDecimalString()).toBe('999999.99');
    });
    it('rejects combining amounts of different precision', () => {
        const a = money_util_1.Money.fromDecimalString('10.00', 2);
        const b = money_util_1.Money.fromDecimalString('10.000', 3);
        expect(() => a.add(b)).toThrow();
    });
});
//# sourceMappingURL=money.util.spec.js.map