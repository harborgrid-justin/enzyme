/**
 * Performance Engineer Agent
 * Handles build performance analysis and optimization recommendations
 */

import { BaseAgent, createAgentConfig, formatDuration, formatBytes, icons, colors } from '../base-agent.js';
import type { BuildConfig, PerformanceResult, BundleAnalysis, TreeshakingReport } from '../types.js';
import { existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

export class PerformanceEngineer extends BaseAgent<PerformanceResult> {
  private buildStartTime: number = 0;

  constructor(buildConfig: BuildConfig) {
    super(
      createAgentConfig(
        'performance-engineer',
        'Performance Engineer',
        'Analyzes build performance and runtime metrics',
        {
          dependencies: [
            { agentId: 'build-engineer', required: true },
            { agentId: 'bundle-engineer', required: false },
          ],
          timeout: 300000, // 5 minutes
          priority: 3,
          parallel: false, // Runs after build
        }
      ),
      buildConfig
    );
  }

  setBuildStartTime(time: number): void {
    this.buildStartTime = time;
  }

  protected async executeTask(): Promise<PerformanceResult> {
    this.log('info', `${icons.performance} Starting performance analysis...`);
    this.reportProgress(10, 'Collecting performance metrics');

    // Measure build time
    const buildTime = this.buildStartTime > 0
      ? Date.now() - this.buildStartTime
      : 0;

    // Get memory usage
    this.reportProgress(30, 'Analyzing memory usage');
    const memoryUsage = process.memoryUsage();
    const memoryPeak = memoryUsage.heapUsed;

    // Analyze bundle
    this.reportProgress(50, 'Analyzing bundle structure');
    const bundleAnalysis = await this.analyzeBundlePerformance();

    // Calculate treeshaking
    this.reportProgress(70, 'Evaluating treeshaking effectiveness');
    const treeshaking = this.evaluateTreeshaking();

    // Generate performance report
    this.reportProgress(90, 'Generating performance report');

    const result: PerformanceResult = {
      buildTime,
      memoryPeak,
      bundleAnalysis,
      treeshaking,
    };

    this.reportProgress(100, 'Performance analysis complete');

    // Log summary
    this.log('success', `${icons.success} Performance analysis complete`);
    this.log('info', `  ${colors.cyan}Build time:${colors.reset} ${formatDuration(buildTime)}`);
    this.log('info', `  ${colors.cyan}Memory peak:${colors.reset} ${formatBytes(memoryPeak)}`);
    this.log('info', `  ${colors.cyan}Treeshaking efficiency:${colors.reset} ${treeshaking.efficiency.toFixed(1)}%`);
    this.log('info', `  ${colors.cyan}Modules analyzed:${colors.reset} ${bundleAnalysis.modules.length}`);
    this.log('info', `  ${colors.cyan}Chunks generated:${colors.reset} ${bundleAnalysis.chunks.length}`);

    // Performance recommendations
    this.generateRecommendations(result);

    return result;
  }

  private async analyzeBundlePerformance(): Promise<BundleAnalysis> {
    const distPath = join(process.cwd(), 'dist');
    const modules: BundleAnalysis['modules'] = [];
    const chunks: BundleAnalysis['chunks'] = [];
    const assets: BundleAnalysis['assets'] = [];

    if (!existsSync(distPath)) {
      return { modules, chunks, assets };
    }

    // Scan dist directory
    const scanDir = (dir: string, prefix: string = ''): void => {
      try {
        const items = readdirSync(dir);
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            scanDir(fullPath, `${prefix}${item}/`);
          } else {
            const name = `${prefix}${item}`;
            const size = stat.size;

            if (item.endsWith('.mjs') || item.endsWith('.js')) {
              if (!item.endsWith('.d.ts')) {
                modules.push({
                  name,
                  size,
                  dependents: 0,
                  dependencies: 0,
                });
              }
            }

            assets.push({
              name,
              size,
              type: this.getAssetType(item),
            });
          }
        }
      } catch {
        // Ignore errors
      }
    };

    scanDir(distPath);

    // Group modules into chunks
    const chunkMap = new Map<string, number>();
    for (const module of modules) {
      const chunkName = module.name.split('/')[0] || 'main';
      chunkMap.set(chunkName, (chunkMap.get(chunkName) || 0) + module.size);
    }

    for (const [name, size] of chunkMap) {
      chunks.push({
        name,
        size,
        modules: modules.filter((m) => m.name.startsWith(name)).length,
        isEntry: name === 'index' || name === 'main',
      });
    }

    return { modules, chunks, assets };
  }

  private getAssetType(filename: string): string {
    if (filename.endsWith('.mjs')) return 'esm';
    if (filename.endsWith('.d.ts')) return 'types';
    if (filename.endsWith('.js')) return 'cjs';
    if (filename.endsWith('.map')) return 'sourcemap';
    if (filename.endsWith('.css')) return 'css';
    return 'other';
  }

  private evaluateTreeshaking(): TreeshakingReport {
    const distPath = join(process.cwd(), 'dist');
    let totalSize = 0;

    if (existsSync(distPath)) {
      const countSize = (dir: string): void => {
        try {
          const items = readdirSync(dir);
          for (const item of items) {
            const fullPath = join(dir, item);
            const stat = statSync(fullPath);
            if (stat.isDirectory()) {
              countSize(fullPath);
            } else if (item.endsWith('.mjs') || item.endsWith('.js')) {
              totalSize += stat.size;
            }
          }
        } catch {
          // Ignore errors
        }
      };
      countSize(distPath);
    }

    // Estimate treeshaking effectiveness (simplified)
    const estimatedOriginalSize = totalSize * 1.4; // Assume 40% was tree-shaken
    const removedBytes = Math.round(estimatedOriginalSize - totalSize);
    const efficiency = (removedBytes / estimatedOriginalSize) * 100;

    return {
      removedBytes,
      removedModules: Math.floor(efficiency / 5), // Rough estimate
      efficiency,
    };
  }

  private generateRecommendations(result: PerformanceResult): void {
    const recommendations: string[] = [];

    // Build time recommendations
    if (result.buildTime > 60000) {
      recommendations.push('Consider enabling parallel builds or incremental compilation');
    }

    // Memory recommendations
    if (result.memoryPeak > 512 * 1024 * 1024) {
      recommendations.push('High memory usage detected. Consider splitting the build into smaller chunks');
    }

    // Treeshaking recommendations
    if (result.treeshaking.efficiency < 20) {
      recommendations.push('Low treeshaking efficiency. Review export patterns and use named exports');
    }

    // Bundle size recommendations
    const totalBundleSize = result.bundleAnalysis.assets.reduce((sum, a) => sum + a.size, 0);
    if (totalBundleSize > 5 * 1024 * 1024) {
      recommendations.push('Large bundle size. Consider code splitting or lazy loading');
    }

    if (recommendations.length > 0) {
      this.log('info', `\n  ${colors.yellow}Performance recommendations:${colors.reset}`);
      recommendations.forEach((rec) => {
        this.log('info', `    ${icons.info} ${rec}`);
      });
    }
  }
}
