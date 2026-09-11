"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const date_range_util_1 = require("./date-range.util");
const NOW = new Date('2026-06-17T20:30:00Z');
const TZ = 'Asia/Kolkata';
const range = (preset) => (0, date_range_util_1.resolveDateRange)({ preset }, NOW);
describe('date-range util', () => {
    describe('todayInAppTimezone', () => {
        it('uses the application timezone, not UTC', () => {
            expect((0, date_range_util_1.todayInAppTimezone)(NOW, TZ)).toEqual({ year: 2026, month: 6, day: 18 });
            expect((0, date_range_util_1.todayInAppTimezone)(NOW, 'UTC')).toEqual({ year: 2026, month: 6, day: 17 });
        });
    });
    describe('resolveDateRange', () => {
        it('resolves TODAY to the app-timezone calendar day', () => {
            expect(range(date_range_util_1.DatePreset.TODAY)).toEqual({ from: '2026-06-18', to: '2026-06-18' });
        });
        it('resolves YESTERDAY', () => {
            expect(range(date_range_util_1.DatePreset.YESTERDAY)).toEqual({ from: '2026-06-17', to: '2026-06-17' });
        });
        it('starts weeks on Monday', () => {
            expect(range(date_range_util_1.DatePreset.THIS_WEEK)).toEqual({ from: '2026-06-15', to: '2026-06-21' });
            expect(range(date_range_util_1.DatePreset.LAST_WEEK)).toEqual({ from: '2026-06-08', to: '2026-06-14' });
        });
        it('resolves month boundaries including the last day', () => {
            expect(range(date_range_util_1.DatePreset.THIS_MONTH)).toEqual({ from: '2026-06-01', to: '2026-06-30' });
            expect(range(date_range_util_1.DatePreset.LAST_MONTH)).toEqual({ from: '2026-05-01', to: '2026-05-31' });
        });
        it('resolves quarters', () => {
            expect(range(date_range_util_1.DatePreset.THIS_QUARTER)).toEqual({ from: '2026-04-01', to: '2026-06-30' });
            expect(range(date_range_util_1.DatePreset.LAST_QUARTER)).toEqual({ from: '2026-01-01', to: '2026-03-31' });
        });
        it('rolls the quarter back across a year boundary', () => {
            const january = new Date('2026-01-15T06:00:00Z');
            expect((0, date_range_util_1.resolveDateRange)({ preset: date_range_util_1.DatePreset.LAST_QUARTER }, january)).toEqual({
                from: '2025-10-01',
                to: '2025-12-31',
            });
        });
        it('resolves years', () => {
            expect(range(date_range_util_1.DatePreset.THIS_YEAR)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
            expect(range(date_range_util_1.DatePreset.LAST_YEAR)).toEqual({ from: '2025-01-01', to: '2025-12-31' });
        });
        it('leaves ALL_TIME unbounded so callers omit the WHERE clause', () => {
            expect(range(date_range_util_1.DatePreset.ALL_TIME)).toEqual({ from: null, to: null });
        });
        it('honours explicit bounds for CUSTOM', () => {
            expect((0, date_range_util_1.resolveDateRange)({ preset: date_range_util_1.DatePreset.CUSTOM, dateFrom: '2026-02-01', dateTo: '2026-02-28' }, NOW)).toEqual({ from: '2026-02-01', to: '2026-02-28' });
        });
        it('rejects malformed custom dates rather than passing them to SQL', () => {
            expect((0, date_range_util_1.resolveDateRange)({ preset: date_range_util_1.DatePreset.CUSTOM, dateFrom: "2026-01-01'; DROP TABLE" }, NOW)).toEqual({ from: null, to: null });
        });
        it('accepts a full ISO timestamp for custom bounds by taking the date part', () => {
            expect((0, date_range_util_1.resolveDateRange)({ preset: date_range_util_1.DatePreset.CUSTOM, dateFrom: '2026-03-09T10:00:00.000Z' }, NOW)).toEqual({ from: '2026-03-09', to: null });
        });
        it('still applies bare dateFrom/dateTo when no preset is given', () => {
            expect((0, date_range_util_1.resolveDateRange)({ dateFrom: '2026-01-01', dateTo: '2026-01-31' }, NOW)).toEqual({
                from: '2026-01-01',
                to: '2026-01-31',
            });
        });
        it('falls back to an unbounded range for an unknown preset', () => {
            expect((0, date_range_util_1.resolveDateRange)({ preset: 'last_fortnight' }, NOW)).toEqual({
                from: null,
                to: null,
            });
        });
    });
    describe('month bucket keys', () => {
        it('produces twelve ordered keys for a year', () => {
            const keys = (0, date_range_util_1.monthKeysOfYear)(2026);
            expect(keys).toHaveLength(12);
            expect(keys[0]).toBe('2026-01');
            expect(keys[11]).toBe('2026-12');
        });
        it('buckets a stored date string without re-parsing it as an instant', () => {
            expect((0, date_range_util_1.monthKeyOf)('2026-01-01')).toBe('2026-01');
            expect((0, date_range_util_1.monthKeyOf)('2026-12-31')).toBe('2026-12');
        });
    });
});
//# sourceMappingURL=date-range.util.spec.js.map