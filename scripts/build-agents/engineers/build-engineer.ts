/**
 * Build Engineer Agent
 * Handles Vite build process for ESM/CJS dual output
 */

import { BaseAgent, createAgentConfig, formatDuration, formatBytes, colors, icons } from '../base-agent.js';
import type { BuildConfig, BundleSizeReport, BundleInfo } from '../types.js';
import { existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

export interface BuildEngineerResult {
  outputDir: string;
  formats: string[];
  entryPoints: number;
  bundleSize: BundleSizeReport;
  duration: number;
}

export class BuildEngineer extends BaseAgent<BuildEngineerResult> {
  constructor(buildConfig: BuildConfig) {
    super(
      createAgentConfig(
        'build-engineer',
        'Build Engineer',
        'Compiles source code using Vite with dual ESM/CJS output',
        {
          dependencies: [
            { agentId: 'typecheck-engineer', required: true },
            { agentId: 'lint-engineer', required: true },
          ],
          timeout: 600000, // 10 minutes
          priority: 8,
        }
      ),
      buildConfig
    );
  }

  protected async executeTask(): Promise<BuildEngineerResult> {
    const startTime = Date.now();

    this.log('info', `${icons.build} Starting Vite build process...`);
    this.reportProgress(10, 'Initializing Vite build');

    // Run the build for main package
    for (const target of this.buildConfig.targets) {
      if (target.type === 'main') {
        await this.buildMainPackage(target.path);
      } else if (target.type === 'typescript') {
        await this.buildTypeScriptPackage(target.path);
      }
    }

    this.reportProgress(80, 'Calculating bundle sizes');
    const bundleSize = await this.calculateBundleSize();

    this.reportProgress(100, 'Build complete');

    const duration = Date.now() - startTime;
    this.metrics.duration = duration;

    this.log('success', `${icons.success} Build completed in ${formatDuration(duration)}`);
    this.log('info', `  ${colors.cyan}Total size:${colors.reset} ${formatBytes(bundleSize.total)}`);
    this.log('info', `  ${colors.cyan}Gzipped:${colors.reset} ${formatBytes(bundleSize.gzipped)}`);

    return {
      outputDir: 'dist',
      formats: ['esm', 'cjs'],
      entryPoints: 35, // Main + 34 lib modules
      bundleSize,
      duration,
    };
  }

  private async buildMainPackage(cwd: string): Promise<void> {
    this.log('info', `Building main enzyme package at ${cwd}`);
    this.reportProgress(20, 'Building main package (ESM + CJS)');

    const { exitCode, stderr } = await this.runCommand(
      'npm',
      ['run', 'build'],
      { cwd, silent: !this.buildConfig.verbose }
    );

    if (exitCode !== 0) {
      throw new Error(`Main package build failed: ${stderr}`);
    }

    this.reportProgress(60, 'Main package build complete');
  }

  private async buildTypeScriptPackage(cwd: string): Promise<void> {
    this.log('info', `Building TypeScript package at ${cwd}`);
    this.reportProgress(65, 'Building TypeScript package');

    const { exitCode, stderr } = await this.runCommand(
      'npm',
      ['run', 'build'],
      { cwd, silent: !this.buildConfig.verbose }
    );

    if (exitCode !== 0) {
      throw new Error(`TypeScript package build failed: ${stderr}`);
    }

    this.reportProgress(75, 'TypeScript package build complete');
  }

  private async calculateBundleSize(): Promise<BundleSizeReport> {
    const distPath = join(process.cwd(), 'dist');

    const esmInfo = this.calculateDirSize(distPath, '.mjs');
    const cjsInfo = this.calculateDirSize(distPath, '.js');
    const typesInfo = this.calculateDirSize(distPath, '.d.ts');

    return {
      esm: esmInfo,
      cjs: cjsInfo,
      types: typesInfo,
      total: esmInfo.size + cjsInfo.size + typesInfo.size,
      gzipped: Math.round((esmInfo.size + cjsInfo.size) * 0.3), // Estimate
    };
  }

  private calculateDirSize(dir: string, ext: string): BundleInfo {
    if (!existsSync(dir)) {
      return { size: 0, gzipped: 0, files: 0 };
    }

    let totalSize = 0;
    let fileCount = 0;

    const walkDir = (currentDir: string): void => {
      const items = readdirSync(currentDir);
      for (const item of items) {
        const fullPath = join(currentDir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (item.endsWith(ext)) {
          totalSize += stat.size;
          fileCount++;
        }
      }
    };

    walkDir(dir);

    return {
      size: totalSize,
      gzipped: Math.round(totalSize * 0.3),
      files: fileCount,
    };
  }
}
