/**
 * WorkspaceAnalyzer - Analyzes Enzyme project structure and configuration
 */

import type { LoggerService } from '../services/logger-service';
import type { WorkspaceService } from '../services/workspace-service';
import type { EnzymeWorkspace } from '../types';

/**
 * Project type
 */
export enum ProjectType {
  NEW = 'new',
  LEGACY = 'legacy',
  MIXED = 'mixed',
  UNKNOWN = 'unknown',
}

/**
 * Configuration issue
 */
export interface ConfigurationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  fix?: string;
}

/**
 * Analysis report
 */
export interface AnalysisReport {
  projectType: ProjectType;
  enzymeVersion?: string;
  features: {
    count: number;
    enabled: number;
    disabled: number;
  };
  routes: {
    count: number;
    protected: number;
    public: number;
  };
  components: {
    count: number;
    withTests: number;
    withoutTests: number;
  };
  stores: {
    count: number;
    persistent: number;
  };
  configuration: {
    hasConfig: boolean;
    issues: ConfigurationIssue[];
  };
  optimizations: string[];
  timestamp: number;
}

/**
 * WorkspaceAnalyzer - Analyzes project structure
 */
export class WorkspaceAnalyzer {
  private static instance: WorkspaceAnalyzer;
  private readonly logger: LoggerService;
  private readonly workspaceService: WorkspaceService;

  /**
   *
   * @param logger
   * @param workspaceService
   */
  private constructor(logger: LoggerService, workspaceService: WorkspaceService) {
    this.logger = logger;
    this.workspaceService = workspaceService;
  }

  /**
   * Create the workspace analyzer
   * @param logger
   * @param workspaceService
   */
  public static create(
    logger: LoggerService,
    workspaceService: WorkspaceService
  ): WorkspaceAnalyzer {
    if (!WorkspaceAnalyzer.instance) {
      WorkspaceAnalyzer.instance = new WorkspaceAnalyzer(logger, workspaceService);
    }
    return WorkspaceAnalyzer.instance;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): WorkspaceAnalyzer {
    if (!WorkspaceAnalyzer.instance) {
      throw new Error('WorkspaceAnalyzer not created. Call create() first.');
    }
    return WorkspaceAnalyzer.instance;
  }

  /**
   * Analyze workspace
   */
  public async analyzeWorkspace(): Promise<AnalysisReport> {
    this.logger.info('Starting workspace analysis...');
    const startTime = Date.now();

    const workspace = await this.workspaceService.analyzeWorkspace();

    if (!workspace.isEnzymeProject) {
      return this.createEmptyReport();
    }

    const projectType = this.detectProjectType(workspace);
    const configurationIssues = this.analyzeConfiguration(workspace);
    const optimizations = this.suggestOptimizations(workspace);

    const report: AnalysisReport = {
      projectType,
      ...(workspace.enzymeVersion ? { enzymeVersion: workspace.enzymeVersion } : {}),
      features: {
        count: workspace.features.length,
        enabled: workspace.features.filter(f => f.enabled).length,
        disabled: workspace.features.filter(f => !f.enabled).length,
      },
      routes: {
        count: workspace.routes.length,
        protected: workspace.routes.filter(r => r.protected).length,
        public: workspace.routes.filter(r => !r.protected).length,
      },
      components: {
        count: workspace.components.length,
        withTests: workspace.components.filter(c => c.hasTests).length,
        withoutTests: workspace.components.filter(c => !c.hasTests).length,
      },
      stores: {
        count: workspace.stores.length,
        persistent: workspace.stores.filter(s => s.persistent).length,
      },
      configuration: {
        hasConfig: !!workspace.enzymeConfig,
        issues: configurationIssues,
      },
      optimizations,
      timestamp: Date.now(),
    };

    const duration = Date.now() - startTime;
    this.logger.success(`Workspace analysis completed in ${duration}ms`);

    return report;
  }

  /**
   * Detect project type
   * @param workspace
   */
  private detectProjectType(workspace: EnzymeWorkspace): ProjectType {
    // Check if it's a new Enzyme project
    const hasEnzymeConfig = !!workspace.enzymeConfig;
    const hasFeatures = workspace.features.length > 0;

    if (hasEnzymeConfig && hasFeatures) {
      return ProjectType.NEW;
    }

    if (hasEnzymeConfig && !hasFeatures) {
      return ProjectType.NEW;
    }

    return ProjectType.UNKNOWN;
  }

  /**
   * Analyze configuration
   * @param workspace
   */
  private analyzeConfiguration(workspace: EnzymeWorkspace): ConfigurationIssue[] {
    const issues: ConfigurationIssue[] = [];

    // Check for enzyme.config
    if (!workspace.enzymeConfig) {
      issues.push({
        severity: 'warning',
        message: 'No enzyme.config.ts file found',
        fix: 'Create an enzyme.config.ts file in your project root',
      });
    }

    // Check for features without routes
    const featuresWithoutRoutes = workspace.features.filter(
      f => f.routes.length === 0
    );

    if (featuresWithoutRoutes.length > 0) {
      issues.push({
        severity: 'info',
        message: `${featuresWithoutRoutes.length} feature(s) have no routes defined`,
      });
    }

    // Check for components without tests
    const componentsWithoutTests = workspace.components.filter(
      c => !c.hasTests
    );

    if (componentsWithoutTests.length > 0) {
      issues.push({
        severity: 'warning',
        message: `${componentsWithoutTests.length} component(s) have no tests`,
        fix: 'Add tests for components to improve code quality',
      });
    }

    // Check for route conflicts
    const routePaths = workspace.routes.map(r => r.path);
    const duplicates = routePaths.filter(
      (path, index) => routePaths.indexOf(path) !== index
    );

    if (duplicates.length > 0) {
      issues.push({
        severity: 'error',
        message: `Route path conflicts detected: ${duplicates.join(', ')}`,
        fix: 'Ensure all route paths are unique',
      });
    }

    return issues;
  }

  /**
   * Suggest optimizations
   * @param workspace
   */
  private suggestOptimizations(workspace: EnzymeWorkspace): string[] {
    const optimizations: string[] = [];

    // Suggest code splitting for large features
    const largeFeatures = workspace.features.filter(
      f => f.components.length > 10
    );

    if (largeFeatures.length > 0) {
      optimizations.push(
        `Consider code splitting for features with many components: ${largeFeatures.map(f => f.name).join(', ')}`
      );
    }

    // Suggest lazy loading for routes
    if (workspace.routes.length > 5) {
      optimizations.push(
        'Consider implementing lazy loading for routes to reduce initial bundle size'
      );
    }

    // Suggest testing coverage
    const testCoverage = workspace.components.length > 0
      ? workspace.components.filter(c => c.hasTests).length / workspace.components.length
      : 0;

    if (testCoverage < 0.8) {
      optimizations.push(
        `Current test coverage is ${Math.round(testCoverage * 100)}%. Aim for at least 80% coverage.`
      );
    }

    // Suggest state persistence
    const unpersistentStores = workspace.stores.filter(s => !s.persistent);
    if (unpersistentStores.length > 0 && unpersistentStores.length < workspace.stores.length) {
      optimizations.push(
        'Consider enabling persistence for stores to improve user experience'
      );
    }

    return optimizations;
  }

  /**
   * Create empty report
   */
  private createEmptyReport(): AnalysisReport {
    return {
      projectType: ProjectType.UNKNOWN,
      features: { count: 0, enabled: 0, disabled: 0 },
      routes: { count: 0, protected: 0, public: 0 },
      components: { count: 0, withTests: 0, withoutTests: 0 },
      stores: { count: 0, persistent: 0 },
      configuration: { hasConfig: false, issues: [] },
      optimizations: [],
      timestamp: Date.now(),
    };
  }

  /**
   * Generate report summary
   * @param report
   */
  public generateReportSummary(report: AnalysisReport): string {
    const lines: string[] = [
      '# Enzyme Workspace Analysis Report',
      '',
      `Generated: ${new Date(report.timestamp).toISOString()}`,
      '',
      '## Project Information',
      `- Type: ${report.projectType}`,
      `- Enzyme Version: ${report.enzymeVersion || 'unknown'}`,
      '',
      '## Features',
      `- Total: ${report.features.count}`,
      `- Enabled: ${report.features.enabled}`,
      `- Disabled: ${report.features.disabled}`,
      '',
      '## Routes',
      `- Total: ${report.routes.count}`,
      `- Protected: ${report.routes.protected}`,
      `- Public: ${report.routes.public}`,
      '',
      '## Components',
      `- Total: ${report.components.count}`,
      `- With Tests: ${report.components.withTests}`,
      `- Without Tests: ${report.components.withoutTests}`,
      '',
      '## Stores',
      `- Total: ${report.stores.count}`,
      `- Persistent: ${report.stores.persistent}`,
      '',
    ];

    if (report.configuration.issues.length > 0) {
      lines.push('## Configuration Issues', '');
      for (const issue of report.configuration.issues) {
        lines.push(`- [${issue.severity.toUpperCase()}] ${issue.message}`);
        if (issue.fix) {
          lines.push(`  Fix: ${issue.fix}`);
        }
      }
      lines.push('');
    }

    if (report.optimizations.length > 0) {
      lines.push('## Optimization Suggestions', '');
      for (const optimization of report.optimizations) {
        lines.push(`- ${optimization}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
