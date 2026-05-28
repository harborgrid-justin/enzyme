import clsx, { type ClassValue } from 'clsx';

/** Tiny className joiner — wraps `clsx` so component files don't import it directly. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
