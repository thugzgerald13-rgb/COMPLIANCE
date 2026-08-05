// Shared date & period helpers.
//
// These centralize the date formatting / parsing patterns that were previously
// duplicated across utils.ts, store.ts, the notification service and several
// components (e.g. `new Date().toISOString().split('T')[0]`, manual
// `YYYY-MM(-DD)` string building, and the day-countdown calculation).

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Today's date as an ISO `YYYY-MM-DD` string (UTC, matching `toISOString`). */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Format a `Date` as a local `YYYY-MM-DD` string. */
export function formatYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Format a year and 1-based month as a `YYYY-MM` period string. */
export function formatYM(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Parse a `YYYY-MM` period string into its numeric year and 1-based month. */
export function parsePeriod(period: string): { year: number; month: number } {
  const [yearStr, monthStr] = period.split('-');
  return { year: parseInt(yearStr, 10), month: parseInt(monthStr, 10) };
}

/** Return a new ISO `YYYY-MM-DD` string `days` days from now. */
export function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * MS_PER_DAY).toISOString().split('T')[0];
}

/**
 * Whole days from today (midnight) until the given deadline (midnight).
 * Negative when overdue, 0 when due today, positive when upcoming.
 */
export function daysUntilDeadline(deadline: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadDate = new Date(deadline);
  deadDate.setHours(0, 0, 0, 0);

  return Math.ceil((deadDate.getTime() - today.getTime()) / MS_PER_DAY);
}
