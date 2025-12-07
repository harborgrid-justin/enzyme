/**
 * @missionfabric-js/enzyme Multi-Agent Build System
 * Enterprise-grade parallel build orchestration with 10 specialized engineer agents
 *
 * Architecture:
 * - 1 Orchestrator Agent: Coordinates all engineers, manages dependency graph
 * - 10 Engineer Agents: Specialized build tasks running in parallel
 */

// ============================================================================
// Core Type Definitions
// ============================================================================

export type AgentId =
  | 'orchestrator'
  | 'build-engineer'
  | 'typecheck-engineer'
  | 'lint-engineer'
  | 'test-engineer'
  | 'bundle-engineer'
  | 'security-engineer'
  | 'quality-engineer'
  | 'documentation-engineer'
  | 'performance-engineer'
  | 'publish-engineer';

export type AgentStatus =
  | 'idle'
  | 'initializing'
  | 'running'
  | 'success'
  | 'failed'
  | 'blocked'
  | 'cancelled';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

export interface AgentLogEntry {
  timestamp: Date;
  agentId: AgentId;
  level: LogLevel;
  message: string;
  details?: Record<string, unknown>;
}

export interface AgentMetrics {
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  memoryUsed?: number;
  cpuPercent?: number;
  linesProcessed?: number;
  filesProcessed?: number;
  errorsFound?: number;
  warningsFound?: number;
}

export interface AgentResult<T = unknown> {
  success: boolean;
  agentId: AgentId;
  status: AgentStatus;
  data?: T;
  error?: Error;
  logs: AgentLogEntry[];
  metrics: AgentMetrics;
}

export interface AgentDependency {
  agentId: AgentId;
  required: boolean;
  condition?: (result: AgentResult) => boolean;
}

export interface AgentConfig {
  id: AgentId;
  name: string;
  description: string;
  dependencies: AgentDependency[];
  timeout: number;
  retries: number;
  priority: number;
  parallel: boolean;
}

// ============================================================================
// Build Configuration
// ============================================================================

export interface BuildTarget {
  name: string;
  path: string;
  version: string;
  type: 'main' | 'typescript' | 'cli';
}

export interface BuildConfig {
  targets: BuildTarget[];
  outputDir: string;
  sourceMap: boolean;
  minify: boolean;
  parallel: boolean;
  maxConcurrency: number;
  failFast: boolean;
  verbose: boolean;
  dryRun: boolean;
  publishToNpm: boolean;
  npmToken?: string;
}

// ============================================================================
// Orchestrator Types
// ============================================================================

export interface OrchestratorState {
  phase: 'idle' | 'planning' | 'executing' | 'publishing' | 'complete' | 'failed';
  currentWave: number;
  totalWaves: number;
  agents: Map<AgentId, AgentResult>;
  startTime?: Date;
  endTime?: Date;
}

export interface ExecutionPlan {
  waves: AgentId[][];
  dependencyGraph: Map<AgentId, AgentId[]>;
  criticalPath: AgentId[];
  estimatedDuration: number;
}

export interface OrchestratorReport {
  success: boolean;
  executionPlan: ExecutionPlan;
  results: Map<AgentId, AgentResult>;
  totalDuration: number;
  summary: BuildSummary;
}

export interface BuildSummary {
  totalAgents: number;
  successfulAgents: number;
  failedAgents: number;
  skippedAgents: number;
  totalErrors: number;
  totalWarnings: number;
  filesBuilt: number;
  bundleSize?: BundleSizeReport;
  coverage?: CoverageReport;
  publishedPackages: string[];
}

// ============================================================================
// Specialized Agent Result Types
// ============================================================================

export interface TypeCheckResult {
  errors: TypeScriptError[];
  warnings: TypeScriptError[];
  filesChecked: number;
}

export interface TypeScriptError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface LintResult {
  errors: LintIssue[];
  warnings: LintIssue[];
  fixedCount: number;
  filesLinted: number;
}

export interface LintIssue {
  file: string;
  line: number;
  column: number;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  fixable: boolean;
}

export interface TestResult {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: number;
  coverage?: CoverageReport;
  suites: TestSuiteResult[];
}

export interface TestSuiteResult {
  name: string;
  file: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  tests: TestCaseResult[];
}

export interface TestCaseResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

export interface CoverageReport {
  lines: CoverageMetric;
  statements: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
}

export interface CoverageMetric {
  total: number;
  covered: number;
  percentage: number;
}

export interface BundleSizeReport {
  esm: BundleInfo;
  cjs: BundleInfo;
  types: BundleInfo;
  total: number;
  gzipped: number;
}

export interface BundleInfo {
  size: number;
  gzipped: number;
  files: number;
}

export interface SecurityResult {
  vulnerabilities: SecurityVulnerability[];
  auditLevel: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  dependencyCount: number;
}

export interface SecurityVulnerability {
  name: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  description: string;
  fixAvailable: boolean;
  path: string[];
}

export interface QualityResult {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  metrics: QualityMetrics;
  issues: QualityIssue[];
}

export interface QualityMetrics {
  complexity: number;
  maintainability: number;
  duplications: number;
  codeSmells: number;
  technicalDebt: number;
}

export interface QualityIssue {
  file: string;
  line: number;
  type: 'complexity' | 'duplication' | 'smell';
  message: string;
  effort: number;
}

export interface PerformanceResult {
  buildTime: number;
  memoryPeak: number;
  bundleAnalysis: BundleAnalysis;
  treeshaking: TreeshakingReport;
}

export interface BundleAnalysis {
  modules: ModuleInfo[];
  chunks: ChunkInfo[];
  assets: AssetInfo[];
}

export interface ModuleInfo {
  name: string;
  size: number;
  dependents: number;
  dependencies: number;
}

export interface ChunkInfo {
  name: string;
  size: number;
  modules: number;
  isEntry: boolean;
}

export interface AssetInfo {
  name: string;
  size: number;
  type: string;
}

export interface TreeshakingReport {
  removedBytes: number;
  removedModules: number;
  efficiency: number;
}

export interface PublishResult {
  packages: PublishedPackage[];
  registry: string;
  timestamp: Date;
}

export interface PublishedPackage {
  name: string;
  version: string;
  tarball: string;
  size: number;
  shasum: string;
}

export interface DocumentationResult {
  generated: boolean;
  filesCreated: number;
  apiDocs: number;
  readme: boolean;
  changelog: boolean;
}

// ============================================================================
// Event System Types
// ============================================================================

export type BuildEvent =
  | { type: 'BUILD_STARTED'; config: BuildConfig }
  | { type: 'AGENT_STARTED'; agentId: AgentId }
  | { type: 'AGENT_PROGRESS'; agentId: AgentId; progress: number; message: string }
  | { type: 'AGENT_COMPLETED'; agentId: AgentId; result: AgentResult }
  | { type: 'AGENT_FAILED'; agentId: AgentId; error: Error }
  | { type: 'WAVE_STARTED'; wave: number; agents: AgentId[] }
  | { type: 'WAVE_COMPLETED'; wave: number; results: AgentResult[] }
  | { type: 'BUILD_COMPLETED'; report: OrchestratorReport }
  | { type: 'BUILD_FAILED'; error: Error; partialReport?: OrchestratorReport };

export type BuildEventHandler = (event: BuildEvent) => void;

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardState {
  agents: AgentDashboardInfo[];
  timeline: TimelineEntry[];
  logs: AgentLogEntry[];
  summary: BuildSummary | null;
  isRunning: boolean;
}

export interface AgentDashboardInfo {
  id: AgentId;
  name: string;
  status: AgentStatus;
  progress: number;
  startTime?: Date;
  endTime?: Date;
  currentTask?: string;
}

export interface TimelineEntry {
  timestamp: Date;
  agentId: AgentId;
  event: string;
  duration?: number;
}
