import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { BaseCommand, CommandContext, CommandMetadata } from '../base-command';

interface BundleAnalysis {
  totalSize: number;
  chunks: ChunkInfo[];
  largestDependencies: DependencyInfo[];
  recommendations: string[];
}

interface ChunkInfo {
  name: string;
  size: number;
  modules: number;
}

interface DependencyInfo {
  name: string;
  size: number;
  version?: string;
}

/**
 * Analyze Bundle Command
 * Analyze build bundle and show size visualization
 */
export class AnalyzeBundleCommand extends BaseCommand {
  getMetadata(): CommandMetadata {
    return {
      id: 'enzyme.analysis.analyzeBundle',
      title: 'Enzyme: Analyze Bundle Size',
      category: 'Enzyme Analysis',
      icon: '$(package)',
    };
  }

  protected async executeCommand(_context: CommandContext): Promise<void> {
    const workspaceFolder = await this.ensureWorkspaceFolder();

    // Check if build exists
    const distPath = path.join(workspaceFolder.uri.fsPath, 'dist');
    const buildPath = path.join(workspaceFolder.uri.fsPath, 'build');

    let bundlePath: string | undefined;

    try {
      await fs.access(distPath);
      bundlePath = distPath;
    } catch {
      try {
        await fs.access(buildPath);
        bundlePath = buildPath;
      } catch {
        const buildNow = await this.showWarning(
          'No build found. Build the project first.',
          'Build Now',
          'Cancel'
        );

        if (buildNow === 'Build Now') {
          await this.buildProject(workspaceFolder);
          return;
        }
        return;
      }
    }

    // Analyze bundle
    const analysis = await this.withProgress(
      'Analyzing bundle...',
      async (progress) => {
        progress.report({ message: 'Scanning build output...' });
        return this.analyzeBundle(bundlePath!);
      }
    );

    // Display results
    this.outputChannel.clear();
    this.outputChannel.show();
    this.displayBundleAnalysis(analysis);

    await this.showInfo(
      `Bundle analysis complete! Total size: ${this.formatSize(analysis.totalSize)}`,
      'View Output'
    );
  }

  private async buildProject(
    workspaceFolder: vscode.WorkspaceFolder
  ): Promise<void> {
    const terminal = vscode.window.createTerminal({
      name: 'Enzyme Build',
      cwd: workspaceFolder.uri.fsPath,
    });

    terminal.show();
    terminal.sendText('npm run build');

    await this.showInfo(
      'Build started in terminal. Run bundle analysis again after build completes.'
    );
  }

  private async analyzeBundle(bundlePath: string): Promise<BundleAnalysis> {
    const analysis: BundleAnalysis = {
      totalSize: 0,
      chunks: [],
      largestDependencies: [],
      recommendations: [],
    };

    try {
      // Find all JS files in the bundle
      const jsFiles = await this.findFiles(bundlePath, /\.(js|mjs)$/);

      // Analyze each chunk
      for (const file of jsFiles) {
        const stat = await fs.stat(file);
        const fileName = path.basename(file);

        analysis.chunks.push({
          name: fileName,
          size: stat.size,
          modules: await this.estimateModuleCount(file),
        });

        analysis.totalSize += stat.size;
      }

      // Sort chunks by size
      analysis.chunks.sort((a, b) => b.size - a.size);

      // Analyze dependencies from package.json
      const packageJsonPath = path.join(
        path.dirname(path.dirname(bundlePath)),
        'package.json'
      );

      try {
        const packageJson = JSON.parse(
          await fs.readFile(packageJsonPath, 'utf-8')
        );

        const dependencies = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        // Identify large dependencies (heuristic based on common packages)
        const knownLargeDeps = [
          { name: 'react', estimatedSize: 150 * 1024 },
          { name: 'react-dom', estimatedSize: 150 * 1024 },
          { name: 'react-router-dom', estimatedSize: 50 * 1024 },
          { name: 'zustand', estimatedSize: 10 * 1024 },
          { name: '@tanstack/react-query', estimatedSize: 40 * 1024 },
          { name: 'lodash', estimatedSize: 70 * 1024 },
          { name: 'moment', estimatedSize: 200 * 1024 },
          { name: 'date-fns', estimatedSize: 50 * 1024 },
        ];

        for (const dep of knownLargeDeps) {
          if (dependencies[dep.name]) {
            analysis.largestDependencies.push({
              name: dep.name,
              size: dep.estimatedSize,
              version: dependencies[dep.name],
            });
          }
        }

        // Sort by size
        analysis.largestDependencies.sort((a, b) => b.size - a.size);
      } catch {
        // Couldn't read package.json
      }

      // Generate recommendations
      this.generateBundleRecommendations(analysis);

      return analysis;
    } catch (error) {
      this.log('error', 'Failed to analyze bundle', error);
      throw error;
    }
  }

  private async findFiles(
    dir: string,
    pattern: RegExp
  ): Promise<string[]> {
    const results: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subResults = await this.findFiles(fullPath, pattern);
          results.push(...subResults);
        } else if (pattern.test(entry.name)) {
          results.push(fullPath);
        }
      }
    } catch {
      // Ignore errors
    }

    return results;
  }

  private async estimateModuleCount(file: string): Promise<number> {
    try {
      const content = await fs.readFile(file, 'utf-8');

      // Count module definitions (heuristic)
      const moduleMatches = content.match(/\b(import|export|require)\b/g);
      return moduleMatches ? Math.min(moduleMatches.length, 100) : 1;
    } catch {
      return 1;
    }
  }

  private generateBundleRecommendations(analysis: BundleAnalysis): void {
    const ONE_MB = 1024 * 1024;

    if (analysis.totalSize > 5 * ONE_MB) {
      analysis.recommendations.push(
        'Bundle size is large (>5MB). Consider code splitting and lazy loading.'
      );
    }

    if (analysis.chunks.length > 20) {
      analysis.recommendations.push(
        'Many chunks detected. Review chunk splitting strategy.'
      );
    }

    const hasLargeDependency = analysis.largestDependencies.some(
      (dep) => dep.size > 200 * 1024
    );

    if (hasLargeDependency) {
      analysis.recommendations.push(
        'Some dependencies are large. Consider lighter alternatives (e.g., date-fns instead of moment).'
      );
    }

    if (analysis.totalSize < 1 * ONE_MB) {
      analysis.recommendations.push(
        'Bundle size looks good! Keep optimizing as you add features.'
      );
    }
  }

  private displayBundleAnalysis(analysis: BundleAnalysis): void {
    this.outputChannel.appendLine('='.repeat(80));
    this.outputChannel.appendLine('BUNDLE SIZE ANALYSIS');
    this.outputChannel.appendLine('='.repeat(80));
    this.outputChannel.appendLine('');

    // Total size
    this.outputChannel.appendLine(
      `Total Bundle Size: ${this.formatSize(analysis.totalSize)}`
    );
    this.outputChannel.appendLine('');

    // Chunks
    this.outputChannel.appendLine('CHUNKS:');
    for (const chunk of analysis.chunks.slice(0, 10)) {
      const sizeBar = this.createSizeBar(
        chunk.size,
        analysis.chunks[0].size
      );
      this.outputChannel.appendLine(
        `  ${chunk.name.padEnd(40)} ${this.formatSize(chunk.size).padStart(10)} ${sizeBar}`
      );
    }

    if (analysis.chunks.length > 10) {
      this.outputChannel.appendLine(`  ... and ${analysis.chunks.length - 10} more chunks`);
    }
    this.outputChannel.appendLine('');

    // Dependencies
    if (analysis.largestDependencies.length > 0) {
      this.outputChannel.appendLine('LARGEST DEPENDENCIES (estimated):');
      for (const dep of analysis.largestDependencies.slice(0, 10)) {
        this.outputChannel.appendLine(
          `  ${dep.name.padEnd(30)} ${this.formatSize(dep.size).padStart(10)} ${dep.version || ''}`
        );
      }
      this.outputChannel.appendLine('');
    }

    // Recommendations
    if (analysis.recommendations.length > 0) {
      this.outputChannel.appendLine('RECOMMENDATIONS:');
      for (const rec of analysis.recommendations) {
        this.outputChannel.appendLine(`  • ${rec}`);
      }
      this.outputChannel.appendLine('');
    }

    this.outputChannel.appendLine('='.repeat(80));
  }

  private formatSize(bytes: number): string {
    const kb = bytes / 1024;
    const mb = kb / 1024;

    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    } else if (kb >= 1) {
      return `${kb.toFixed(2)} KB`;
    } else {
      return `${bytes} B`;
    }
  }

  private createSizeBar(size: number, maxSize: number): string {
    const barLength = 20;
    const filledLength = Math.round((size / maxSize) * barLength);
    const emptyLength = barLength - filledLength;

    return '█'.repeat(filledLength) + '░'.repeat(emptyLength);
  }
}
