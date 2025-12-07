/**
 * Coverage Reporting Utilities
 *
 * Utilities for collecting, analyzing, and reporting test coverage data.
 * Framework-agnostic and works with various coverage tools.
 *
 * @module @missionfabric-js/enzyme-typescript/testing/coverage
 * @example
 * ```typescript
 * import { CoverageCollector, calculateCoverage } from '@missionfabric-js/enzyme-typescript/testing/coverage';
 *
 * const collector = new CoverageCollector();
 * const report = collector.generateReport();
 * console.log(`Coverage: ${report.lineCoverage}%`);
 * ```
 */

import type { CoverageReport, FileCoverage, CoverageThresholds } from './types';

/**
 * Coverage data for a single file
 */
interface FileCoverageData {
  path: string;
  statements: {
    total: number;
    covered: number;
    locations: Array<{ line: number; covered: boolean }>;
  };
  branches: {
    total: number;
    covered: number;
    locations: Array<{ line: number; branch: number; covered: boolean }>;
  };
  functions: {
    total: number;
    covered: number;
    locations: Array<{ name: string; line: number; covered: boolean }>;
  };
  lines: {
    total: number;
    covered: number;
    locations: Array<{ line: number; covered: boolean }>;
  };
}

/**
 * Coverage collector for tracking test coverage
 */
export class CoverageCollector {
  private files = new Map<string, FileCoverageData>();

  /**
   * Add file coverage data
   *
   * @param data File coverage data
   *
   * @example
   * ```typescript
   * collector.addFile({
   *   path: 'src/utils.ts',
   *   statements: { total: 10, covered: 8, locations: [] },
   *   branches: { total: 4, covered: 3, locations: [] },
   *   functions: { total: 3, covered: 3, locations: [] },
   *   lines: { total: 10, covered: 8, locations: [] }
   * });
   * ```
   */
  addFile(data: FileCoverageData): void {
    this.files.set(data.path, data);
  }

  /**
   * Get coverage data for a file
   *
   * @param path File path
   * @returns File coverage data
   *
   * @example
   * ```typescript
   * const coverage = collector.getFile('src/utils.ts');
   * ```
   */
  getFile(path: string): FileCoverageData | undefined {
    return this.files.get(path);
  }

  /**
   * Generate coverage report
   *
   * @returns Coverage report
   *
   * @example
   * ```typescript
   * const report = collector.generateReport();
   * console.log(`Line coverage: ${report.lineCoverage}%`);
   * ```
   */
  generateReport(): CoverageReport {
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalLines = 0;
    let coveredLines = 0;

    for (const file of this.files.values()) {
      totalStatements += file.statements.total;
      coveredStatements += file.statements.covered;
      totalBranches += file.branches.total;
      coveredBranches += file.branches.covered;
      totalFunctions += file.functions.total;
      coveredFunctions += file.functions.covered;
      totalLines += file.lines.total;
      coveredLines += file.lines.covered;
    }

    return {
      totalStatements,
      coveredStatements,
      totalBranches,
      coveredBranches,
      totalFunctions,
      coveredFunctions,
      totalLines,
      coveredLines,
      statementCoverage: calculatePercentage(coveredStatements, totalStatements),
      branchCoverage: calculatePercentage(coveredBranches, totalBranches),
      functionCoverage: calculatePercentage(coveredFunctions, totalFunctions),
      lineCoverage: calculatePercentage(coveredLines, totalLines),
    };
  }

  /**
   * Generate file coverage reports
   *
   * @returns Array of file coverage reports
   *
   * @example
   * ```typescript
   * const files = collector.generateFileReports();
   * files.forEach(file => {
   *   console.log(`${file.path}: ${file.lineCoverage}%`);
   * });
   * ```
   */
  generateFileReports(): FileCoverage[] {
    return Array.from(this.files.values()).map((file) => {
      const uncoveredLines = file.lines.locations
        .filter((loc) => !loc.covered)
        .map((loc) => loc.line);

      const uncoveredBranches = file.branches.locations
        .filter((loc) => !loc.covered)
        .map((loc) => ({ line: loc.line, branch: loc.branch }));

      return {
        path: file.path,
        totalStatements: file.statements.total,
        coveredStatements: file.statements.covered,
        totalBranches: file.branches.total,
        coveredBranches: file.branches.covered,
        totalFunctions: file.functions.total,
        coveredFunctions: file.functions.covered,
        totalLines: file.lines.total,
        coveredLines: file.lines.covered,
        statementCoverage: calculatePercentage(file.statements.covered, file.statements.total),
        branchCoverage: calculatePercentage(file.branches.covered, file.branches.total),
        functionCoverage: calculatePercentage(file.functions.covered, file.functions.total),
        lineCoverage: calculatePercentage(file.lines.covered, file.lines.total),
        uncoveredLines,
        uncoveredBranches,
      };
    });
  }

  /**
   * Check if coverage meets thresholds
   *
   * @param thresholds Coverage thresholds
   * @returns Validation result
   *
   * @example
   * ```typescript
   * const result = collector.checkThresholds({
   *   statements: 80,
   *   branches: 70,
   *   functions: 80,
   *   lines: 80
   * });
   *
   * if (!result.passed) {
   *   console.error('Coverage thresholds not met:', result.failures);
   * }
   * ```
   */
  checkThresholds(thresholds: CoverageThresholds): {
    passed: boolean;
    failures: string[];
  } {
    const report = this.generateReport();
    const failures: string[] = [];

    if (thresholds.statements && report.statementCoverage < thresholds.statements) {
      failures.push(
        `Statement coverage ${report.statementCoverage.toFixed(2)}% is below threshold ${thresholds.statements}%`
      );
    }

    if (thresholds.branches && report.branchCoverage < thresholds.branches) {
      failures.push(
        `Branch coverage ${report.branchCoverage.toFixed(2)}% is below threshold ${thresholds.branches}%`
      );
    }

    if (thresholds.functions && report.functionCoverage < thresholds.functions) {
      failures.push(
        `Function coverage ${report.functionCoverage.toFixed(2)}% is below threshold ${thresholds.functions}%`
      );
    }

    if (thresholds.lines && report.lineCoverage < thresholds.lines) {
      failures.push(
        `Line coverage ${report.lineCoverage.toFixed(2)}% is below threshold ${thresholds.lines}%`
      );
    }

    return {
      passed: failures.length === 0,
      failures,
    };
  }

  /**
   * Get files below coverage threshold
   *
   * @param threshold Minimum coverage percentage
   * @returns Files below threshold
   *
   * @example
   * ```typescript
   * const lowCoverage = collector.getFilesBelowThreshold(80);
   * lowCoverage.forEach(file => {
   *   console.log(`${file.path}: ${file.lineCoverage}%`);
   * });
   * ```
   */
  getFilesBelowThreshold(threshold: number): FileCoverage[] {
    return this.generateFileReports().filter((file) => file.lineCoverage < threshold);
  }

  /**
   * Clear all coverage data
   *
   * @example
   * ```typescript
   * collector.clear();
   * ```
   */
  clear(): void {
    this.files.clear();
  }

  /**
   * Get number of tracked files
   *
   * @returns File count
   *
   * @example
   * ```typescript
   * console.log(`Tracking ${collector.fileCount()} files`);
   * ```
   */
  fileCount(): number {
    return this.files.size;
  }
}

/**
 * Calculate coverage percentage
 *
 * @param covered Number of covered items
 * @param total Total number of items
 * @returns Percentage (0-100)
 *
 * @example
 * ```typescript
 * const coverage = calculateCoverage(80, 100);
 * console.log(`${coverage}% coverage`);
 * ```
 */
export function calculateCoverage(covered: number, total: number): number {
  return calculatePercentage(covered, total);
}

/**
 * Calculate percentage helper
 */
function calculatePercentage(covered: number, total: number): number {
  if (total === 0) return 100;
  return (covered / total) * 100;
}

/**
 * Format coverage report as string
 *
 * @param report Coverage report
 * @param options Format options
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * const report = collector.generateReport();
 * const formatted = formatCoverageReport(report);
 * console.log(formatted);
 * ```
 */
export function formatCoverageReport(
  report: CoverageReport,
  options: {
    colors?: boolean;
    detailed?: boolean;
  } = {}
): string {
  const lines: string[] = [];

  lines.push('Coverage Report');
  lines.push('===============');
  lines.push('');

  lines.push(
    `Statements: ${report.coveredStatements}/${report.totalStatements} (${report.statementCoverage.toFixed(2)}%)`
  );
  lines.push(
    `Branches:   ${report.coveredBranches}/${report.totalBranches} (${report.branchCoverage.toFixed(2)}%)`
  );
  lines.push(
    `Functions:  ${report.coveredFunctions}/${report.totalFunctions} (${report.functionCoverage.toFixed(2)}%)`
  );
  lines.push(
    `Lines:      ${report.coveredLines}/${report.totalLines} (${report.lineCoverage.toFixed(2)}%)`
  );

  return lines.join('\n');
}

/**
 * Format file coverage report as string
 *
 * @param file File coverage report
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * const fileCoverage = collector.generateFileReports()[0];
 * const formatted = formatFileCoverage(fileCoverage);
 * console.log(formatted);
 * ```
 */
export function formatFileCoverage(file: FileCoverage): string {
  const lines: string[] = [];

  lines.push(`File: ${file.path}`);
  lines.push('─'.repeat(50));
  lines.push(`Lines:      ${file.lineCoverage.toFixed(2)}%`);
  lines.push(`Statements: ${file.statementCoverage.toFixed(2)}%`);
  lines.push(`Branches:   ${file.branchCoverage.toFixed(2)}%`);
  lines.push(`Functions:  ${file.functionCoverage.toFixed(2)}%`);

  if (file.uncoveredLines.length > 0) {
    lines.push('');
    lines.push(`Uncovered Lines: ${file.uncoveredLines.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Generate coverage summary
 *
 * @param report Coverage report
 * @returns Summary string
 *
 * @example
 * ```typescript
 * const summary = coverageSummary(report);
 * console.log(summary);
 * ```
 */
export function coverageSummary(report: CoverageReport): string {
  const avg =
    (report.statementCoverage +
      report.branchCoverage +
      report.functionCoverage +
      report.lineCoverage) /
    4;

  return `Overall: ${avg.toFixed(2)}% | Statements: ${report.statementCoverage.toFixed(2)}% | Branches: ${report.branchCoverage.toFixed(2)}% | Functions: ${report.functionCoverage.toFixed(2)}% | Lines: ${report.lineCoverage.toFixed(2)}%`;
}

/**
 * Merge multiple coverage reports
 *
 * @param reports Coverage reports to merge
 * @returns Merged coverage report
 *
 * @example
 * ```typescript
 * const merged = mergeCoverageReports([report1, report2, report3]);
 * ```
 */
export function mergeCoverageReports(reports: CoverageReport[]): CoverageReport {
  const merged: CoverageReport = {
    totalStatements: 0,
    coveredStatements: 0,
    totalBranches: 0,
    coveredBranches: 0,
    totalFunctions: 0,
    coveredFunctions: 0,
    totalLines: 0,
    coveredLines: 0,
    statementCoverage: 0,
    branchCoverage: 0,
    functionCoverage: 0,
    lineCoverage: 0,
  };

  for (const report of reports) {
    merged.totalStatements += report.totalStatements;
    merged.coveredStatements += report.coveredStatements;
    merged.totalBranches += report.totalBranches;
    merged.coveredBranches += report.coveredBranches;
    merged.totalFunctions += report.totalFunctions;
    merged.coveredFunctions += report.coveredFunctions;
    merged.totalLines += report.totalLines;
    merged.coveredLines += report.coveredLines;
  }

  merged.statementCoverage = calculatePercentage(merged.coveredStatements, merged.totalStatements);
  merged.branchCoverage = calculatePercentage(merged.coveredBranches, merged.totalBranches);
  merged.functionCoverage = calculatePercentage(merged.coveredFunctions, merged.totalFunctions);
  merged.lineCoverage = calculatePercentage(merged.coveredLines, merged.totalLines);

  return merged;
}

/**
 * Compare two coverage reports
 *
 * @param before Previous coverage report
 * @param after Current coverage report
 * @returns Coverage delta
 *
 * @example
 * ```typescript
 * const delta = compareCoverage(previousReport, currentReport);
 * console.log(`Coverage change: ${delta.lineCoverage > 0 ? '+' : ''}${delta.lineCoverage}%`);
 * ```
 */
export function compareCoverage(before: CoverageReport, after: CoverageReport): {
  statementCoverage: number;
  branchCoverage: number;
  functionCoverage: number;
  lineCoverage: number;
} {
  return {
    statementCoverage: after.statementCoverage - before.statementCoverage,
    branchCoverage: after.branchCoverage - before.branchCoverage,
    functionCoverage: after.functionCoverage - before.functionCoverage,
    lineCoverage: after.lineCoverage - before.lineCoverage,
  };
}

/**
 * Get coverage badge color
 *
 * @param percentage Coverage percentage
 * @returns Badge color (brightgreen, green, yellow, orange, red)
 *
 * @example
 * ```typescript
 * const color = getCoverageBadgeColor(85);
 * console.log(color); // 'green'
 * ```
 */
export function getCoverageBadgeColor(percentage: number): string {
  if (percentage >= 90) return 'brightgreen';
  if (percentage >= 80) return 'green';
  if (percentage >= 70) return 'yellow';
  if (percentage >= 60) return 'orange';
  return 'red';
}

/**
 * Generate coverage badge URL (shields.io)
 *
 * @param report Coverage report
 * @param type Coverage type (lines, statements, branches, functions)
 * @returns Badge URL
 *
 * @example
 * ```typescript
 * const url = getCoverageBadgeUrl(report, 'lines');
 * // Use in README: ![Coverage](url)
 * ```
 */
export function getCoverageBadgeUrl(
  report: CoverageReport,
  type: 'lines' | 'statements' | 'branches' | 'functions' = 'lines'
): string {
  const coverageMap = {
    lines: report.lineCoverage,
    statements: report.statementCoverage,
    branches: report.branchCoverage,
    functions: report.functionCoverage,
  };

  const percentage = coverageMap[type];
  const color = getCoverageBadgeColor(percentage);

  return `https://img.shields.io/badge/coverage-${percentage.toFixed(0)}%25-${color}`;
}

/**
 * Create a minimal coverage report
 *
 * @param covered Number of covered items
 * @param total Total number of items
 * @returns Coverage report
 *
 * @example
 * ```typescript
 * const report = createCoverageReport(80, 100);
 * ```
 */
export function createCoverageReport(covered: number, total: number): CoverageReport {
  const percentage = calculatePercentage(covered, total);

  return {
    totalStatements: total,
    coveredStatements: covered,
    totalBranches: 0,
    coveredBranches: 0,
    totalFunctions: 0,
    coveredFunctions: 0,
    totalLines: total,
    coveredLines: covered,
    statementCoverage: percentage,
    branchCoverage: 0,
    functionCoverage: 0,
    lineCoverage: percentage,
  };
}
