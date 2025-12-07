/**
 * Date Manipulation Utilities
 *
 * Provides type-safe date manipulation and formatting utilities
 * for common date operations.
 *
 * @module utils/date
 * @example
 * ```typescript
 * import { formatDate, addDays, differenceInDays } from '@missionfabric-js/enzyme-typescript/utils';
 *
 * const formatted = formatDate(new Date(), 'YYYY-MM-DD');
 * const future = addDays(new Date(), 7);
 * ```
 */

/**
 * Formats a date according to a format string.
 *
 * @param date - The date to format
 * @param format - The format string (YYYY, MM, DD, HH, mm, ss)
 * @returns The formatted date string
 *
 * @example
 * ```typescript
 * formatDate(new Date('2024-03-15'), 'YYYY-MM-DD'); // '2024-03-15'
 * formatDate(new Date('2024-03-15 14:30'), 'HH:mm'); // '14:30'
 * formatDate(new Date(), 'YYYY/MM/DD HH:mm:ss');
 * ```
 */
export function formatDate(date: Date, format: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return format
    .replace('YYYY', String(year))
    .replace('YY', String(year).slice(-2))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Adds days to a date.
 *
 * @param date - The source date
 * @param days - Number of days to add (can be negative)
 * @returns A new date with days added
 *
 * @example
 * ```typescript
 * addDays(new Date('2024-03-15'), 7); // 2024-03-22
 * addDays(new Date('2024-03-15'), -7); // 2024-03-08
 * ```
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Adds hours to a date.
 *
 * @param date - The source date
 * @param hours - Number of hours to add (can be negative)
 * @returns A new date with hours added
 *
 * @example
 * ```typescript
 * addHours(new Date('2024-03-15 10:00'), 5); // 2024-03-15 15:00
 * ```
 */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

/**
 * Adds minutes to a date.
 *
 * @param date - The source date
 * @param minutes - Number of minutes to add (can be negative)
 * @returns A new date with minutes added
 *
 * @example
 * ```typescript
 * addMinutes(new Date('2024-03-15 10:00'), 30); // 2024-03-15 10:30
 * ```
 */
export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

/**
 * Adds months to a date.
 *
 * @param date - The source date
 * @param months - Number of months to add (can be negative)
 * @returns A new date with months added
 *
 * @example
 * ```typescript
 * addMonths(new Date('2024-03-15'), 2); // 2024-05-15
 * ```
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Adds years to a date.
 *
 * @param date - The source date
 * @param years - Number of years to add (can be negative)
 * @returns A new date with years added
 *
 * @example
 * ```typescript
 * addYears(new Date('2024-03-15'), 1); // 2025-03-15
 * ```
 */
export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Calculates the difference in days between two dates.
 *
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns The number of days difference
 *
 * @example
 * ```typescript
 * differenceInDays(new Date('2024-03-20'), new Date('2024-03-15')); // 5
 * ```
 */
export function differenceInDays(date1: Date, date2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((date1.getTime() - date2.getTime()) / msPerDay);
}

/**
 * Calculates the difference in hours between two dates.
 *
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns The number of hours difference
 *
 * @example
 * ```typescript
 * differenceInHours(new Date('2024-03-15 15:00'), new Date('2024-03-15 10:00')); // 5
 * ```
 */
export function differenceInHours(date1: Date, date2: Date): number {
  const msPerHour = 60 * 60 * 1000;
  return Math.floor((date1.getTime() - date2.getTime()) / msPerHour);
}

/**
 * Calculates the difference in minutes between two dates.
 *
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns The number of minutes difference
 *
 * @example
 * ```typescript
 * differenceInMinutes(new Date('2024-03-15 10:30'), new Date('2024-03-15 10:00')); // 30
 * ```
 */
export function differenceInMinutes(date1: Date, date2: Date): number {
  const msPerMinute = 60 * 1000;
  return Math.floor((date1.getTime() - date2.getTime()) / msPerMinute);
}

/**
 * Gets the start of day for a date.
 *
 * @param date - The source date
 * @returns A new date set to start of day (00:00:00)
 *
 * @example
 * ```typescript
 * startOfDay(new Date('2024-03-15 14:30')); // 2024-03-15 00:00:00
 * ```
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Gets the end of day for a date.
 *
 * @param date - The source date
 * @returns A new date set to end of day (23:59:59.999)
 *
 * @example
 * ```typescript
 * endOfDay(new Date('2024-03-15 14:30')); // 2024-03-15 23:59:59.999
 * ```
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Gets the start of month for a date.
 *
 * @param date - The source date
 * @returns A new date set to start of month
 *
 * @example
 * ```typescript
 * startOfMonth(new Date('2024-03-15')); // 2024-03-01 00:00:00
 * ```
 */
export function startOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Gets the end of month for a date.
 *
 * @param date - The source date
 * @returns A new date set to end of month
 *
 * @example
 * ```typescript
 * endOfMonth(new Date('2024-03-15')); // 2024-03-31 23:59:59.999
 * ```
 */
export function endOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Checks if a date is between two dates.
 *
 * @param date - The date to check
 * @param start - The start date
 * @param end - The end date
 * @returns True if date is between start and end
 *
 * @example
 * ```typescript
 * isBetween(
 *   new Date('2024-03-15'),
 *   new Date('2024-03-10'),
 *   new Date('2024-03-20')
 * ); // true
 * ```
 */
export function isBetween(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

/**
 * Checks if two dates are on the same day.
 *
 * @param date1 - The first date
 * @param date2 - The second date
 * @returns True if dates are on the same day
 *
 * @example
 * ```typescript
 * isSameDay(
 *   new Date('2024-03-15 10:00'),
 *   new Date('2024-03-15 15:00')
 * ); // true
 * ```
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Checks if a date is today.
 *
 * @param date - The date to check
 * @returns True if date is today
 *
 * @example
 * ```typescript
 * isToday(new Date()); // true
 * ```
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Checks if a date is in the past.
 *
 * @param date - The date to check
 * @returns True if date is in the past
 *
 * @example
 * ```typescript
 * isPast(new Date('2020-01-01')); // true
 * ```
 */
export function isPast(date: Date): boolean {
  return date < new Date();
}

/**
 * Checks if a date is in the future.
 *
 * @param date - The date to check
 * @returns True if date is in the future
 *
 * @example
 * ```typescript
 * isFuture(new Date('2030-01-01')); // true
 * ```
 */
export function isFuture(date: Date): boolean {
  return date > new Date();
}

/**
 * Checks if a year is a leap year.
 *
 * @param year - The year to check
 * @returns True if year is a leap year
 *
 * @example
 * ```typescript
 * isLeapYear(2024); // true
 * isLeapYear(2023); // false
 * ```
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Gets the number of days in a month.
 *
 * @param year - The year
 * @param month - The month (1-12)
 * @returns The number of days in the month
 *
 * @example
 * ```typescript
 * getDaysInMonth(2024, 2); // 29 (leap year)
 * getDaysInMonth(2023, 2); // 28
 * ```
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Parses a date string in ISO format.
 *
 * @param dateString - The date string to parse
 * @returns A Date object or null if invalid
 *
 * @example
 * ```typescript
 * parseDate('2024-03-15'); // Date object
 * parseDate('invalid'); // null
 * ```
 */
export function parseDate(dateString: string): Date | null {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Gets a relative time string (e.g., "2 hours ago").
 *
 * @param date - The date to compare
 * @param baseDate - The base date (default: now)
 * @returns A relative time string
 *
 * @example
 * ```typescript
 * getRelativeTime(new Date(Date.now() - 3600000)); // '1 hour ago'
 * getRelativeTime(new Date(Date.now() + 86400000)); // 'in 1 day'
 * ```
 */
export function getRelativeTime(date: Date, baseDate = new Date()): string {
  const diffMs = date.getTime() - baseDate.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  const isPast = diffMs < 0;
  const abs = Math.abs;

  if (abs(diffYear) >= 1) {
    return isPast
      ? `${abs(diffYear)} year${abs(diffYear) > 1 ? 's' : ''} ago`
      : `in ${abs(diffYear)} year${abs(diffYear) > 1 ? 's' : ''}`;
  }
  if (abs(diffMonth) >= 1) {
    return isPast
      ? `${abs(diffMonth)} month${abs(diffMonth) > 1 ? 's' : ''} ago`
      : `in ${abs(diffMonth)} month${abs(diffMonth) > 1 ? 's' : ''}`;
  }
  if (abs(diffWeek) >= 1) {
    return isPast
      ? `${abs(diffWeek)} week${abs(diffWeek) > 1 ? 's' : ''} ago`
      : `in ${abs(diffWeek)} week${abs(diffWeek) > 1 ? 's' : ''}`;
  }
  if (abs(diffDay) >= 1) {
    return isPast
      ? `${abs(diffDay)} day${abs(diffDay) > 1 ? 's' : ''} ago`
      : `in ${abs(diffDay)} day${abs(diffDay) > 1 ? 's' : ''}`;
  }
  if (abs(diffHour) >= 1) {
    return isPast
      ? `${abs(diffHour)} hour${abs(diffHour) > 1 ? 's' : ''} ago`
      : `in ${abs(diffHour)} hour${abs(diffHour) > 1 ? 's' : ''}`;
  }
  if (abs(diffMin) >= 1) {
    return isPast
      ? `${abs(diffMin)} minute${abs(diffMin) > 1 ? 's' : ''} ago`
      : `in ${abs(diffMin)} minute${abs(diffMin) > 1 ? 's' : ''}`;
  }
  return 'just now';
}

/**
 * Gets the day of week name.
 *
 * @param date - The date
 * @param locale - The locale (default: 'en-US')
 * @returns The day name
 *
 * @example
 * ```typescript
 * getDayName(new Date('2024-03-15')); // 'Friday'
 * ```
 */
export function getDayName(date: Date, locale = 'en-US'): string {
  return date.toLocaleDateString(locale, { weekday: 'long' });
}

/**
 * Gets the month name.
 *
 * @param date - The date
 * @param locale - The locale (default: 'en-US')
 * @returns The month name
 *
 * @example
 * ```typescript
 * getMonthName(new Date('2024-03-15')); // 'March'
 * ```
 */
export function getMonthName(date: Date, locale = 'en-US'): string {
  return date.toLocaleDateString(locale, { month: 'long' });
}
