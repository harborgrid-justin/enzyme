/**
 * @missionfabric-js/enzyme Multi-Agent Build System
 *
 * Enterprise-grade parallel build orchestration with:
 * - 1 Orchestrator Agent: Coordinates all engineers
 * - 10 Engineer Agents: Specialized build tasks
 *
 * Architecture:
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    BUILD ORCHESTRATOR                          │
 * │  ┌─────────────────────────────────────────────────────────┐   │
 * │  │            Dependency Graph & Wave Scheduler            │   │
 * │  └─────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────┘
 *                              │
 *          ┌───────────────────┼───────────────────┐
 *          ▼                   ▼                   ▼
 * ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
 * │ Wave 1 (Parallel)│ │ Wave 2 (Parallel)│ │ Wave 3 (Parallel)│
 * ├─────────────────┤ ├─────────────────┤ ├─────────────────┤
 * │ 🔤 TypeCheck    │ │ 🔨 Build        │ │ 📦 Bundle       │
 * │ 🔍 Lint         │ │ 🧪 Test         │ │ ⚡ Performance  │
 * │ 🔒 Security     │ │ ⭐ Quality      │ │ 📦 Publish      │
 * │ 📄 Docs         │ │                 │ │                 │
 * └─────────────────┘ └─────────────────┘ └─────────────────┘
 *
 * Execution Flow:
 * 1. Orchestrator creates dependency graph
 * 2. Topological sort into execution waves
 * 3. Execute waves in parallel (respecting dependencies)
 * 4. Aggregate results and generate reports
 * 5. Publish if enabled
 *
 * @example
 * ```typescript
 * import { BuildOrchestrator, BuildConfig } from './build-agents';
 *
 * const config: BuildConfig = {
 *   targets: [{ name: '@enzyme/main', path: '.', version: '1.0.0', type: 'main' }],
 *   outputDir: 'dist',
 *   sourceMap: true,
 *   minify: true,
 *   parallel: true,
 *   maxConcurrency: 4,
 *   failFast: false,
 *   verbose: false,
 *   dryRun: false,
 *   publishToNpm: false,
 * };
 *
 * const orchestrator = new BuildOrchestrator(config);
 * const report = await orchestrator.run();
 *
 * console.log(`Build ${report.success ? 'succeeded' : 'failed'}`);
 * ```
 */

// Core Types
export * from './types.js';

// Base Agent
export { BaseAgent, createAgentConfig, formatDuration, formatBytes, colors, icons } from './base-agent.js';

// Engineer Agents
export {
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

// Orchestrator
export { BuildOrchestrator } from './orchestrator.js';

// Dashboard
export { BuildDashboard, SimpleProgressLogger } from './dashboard.js';

// ============================================================================
// Quick Start Functions
// ============================================================================

import type { BuildConfig, OrchestratorReport } from './types.js';
import { BuildOrchestrator } from './orchestrator.js';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Run a full build with default configuration
 */
export async function runBuild(options: Partial<BuildConfig> = {}): Promise<OrchestratorReport> {
  const rootDir = resolve(process.cwd());

  const defaultConfig: BuildConfig = {
    targets: [],
    outputDir: 'dist',
    sourceMap: true,
    minify: true,
    parallel: true,
    maxConcurrency: 4,
    failFast: false,
    verbose: false,
    dryRun: false,
    publishToNpm: false,
    ...options,
  };

  // Auto-discover targets if not provided
  if (defaultConfig.targets.length === 0) {
    const mainPkgPath = join(rootDir, 'package.json');
    if (existsSync(mainPkgPath)) {
      const pkg = JSON.parse(readFileSync(mainPkgPath, 'utf-8'));
      defaultConfig.targets.push({
        name: pkg.name,
        path: rootDir,
        version: pkg.version,
        type: 'main',
      });
    }

    const tsPkgPath = join(rootDir, 'typescript', 'package.json');
    if (existsSync(tsPkgPath)) {
      const pkg = JSON.parse(readFileSync(tsPkgPath, 'utf-8'));
      defaultConfig.targets.push({
        name: pkg.name,
        path: join(rootDir, 'typescript'),
        version: pkg.version,
        type: 'typescript',
      });
    }
  }

  const orchestrator = new BuildOrchestrator(defaultConfig);
  return orchestrator.run();
}

/**
 * Run build and publish to npm
 */
export async function runBuildAndPublish(
  npmToken: string,
  options: Partial<BuildConfig> = {}
): Promise<OrchestratorReport> {
  return runBuild({
    ...options,
    publishToNpm: true,
    npmToken,
  });
}
