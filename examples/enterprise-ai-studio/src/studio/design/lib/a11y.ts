/**
 * Accessibility audit (feature #8).
 *
 * A lightweight, dependency-free WCAG sniff over an artifact's HTML string:
 * missing alt text, unlabeled controls, document language, heading-order
 * jumps, and low text/background contrast. Each issue carries an optional
 * autofix that rewrites the markup.
 */

export type A11ySeverity = 'error' | 'warning';

export interface A11yIssue {
  id: string;
  rule: string;
  severity: A11ySeverity;
  message: string;
  /** When present, applying it yields a corrected HTML string. */
  fix?: (html: string) => string;
}

export interface A11yReport {
  issues: A11yIssue[];
  score: number;
}

/** Relative luminance per WCAG 2.x. */
export function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (rgb == null) return 1;
  const channels = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

/** WCAG contrast ratio between two hex colors (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (m?.[1] == null) {
    const short = /^#?([0-9a-f]{3})$/i.exec(hex.trim());
    if (short?.[1] == null) return null;
    const [r, g, b] = short[1].split('');
    return { r: parseInt(`${r}${r}`, 16), g: parseInt(`${g}${g}`, 16), b: parseInt(`${b}${b}`, 16) };
  }
  const v = m[1];
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

export function auditHtml(html: string): A11yReport {
  const issues: A11yIssue[] = [];

  // Images without alt.
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  const missingAlt = imgs.filter((tag) => !/\balt\s*=/.test(tag)).length;
  if (missingAlt > 0) {
    issues.push({
      id: 'img-alt',
      rule: 'WCAG 1.1.1',
      severity: 'error',
      message: `${missingAlt} image${missingAlt > 1 ? 's' : ''} missing alt text`,
      fix: (h) => h.replace(/<img\b((?:(?!alt=)[^>])*?)\s*\/?>/gi, '<img$1 alt="" />'),
    });
  }

  // Document language.
  if (/<html\b/i.test(html) && !/<html\b[^>]*\blang=/i.test(html)) {
    issues.push({
      id: 'html-lang',
      rule: 'WCAG 3.1.1',
      severity: 'warning',
      message: '<html> is missing a lang attribute',
      fix: (h) => h.replace(/<html\b/i, '<html lang="en"'),
    });
  }

  // Buttons / links with no accessible name.
  const emptyButtons = (html.match(/<button\b[^>]*>\s*<\/button>/gi) ?? []).length;
  if (emptyButtons > 0) {
    issues.push({
      id: 'button-name',
      rule: 'WCAG 4.1.2',
      severity: 'error',
      message: `${emptyButtons} button${emptyButtons > 1 ? 's' : ''} have no accessible label`,
    });
  }

  // Heading order jumps (h1 → h3 with no h2).
  const headings = [...html.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
  for (let i = 1; i < headings.length; i += 1) {
    if (headings[i]! - headings[i - 1]! > 1) {
      issues.push({
        id: 'heading-order',
        rule: 'WCAG 1.3.1',
        severity: 'warning',
        message: `Heading level jumps from h${headings[i - 1]} to h${headings[i]}`,
      });
      break;
    }
  }

  // Inline color contrast (a coarse check on `color`/`background` pairs).
  const colorDecl = /color:\s*(#[0-9a-f]{3,6})/i.exec(html);
  const bgDecl = /background(?:-color)?:\s*(#[0-9a-f]{3,6})/i.exec(html);
  if (colorDecl?.[1] != null && bgDecl?.[1] != null) {
    const ratio = contrastRatio(colorDecl[1], bgDecl[1]);
    if (ratio < 4.5) {
      issues.push({
        id: 'contrast',
        rule: 'WCAG 1.4.3',
        severity: 'warning',
        message: `Text contrast ${ratio.toFixed(2)}:1 is below the 4.5:1 minimum`,
      });
    }
  }

  const errorWeight = issues.filter((i) => i.severity === 'error').length * 20;
  const warnWeight = issues.filter((i) => i.severity === 'warning').length * 8;
  const score = Math.max(0, 100 - errorWeight - warnWeight);
  return { issues, score };
}

/** Apply every issue that ships an autofix, in order. */
export function applyAutofixes(html: string, report: A11yReport): string {
  return report.issues.reduce((acc, issue) => (issue.fix != null ? issue.fix(acc) : acc), html);
}
