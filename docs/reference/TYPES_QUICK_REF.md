# Types Quick Reference

Complete TypeScript type reference for @missionfabric-js/enzyme.

## Table of Contents

- [API Types](#api-types)
- [Authentication Types](#authentication-types)
- [Configuration Types](#configuration-types)
- [Data Types](#data-types)
- [Feature Types](#feature-types)
- [Flag Types](#flag-types)
- [Routing Types](#routing-types)
- [State Types](#state-types)
- [Performance Types](#performance-types)
- [Error Types](#error-types)
- [Real-time Types](#real-time-types)
- [Coordination Types](#coordination-types)
- [Utility Types](#utility-types)

---

## API Types

### `HttpMethod`
```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
```
**Module:** `/api`
**Description:** HTTP request methods

### `ApiResponse<T>`
```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
  headers: ResponseHeaders;
  timing: ResponseTiming;
  cache?: CacheInfo;
}
```
**Module:** `/api`
**Description:** Standardized API response structure

### `ApiError`
```typescript
interface ApiError {
  message: string;
  status: number;
  code?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: Date;
  requestId?: string;
  fieldErrors?: FieldError[];
}
```
**Module:** `/api`
**Description:** API error structure

### `ApiClientConfig`
```typescript
interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  retry?: RetryConfig;
  interceptors?: {
    request?: RequestInterceptor[];
    response?: ResponseInterceptor[];
    error?: ErrorInterceptor[];
  };
}
```
**Module:** `/api`
**Description:** API client configuration

### `RequestConfig`
```typescript
interface RequestConfig {
  url: string;
  method: HttpMethod;
  headers?: RequestHeaders;
  params?: PathParams;
  query?: QueryParams;
  body?: any;
  timeout?: number;
  retry?: RetryConfig;
  cache?: CacheConfig;
}
```
**Module:** `/api`
**Description:** HTTP request configuration

### `PaginatedResponse<T>`
```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
```
**Module:** `/api`
**Description:** Paginated API response

---

## Authentication Types

### `User`
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  permissions: Permission[];
  metadata?: Record<string, any>;
}
```
**Module:** `/auth`
**Description:** User object structure

### `Role`
```typescript
interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
}
```
**Module:** `/auth`
**Description:** User role definition

### `Permission`
```typescript
interface Permission {
  id: string;
  action: string;
  resource: string;
  scope?: PermissionScope;
  conditions?: PermissionCondition[];
}
```
**Module:** `/auth`
**Description:** Permission definition

### `AuthTokens`
```typescript
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}
```
**Module:** `/auth`
**Description:** Authentication tokens

### `LoginCredentials`
```typescript
interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}
```
**Module:** `/auth`
**Description:** Login credentials

### `AuthState`
```typescript
interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
}
```
**Module:** `/auth`
**Description:** Authentication state

### `RouteAuthConfig`
```typescript
interface RouteAuthConfig {
  requireAuth: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  redirectTo?: string;
}
```
**Module:** `/auth`
**Description:** Route authentication configuration

### `RBACConfig`
```typescript
interface RBACConfig {
  roles: RoleDefinition[];
  permissions: PermissionMatrix;
  policies?: PolicySet;
  hierarchy?: RoleHierarchy;
}
```
**Module:** `/auth`
**Description:** RBAC system configuration

---

## Configuration Types

### `AppConfig`
```typescript
interface AppConfig {
  api: {
    baseURL: string;
    timeout: number;
  };
  auth: {
    provider: string;
    redirectUri: string;
  };
  features: Record<string, boolean>;
  theme: {
    mode: 'light' | 'dark' | 'auto';
  };
  [key: string]: any;
}
```
**Module:** `/config`
**Description:** Application configuration structure

### `ConfigSchema`
```typescript
interface ConfigSchema {
  [key: string]: ConfigFieldSchema;
}

interface ConfigFieldSchema {
  type: ValidationRuleType;
  required?: boolean;
  default?: any;
  validation?: ValidationRule[];
}
```
**Module:** `/config`
**Description:** Configuration schema definition

### `Environment`
```typescript
type Environment = 'development' | 'staging' | 'production' | 'test';
```
**Module:** `/config`
**Description:** Application environment

### `ValidationError`
```typescript
interface ValidationError {
  field: string;
  message: string;
  value?: any;
}
```
**Module:** `/config`
**Description:** Configuration validation error

### `ValidationResult`
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
```
**Module:** `/config`
**Description:** Validation result

---

## Data Types

### `Schema<T>`
```typescript
interface Schema<T> {
  parse: (value: unknown) => T;
  safeParse: (value: unknown) => ValidationResult<T>;
}

interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: ValidationIssue[];
}
```
**Module:** `/data`
**Description:** Validation schema

### `Entity`
```typescript
interface Entity {
  id: string;
  [key: string]: any;
}
```
**Module:** `/data`
**Description:** Base entity structure

### `NormalizedEntities`
```typescript
interface NormalizedEntities {
  [entityType: string]: EntityMap;
}

interface EntityMap {
  [id: string]: Entity;
}
```
**Module:** `/data`
**Description:** Normalized entity storage

### `NormalizationResult`
```typescript
interface NormalizationResult {
  entities: NormalizedEntities;
  result: string | string[];
}
```
**Module:** `/data`
**Description:** Entity normalization result

### `SyncConflict`
```typescript
interface SyncConflict {
  entityId: string;
  field: string;
  localValue: any;
  remoteValue: any;
  baseValue?: any;
  resolution?: ConflictResolution;
}
```
**Module:** `/data`
**Description:** Data synchronization conflict

### `IntegrityViolation`
```typescript
interface IntegrityViolation {
  entityId: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  repairable: boolean;
}
```
**Module:** `/data`
**Description:** Data integrity violation

---

## Feature Types

### `FeatureMetadata`
```typescript
interface FeatureMetadata {
  id: string;
  name: string;
  description?: string;
  version: string;
  category?: string;
  tags?: string[];
}
```
**Module:** `/feature`
**Description:** Feature module metadata

### `FeatureConfig`
```typescript
interface FeatureConfig {
  id: string;
  metadata: FeatureMetadata;
  routes?: RouteConfig[];
  navigation?: NavItem[];
  permissions?: string[];
  flags?: Record<string, boolean>;
  component?: ComponentType;
}
```
**Module:** `/feature`
**Description:** Feature configuration

### `FeatureModule`
```typescript
interface FeatureModule {
  config: FeatureConfig;
  component: ComponentType;
}
```
**Module:** `/feature`
**Description:** Feature module structure

### `FeatureRegistry`
```typescript
interface FeatureRegistry {
  register: (config: FeatureConfig) => void;
  unregister: (id: string) => void;
  get: (id: string) => FeatureConfig | undefined;
  getAll: () => FeatureConfig[];
}
```
**Module:** `/feature`
**Description:** Feature registry interface

---

## Flag Types

### `FlagKey`
```typescript
type FlagKey = string;
```
**Module:** `/flags`
**Description:** Feature flag key

### `FlagCategory`
```typescript
type FlagCategory =
  | 'feature'
  | 'experiment'
  | 'operational'
  | 'permission';
```
**Module:** `/flags`
**Description:** Feature flag category

---

## Routing Types

### `RouteConfig`
```typescript
interface RouteConfig {
  path: string;
  component: ComponentType;
  auth?: RouteAuthConfig;
  meta?: Record<string, any>;
  children?: RouteConfig[];
}
```
**Module:** `/routing`
**Description:** Route configuration

### `PathParams`
```typescript
type PathParams = Record<string, string | number>;
```
**Module:** `/routing`
**Description:** URL path parameters

### `QueryParams`
```typescript
type QueryParams = Record<string, string | number | boolean | null | undefined>;
```
**Module:** `/routing`
**Description:** URL query parameters

---

## State Types

### `StoreState`
```typescript
interface StoreState {
  // Global state shape
  user: User | null;
  ui: {
    sidebarOpen: boolean;
    theme: ThemeMode;
  };
  [key: string]: any;
}
```
**Module:** `/state`
**Description:** Global store state shape

---

## Performance Types

### `VitalMetricName`
```typescript
type VitalMetricName =
  | 'FCP'  // First Contentful Paint
  | 'LCP'  // Largest Contentful Paint
  | 'FID'  // First Input Delay
  | 'CLS'  // Cumulative Layout Shift
  | 'TTFB' // Time to First Byte
  | 'INP'; // Interaction to Next Paint
```
**Module:** `/performance`
**Description:** Web vitals metric names

### `PerformanceRating`
```typescript
type PerformanceRating = 'good' | 'needs-improvement' | 'poor';
```
**Module:** `/performance`
**Description:** Performance metric rating

### `PerformanceBudget`
```typescript
interface PerformanceBudget {
  FCP?: number;
  LCP?: number;
  FID?: number;
  CLS?: number;
  TTFB?: number;
  INP?: number;
}
```
**Module:** `/performance`
**Description:** Performance budget thresholds

### `VitalsSnapshot`
```typescript
interface VitalsSnapshot {
  metrics: Record<VitalMetricName, number>;
  ratings: Record<VitalMetricName, PerformanceRating>;
  timestamp: Date;
}
```
**Module:** `/performance`
**Description:** Web vitals snapshot

### `BudgetViolation`
```typescript
interface BudgetViolation {
  metric: VitalMetricName;
  value: number;
  budget: number;
  severity: 'warning' | 'critical';
}
```
**Module:** `/performance`
**Description:** Budget violation

---

## Error Types

### `AppError`
```typescript
interface AppError extends Error {
  code?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context?: ErrorContext;
  timestamp: Date;
  stack?: string;
}
```
**Module:** `/monitoring`
**Description:** Application error

### `ErrorSeverity`
```typescript
type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
```
**Module:** `/monitoring`
**Description:** Error severity level

### `ErrorCategory`
```typescript
type ErrorCategory =
  | 'network'
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not-found'
  | 'server'
  | 'client'
  | 'unknown';
```
**Module:** `/monitoring`
**Description:** Error category

### `ErrorContext`
```typescript
interface ErrorContext {
  user?: User;
  route?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}
```
**Module:** `/monitoring`
**Description:** Error context information

### `ErrorReport`
```typescript
interface ErrorReport {
  error: AppError;
  context: ErrorContext;
  breadcrumbs: string[];
  timestamp: Date;
}
```
**Module:** `/monitoring`
**Description:** Complete error report

---

## Real-time Types

### `WebSocketOptions`
```typescript
interface WebSocketOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  protocols?: string[];
}
```
**Module:** `/realtime`
**Description:** WebSocket client options

### `SSEOptions`
```typescript
interface SSEOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  withCredentials?: boolean;
}
```
**Module:** `/realtime`
**Description:** Server-Sent Events options

---

## Coordination Types

### `CoordinationEvent`
```typescript
interface CoordinationEvent {
  type: string;
  payload?: any;
  priority?: EventPriority;
  source?: string;
  timestamp?: Date;
}
```
**Module:** `/coordination`
**Description:** Coordination event

### `EventPriority`
```typescript
enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}
```
**Module:** `/coordination`
**Description:** Event priority levels

### `ServiceContract<T>`
```typescript
interface ServiceContract<T> {
  id: string;
  type: string;
  version?: string;
}
```
**Module:** `/coordination`
**Description:** DI service contract

### `LifecyclePhase`
```typescript
type LifecyclePhase =
  | 'created'
  | 'initializing'
  | 'initialized'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error';
```
**Module:** `/coordination`
**Description:** Library lifecycle phase

---

## Utility Types

### `DeepRequired<T>`
```typescript
type DeepRequired<T> = {
  [P in keyof T]-?: DeepRequired<T[P]>;
};
```
**Module:** `/utils`
**Description:** Makes all properties required recursively

### `DeepReadonly<T>`
```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};
```
**Module:** `/utils`
**Description:** Makes all properties readonly recursively

### `Nullable<T>`
```typescript
type Nullable<T> = T | null;
```
**Module:** `/utils`
**Description:** Makes type nullable

### `Maybe<T>`
```typescript
type Maybe<T> = T | null | undefined;
```
**Module:** `/utils`
**Description:** Makes type optional or null

### `Result<T, E>`
```typescript
type Result<T, E = Error> = Ok<T> | Err<E>;

interface Ok<T> {
  ok: true;
  value: T;
}

interface Err<E> {
  ok: false;
  error: E;
}
```
**Module:** `/utils`
**Description:** Result type for error handling

---

## Theme Types

### `ThemeMode`
```typescript
type ThemeMode = 'light' | 'dark' | 'auto';
```
**Module:** `/theme`
**Description:** Theme mode

### `ResolvedTheme`
```typescript
type ResolvedTheme = 'light' | 'dark';
```
**Module:** `/theme`
**Description:** Resolved theme (after auto detection)

### `ThemeConfig`
```typescript
interface ThemeConfig {
  mode: ThemeMode;
  palette: ColorPalette;
  tokens: DesignTokens;
}
```
**Module:** `/theme`
**Description:** Theme configuration

### `ColorPalette`
```typescript
interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  [key: string]: string;
}
```
**Module:** `/theme`
**Description:** Color palette definition

### `DesignTokens`
```typescript
interface DesignTokens {
  colors: ColorPalette;
  spacing: Record<string, string>;
  typography: Record<string, any>;
  shadows: Record<string, string>;
  borders: Record<string, string>;
  [key: string]: any;
}
```
**Module:** `/theme`
**Description:** Design system tokens

---

## System Types

### `SystemConfig`
```typescript
interface SystemConfig {
  name: string;
  version: string;
  environment: Environment;
  features: Record<string, boolean>;
}
```
**Module:** `/system`
**Description:** System configuration

### `SystemStatus`
```typescript
interface SystemStatus {
  initialized: boolean;
  running: boolean;
  services: Record<string, 'running' | 'stopped' | 'error'>;
}
```
**Module:** `/system`
**Description:** System status

---

**Total Types:** 100+
**Last Updated:** 2025-11-29
**Version:** 1.0.5
