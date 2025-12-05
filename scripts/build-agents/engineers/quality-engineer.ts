/**
 * Quality Engineer Agent
 * Handles code quality analysis and metrics
 */

import { BaseAgent, createAgentConfig, icons, colors } from '../base-agent.js';
import type { BuildConfig, QualityResult, QualityMetrics, QualityIssue } from '../types.js';
import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export class QualityEngineer extends BaseAgent<QualityResult> {
  constructor(buildConfig: BuildConfig) {
    super(
      createAgentConfig(
        'quality-engineer',
        'Quality Engineer',
        'Analyzes code quality metrics and complexity',
        {
          dependencies: [
            { agentId: 'lint-engineer', required: false },
          ],
          timeout: 300000, // 5 minutes
          priority: 5,
          parallel: true,
        }
      ),
      buildConfig
    );
  }

  protected async executeTask(): Promise<QualityResult> {
    this.log('info', `${icons.quality} Starting code quality analysis...`);
    this.reportProgress(10, 'Initializing quality analyzer');

    const issues: QualityIssue[] = [];

    // Analyze main package
    this.reportProgress(30, 'Analyzing main package code quality');
    const mainMetrics = await this.analyzePackage(join(process.cwd(), 'src'), 'main');

    // Analyze TypeScript package
    this.reportProgress(60, 'Analyzing TypeScript package code quality');
    const tsMetrics = await this.analyzePackage(join(process.cwd(), 'typescript', 'src'), 'typescript');

    this.reportProgress(90, 'Calculating quality score');

    // Combine metrics
    const metrics: QualityMetrics = {
      complexity: Math.round((mainMetrics.complexity + tsMetrics.complexity) / 2),
      maintainability: Math.round((mainMetrics.maintainability + tsMetrics.maintainability) / 2),
      duplications: mainMetrics.duplications + tsMetrics.duplications,
      codeSmells: mainMetrics.codeSmells + tsMetrics.codeSmells,
      technicalDebt: mainMetrics.technicalDebt + tsMetrics.technicalDebt,
    };

    // Calculate quality score (0-100)
    const score = this.calculateScore(metrics);
    const grade = this.getGrade(score);

    this.reportProgress(100, 'Quality analysis complete');

    this.log('success', `${icons.success} Quality analysis complete`);
    this.log('info', `  ${colors.cyan}Quality Score:${colors.reset} ${score}/100 (Grade: ${grade})`);
    this.log('info', `  ${colors.cyan}Complexity:${colors.reset} ${metrics.complexity}`);
    this.log('info', `  ${colors.cyan}Maintainability:${colors.reset} ${metrics.maintainability}%`);
    this.log('info', `  ${colors.cyan}Code Smells:${colors.reset} ${metrics.codeSmells}`);
    this.log('info', `  ${colors.cyan}Technical Debt:${colors.reset} ${metrics.technicalDebt}h`);

    return {
      score,
      grade,
      metrics,
      issues,
    };
  }

  private async analyzePackage(srcPath: string, name: string): Promise<QualityMetrics> {
    this.log('info', `Analyzing ${name} package at ${srcPath}`);

    if (!existsSync(srcPath)) {
      return {
        complexity: 0,
        maintainability: 100,
        duplications: 0,
        codeSmells: 0,
        technicalDebt: 0,
      };
    }

    const files = this.getAllTsFiles(srcPath);
    let totalComplexity = 0;
    let totalLines = 0;
    let codeSmells = 0;
    let duplications = 0;

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      totalLines += lines.length;

      // Estimate complexity based on control flow statements
      const complexity = this.estimateComplexity(content);
      totalComplexity += complexity;

      // Detect potential code smells
      codeSmells += this.detectCodeSmells(content);

      // Detect potential duplications (simplified)
      duplications += this.detectDuplications(content);
    }

    const avgComplexity = files.length > 0 ? Math.round(totalComplexity / files.length) : 0;
    const maintainability = Math.max(0, Math.min(100, 100 - avgComplexity * 2));
    const technicalDebt = Math.round(codeSmells * 0.5 + duplications * 0.3);

    this.metrics.filesProcessed = (this.metrics.filesProcessed || 0) + files.length;
    this.metrics.linesProcessed = (this.metrics.linesProcessed || 0) + totalLines;

    return {
      complexity: avgComplexity,
      maintainability,
      duplications,
      codeSmells,
      technicalDebt,
    };
  }

  private getAllTsFiles(dir: string): string[] {
    const files: string[] = [];

    const walkDir = (currentDir: string): void => {
      try {
        const items = readdirSync(currentDir);
        for (const item of items) {
          if (item.startsWith('.') || item === 'node_modules' || item === 'dist') {
            continue;
          }

          const fullPath = join(currentDir, item);
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            walkDir(fullPath);
          } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
            if (!item.includes('.test.') && !item.includes('.spec.')) {
              files.push(fullPath);
            }
          }
        }
      } catch {
        // Ignore errors
      }
    };

    walkDir(dir);
    return files;
  }

  private estimateComplexity(content: string): number {
    let complexity = 1; // Base complexity

    // Count control flow statements
    const patterns = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bswitch\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\?\s*[^:]+\s*:/g, // Ternary operators
      /&&/g,
      /\|\|/g,
    ];

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private detectCodeSmells(content: string): number {
    let smells = 0;

    // Long functions (more than 50 lines between braces)
    const functions = content.match(/(?:function|=>)\s*[^{]*\{[^}]{2000,}\}/g);
    smells += functions?.length || 0;

    // Too many parameters (more than 5)
    const manyParams = content.match(/\([^)]{100,}\)/g);
    smells += manyParams?.length || 0;

    // Magic numbers
    const magicNumbers = content.match(/[^a-zA-Z0-9_](\d{3,})[^a-zA-Z0-9_]/g);
    smells += Math.min(magicNumbers?.length || 0, 10);

    // TODO comments
    const todos = content.match(/\/\/\s*TODO/gi);
    smells += todos?.length || 0;

    // @ts-ignore comments
    const tsIgnore = content.match(/@ts-ignore/g);
    smells += (tsIgnore?.length || 0) * 2;

    // any type usage
    const anyType = content.match(/:\s*any\b/g);
    smells += anyType?.length || 0;

    return smells;
  }

  private detectDuplications(content: string): number {
    // Simplified duplication detection
    const lines = content.split('\n').filter((l) => l.trim().length > 20);
    const seen = new Set<string>();
    let duplicates = 0;

    for (const line of lines) {
      const normalized = line.trim();
      if (seen.has(normalized)) {
        duplicates++;
      } else {
        seen.add(normalized);
      }
    }

    return Math.min(duplicates, 50); // Cap at 50
  }

  private calculateScore(metrics: QualityMetrics): number {
    let score = 100;

    // Penalize for complexity (0-30 points)
    score -= Math.min(30, metrics.complexity * 1.5);

    // Reward maintainability (0-30 points)
    score -= Math.max(0, 30 - metrics.maintainability * 0.3);

    // Penalize code smells (0-20 points)
    score -= Math.min(20, metrics.codeSmells * 0.5);

    // Penalize duplications (0-10 points)
    score -= Math.min(10, metrics.duplications * 0.2);

    // Penalize technical debt (0-10 points)
    score -= Math.min(10, metrics.technicalDebt * 0.1);

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}
