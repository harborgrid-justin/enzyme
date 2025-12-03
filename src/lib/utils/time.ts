/**
 * @file Time Utilities
 * @description Date/time formatting and manipulation utilities
 */

/**
 * Format options
 */
export interface FormatOptions {
  locale?: string;
  timeZone?: string;
}

/**
 * Default format options
 */
const defaultFormatOptions: FormatOptions = {
  locale: 'en-US',
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

/**
 * Parse date input to Date object
 */
export function parseDate(input: string | number | Date): Date {
  if (input instanceof Date) {
    return input;
  }

  if (typeof input === 'number') {
    return new Date(input);
  }

  const parsed = new Date(input);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${input}`);
  }

  return parsed;
}

/**
 * Format date with pattern
 */
export function formatDate(
  date: string | number | Date,
  pattern: 'short' | 'medium' | 'long' | 'full' = 'medium',
  options?: FormatOptions
): string {
  const d = parseDate(date);
  const opts = { ...defaultFormatOptions, ...options };

  const formats: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  };

  return new Intl.DateTimeFormat(opts.locale, {
    ...formats[pattern],
    timeZone: opts.timeZone,
  }).format(d);
}

/**
 * Format time
 */
export function formatTime(
  date: string | number | Date,
  pattern: 'short' | 'medium' | 'long' = 'short',
  options?: FormatOptions
): string {
  const d = parseDate(date);
  const opts = { ...defaultFormatOptions, ...options };

  const formats: Record<string, Intl.DateTimeFormatOptions> = {
    short: { hour: 'numeric', minute: '2-digit' },
    medium: { hour: 'numeric', minute: '2-digit', second: '2-digit' },
    long: { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' },
  };

  return new Intl.DateTimeFormat(opts.locale, {
    ...formats[pattern],
    timeZone: opts.timeZone,
  }).format(d);
}

/**
 * Format date and time
 */
export function formatDateTime(
  date: string | number | Date,
  datePattern: 'short' | 'medium' | 'long' = 'medium',
  timePattern: 'short' | 'medium' | 'long' = 'short',
  options?: FormatOptions
): string {
  return `${formatDate(date, datePattern, options)} ${formatTime(date, timePattern, options)}`;
}

/**
 * Format relative time
 */
export function formatRelative(date: string | number | Date, options?: FormatOptions): string {
  const d = parseDate(date);
  const now = new Date();
  const opts = { ...defaultFormatOptions, ...options };

  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  const rtf = new Intl.RelativeTimeFormat(opts.locale, { numeric: 'auto' });

  if (Math.abs(diffSec) < 60) {
    return rtf.format(-Math.sign(diffMs) * Math.abs(diffSec), 'second');
  }
  if (Math.abs(diffMin) < 60) {
    return rtf.format(-diffMin, 'minute');
  }
  if (Math.abs(diffHour) < 24) {
    return rtf.format(-diffHour, 'hour');
  }
  if (Math.abs(diffDay) < 7) {
    return rtf.format(-diffDay, 'day');
  }
  if (Math.abs(diffWeek) < 4) {
    return rtf.format(-diffWeek, 'week');
  }
  if (Math.abs(diffMonth) < 12) {
    return rtf.format(-diffMonth, 'month');
  }

  return rtf.format(-diffYear, 'year');
}

/**
 * Format duration
 */
export function formatDuration(ms: number, options?: { verbose?: boolean }): string {
  const verbose = options?.verbose ?? false;

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (verbose) {
    const parts: string[] = [];

    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours % 24 > 0) parts.push(`${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`);
    if (seconds % 60 > 0 && days === 0)
      parts.push(`${seconds % 60} second${seconds % 60 !== 1 ? 's' : ''}`);

    return parts.join(', ') || '0 seconds';
  }

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }

  return `${seconds}s`;
}

/**
 * Check if date is today
 */
export function isToday(date: string | number | Date): boolean {
  const d = parseDate(date);
  const today = new Date();

  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if date is yesterday
 */
export function isYesterday(date: string | number | Date): boolean {
  const d = parseDate(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Check if date is within the last N days
 */
export function isWithinDays(date: string | number | Date, days: number): boolean {
  const d = parseDate(date);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);

  return d >= threshold;
}

/**
 * Get start of day
 */
export function startOfDay(date: string | number | Date): Date {
  const d = parseDate(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 */
export function endOfDay(date: string | number | Date): Date {
  const d = parseDate(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Add time to date
 */
export function addTime(
  date: string | number | Date,
  amount: number,
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'
): Date {
  const d = parseDate(date);

  switch (unit) {
    case 'seconds':
      d.setSeconds(d.getSeconds() + amount);
      break;
    case 'minutes':
      d.setMinutes(d.getMinutes() + amount);
      break;
    case 'hours':
      d.setHours(d.getHours() + amount);
      break;
    case 'days':
      d.setDate(d.getDate() + amount);
      break;
    case 'weeks':
      d.setDate(d.getDate() + amount * 7);
      break;
    case 'months':
      d.setMonth(d.getMonth() + amount);
      break;
    case 'years':
      d.setFullYear(d.getFullYear() + amount);
      break;
  }

  return d;
}

/**
 * Get difference between dates
 */
export function dateDiff(
  date1: string | number | Date,
  date2: string | number | Date,
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years'
): number {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  const diffMs = d2.getTime() - d1.getTime();

  switch (unit) {
    case 'seconds':
      return Math.floor(diffMs / 1000);
    case 'minutes':
      return Math.floor(diffMs / (1000 * 60));
    case 'hours':
      return Math.floor(diffMs / (1000 * 60 * 60));
    case 'days':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    case 'weeks':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
    case 'months':
      return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
    case 'years':
      return d2.getFullYear() - d1.getFullYear();
  }
}
