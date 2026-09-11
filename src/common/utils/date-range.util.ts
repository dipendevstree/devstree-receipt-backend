/**
 * The single implementation of "This Month", "Last Quarter" and friends.
 *
 * Every list, report and dashboard endpoint resolves its date window through
 * `resolveDateRange` so a preset means exactly the same thing everywhere. All
 * arithmetic happens on the *application* timezone's calendar (APP_TIMEZONE,
 * default Asia/Kolkata) rather than the server's, so a payment recorded at
 * 00:30 IST lands in the right day even when the process runs in UTC.
 *
 * The returned boundaries are plain `YYYY-MM-DD` strings because every date
 * column in this system (`payment_date`, `receipt_date`, `start_date`) is a
 * Postgres `date`, not a timestamp — comparing them to an ISO instant would
 * reintroduce the timezone bug this utility exists to remove.
 */
export enum DatePreset {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  THIS_WEEK = 'this_week',
  LAST_WEEK = 'last_week',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_QUARTER = 'this_quarter',
  LAST_QUARTER = 'last_quarter',
  THIS_YEAR = 'this_year',
  LAST_YEAR = 'last_year',
  CUSTOM = 'custom',
  ALL_TIME = 'all_time',
}

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  [DatePreset.TODAY]: 'Today',
  [DatePreset.YESTERDAY]: 'Yesterday',
  [DatePreset.THIS_WEEK]: 'This Week',
  [DatePreset.LAST_WEEK]: 'Last Week',
  [DatePreset.THIS_MONTH]: 'This Month',
  [DatePreset.LAST_MONTH]: 'Last Month',
  [DatePreset.THIS_QUARTER]: 'This Quarter',
  [DatePreset.LAST_QUARTER]: 'Last Quarter',
  [DatePreset.THIS_YEAR]: 'This Year',
  [DatePreset.LAST_YEAR]: 'Last Year',
  [DatePreset.CUSTOM]: 'Custom Date Range',
  [DatePreset.ALL_TIME]: 'All Time',
};

export interface DateRange {
  /** Inclusive lower bound as `YYYY-MM-DD`, or null for an open start. */
  from: string | null;
  /** Inclusive upper bound as `YYYY-MM-DD`, or null for an open end. */
  to: string | null;
}

export interface DateRangeInput {
  preset?: DatePreset | string;
  dateFrom?: string;
  dateTo?: string;
}

export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

/** A bare calendar date, detached from any timezone. */
interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;
}

/** Today's calendar date in the application timezone. */
export function todayInAppTimezone(now: Date = new Date(), timeZone = APP_TIMEZONE): CalendarDate {
  // en-CA renders as YYYY-MM-DD, which parses without any locale guesswork.
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const [year, month, day] = formatted.split('-').map(Number);
  return { year, month, day };
}

function toIso(date: CalendarDate): string {
  return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

/**
 * Calendar arithmetic via UTC epoch days. Using UTC here is not a timezone
 * assumption — the calendar date was already resolved in the app timezone, and
 * UTC is simply an offset-free coordinate system for "add N days".
 */
function toUtc(date: CalendarDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

function fromUtc(date: Date): CalendarDate {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function addDays(date: CalendarDate, days: number): CalendarDate {
  const shifted = toUtc(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return fromUtc(shifted);
}

function startOfWeek(date: CalendarDate): CalendarDate {
  // ISO weeks start on Monday. getUTCDay() returns 0 for Sunday.
  const weekday = toUtc(date).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

function startOfMonth(date: CalendarDate): CalendarDate {
  return { year: date.year, month: date.month, day: 1 };
}

function endOfMonth(date: CalendarDate): CalendarDate {
  // Day 0 of the following month is the last day of this one.
  return fromUtc(new Date(Date.UTC(date.year, date.month, 0)));
}

function addMonths(date: CalendarDate, months: number): CalendarDate {
  const total = date.year * 12 + (date.month - 1) + months;
  return { year: Math.floor(total / 12), month: (total % 12) + 1, day: 1 };
}

function quarterStart(date: CalendarDate): CalendarDate {
  return { year: date.year, month: Math.floor((date.month - 1) / 3) * 3 + 1, day: 1 };
}

/**
 * Resolves a preset (or an explicit custom window) into inclusive date bounds.
 * Unknown/absent presets fall back to ALL_TIME, which is an unbounded window —
 * callers simply skip the WHERE clause when both bounds are null.
 */
export function resolveDateRange(input: DateRangeInput, now: Date = new Date()): DateRange {
  const preset = (input.preset ?? DatePreset.ALL_TIME) as DatePreset;
  const today = todayInAppTimezone(now);

  switch (preset) {
    case DatePreset.TODAY:
      return { from: toIso(today), to: toIso(today) };

    case DatePreset.YESTERDAY: {
      const yesterday = addDays(today, -1);
      return { from: toIso(yesterday), to: toIso(yesterday) };
    }

    case DatePreset.THIS_WEEK: {
      const start = startOfWeek(today);
      return { from: toIso(start), to: toIso(addDays(start, 6)) };
    }

    case DatePreset.LAST_WEEK: {
      const start = addDays(startOfWeek(today), -7);
      return { from: toIso(start), to: toIso(addDays(start, 6)) };
    }

    case DatePreset.THIS_MONTH:
      return { from: toIso(startOfMonth(today)), to: toIso(endOfMonth(today)) };

    case DatePreset.LAST_MONTH: {
      const start = addMonths(startOfMonth(today), -1);
      return { from: toIso(start), to: toIso(endOfMonth(start)) };
    }

    case DatePreset.THIS_QUARTER: {
      const start = quarterStart(today);
      return { from: toIso(start), to: toIso(endOfMonth(addMonths(start, 2))) };
    }

    case DatePreset.LAST_QUARTER: {
      const start = addMonths(quarterStart(today), -3);
      return { from: toIso(start), to: toIso(endOfMonth(addMonths(start, 2))) };
    }

    case DatePreset.THIS_YEAR:
      return { from: `${today.year}-01-01`, to: `${today.year}-12-31` };

    case DatePreset.LAST_YEAR:
      return { from: `${today.year - 1}-01-01`, to: `${today.year - 1}-12-31` };

    case DatePreset.CUSTOM:
      return { from: normalise(input.dateFrom), to: normalise(input.dateTo) };

    case DatePreset.ALL_TIME:
    default:
      // Explicit bounds still win when no preset was chosen — that is how the
      // legacy `?dateFrom=&dateTo=` query parameters keep working unchanged.
      return { from: normalise(input.dateFrom), to: normalise(input.dateTo) };
  }
}

/**
 * Accepts a plain `YYYY-MM-DD` or a full ISO timestamp (the browser's date
 * input sends the former, `toISOString()` the latter) and returns the date
 * part. Anything else becomes null.
 *
 * The whole string is validated before any truncation. Slicing first would
 * "sanitise" `2026-01-01'; DROP TABLE` into a valid-looking date instead of
 * rejecting it — these values are parameterised, but a filter that silently
 * accepts nonsense hides bugs rather than surfacing them.
 */
function normalise(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}(?:[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(trimmed)) {
    return null;
  }
  return trimmed.slice(0, 10);
}

/** Bounds of a calendar year, for the dashboard's year selector. */
export function yearRange(year: number): DateRange {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

/** The twelve `YYYY-MM` bucket keys of a year, in order. */
export function monthKeysOfYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);
}

/** `YYYY-MM` bucket key for a stored `date` column value. Never re-parses as an instant. */
export function monthKeyOf(dateValue: string | Date): string {
  const iso = dateValue instanceof Date ? dateValue.toISOString().slice(0, 10) : String(dateValue);
  return iso.slice(0, 7);
}

export function currentYearInAppTimezone(now: Date = new Date()): number {
  return todayInAppTimezone(now).year;
}
