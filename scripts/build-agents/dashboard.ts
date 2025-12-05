/**
 * @missionfabric-js/enzyme Multi-Agent Build System
 * Real-time Dashboard - Live progress visualization
 */

import type {
  BuildEvent,
  AgentId,
  AgentStatus,
  AgentDashboardInfo,
  OrchestratorReport,
} from './types.js';
import { colors, icons, formatDuration } from './base-agent.js';

// ============================================================================
// Dashboard State
// ============================================================================

interface DashboardState {
  isRunning: boolean;
  currentWave: number;
  totalWaves: number;
  agents: Map<AgentId, AgentDashboardInfo>;
  startTime: Date | null;
  lastUpdate: Date | null;
}

// ============================================================================
// Dashboard Class
// ============================================================================

export class BuildDashboard {
  private state: DashboardState;
  private intervalId: NodeJS.Timeout | null = null;
  private isInteractive: boolean;

  constructor(interactive: boolean = true) {
    this.isInteractive = interactive && process.stdout.isTTY;
    this.state = {
      isRunning: false,
      currentWave: 0,
      totalWaves: 0,
      agents: new Map(),
      startTime: null,
      lastUpdate: null,
    };
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  handleEvent(event: BuildEvent): void {
    this.state.lastUpdate = new Date();

    switch (event.type) {
      case 'BUILD_STARTED':
        this.state.isRunning = true;
        this.state.startTime = new Date();
        break;

      case 'AGENT_STARTED':
        this.updateAgentStatus(event.agentId, 'running');
        break;

      case 'AGENT_PROGRESS':
        this.updateAgentProgress(event.agentId, event.progress, event.message);
        break;

      case 'AGENT_COMPLETED':
        this.updateAgentStatus(event.agentId, 'success');
        break;

      case 'AGENT_FAILED':
        this.updateAgentStatus(event.agentId, 'failed');
        break;

      case 'WAVE_STARTED':
        this.state.currentWave = event.wave;
        break;

      case 'BUILD_COMPLETED':
      case 'BUILD_FAILED':
        this.state.isRunning = false;
        break;
    }

    if (this.isInteractive) {
      this.render();
    }
  }

  private updateAgentStatus(agentId: AgentId, status: AgentStatus): void {
    const existing = this.state.agents.get(agentId);
    if (existing) {
      existing.status = status;
      if (status === 'running') {
        existing.startTime = new Date();
      } else if (status === 'success' || status === 'failed') {
        existing.endTime = new Date();
        existing.progress = status === 'success' ? 100 : 0;
      }
    } else {
      this.state.agents.set(agentId, {
        id: agentId,
        name: this.getAgentName(agentId),
        status,
        progress: 0,
        startTime: status === 'running' ? new Date() : undefined,
      });
    }
  }

  private updateAgentProgress(agentId: AgentId, progress: number, message: string): void {
    const existing = this.state.agents.get(agentId);
    if (existing) {
      existing.progress = progress;
      existing.currentTask = message;
    }
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  start(): void {
    if (this.isInteractive) {
      // Clear screen and hide cursor
      process.stdout.write('\x1B[?25l'); // Hide cursor
      this.render();

      // Update every 100ms
      this.intervalId = setInterval(() => this.render(), 100);
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.isInteractive) {
      process.stdout.write('\x1B[?25h'); // Show cursor
    }
  }

  private render(): void {
    if (!this.isInteractive) return;

    const output: string[] = [];

    // Header
    output.push(`${colors.cyan}${colors.bold}┌─────────────────────────────────────────────────────────────────┐${colors.reset}`);
    output.push(`${colors.cyan}${colors.bold}│${colors.reset}              🤖 ENZYME BUILD DASHBOARD                         ${colors.cyan}${colors.bold}│${colors.reset}`);
    output.push(`${colors.cyan}${colors.bold}└─────────────────────────────────────────────────────────────────┘${colors.reset}`);
    output.push('');

    // Status
    const elapsed = this.state.startTime
      ? formatDuration(Date.now() - this.state.startTime.getTime())
      : '0ms';
    const status = this.state.isRunning
      ? `${colors.green}●${colors.reset} Running`
      : `${colors.dim}○${colors.reset} Idle`;

    output.push(`  Status: ${status}  │  Elapsed: ${elapsed}  │  Wave: ${this.state.currentWave}/${this.state.totalWaves || '?'}`);
    output.push('');

    // Agent progress bars
    output.push(`${colors.bold}  Engineers:${colors.reset}`);

    const agentOrder: AgentId[] = [
      'typecheck-engineer',
      'lint-engineer',
      'test-engineer',
      'security-engineer',
      'quality-engineer',
      'documentation-engineer',
      'build-engineer',
      'bundle-engineer',
      'performance-engineer',
      'publish-engineer',
    ];

    for (const id of agentOrder) {
      const agent = this.state.agents.get(id) || {
        id,
        name: this.getAgentName(id),
        status: 'idle' as AgentStatus,
        progress: 0,
      };

      output.push(this.renderAgentLine(agent));
    }

    output.push('');
    output.push(`${colors.dim}  Press Ctrl+C to cancel${colors.reset}`);

    // Clear screen and render
    process.stdout.write('\x1B[2J\x1B[H'); // Clear screen and move to home
    console.log(output.join('\n'));
  }

  private renderAgentLine(agent: AgentDashboardInfo): string {
    const icon = this.getStatusIcon(agent.status);
    const name = agent.name.padEnd(20);
    const progressBar = this.renderProgressBar(agent.progress, 20);
    const percentage = `${Math.round(agent.progress)}%`.padStart(4);
    const task = agent.currentTask ? ` ${colors.dim}${agent.currentTask.slice(0, 25)}${colors.reset}` : '';

    return `  ${icon} ${name} ${progressBar} ${percentage}${task}`;
  }

  private renderProgressBar(progress: number, width: number): string {
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;

    const filledChar = '█';
    const emptyChar = '░';

    let color = colors.dim;
    if (progress >= 100) color = colors.green;
    else if (progress > 0) color = colors.cyan;

    return `${color}${filledChar.repeat(filled)}${colors.dim}${emptyChar.repeat(empty)}${colors.reset}`;
  }

  private getStatusIcon(status: AgentStatus): string {
    const iconMap: Record<AgentStatus, string> = {
      idle: `${colors.dim}○${colors.reset}`,
      initializing: `${colors.yellow}◐${colors.reset}`,
      running: `${colors.cyan}◉${colors.reset}`,
      success: `${colors.green}✓${colors.reset}`,
      failed: `${colors.red}✗${colors.reset}`,
      blocked: `${colors.yellow}⊘${colors.reset}`,
      cancelled: `${colors.dim}○${colors.reset}`,
    };
    return iconMap[status] || '○';
  }

  private getAgentName(id: AgentId): string {
    const nameMap: Record<AgentId, string> = {
      orchestrator: 'Orchestrator',
      'build-engineer': 'Build Engineer',
      'typecheck-engineer': 'TypeCheck Engineer',
      'lint-engineer': 'Lint Engineer',
      'test-engineer': 'Test Engineer',
      'bundle-engineer': 'Bundle Engineer',
      'security-engineer': 'Security Engineer',
      'quality-engineer': 'Quality Engineer',
      'documentation-engineer': 'Docs Engineer',
      'performance-engineer': 'Performance Engineer',
      'publish-engineer': 'Publish Engineer',
    };
    return nameMap[id] || id;
  }

  // ============================================================================
  // Final Report
  // ============================================================================

  printFinalReport(report: OrchestratorReport): void {
    const { summary, totalDuration } = report;

    console.log(`
${colors.cyan}${colors.bold}╔═══════════════════════════════════════════════════════════════════════╗
║                        FINAL BUILD REPORT                             ║
╚═══════════════════════════════════════════════════════════════════════╝${colors.reset}
`);

    // Overall status
    const statusIcon = report.success
      ? `${colors.green}${icons.success}${colors.reset}`
      : `${colors.red}${icons.failure}${colors.reset}`;
    const statusText = report.success
      ? `${colors.green}BUILD SUCCESSFUL${colors.reset}`
      : `${colors.red}BUILD FAILED${colors.reset}`;

    console.log(`  ${statusIcon} ${statusText}`);
    console.log(`  ${colors.dim}Total Duration: ${formatDuration(totalDuration)}${colors.reset}`);
    console.log();

    // Agent summary table
    console.log(`${colors.bold}  Agent Results:${colors.reset}`);
    console.log(`  ${'─'.repeat(60)}`);

    for (const [id, result] of report.results) {
      const icon = result.success
        ? `${colors.green}✓${colors.reset}`
        : `${colors.red}✗${colors.reset}`;
      const name = this.getAgentName(id).padEnd(25);
      const duration = result.metrics.duration
        ? formatDuration(result.metrics.duration).padStart(10)
        : 'N/A'.padStart(10);
      const errors = result.metrics.errorsFound || 0;
      const warnings = result.metrics.warningsFound || 0;

      const metrics = errors > 0 || warnings > 0
        ? `${colors.red}${errors}E${colors.reset} ${colors.yellow}${warnings}W${colors.reset}`
        : `${colors.green}0E 0W${colors.reset}`;

      console.log(`  ${icon} ${name} ${duration}  ${metrics}`);
    }

    console.log(`  ${'─'.repeat(60)}`);
    console.log();

    // Summary stats
    console.log(`${colors.bold}  Summary:${colors.reset}`);
    console.log(`    ${colors.green}✓ Successful:${colors.reset} ${summary.successfulAgents}/${summary.totalAgents}`);
    console.log(`    ${colors.red}✗ Failed:${colors.reset} ${summary.failedAgents}`);
    console.log(`    ${colors.yellow}○ Skipped:${colors.reset} ${summary.skippedAgents}`);
    console.log(`    ${colors.cyan}Files:${colors.reset} ${summary.filesBuilt}`);
    console.log(`    ${colors.red}Errors:${colors.reset} ${summary.totalErrors}`);
    console.log(`    ${colors.yellow}Warnings:${colors.reset} ${summary.totalWarnings}`);

    if (summary.publishedPackages.length > 0) {
      console.log();
      console.log(`${colors.bold}  Published Packages:${colors.reset}`);
      summary.publishedPackages.forEach((pkg) => {
        console.log(`    ${colors.green}📦${colors.reset} ${pkg}`);
      });
    }

    console.log();
  }
}

// ============================================================================
// Simple Progress Logger (for non-interactive mode)
// ============================================================================

export class SimpleProgressLogger {
  handleEvent(event: BuildEvent): void {
    const timestamp = new Date().toISOString().slice(11, 23);

    switch (event.type) {
      case 'BUILD_STARTED':
        console.log(`[${timestamp}] ${icons.build} Build started`);
        break;

      case 'AGENT_STARTED':
        console.log(`[${timestamp}] ${icons.running} ${event.agentId} started`);
        break;

      case 'AGENT_COMPLETED':
        console.log(`[${timestamp}] ${colors.green}${icons.success}${colors.reset} ${event.agentId} completed`);
        break;

      case 'AGENT_FAILED':
        console.log(`[${timestamp}] ${colors.red}${icons.failure}${colors.reset} ${event.agentId} failed: ${event.error.message}`);
        break;

      case 'WAVE_STARTED':
        console.log(`[${timestamp}] ${icons.info} Starting wave ${event.wave}: ${event.agents.join(', ')}`);
        break;

      case 'BUILD_COMPLETED':
        console.log(`[${timestamp}] ${colors.green}${icons.success}${colors.reset} Build completed successfully`);
        break;

      case 'BUILD_FAILED':
        console.log(`[${timestamp}] ${colors.red}${icons.failure}${colors.reset} Build failed: ${event.error.message}`);
        break;
    }
  }
}
