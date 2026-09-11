"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_TIMEZONE = exports.DATE_PRESET_LABELS = exports.DatePreset = void 0;
exports.todayInAppTimezone = todayInAppTimezone;
exports.resolveDateRange = resolveDateRange;
exports.yearRange = yearRange;
exports.monthKeysOfYear = monthKeysOfYear;
exports.monthKeyOf = monthKeyOf;
exports.currentYearInAppTimezone = currentYearInAppTimezone;
var DatePreset;
(function (DatePreset) {
    DatePreset["TODAY"] = "today";
    DatePreset["YESTERDAY"] = "yesterday";
    DatePreset["THIS_WEEK"] = "this_week";
    DatePreset["LAST_WEEK"] = "last_week";
    DatePreset["THIS_MONTH"] = "this_month";
    DatePreset["LAST_MONTH"] = "last_month";
    DatePreset["THIS_QUARTER"] = "this_quarter";
    DatePreset["LAST_QUARTER"] = "last_quarter";
    DatePreset["THIS_YEAR"] = "this_year";
    DatePreset["LAST_YEAR"] = "last_year";
    DatePreset["CUSTOM"] = "custom";
    DatePreset["ALL_TIME"] = "all_time";
})(DatePreset || (exports.DatePreset = DatePreset = {}));
exports.DATE_PRESET_LABELS = {
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
exports.APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';
function todayInAppTimezone(now = new Date(), timeZone = exports.APP_TIMEZONE) {
    const formatted = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now);
    const [year, month, day] = formatted.split('-').map(Number);
    return { year, month, day };
}
function toIso(date) {
    return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}
function toUtc(date) {
    return new Date(Date.UTC(date.year, date.month - 1, date.day));
}
function fromUtc(date) {
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}
function addDays(date, days) {
    const shifted = toUtc(date);
    shifted.setUTCDate(shifted.getUTCDate() + days);
    return fromUtc(shifted);
}
function startOfWeek(date) {
    const weekday = toUtc(date).getUTCDay();
    return addDays(date, -((weekday + 6) % 7));
}
function startOfMonth(date) {
    return { year: date.year, month: date.month, day: 1 };
}
function endOfMonth(date) {
    return fromUtc(new Date(Date.UTC(date.year, date.month, 0)));
}
function addMonths(date, months) {
    const total = date.year * 12 + (date.month - 1) + months;
    return { year: Math.floor(total / 12), month: (total % 12) + 1, day: 1 };
}
function quarterStart(date) {
    return { year: date.year, month: Math.floor((date.month - 1) / 3) * 3 + 1, day: 1 };
}
function resolveDateRange(input, now = new Date()) {
    const preset = (input.preset ?? DatePreset.ALL_TIME);
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
            return { from: normalise(input.dateFrom), to: normalise(input.dateTo) };
    }
}
function normalise(value) {
    if (!value)
        return null;
    const trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}(?:[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(trimmed)) {
        return null;
    }
    return trimmed.slice(0, 10);
}
function yearRange(year) {
    return { from: `${year}-01-01`, to: `${year}-12-31` };
}
function monthKeysOfYear(year) {
    return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);
}
function monthKeyOf(dateValue) {
    const iso = dateValue instanceof Date ? dateValue.toISOString().slice(0, 10) : String(dateValue);
    return iso.slice(0, 7);
}
function currentYearInAppTimezone(now = new Date()) {
    return todayInAppTimezone(now).year;
}
//# sourceMappingURL=date-range.util.js.map