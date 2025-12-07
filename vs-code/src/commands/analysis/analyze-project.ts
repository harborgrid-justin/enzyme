import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { BaseCommand, CommandContext, CommandMetadata } from '../base-command';

interface ProjectAnalysis {
  summary: {
    totalFiles: number;
    totalComponents: number;
    totalRoutes: number;
    totalStores: number;
    totalFeatures: number;
    totalHooks: number;
  };
  issues: AnalysisIssue[];
  recommendations: string[];
}

interface AnalysisIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
}

/**
 * Analyze Project Command
 * Run comprehensive project analysis and show results
 * Keybinding: Ctrl+Shift+A P
 */
export class AnalyzeProjectCommand extends BaseCommand {
  getMetadata(): CommandMetadata {
    return {
      id: 'enzyme.analysis.analyzeProject',
      title: 'Enzyme: Analyze Project',
      category: 'Enzyme Analysis',
      icon: '$(search)',
      keybinding: {
        key: 'ctrl+shift+a p',
        mac: 'cmd+shift+a p',
      },
    };
  }

  protected async executeCommand(_context: CommandContext): Promise<void> {
    const workspaceFolder = await this.ensureWorkspaceFolder();

    // Run analysis
    const analysis = await this.withProgress(
      'Analyzing project...',
      async (progress, token) => {
        progress.report({ message: 'Scanning files...', increment: 10 });

        const result = await this.analyzeProject(workspaceFolder, progress, token);

        progress.report({ message: 'Analysis complete!', increment: 100 });

        return result;
      },
      { cancellable: true }
    );

    if (!analysis) {
      return;
    }

    // Show results in output panel
    this.outputChannel.clear();
    this.outputChannel.show();

    this.displayAnalysisResults(analysis);

    // Optionally generate report
    const generateReport = await this.showInfo(
      `Analysis complete! Found ${analysis.issues.length} issues.`,
      'Generate Report',
      'View Output'
    );

    if (generateReport === 'Generate Report') {
      await this.generateAnalysisReport(workspaceFolder, analysis);
    } else if (generateReport === 'View Output') {
      this.outputChannel.show();
    }
  }

  private async analyzeProject(
    workspaceFolder: vscode.WorkspaceFolder,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
  ): Promise<ProjectAnalysis | undefined> {
    const analysis: ProjectAnalysis = {
      summary: {
        totalFiles: 0,
        totalComponents: 0,
        totalRoutes: 0,
        totalStores: 0,
        totalFeatures: 0,
        totalHooks: 0,
      },
      issues: [],
      recommendations: [],
    };

    const srcPath = path.join(workspaceFolder.uri.fsPath, 'src');

    try {
      // Count files
      progress.report({ message: 'Counting files...', increment: 20 });
      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(srcPath, '**/*.{ts,tsx,js,jsx}'),
        '**/node_modules/**'
      );
      analysis.summary.totalFiles = files.length;

      if (token.isCancellationRequested) {
        return undefined;
      }

      // Analyze components
      progress.report({ message: 'Analyzing components...', increment: 30 });
      await this.analyzeComponents(srcPath, analysis);

      if (token.isCancellationRequested) {
        return undefined;
      }

      // Analyze routes
      progress.report({ message: 'Analyzing routes...', increment: 40 });
      await this.analyzeRoutes(srcPath, analysis);

      if (token.isCancellationRequested) {
        return undefined;
      }

      // Analyze stores
      progress.report({ message: 'Analyzing stores...', increment: 50 });
      await this.analyzeStores(srcPath, analysis);

      if (token.isCancellationRequested) {
        return undefined;
      }

      // Analyze features
      progress.report({ message: 'Analyzing features...', increment: 60 });
      await this.analyzeFeatures(srcPath, analysis);

      if (token.isCancellationRequested) {
        return undefined;
      }

      // Analyze hooks
      progress.report({ message: 'Analyzing hooks...', increment: 70 });
      await this.analyzeHooks(srcPath, analysis);

      if (token.isCancellationRequested) {
        return undefined;
      }

      // Generate recommendations
      progress.report({ message: 'Generating recommendations...', increment: 90 });
      this.generateRecommendations(analysis);

      return analysis;
    } catch (error) {
      this.log('error', 'Failed to analyze project', error);
      throw error;
    }
  }

  private async analyzeComponents(
    srcPath: string,
    analysis: ProjectAnalysis
  ): Promise<void> {
    const componentFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(srcPath, '**/components/**/*.{tsx,jsx}'),
      '**/node_modules/**'
    );

    analysis.summary.totalComponents = componentFiles.length;

    // Check for component issues
    for (const file of componentFiles) {
      const document = await vscode.workspace.openTextDocument(file);
      const text = document.getText();

      // Check for default exports (discouraged in Enzyme)
      if (text.includes('export default')) {
        analysis.issues.push({
          severity: 'warning',
          message: 'Component uses default export (prefer named exports)',
          file: file.fsPath,
        });
      }

      // Check for missing prop types
      if (text.includes('React.FC<') && !text.includes('interface') && !text.includes('type')) {
        analysis.issues.push({
          severity: 'info',
          message: 'Component missing TypeScript interface for props',
          file: file.fsPath,
        });
      }
    }
  }

  private async analyzeRoutes(
    srcPath: string,
    analysis: ProjectAnalysis
  ): Promise<void> {
    const routeFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(srcPath, '**/routes/**/*.{ts,tsx}'),
      '**/node_modules/**'
    );

    let routeCount = 0;

    for (const file of routeFiles) {
      const document = await vscode.workspace.openTextDocument(file);
      const text = document.getText();

      const pathMatches = text.match(/path:\s*['"`][^'"`]+['"`]/g);
      if (pathMatches) {
        routeCount += pathMatches.length;
      }
    }

    analysis.summary.totalRoutes = routeCount;
  }

  private async analyzeStores(
    srcPath: string,
    analysis: ProjectAnalysis
  ): Promise<void> {
    const storeFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(srcPath, '**/store/**/*.{ts,tsx}'),
      '**/node_modules/**'
    );

    let storeCount = 0;

    for (const file of storeFiles) {
      const document = await vscode.workspace.openTextDocument(file);
      const text = document.getText();

      const storeMatches = text.match(/export\s+const\s+use\w+Store\s*=/g);
      if (storeMatches) {
        storeCount += storeMatches.length;
      }

      // Check for missing DevTools
      if (text.includes('create(') && !text.includes('devtools(')) {
        analysis.issues.push({
          severity: 'info',
          message: 'Store missing DevTools integration',
          file: file.fsPath,
        });
      }
    }

    analysis.summary.totalStores = storeCount;
  }

  private async analyzeFeatures(
    srcPath: string,
    analysis: ProjectAnalysis
  ): Promise<void> {
    const featuresPath = path.join(srcPath, 'features');

    try {
      const entries = await fs.readdir(featuresPath, { withFileTypes: true });
      const featureDirs = entries.filter((entry) => entry.isDirectory());

      analysis.summary.totalFeatures = featureDirs.length;

      // Check feature structure
      for (const dir of featureDirs) {
        const featurePath = path.join(featuresPath, dir.name);
        const hasIndex = await this.fileExists(path.join(featurePath, 'index.ts'));

        if (!hasIndex) {
          analysis.issues.push({
            severity: 'warning',
            message: `Feature "${dir.name}" missing index.ts`,
            file: featurePath,
          });
        }
      }
    } catch {
      // Features directory doesn't exist
    }
  }

  private async analyzeHooks(
    srcPath: string,
    analysis: ProjectAnalysis
  ): Promise<void> {
    const hookFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(srcPath, '**/hooks/**/*.{ts,tsx}'),
      '**/node_modules/**'
    );

    let hookCount = 0;

    for (const file of hookFiles) {
      const document = await vscode.workspace.openTextDocument(file);
      const text = document.getText();

      const hookMatches = text.match(/export\s+(?:function|const)\s+use\w+/g);
      if (hookMatches) {
        hookCount += hookMatches.length;
      }
    }

    analysis.summary.totalHooks = hookCount;
  }

  private generateRecommendations(analysis: ProjectAnalysis): void {
    const { summary } = analysis;

    if (summary.totalComponents > 50 && summary.totalFeatures < 3) {
      analysis.recommendations.push(
        'Consider organizing components into feature modules for better scalability'
      );
    }

    if (summary.totalStores > 10) {
      analysis.recommendations.push(
        'You have many stores. Consider consolidating related state into feature-based stores'
      );
    }

    if (summary.totalRoutes > 20 && summary.totalFeatures < 5) {
      analysis.recommendations.push(
        'Consider grouping routes by feature for better organization'
      );
    }

    if (analysis.issues.filter((i) => i.severity === 'error').length === 0) {
      analysis.recommendations.push(
        'Great! No critical issues found in your project structure'
      );
    }
  }

  private displayAnalysisResults(analysis: ProjectAnalysis): void {
    this.outputChannel.appendLine('='.repeat(80));
    this.outputChannel.appendLine('ENZYME PROJECT ANALYSIS');
    this.outputChannel.appendLine('='.repeat(80));
    this.outputChannel.appendLine('');

    // Summary
    this.outputChannel.appendLine('PROJECT SUMMARY:');
    this.outputChannel.appendLine(`  Total Files: ${analysis.summary.totalFiles}`);
    this.outputChannel.appendLine(`  Components: ${analysis.summary.totalComponents}`);
    this.outputChannel.appendLine(`  Routes: ${analysis.summary.totalRoutes}`);
    this.outputChannel.appendLine(`  Stores: ${analysis.summary.totalStores}`);
    this.outputChannel.appendLine(`  Features: ${analysis.summary.totalFeatures}`);
    this.outputChannel.appendLine(`  Custom Hooks: ${analysis.summary.totalHooks}`);
    this.outputChannel.appendLine('');

    // Issues
    if (analysis.issues.length > 0) {
      this.outputChannel.appendLine('ISSUES FOUND:');
      const errors = analysis.issues.filter((i) => i.severity === 'error');
      const warnings = analysis.issues.filter((i) => i.severity === 'warning');
      const infos = analysis.issues.filter((i) => i.severity === 'info');

      this.outputChannel.appendLine(`  Errors: ${errors.length}`);
      this.outputChannel.appendLine(`  Warnings: ${warnings.length}`);
      this.outputChannel.appendLine(`  Info: ${infos.length}`);
      this.outputChannel.appendLine('');

      for (const issue of analysis.issues) {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        this.outputChannel.appendLine(`${icon} [${issue.severity.toUpperCase()}] ${issue.message}`);
        if (issue.file) {
          this.outputChannel.appendLine(`   File: ${issue.file}`);
        }
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

  private async generateAnalysisReport(
    workspaceFolder: vscode.WorkspaceFolder,
    analysis: ProjectAnalysis
  ): Promise<void> {
    const reportPath = path.join(
      workspaceFolder.uri.fsPath,
      'enzyme-analysis-report.md'
    );

    const report = this.formatAnalysisAsMarkdown(analysis);

    await fs.writeFile(reportPath, report);

    const uri = vscode.Uri.file(reportPath);
    await this.openFile(uri);

    await this.showInfo('Analysis report generated successfully!');
  }

  private formatAnalysisAsMarkdown(analysis: ProjectAnalysis): string {
    const timestamp = new Date().toLocaleString();

    return `# Enzyme Project Analysis Report

Generated: ${timestamp}

## Project Summary

| Metric | Count |
|--------|-------|
| Total Files | ${analysis.summary.totalFiles} |
| Components | ${analysis.summary.totalComponents} |
| Routes | ${analysis.summary.totalRoutes} |
| Stores | ${analysis.summary.totalStores} |
| Features | ${analysis.summary.totalFeatures} |
| Custom Hooks | ${analysis.summary.totalHooks} |

## Issues Found

${analysis.issues.length === 0 ? '_No issues found!_' : ''}

${analysis.issues.map((issue) => `### ${issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️'} ${issue.severity.toUpperCase()}: ${issue.message}
${issue.file ? `**File:** \`${issue.file}\`` : ''}
`).join('\n')}

## Recommendations

${analysis.recommendations.map((rec) => `- ${rec}`).join('\n')}

---

_Generated by Enzyme VS Code Extension_
`;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
