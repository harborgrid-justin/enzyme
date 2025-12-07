/**
 * Type definitions for the Enzyme VS Code Extension
 */

import * as vscode from 'vscode';

/**
 * Log Levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Component Style Types
 */
export type ComponentStyle = 'function' | 'arrow';

/**
 * Test Framework Types
 */
export type TestFramework = 'vitest' | 'jest';

/**
 * CSS Framework Types
 */
export type CSSFramework = 'tailwind' | 'css-modules' | 'styled-components' | 'emotion';

/**
 * Enzyme Configuration
 */
export interface EnzymeConfig {
  version?: string;
  features?: EnzymeFeatureConfig[];
  routes?: EnzymeRouteConfig[];
  auth?: EnzymeAuthConfig;
  api?: EnzymeApiConfig;
  state?: EnzymeStateConfig;
  performance?: EnzymePerformanceConfig;
  extensions?: EnzymeExtensionConfig[];
}

/**
 * Enzyme Feature Configuration
 */
export interface EnzymeFeatureConfig {
  id: string;
  name: string;
  version: string;
  description?: string;
  enabled?: boolean;
  routes?: EnzymeRouteConfig[];
  permissions?: string[];
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Enzyme Route Configuration
 */
export interface EnzymeRouteConfig {
  path: string;
  component?: string;
  loader?: string;
  action?: string;
  children?: EnzymeRouteConfig[];
  meta?: EnzymeRouteMeta;
  protected?: boolean;
  permissions?: string[];
}

/**
 * Route Metadata
 */
export interface EnzymeRouteMeta {
  title?: string;
  description?: string;
  icon?: string;
  layout?: string;
  [key: string]: unknown;
}

/**
 * Enzyme Auth Configuration
 */
export interface EnzymeAuthConfig {
  provider: 'jwt' | 'oauth' | 'saml' | 'custom';
  endpoints?: {
    login?: string;
    logout?: string;
    refresh?: string;
    profile?: string;
  };
  storage?: 'localStorage' | 'sessionStorage' | 'cookie';
  redirects?: {
    login?: string;
    logout?: string;
    unauthorized?: string;
  };
}

/**
 * Enzyme API Configuration
 */
export interface EnzymeApiConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  interceptors?: {
    request?: string[];
    response?: string[];
  };
}

/**
 * Enzyme State Configuration
 */
export interface EnzymeStateConfig {
  devtools?: boolean;
  persist?: boolean;
  middleware?: string[];
}

/**
 * Enzyme Performance Configuration
 */
export interface EnzymePerformanceConfig {
  monitoring?: boolean;
  sampling?: number;
  thresholds?: {
    fcp?: number;
    lcp?: number;
    fid?: number;
    cls?: number;
  };
}

/**
 * Enzyme Extension Configuration
 */
export interface EnzymeExtensionConfig {
  id: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

/**
 * Enzyme Workspace Information
 */
export interface EnzymeWorkspace {
  rootPath: string;
  packageJson?: PackageJson;
  enzymeConfig?: EnzymeConfig;
  isEnzymeProject: boolean;
  enzymeVersion?: string;
  features: EnzymeFeature[];
  routes: EnzymeRoute[];
  components: EnzymeComponent[];
  stores: EnzymeStore[];
  apiClients: EnzymeApiClient[];
}

/**
 * Package.json Structure
 */
export interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Enzyme Feature
 */
export interface EnzymeFeature {
  id: string;
  name: string;
  path: string;
  version: string;
  enabled: boolean;
  routes: EnzymeRoute[];
  components: EnzymeComponent[];
  description?: string;
  icon?: string;
}

/**
 * Enzyme Route
 */
export interface EnzymeRoute {
  path: string;
  filePath: string;
  component?: string;
  loader?: boolean;
  action?: boolean;
  children: EnzymeRoute[];
  protected: boolean;
  permissions: string[];
  meta?: EnzymeRouteMeta;
}

/**
 * Enzyme Component
 */
export interface EnzymeComponent {
  name: string;
  filePath: string;
  type: 'page' | 'component' | 'layout' | 'feature';
  exports: string[];
  imports: EnzymeImport[];
  hooks: string[];
  hasTests: boolean;
}

/**
 * Enzyme Store
 */
export interface EnzymeStore {
  name: string;
  filePath: string;
  stateShape: Record<string, string>;
  actions: string[];
  selectors: string[];
  middleware: string[];
  persistent: boolean;
}

/**
 * Enzyme API Client
 */
export interface EnzymeApiClient {
  name: string;
  filePath: string;
  baseUrl?: string;
  endpoints: EnzymeApiEndpoint[];
  interceptors: string[];
}

/**
 * API Endpoint
 */
export interface EnzymeApiEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  requestType?: string;
  responseType?: string;
}

/**
 * Import Information
 */
export interface EnzymeImport {
  module: string;
  imports: string[];
  isEnzyme: boolean;
  isDynamic: boolean;
}

/**
 * TreeView Item Types
 */
export interface EnzymeTreeItem extends vscode.TreeItem {
  type: 'feature' | 'route' | 'component' | 'store' | 'api' | 'performance';
  data?: EnzymeFeature | EnzymeRoute | EnzymeComponent | EnzymeStore | EnzymeApiClient;
  children?: EnzymeTreeItem[];
}

/**
 * WebView Message Types
 */
export interface WebViewMessage {
  command: string;
  data?: unknown;
}

/**
 * State Inspector Message
 */
export interface StateInspectorMessage extends WebViewMessage {
  command: 'init' | 'update' | 'select' | 'dispatch';
  data?: {
    stores?: Record<string, unknown>;
    selectedStore?: string;
    action?: {
      type: string;
      payload?: unknown;
    };
  };
}

/**
 * Performance Dashboard Message
 */
export interface PerformanceDashboardMessage extends WebViewMessage {
  command: 'init' | 'update' | 'filter';
  data?: {
    metrics?: PerformanceMetric[];
    filter?: PerformanceFilter;
  };
}

/**
 * Performance Metric
 */
export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  timestamp: number;
  component?: string;
  type: 'render' | 'api' | 'bundle' | 'memory';
  severity: 'info' | 'warning' | 'error';
}

/**
 * Performance Filter
 */
export interface PerformanceFilter {
  type?: PerformanceMetric['type'][];
  severity?: PerformanceMetric['severity'][];
  component?: string;
  startTime?: number;
  endTime?: number;
}

/**
 * Code Generation Options
 */
export interface GenerateComponentOptions {
  name: string;
  path: string;
  style: ComponentStyle;
  cssFramework: CSSFramework;
  withTest: boolean;
  withStory: boolean;
  props?: ComponentProp[];
}

/**
 * Component Prop Definition
 */
export interface ComponentProp {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
}

/**
 * Generate Feature Options
 */
export interface GenerateFeatureOptions {
  id: string;
  name: string;
  path: string;
  withRoutes: boolean;
  withComponents: boolean;
  withStore: boolean;
  withApi: boolean;
  withTests: boolean;
}

/**
 * Generate Route Options
 */
export interface GenerateRouteOptions {
  path: string;
  filePath: string;
  withLoader: boolean;
  withAction: boolean;
  protected: boolean;
  layout?: string;
}

/**
 * Generate Store Options
 */
export interface GenerateStoreOptions {
  name: string;
  path: string;
  stateShape: Record<string, string>;
  withPersist: boolean;
  withDevtools: boolean;
  withMiddleware: string[];
}

/**
 * Generate API Client Options
 */
export interface GenerateApiClientOptions {
  name: string;
  path: string;
  baseUrl?: string;
  endpoints: EnzymeApiEndpoint[];
  withInterceptors: boolean;
  withTypes: boolean;
}

/**
 * Generate Hook Options
 */
export interface GenerateHookOptions {
  name: string;
  path: string;
  params?: HookParam[];
  returnType?: string;
  withTest: boolean;
}

/**
 * Hook Parameter
 */
export interface HookParam {
  name: string;
  type: string;
  optional: boolean;
}

/**
 * Generate Test Options
 */
export interface GenerateTestOptions {
  targetFile: string;
  framework: TestFramework;
  withCoverage: boolean;
  testTypes: ('unit' | 'integration' | 'e2e')[];
}

/**
 * Analysis Result
 */
export interface AnalysisResult {
  type: 'performance' | 'security' | 'dependencies';
  timestamp: number;
  summary: string;
  issues: AnalysisIssue[];
  recommendations: string[];
}

/**
 * Analysis Issue
 */
export interface AnalysisIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  fix?: AnalysisFix;
}

/**
 * Analysis Fix
 */
export interface AnalysisFix {
  description: string;
  edits: vscode.TextEdit[];
  automatic: boolean;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation Error
 */
export interface ValidationError {
  message: string;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
}

/**
 * Validation Warning
 */
export interface ValidationWarning {
  message: string;
  file?: string;
  line?: number;
  column?: number;
  code?: string;
}

/**
 * Migration Analysis Result
 */
export interface MigrationAnalysisResult {
  sourceFramework: 'cra' | 'next' | 'vite' | 'other';
  complexity: 'low' | 'medium' | 'high';
  estimatedEffort: string;
  steps: MigrationStep[];
  compatibilityIssues: MigrationIssue[];
}

/**
 * Migration Step
 */
export interface MigrationStep {
  id: string;
  title: string;
  description: string;
  order: number;
  automated: boolean;
  completed: boolean;
}

/**
 * Migration Issue
 */
export interface MigrationIssue {
  type: 'breaking' | 'warning' | 'info';
  message: string;
  file?: string;
  resolution?: string;
}

/**
 * Extension Settings
 */
export interface ExtensionSettings {
  telemetryEnabled: boolean;
  loggingLevel: LogLevel;
  componentStyle: ComponentStyle;
  testFramework: TestFramework;
  cssFramework: CSSFramework;
  validationOnSave: boolean;
  validationStrict: boolean;
  performanceMonitoringEnabled: boolean;
  securityScanningEnabled: boolean;
  importsAutoOptimize: boolean;
  snippetsEnabled: boolean;
  codeActionsEnabled: boolean;
  explorerAutoRefresh: boolean;
  formatOnSave: boolean;
}

/**
 * Telemetry Event
 */
export interface TelemetryEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
  measurements?: Record<string, number>;
}

/**
 * File Watcher Event
 */
export interface FileWatcherEvent {
  type: 'created' | 'changed' | 'deleted';
  uri: vscode.Uri;
  timestamp: number;
}

/**
 * Command Argument Types
 */
export interface CommandArgs {
  uri?: vscode.Uri;
  [key: string]: unknown;
}

/**
 * Quick Pick Item with Additional Data
 */
export interface EnzymeQuickPickItem extends vscode.QuickPickItem {
  data?: unknown;
  action?: () => void | Promise<void>;
}

/**
 * Status Bar Item Configuration
 */
export interface StatusBarItemConfig {
  text: string;
  tooltip?: string;
  command?: string;
  priority?: number;
  alignment?: vscode.StatusBarAlignment;
}

/**
 * Diagnostic Information
 */
export interface DiagnosticInfo {
  file: string;
  line: number;
  column: number;
  severity: vscode.DiagnosticSeverity;
  message: string;
  source: string;
  code?: string | number;
}
