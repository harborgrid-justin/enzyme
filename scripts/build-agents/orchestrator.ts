/**
 * @missionfabric-js/enzyme Multi-Agent Build System
 * Orchestrator Agent - PhD-level coordination of 10 engineer agents
 *
 * The Orchestrator implements:
 * - Topological sorting of agent dependencies
 * - Wave-based parallel execution
 * - Real-time progress tracking
 * - Failure handling and recovery
 * - Performance optimization
 */

import { EventEmitter } from 'events';
import type {
  AgentId,
  AgentResult,
  BuildConfig,
  BuildEvent,
  BuildEventHandler,
  ExecutionPlan,
  OrchestratorReport,
  OrchestratorState,
  BuildSummary,
  AgentDashboardInfo,
  AgentStatus,
} from './types.js';
import { BaseAgent, colors, icons, formatDuration, formatBytes } from './base-agent.js';
import {
  BuildEngineer,
  TypeCheckEngineer,
  LintEngineer,
  TestEngineer,
  SecurityEngineer,
  QualityEngineer,
  BundleEngineer,
  PerformanceEngineer,
  DocumentationEngineer,
  PublishEngineer,
} from './engineers/index.js';

// ============================================================================
// Orchestrator Agent
// ============================================================================

export class BuildOrchestrator extends EventEmitter {
  private config: BuildConfig;
  private agents: Map<AgentId, BaseAgent> = new Map();
  private results: Map<AgentId, AgentResult> = new Map();
  private state: OrchestratorState;
  private eventHandlers: BuildEventHandler[] = [];
  private buildStartTime: number = 0;

  constructor(config: BuildConfig) {
    super();
    this.config = config;
    this.state = {
      phase: 'idle',
      currentWave: 0,
      totalWaves: 0,
      agents: new Map(),
      startTime: undefined,
      endTime: undefined,
    };

    this.initializeAgents();
  }

  // ============================================================================
  // Agent Initialization
  // ============================================================================

  private initializeAgents(): void {
    // Create all 10 engineer agents
    this.agents.set('typecheck-engineer', new TypeCheckEngineer(this.config));
    this.agents.set('lint-engineer', new LintEngineer(this.config));
    this.agents.set('test-engineer', new TestEngineer(this.config));
    this.agents.set('security-engineer', new SecurityEngineer(this.config));
    this.agents.set('quality-engineer', new QualityEngineer(this.config));
    this.agents.set('documentation-engineer', new DocumentationEngineer(this.config));
    this.agents.set('build-engineer', new BuildEngineer(this.config));
    this.agents.set('bundle-engineer', new BundleEngineer(this.config));
    this.agents.set('performance-engineer', new PerformanceEngineer(this.config));
    this.agents.set('publish-engineer', new PublishEngineer(this.config));

    // Wire up event handlers for each agent
    for (const [id, agent] of this.agents) {
      agent.on('started', (data) => this.emitEvent({ type: 'AGENT_STARTED', agentId: data.agentId }));
      agent.on('progress', (data) => this.emitEvent({
        type: 'AGENT_PROGRESS',
        agentId: data.agentId,
        progress: data.progress,
        message: data.message,
      }));
      agent.on('completed', (data) => this.emitEvent({
        type: 'AGENT_COMPLETED',
        agentId: data.agentId,
        result: data.result,
      }));
      agent.on('failed', (data) => this.emitEvent({
        type: 'AGENT_FAILED',
        agentId: data.agentId,
        error: data.error,
      }));
    }
  }

  // ============================================================================
  // Execution Planning
  // ============================================================================

  private createExecutionPlan(): ExecutionPlan {
    // Build dependency graph
    const dependencyGraph = new Map<AgentId, AgentId[]>();

    for (const [id, agent] of this.agents) {
      const config = agent.getConfig();
      const deps = config.dependencies
        .filter((d) => d.required)
        .map((d) => d.agentId);
      dependencyGraph.set(id, deps);
    }

    // Topological sort into waves
    const waves = this.topologicalSort(dependencyGraph);

    // Calculate critical path
    const criticalPath = this.findCriticalPath(dependencyGraph);

    // Estimate duration based on agents in critical path
    const estimatedDuration = criticalPath.length * 30000; // ~30s per critical agent

    return {
      waves,
      dependencyGraph,
      criticalPath,
      estimatedDuration,
    };
  }

  private topologicalSort(graph: Map<AgentId, AgentId[]>): AgentId[][] {
    const waves: AgentId[][] = [];
    const completed = new Set<AgentId>();
    const remaining = new Set(graph.keys());

    while (remaining.size > 0) {
      const wave: AgentId[] = [];

      for (const id of remaining) {
        const deps = graph.get(id) || [];
        const allDepsCompleted = deps.every((dep) => completed.has(dep));

        if (allDepsCompleted) {
          wave.push(id);
        }
      }

      if (wave.length === 0) {
        // Circular dependency detected - break by adding remaining
        wave.push(...remaining);
        this.log('warn', 'Circular dependency detected. Breaking cycle.');
      }

      // Sort wave by priority (higher priority first)
      wave.sort((a, b) => {
        const agentA = this.agents.get(a);
        const agentB = this.agents.get(b);
        return (agentB?.getConfig().priority || 0) - (agentA?.getConfig().priority || 0);
      });

      waves.push(wave);

      for (const id of wave) {
        completed.add(id);
        remaining.delete(id);
      }
    }

    return waves;
  }

  private findCriticalPath(graph: Map<AgentId, AgentId[]>): AgentId[] {
    // Find longest path through dependency graph
    const memo = new Map<AgentId, AgentId[]>();

    const findPath = (id: AgentId): AgentId[] => {
      if (memo.has(id)) return memo.get(id)!;

      const deps = graph.get(id) || [];
      if (deps.length === 0) {
        memo.set(id, [id]);
        return [id];
      }

      let longestDepPath: AgentId[] = [];
      for (const dep of deps) {
        const depPath = findPath(dep);
        if (depPath.length > longestDepPath.length) {
          longestDepPath = depPath;
        }
      }

      const path = [...longestDepPath, id];
      memo.set(id, path);
      return path;
    };

    let criticalPath: AgentId[] = [];
    for (const id of graph.keys()) {
      const path = findPath(id);
      if (path.length > criticalPath.length) {
        criticalPath = path;
      }
    }

    return criticalPath;
  }

  // ============================================================================
  // Execution
  // ============================================================================

  async run(): Promise<OrchestratorReport> {
    this.buildStartTime = Date.now();
    this.state.phase = 'planning';
    this.state.startTime = new Date();

    this.printHeader();
    this.emitEvent({ type: 'BUILD_STARTED', config: this.config });

    try {
      // Create execution plan
      this.log('info', `${icons.agent} Creating execution plan...`);
      const plan = this.createExecutionPlan();
      this.state.totalWaves = plan.waves.length;

      this.printExecutionPlan(plan);

      // Execute waves
      this.state.phase = 'executing';

      for (let i = 0; i < plan.waves.length; i++) {
        const wave = plan.waves[i];
        this.state.currentWave = i + 1;

        this.log('info', `\n${colors.bold}═══ Wave ${i + 1}/${plan.waves.length} ═══${colors.reset}`);
        this.log('info', `Agents: ${wave.map((id) => this.getAgentDisplayName(id)).join(', ')}`);

        this.emitEvent({ type: 'WAVE_STARTED', wave: i + 1, agents: wave });

        const waveResults = await this.executeWave(wave);

        this.emitEvent({ type: 'WAVE_COMPLETED', wave: i + 1, results: waveResults });

        // Check for failures
        const failures = waveResults.filter((r) => !r.success);
        if (failures.length > 0 && this.config.failFast) {
          const failedAgents = failures.map((f) => f.agentId).join(', ');
          throw new Error(`Build failed: ${failedAgents} failed`);
        }
      }

      // Publishing phase (if enabled)
      if (this.config.publishToNpm) {
        this.state.phase = 'publishing';
        this.log('info', `\n${colors.bold}═══ Publishing ═══${colors.reset}`);
      }

      this.state.phase = 'complete';
      this.state.endTime = new Date();

      const report = this.generateReport(plan);
      this.printSummary(report);

      this.emitEvent({ type: 'BUILD_COMPLETED', report });
      return report;

    } catch (error) {
      this.state.phase = 'failed';
      this.state.endTime = new Date();

      const err = error instanceof Error ? error : new Error(String(error));
      this.log('error', `\n${icons.failure} Build failed: ${err.message}`);

      const plan = this.createExecutionPlan();
      const partialReport = this.generateReport(plan);

      this.emitEvent({ type: 'BUILD_FAILED', error: err, partialReport });
      throw err;
    }
  }

  private async executeWave(wave: AgentId[]): Promise<AgentResult[]> {
    const maxConcurrency = this.config.maxConcurrency || wave.length;
    const results: AgentResult[] = [];

    // Execute agents in batches based on max concurrency
    for (let i = 0; i < wave.length; i += maxConcurrency) {
      const batch = wave.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (id) => {
        const agent = this.agents.get(id);
        if (!agent) {
          throw new Error(`Agent ${id} not found`);
        }

        // Check if dependencies succeeded
        const config = agent.getConfig();
        for (const dep of config.dependencies) {
          if (dep.required) {
            const depResult = this.results.get(dep.agentId);
            if (!depResult?.success) {
              this.log('warn', `${id}: Skipping due to failed dependency ${dep.agentId}`);
              return {
                success: false,
                agentId: id,
                status: 'blocked' as AgentStatus,
                error: new Error(`Dependency ${dep.agentId} failed`),
                logs: [],
                metrics: {},
              };
            }
          }
        }

        // Set build start time for performance engineer
        if (id === 'performance-engineer') {
          (agent as PerformanceEngineer).setBuildStartTime(this.buildStartTime);
        }

        const result = await agent.executeWithRetries();
        this.results.set(id, result);
        return result;
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  // ============================================================================
  // Reporting
  // ============================================================================

  private generateReport(plan: ExecutionPlan): OrchestratorReport {
    const totalDuration = this.state.endTime && this.state.startTime
      ? this.state.endTime.getTime() - this.state.startTime.getTime()
      : 0;

    const summary = this.generateSummary();

    return {
      success: this.state.phase === 'complete',
      executionPlan: plan,
      results: this.results,
      totalDuration,
      summary,
    };
  }

  private generateSummary(): BuildSummary {
    let totalErrors = 0;
    let totalWarnings = 0;
    let successfulAgents = 0;
    let failedAgents = 0;
    let skippedAgents = 0;
    let filesBuilt = 0;
    const publishedPackages: string[] = [];

    for (const result of this.results.values()) {
      if (result.success) {
        successfulAgents++;
      } else if (result.status === 'blocked') {
        skippedAgents++;
      } else {
        failedAgents++;
      }

      totalErrors += result.metrics.errorsFound || 0;
      totalWarnings += result.metrics.warningsFound || 0;
      filesBuilt += result.metrics.filesProcessed || 0;
    }

    // Get published packages from publish-engineer result
    const publishResult = this.results.get('publish-engineer');
    if (publishResult?.success && publishResult.data) {
      const data = publishResult.data as { packages: { name: string; version: string }[] };
      publishedPackages.push(...data.packages.map((p) => `${p.name}@${p.version}`));
    }

    return {
      totalAgents: this.agents.size,
      successfulAgents,
      failedAgents,
      skippedAgents,
      totalErrors,
      totalWarnings,
      filesBuilt,
      publishedPackages,
    };
  }

  // ============================================================================
  // Console Output
  // ============================================================================

  private printHeader(): void {
    console.log(`
${colors.cyan}${colors.bold}╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║   ${colors.white}🤖 ENZYME MULTI-AGENT BUILD SYSTEM${colors.cyan}                                 ║
║   ${colors.dim}Enterprise-grade parallel build orchestration${colors.cyan}${colors.bold}                     ║
║                                                                       ║
║   ${colors.yellow}Orchestrator + 10 Enterprise Engineers${colors.cyan}                            ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝${colors.reset}
`);

    this.log('info', `${colors.bold}Build Configuration:${colors.reset}`);
    this.log('info', `  Targets: ${this.config.targets.map((t) => t.name).join(', ')}`);
    this.log('info', `  Parallel: ${this.config.parallel ? 'Yes' : 'No'}`);
    this.log('info', `  Max Concurrency: ${this.config.maxConcurrency}`);
    this.log('info', `  Publish to NPM: ${this.config.publishToNpm ? 'Yes' : 'No'}`);
    this.log('info', `  Dry Run: ${this.config.dryRun ? 'Yes' : 'No'}`);
    console.log();
  }

  private printExecutionPlan(plan: ExecutionPlan): void {
    this.log('info', `${colors.bold}Execution Plan:${colors.reset}`);
    this.log('info', `  Total waves: ${plan.waves.length}`);
    this.log('info', `  Critical path: ${plan.criticalPath.map((id) => this.getAgentShortName(id)).join(' → ')}`);
    this.log('info', `  Estimated duration: ${formatDuration(plan.estimatedDuration)}`);

    console.log();
    this.log('info', `${colors.bold}Wave Breakdown:${colors.reset}`);
    plan.waves.forEach((wave, i) => {
      const agents = wave.map((id) => {
        const agent = this.agents.get(id);
        return `${this.getAgentIcon(id)} ${this.getAgentShortName(id)}`;
      });
      this.log('info', `  Wave ${i + 1}: ${agents.join(', ')}`);
    });
    console.log();
  }

  private printSummary(report: OrchestratorReport): void {
    const { summary, totalDuration } = report;

    console.log(`
${colors.cyan}${colors.bold}╔═══════════════════════════════════════════════════════════════════════╗
║                         BUILD SUMMARY                                 ║
╚═══════════════════════════════════════════════════════════════════════╝${colors.reset}
`);

    const statusIcon = report.success ? `${colors.green}${icons.success}` : `${colors.red}${icons.failure}`;
    const statusText = report.success ? `${colors.green}SUCCESS` : `${colors.red}FAILED`;

    this.log('info', `${statusIcon} Build Status: ${statusText}${colors.reset}`);
    this.log('info', `${colors.cyan}Total Duration:${colors.reset} ${formatDuration(totalDuration)}`);
    console.log();

    this.log('info', `${colors.bold}Agent Results:${colors.reset}`);
    this.log('info', `  ${colors.green}✓ Successful:${colors.reset} ${summary.successfulAgents}/${summary.totalAgents}`);
    this.log('info', `  ${colors.red}✗ Failed:${colors.reset} ${summary.failedAgents}`);
    this.log('info', `  ${colors.yellow}○ Skipped:${colors.reset} ${summary.skippedAgents}`);
    console.log();

    this.log('info', `${colors.bold}Metrics:${colors.reset}`);
    this.log('info', `  ${colors.red}Errors:${colors.reset} ${summary.totalErrors}`);
    this.log('info', `  ${colors.yellow}Warnings:${colors.reset} ${summary.totalWarnings}`);
    this.log('info', `  ${colors.cyan}Files Processed:${colors.reset} ${summary.filesBuilt}`);

    if (summary.publishedPackages.length > 0) {
      console.log();
      this.log('info', `${colors.bold}Published Packages:${colors.reset}`);
      summary.publishedPackages.forEach((pkg) => {
        this.log('info', `  ${colors.green}${icons.publish}${colors.reset} ${pkg}`);
      });
    }

    console.log();

    // Print individual agent results
    this.log('info', `${colors.bold}Individual Agent Results:${colors.reset}`);
    for (const [id, result] of this.results) {
      const icon = result.success ? `${colors.green}${icons.success}` : `${colors.red}${icons.failure}`;
      const duration = result.metrics.duration ? formatDuration(result.metrics.duration) : 'N/A';
      this.log('info', `  ${icon} ${this.getAgentDisplayName(id)}${colors.reset} (${duration})`);
    }

    console.log(`
${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════════════════${colors.reset}
`);
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string): void {
    if (level === 'debug' && !this.config.verbose) return;

    const colorMap = {
      info: colors.white,
      warn: colors.yellow,
      error: colors.red,
      debug: colors.dim,
    };

    console.log(`${colorMap[level]}${message}${colors.reset}`);
  }

  private emitEvent(event: BuildEvent): void {
    this.emit('event', event);
    this.eventHandlers.forEach((handler) => handler(event));
  }

  onEvent(handler: BuildEventHandler): void {
    this.eventHandlers.push(handler);
  }

  private getAgentDisplayName(id: AgentId): string {
    const agent = this.agents.get(id);
    return agent?.getConfig().name || id;
  }

  private getAgentShortName(id: AgentId): string {
    const nameMap: Record<AgentId, string> = {
      orchestrator: 'Orchestrator',
      'build-engineer': 'Build',
      'typecheck-engineer': 'TypeCheck',
      'lint-engineer': 'Lint',
      'test-engineer': 'Test',
      'bundle-engineer': 'Bundle',
      'security-engineer': 'Security',
      'quality-engineer': 'Quality',
      'documentation-engineer': 'Docs',
      'performance-engineer': 'Perf',
      'publish-engineer': 'Publish',
    };
    return nameMap[id] || id;
  }

  private getAgentIcon(id: AgentId): string {
    const iconMap: Record<AgentId, string> = {
      orchestrator: icons.agent,
      'build-engineer': icons.build,
      'typecheck-engineer': icons.typecheck,
      'lint-engineer': icons.lint,
      'test-engineer': icons.test,
      'bundle-engineer': icons.bundle,
      'security-engineer': icons.security,
      'quality-engineer': icons.quality,
      'documentation-engineer': icons.docs,
      'performance-engineer': icons.performance,
      'publish-engineer': icons.publish,
    };
    return iconMap[id] || icons.agent;
  }

  // Get current dashboard state
  getDashboardState(): AgentDashboardInfo[] {
    const dashboard: AgentDashboardInfo[] = [];

    for (const [id, agent] of this.agents) {
      const result = this.results.get(id);
      dashboard.push({
        id,
        name: agent.getConfig().name,
        status: result?.status || agent.getStatus(),
        progress: result?.success ? 100 : 0,
        startTime: result?.metrics.startTime,
        endTime: result?.metrics.endTime,
      });
    }

    return dashboard;
  }
}
