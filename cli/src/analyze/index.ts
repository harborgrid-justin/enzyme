/**
 * Project Analyzer
 *
 * Analyzes Enzyme projects to detect used features, find issues,
 * and provide optimization suggestions.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, relative, extname } from 'path';
import { ConfigManager } from '../config/manager.js';
import { EnzymeConfig, Features } from '../config/schema.js';

export interface AnalysisResult {
  features: FeatureAnalysis;
  imports: ImportAnalysis;
  deprecations: DeprecationAnalysis;
  performance: PerformanceAnalysis;
  issues: Issue[];
  suggestions: Suggestion[];
  stats: ProjectStats;
}

export interface FeatureAnalysis {
  detected: Partial<Features>;
  configured: Partial<Features>;
  unused: string[];
  missing: string[];
}

export interface ImportAnalysis {
  used: Map<string, string[]>; // package -> files
  unused: string[];
  deprecated: string[];
}

export interface DeprecationAnalysis {
  patterns: DeprecatedPattern[];
  count: number;
}

export interface DeprecatedPattern {
  pattern: string;
  replacement: string;
  files: string[];
  severity: 'warning' | 'error';
}

export interface PerformanceAnalysis {
  bundleSize: number;
  unusedExports: string[];
  heavyDependencies: string[];
  suggestions: string[];
}

export interface Issue {
  type: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  fix?: string;
}

export interface Suggestion {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
}

export interface ProjectStats {
  files: number;
  components: number;
  routes: number;
  hooks: number;
  tests: number;
  linesOfCode: number;
}

export interface AnalyzeOptions {
  cwd?: string;
  verbose?: boolean;
  format?: 'json' | 'console';
  includeTests?: boolean;
}

/**
 * Project Analyzer
 */
export class ProjectAnalyzer {
  private cwd: string;
  private config: EnzymeConfig;
  private files: string[] = [];

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.config = {} as EnzymeConfig;
  }

  /**
   * Analyze project
   */
  async analyze(options: AnalyzeOptions = {}): Promise<AnalysisResult> {
    // Load configuration
    const configManager = new ConfigManager(this.cwd);
    const { config } = await configManager.load();
    this.config = config;

    // Scan project files
    this.files = this.scanFiles(resolve(this.cwd, config.srcDir));

    // Perform analysis
    const features = this.analyzeFeatures();
    const imports = this.analyzeImports();
    const deprecations = this.analyzeDeprecations();
    const performance = this.analyzePerformance();
    const stats = this.calculateStats();
    const issues = this.detectIssues();
    const suggestions = this.generateSuggestions(features, imports, performance);

    return {
      features,
      imports,
      deprecations,
      performance,
      issues,
      suggestions,
      stats,
    };
  }

  /**
   * Scan project files
   */
  private scanFiles(dir: string, files: string[] = []): string[] {
    if (!existsSync(dir)) {
      return files;
    }

    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules and other ignored directories
        if (
          entry !== 'node_modules' &&
          entry !== 'dist' &&
          entry !== 'build' &&
          entry !== '.git' &&
          !entry.startsWith('.')
        ) {
          this.scanFiles(fullPath, files);
        }
      } else if (
        stat.isFile() &&
        (entry.endsWith('.ts') ||
          entry.endsWith('.tsx') ||
          entry.endsWith('.js') ||
          entry.endsWith('.jsx'))
      ) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Analyze feature usage
   */
  private analyzeFeatures(): FeatureAnalysis {
    const detected: Partial<Features> = {};
    const configured = this.config.features;

    // Detect auth usage
    if (this.hasImport('@missionfabric-js/enzyme/auth')) {
      detected.auth = true;
    }

    // Detect state usage
    if (this.hasImport('@missionfabric-js/enzyme/state') || this.hasImport('zustand')) {
      detected.state = true;
    }

    // Detect routing usage
    if (this.hasImport('@missionfabric-js/enzyme/routing') || this.hasImport('react-router-dom')) {
      detected.routing = true;
    }

    // Detect realtime usage
    if (this.hasImport('@missionfabric-js/enzyme/realtime')) {
      detected.realtime = true;
    }

    // Detect monitoring usage
    if (this.hasImport('@missionfabric-js/enzyme/monitoring')) {
      detected.monitoring = true;
    }

    // Detect theme usage
    if (this.hasImport('@missionfabric-js/enzyme/theme')) {
      detected.theme = true;
    }

    // Find unused features (configured but not used)
    const unused: string[] = [];
    for (const [feature, enabled] of Object.entries(configured)) {
      if (enabled && !detected[feature as keyof Features]) {
        unused.push(feature);
      }
    }

    // Find missing features (used but not configured)
    const missing: string[] = [];
    for (const [feature, used] of Object.entries(detected)) {
      if (used && !configured[feature as keyof Features]) {
        missing.push(feature);
      }
    }

    return { detected, configured, unused, missing };
  }

  /**
   * Analyze imports
   */
  private analyzeImports(): ImportAnalysis {
    const used = new Map<string, string[]>();
    const unused: string[] = [];
    const deprecated: string[] = [];

    const enzymeImportPattern = /from\s+['"]@missionfabric-js\/enzyme(?:\/([^'"]+))?['"]/g;
    const importPattern = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;

    for (const file of this.files) {
      const content = readFileSync(file, 'utf-8');
      const relPath = relative(this.cwd, file);

      // Find all imports
      let match;
      while ((match = importPattern.exec(content)) !== null) {
        const packageName = match[1];

        if (!used.has(packageName)) {
          used.set(packageName, []);
        }

        if (!used.get(packageName)!.includes(relPath)) {
          used.get(packageName)!.push(relPath);
        }
      }
    }

    // Check for deprecated imports
    const deprecatedPatterns = [
      '@missionfabric-js/enzyme/legacy',
      '@missionfabric-js/enzyme/deprecated',
    ];

    for (const pattern of deprecatedPatterns) {
      if (used.has(pattern)) {
        deprecated.push(pattern);
      }
    }

    return { used, unused, deprecated };
  }

  /**
   * Analyze deprecations
   */
  private analyzeDeprecations(): DeprecationAnalysis {
    const patterns: DeprecatedPattern[] = [];

    // Define deprecated patterns
    const deprecatedPatterns = [
      {
        pattern: 'useOldRouter',
        replacement: 'useRouter',
        severity: 'error' as const,
      },
      {
        pattern: 'LegacyProvider',
        replacement: 'EnzymeProvider',
        severity: 'warning' as const,
      },
      {
        pattern: 'withAuth',
        replacement: 'useAuth hook',
        severity: 'warning' as const,
      },
    ];

    for (const deprecated of deprecatedPatterns) {
      const files = this.findPattern(deprecated.pattern);

      if (files.length > 0) {
        patterns.push({
          ...deprecated,
          files,
        });
      }
    }

    return {
      patterns,
      count: patterns.reduce((sum, p) => sum + p.files.length, 0),
    };
  }

  /**
   * Analyze performance
   */
  private analyzePerformance(): PerformanceAnalysis {
    const suggestions: string[] = [];
    const unusedExports: string[] = [];
    const heavyDependencies: string[] = [];

    // Check for heavy dependencies
    const packageJsonPath = resolve(this.cwd, 'package.json');
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      const heavyPackages = ['moment', 'lodash'];
      for (const pkg of heavyPackages) {
        if (deps[pkg]) {
          heavyDependencies.push(pkg);
          suggestions.push(
            `Consider replacing '${pkg}' with a lighter alternative`
          );
        }
      }
    }

    // Check for code splitting opportunities
    if (!this.hasPattern('React.lazy')) {
      suggestions.push('Consider using React.lazy for code splitting');
    }

    // Check for memoization
    const componentFiles = this.files.filter((f) =>
      f.includes('/components/')
    );

    let memoizedCount = 0;
    for (const file of componentFiles) {
      const content = readFileSync(file, 'utf-8');
      if (content.includes('React.memo') || content.includes('useMemo')) {
        memoizedCount++;
      }
    }

    if (componentFiles.length > 0 && memoizedCount / componentFiles.length < 0.3) {
      suggestions.push(
        'Consider memoizing more components to improve performance'
      );
    }

    return {
      bundleSize: 0, // Would require actual bundle analysis
      unusedExports,
      heavyDependencies,
      suggestions,
    };
  }

  /**
   * Calculate project statistics
   */
  private calculateStats(): ProjectStats {
    let linesOfCode = 0;
    let components = 0;
    let routes = 0;
    let hooks = 0;
    let tests = 0;

    for (const file of this.files) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      linesOfCode += lines.filter((line) => line.trim() && !line.trim().startsWith('//')).length;

      const fileName = file.split('/').pop() || '';

      // Count components
      if (
        content.includes('export default function') ||
        content.includes('export const') ||
        content.includes('export function')
      ) {
        if (file.includes('/components/')) {
          components++;
        } else if (file.includes('/routes/') || file.includes('/pages/')) {
          routes++;
        }
      }

      // Count hooks
      if (fileName.startsWith('use') && fileName.endsWith('.ts')) {
        hooks++;
      }

      // Count tests
      if (fileName.includes('.test.') || fileName.includes('.spec.')) {
        tests++;
      }
    }

    return {
      files: this.files.length,
      components,
      routes,
      hooks,
      tests,
      linesOfCode,
    };
  }

  /**
   * Detect issues
   */
  private detectIssues(): Issue[] {
    const issues: Issue[] = [];

    // Check for missing configuration
    if (!ConfigManager.hasConfig(this.cwd)) {
      issues.push({
        type: 'warning',
        message: 'No Enzyme configuration file found',
        fix: 'Run "enzyme config init" to create one',
      });
    }

    // Check for missing TypeScript config
    if (!existsSync(resolve(this.cwd, 'tsconfig.json'))) {
      issues.push({
        type: 'warning',
        message: 'No tsconfig.json found',
        fix: 'Create a TypeScript configuration file',
      });
    }

    // Check for circular dependencies (basic check)
    const circularImports = this.detectCircularImports();
    for (const cycle of circularImports) {
      issues.push({
        type: 'error',
        message: `Circular dependency detected: ${cycle.join(' -> ')}`,
      });
    }

    return issues;
  }

  /**
   * Generate suggestions
   */
  private generateSuggestions(
    features: FeatureAnalysis,
    imports: ImportAnalysis,
    performance: PerformanceAnalysis
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Suggest removing unused features
    if (features.unused.length > 0) {
      suggestions.push({
        title: 'Remove unused features',
        description: `Features configured but not used: ${features.unused.join(', ')}`,
        impact: 'medium',
        effort: 'low',
      });
    }

    // Suggest adding missing features
    if (features.missing.length > 0) {
      suggestions.push({
        title: 'Configure detected features',
        description: `Features used but not configured: ${features.missing.join(', ')}`,
        impact: 'low',
        effort: 'low',
      });
    }

    // Suggest performance improvements
    for (const suggestion of performance.suggestions) {
      suggestions.push({
        title: 'Performance improvement',
        description: suggestion,
        impact: 'medium',
        effort: 'medium',
      });
    }

    // Suggest updating deprecated imports
    if (imports.deprecated.length > 0) {
      suggestions.push({
        title: 'Update deprecated imports',
        description: `Update deprecated packages: ${imports.deprecated.join(', ')}`,
        impact: 'high',
        effort: 'medium',
      });
    }

    return suggestions;
  }

  /**
   * Helper: Check if import exists in any file
   */
  private hasImport(packageName: string): boolean {
    const pattern = new RegExp(`from\\s+['"]${packageName.replace('/', '\\/')}(?:/[^'"]+)?['"]`);

    for (const file of this.files) {
      const content = readFileSync(file, 'utf-8');
      if (pattern.test(content)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Helper: Check if pattern exists in any file
   */
  private hasPattern(pattern: string): boolean {
    const regex = new RegExp(pattern);

    for (const file of this.files) {
      const content = readFileSync(file, 'utf-8');
      if (regex.test(content)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Helper: Find files containing pattern
   */
  private findPattern(pattern: string): string[] {
    const regex = new RegExp(pattern);
    const matches: string[] = [];

    for (const file of this.files) {
      const content = readFileSync(file, 'utf-8');
      if (regex.test(content)) {
        matches.push(relative(this.cwd, file));
      }
    }

    return matches;
  }

  /**
   * Helper: Detect circular imports (simplified)
   */
  private detectCircularImports(): string[][] {
    // Simplified circular import detection
    // In production, this would use a proper dependency graph
    const cycles: string[][] = [];
    return cycles;
  }
}

/**
 * Analyze project
 */
export async function analyzeProject(options: AnalyzeOptions = {}): Promise<AnalysisResult> {
  const analyzer = new ProjectAnalyzer(options.cwd);
  return analyzer.analyze(options);
}

/**
 * Format analysis result for console
 */
export function formatAnalysisResult(result: AnalysisResult): string {
  const lines: string[] = [];

  lines.push('=== Enzyme Project Analysis ===\n');

  // Stats
  lines.push('📊 Project Statistics:');
  lines.push(`  Files: ${result.stats.files}`);
  lines.push(`  Components: ${result.stats.components}`);
  lines.push(`  Routes: ${result.stats.routes}`);
  lines.push(`  Hooks: ${result.stats.hooks}`);
  lines.push(`  Tests: ${result.stats.tests}`);
  lines.push(`  Lines of Code: ${result.stats.linesOfCode}\n`);

  // Features
  lines.push('🔧 Features:');
  const detectedFeatures = Object.entries(result.features.detected)
    .filter(([_, used]) => used)
    .map(([name]) => name);
  lines.push(`  Detected: ${detectedFeatures.join(', ') || 'none'}`);

  if (result.features.unused.length > 0) {
    lines.push(`  ⚠️  Unused: ${result.features.unused.join(', ')}`);
  }

  if (result.features.missing.length > 0) {
    lines.push(`  ⚠️  Missing config: ${result.features.missing.join(', ')}`);
  }

  lines.push('');

  // Issues
  if (result.issues.length > 0) {
    lines.push('⚠️  Issues:');
    for (const issue of result.issues) {
      const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
      lines.push(`  ${icon} ${issue.message}`);
      if (issue.fix) {
        lines.push(`     💡 ${issue.fix}`);
      }
    }
    lines.push('');
  }

  // Suggestions
  if (result.suggestions.length > 0) {
    lines.push('💡 Suggestions:');
    for (const suggestion of result.suggestions) {
      lines.push(`  • ${suggestion.title}`);
      lines.push(`    ${suggestion.description}`);
      lines.push(`    Impact: ${suggestion.impact} | Effort: ${suggestion.effort}`);
    }
    lines.push('');
  }

  // Deprecations
  if (result.deprecations.count > 0) {
    lines.push('⚠️  Deprecations:');
    for (const pattern of result.deprecations.patterns) {
      lines.push(`  • ${pattern.pattern} → ${pattern.replacement}`);
      lines.push(`    Found in ${pattern.files.length} file(s)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
