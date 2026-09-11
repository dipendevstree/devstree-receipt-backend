import {
  DatePreset,
  monthKeyOf,
  monthKeysOfYear,
  resolveDateRange,
  todayInAppTimezone,
} from './date-range.util';

/**
 * The presets are the shared contract between every list, report and dashboard
 * endpoint, so they are pinned against a fixed "now" rather than the wall
 * clock. `now` is 2026-06-17T20:30:00Z — which is already 2026-06-18 in
 * Asia/Kolkata, and that difference is exactly what these tests exist to
 * protect: a preset must follow the application's calendar, not the server's.
 */
const NOW = new Date('2026-06-17T20:30:00Z');
const TZ = 'Asia/Kolkata';

const range = (preset: DatePreset) => resolveDateRange({ preset }, NOW);

describe('date-range util', () => {
  describe('todayInAppTimezone', () => {
    it('uses the application timezone, not UTC', () => {
      expect(todayInAppTimezone(NOW, TZ)).toEqual({ year: 2026, month: 6, day: 18 });
      expect(todayInAppTimezone(NOW, 'UTC')).toEqual({ year: 2026, month: 6, day: 17 });
    });
  });

  describe('resolveDateRange', () => {
    it('resolves TODAY to the app-timezone calendar day', () => {
      expect(range(DatePreset.TODAY)).toEqual({ from: '2026-06-18', to: '2026-06-18' });
    });

    it('resolves YESTERDAY', () => {
      expect(range(DatePreset.YESTERDAY)).toEqual({ from: '2026-06-17', to: '2026-06-17' });
    });

    it('starts weeks on Monday', () => {
      // 2026-06-18 is a Thursday, so the ISO week runs Mon 15th – Sun 21st.
      expect(range(DatePreset.THIS_WEEK)).toEqual({ from: '2026-06-15', to: '2026-06-21' });
      expect(range(DatePreset.LAST_WEEK)).toEqual({ from: '2026-06-08', to: '2026-06-14' });
    });

    it('resolves month boundaries including the last day', () => {
      expect(range(DatePreset.THIS_MONTH)).toEqual({ from: '2026-06-01', to: '2026-06-30' });
      expect(range(DatePreset.LAST_MONTH)).toEqual({ from: '2026-05-01', to: '2026-05-31' });
    });

    it('resolves quarters', () => {
      expect(range(DatePreset.THIS_QUARTER)).toEqual({ from: '2026-04-01', to: '2026-06-30' });
      expect(range(DatePreset.LAST_QUARTER)).toEqual({ from: '2026-01-01', to: '2026-03-31' });
    });

    it('rolls the quarter back across a year boundary', () => {
      const january = new Date('2026-01-15T06:00:00Z');
      expect(resolveDateRange({ preset: DatePreset.LAST_QUARTER }, january)).toEqual({
        from: '2025-10-01',
        to: '2025-12-31',
      });
    });

    it('resolves years', () => {
      expect(range(DatePreset.THIS_YEAR)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
      expect(range(DatePreset.LAST_YEAR)).toEqual({ from: '2025-01-01', to: '2025-12-31' });
    });

    it('leaves ALL_TIME unbounded so callers omit the WHERE clause', () => {
      expect(range(DatePreset.ALL_TIME)).toEqual({ from: null, to: null });
    });

    it('honours explicit bounds for CUSTOM', () => {
      expect(
        resolveDateRange(
          { preset: DatePreset.CUSTOM, dateFrom: '2026-02-01', dateTo: '2026-02-28' },
          NOW,
        ),
      ).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    });

    it('rejects malformed custom dates rather than passing them to SQL', () => {
      expect(
        resolveDateRange({ preset: DatePreset.CUSTOM, dateFrom: "2026-01-01'; DROP TABLE" }, NOW),
      ).toEqual({ from: null, to: null });
    });

    it('accepts a full ISO timestamp for custom bounds by taking the date part', () => {
      expect(
        resolveDateRange({ preset: DatePreset.CUSTOM, dateFrom: '2026-03-09T10:00:00.000Z' }, NOW),
      ).toEqual({ from: '2026-03-09', to: null });
    });

    it('still applies bare dateFrom/dateTo when no preset is given', () => {
      // Keeps the pre-existing `?dateFrom=&dateTo=` query contract working.
      expect(resolveDateRange({ dateFrom: '2026-01-01', dateTo: '2026-01-31' }, NOW)).toEqual({
        from: '2026-01-01',
        to: '2026-01-31',
      });
    });

    it('falls back to an unbounded range for an unknown preset', () => {
      expect(resolveDateRange({ preset: 'last_fortnight' }, NOW)).toEqual({
        from: null,
        to: null,
      });
    });
  });

  describe('month bucket keys', () => {
    it('produces twelve ordered keys for a year', () => {
      const keys = monthKeysOfYear(2026);
      expect(keys).toHaveLength(12);
      expect(keys[0]).toBe('2026-01');
      expect(keys[11]).toBe('2026-12');
    });

    it('buckets a stored date string without re-parsing it as an instant', () => {
      // A `date` column arrives as 'YYYY-MM-DD'. Parsing it as a Date and
      // reading local months is what puts 1 January into December.
      expect(monthKeyOf('2026-01-01')).toBe('2026-01');
      expect(monthKeyOf('2026-12-31')).toBe('2026-12');
    });
  });
});
