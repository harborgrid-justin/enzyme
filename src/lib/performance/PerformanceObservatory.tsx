/**
 * @file Performance Observatory Dashboard
 * @description Real-time performance monitoring dashboard component for development
 * and debugging. Displays Core Web Vitals, resource timings, and performance insights.
 *
 * FEATURE 5: Performance Observatory
 *
 * NOTE: This file uses inline styles intentionally for self-contained portability
 * as a development-only monitoring tool. Inline styles allow this component to work
 * without external CSS dependencies.
 *
 * @webhint-disable no-inline-styles
 */

import {
  useState,
  useEffect,
  useMemo,
  useContext,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { PerformanceObservatoryContext, type PerformanceObservatoryContextValue } from '../contexts/PerformanceObservatoryContext';
import {
  getVitalsCollector,
  type VitalMetricEntry,
  type VitalsSnapshot,
  type VitalMetricName,
  type PerformanceRating,
  type BudgetViolation,
  formatMetricValue,
  getRatingColor,
  getMetricTarget,
  DEFAULT_BUDGETS,
} from './vitals';
import { formatBytes } from '../../config/performance.config';
import { isDev } from '@/lib/core/config/env-helper';

// ============================================================================
// Types
// ============================================================================

/**
 * Resource statistics
 */
interface ResourceStats {
  total: number;
  totalSize: number;
  totalDuration: number;
  byType: Record<string, { count: number; size: number; duration: number }>;
  slowResources: PerformanceResourceTiming[];
}

/**
 * Long task entry
 */
interface LongTaskEntry {
  startTime: number;
  duration: number;
  name: string;
}

/**
 * Props for PerformanceObservatory
 */
export interface PerformanceObservatoryProps {
  /** Show in development only */
  devOnly?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  /** Position on screen */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Enable analytics reporting */
  reportToAnalytics?: boolean;
  /** Analytics endpoint */
  analyticsEndpoint?: string;
  /** Sample rate for collection */
  sampleRate?: number;
  /** Enable debug mode */
  debug?: boolean;
  /** Custom z-index */
  zIndex?: number;
}

/**
 * Props for PerformanceProvider
 */
export interface PerformanceProviderProps {
  children: ReactNode;
  /** Collector configuration */
  reportToAnalytics?: boolean;
  analyticsEndpoint?: string;
  sampleRate?: number;
  debug?: boolean;
  /** Callback on metric update */
  onMetric?: (metric: VitalMetricEntry, snapshot: VitalsSnapshot) => void;
  /** Callback on budget violation */
  onViolation?: (violation: BudgetViolation) => void;
}

// ============================================================================
// Context
// ============================================================================

/**
 * Hook to access performance observatory context
 */
export function usePerformanceObservatory(): PerformanceObservatoryContextValue {
  const context = useContext(PerformanceObservatoryContext);
  if (!context) {
    throw new Error('usePerformanceObservatory must be used within PerformanceProvider');
  }
  return context;
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Performance monitoring provider that collects Web Vitals and resource metrics
 */
export function PerformanceProvider({
  children,
  reportToAnalytics = false,
  analyticsEndpoint,
  sampleRate = 1,
  debug = false,
  onMetric,
  onViolation,
}: PerformanceProviderProps): JSX.Element {
  const [isCollecting, setIsCollecting] = useState(false);

  const collector = useMemo(
    () =>
      getVitalsCollector({
        reportToAnalytics,
        analyticsEndpoint,
        sampleRate,
        debug,
        onMetric: (metric, snap) => {
          onMetric?.(metric, snap);
        },
        onBudgetViolation: (violation) => {
          onViolation?.(violation);
        },
      }),
    [reportToAnalytics, analyticsEndpoint, sampleRate, debug, onMetric, onViolation]
  );

  // Initialize vitals collection
  useEffect(() => {
    const cleanup = collector.init();
    setIsCollecting(true);

    return () => {
      cleanup();
      setIsCollecting(false);
    };
  }, [collector]);

  const value = useMemo<PerformanceObservatoryContextValue>(
    () => ({
      metrics: [],
      recordMetric: () => {},
      clearMetrics: () => {},
      getMetric: () => undefined,
      getMetricsByName: () => [],
      isObserving: isCollecting,
      startObserving: () => setIsCollecting(true),
      stopObserving: () => setIsCollecting(false),
    }),
    [isCollecting, collector]
  );

  return (
    <PerformanceObservatoryContext.Provider value={value}>
      {children}
    </PerformanceObservatoryContext.Provider>
  );
}

// ============================================================================
// Observatory Dashboard Component
// ============================================================================

/**
 * Metric gauge component
 */
function MetricGauge({
  name,
  entry,
}: {
  name: VitalMetricName;
  entry: VitalMetricEntry | undefined;
}): JSX.Element {
  const budget = DEFAULT_BUDGETS[name];
  const value = entry?.value ?? 0;
  const rating = entry?.rating ?? 'good';

  // Calculate gauge percentage
  const maxValue = budget.poor * 1.5;
  const percentage = Math.min((value / maxValue) * 100, 100);

  const badgeStyle = useMemo(
    (): CSSProperties => ({
      ...styles.metricBadge,
      backgroundColor: getRatingColor(rating),
    }),
    [rating]
  );

  const gaugeFillStyle = useMemo(
    (): CSSProperties => ({
      ...styles.gaugeFill,
      width: `${percentage}%`,
      backgroundColor: getRatingColor(rating),
    }),
    [percentage, rating]
  );

  const goodMarkerStyle = useMemo(
    (): CSSProperties => ({
      ...styles.gaugeMarker,
      left: `${(budget.good / maxValue) * 100}%`,
    }),
    [budget.good, maxValue]
  );

  const poorMarkerStyle = useMemo(
    (): CSSProperties => ({
      ...styles.gaugeMarker,
      left: `${(budget.poor / maxValue) * 100}%`,
    }),
    [budget.poor, maxValue]
  );

  return (
    <div style={styles.metricCard}>
      <div style={styles.metricHeader}>
        <span style={styles.metricName}>{name}</span>
        <span style={badgeStyle}>
          {rating === 'good' ? 'Pass' : rating === 'needs-improvement' ? 'Warn' : 'Fail'}
        </span>
      </div>

      <div style={styles.metricValue}>
        {entry ? formatMetricValue(name, value) : '--'}
      </div>

      <div style={styles.gaugeContainer}>
        <div style={gaugeFillStyle} />
        {/* Threshold markers */}
        <div style={goodMarkerStyle} />
        <div style={poorMarkerStyle} />
      </div>

      <div style={styles.metricTarget}>
        Target: {getMetricTarget(name)}
      </div>
    </div>
  );
}

/**
 * Resource breakdown component
 */
function ResourceBreakdown({ stats }: { stats: ResourceStats }): JSX.Element {
  const sortedTypes = Object.entries(stats.byType)
    .sort(([, a], [, b]) => b.size - a.size);

  return (
    <div style={styles.resourceSection}>
      <div style={styles.sectionTitle}>Resources ({stats.total})</div>
      <div style={styles.resourceTotal}>
        Total: {formatBytes(stats.totalSize)}
      </div>
      <div style={styles.resourceList}>
        {sortedTypes.slice(0, 5).map(([type, data]) => (
          <div key={type} style={styles.resourceItem}>
            <span style={styles.resourceType}>{type}</span>
            <span style={styles.resourceCount}>{data.count}</span>
            <span style={styles.resourceSize}>{formatBytes(data.size)}</span>
          </div>
        ))}
      </div>
      {stats.slowResources.length > 0 && (
        <div style={styles.slowResources}>
          <div style={styles.slowResourcesTitle}>
            Slow Resources ({stats.slowResources.length})
          </div>
          {stats.slowResources.slice(0, 3).map((resource, i) => (
            <div key={i} style={styles.slowResourceItem}>
              <span style={styles.slowResourceName}>
                {resource.name.split('/').pop()?.slice(0, 30)}
              </span>
              <span style={styles.slowResourceDuration}>
                {Math.round(resource.duration)}ms
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Long tasks monitor
 */
function LongTasksMonitor({ tasks }: { tasks: LongTaskEntry[] }): JSX.Element {
  const recentTasks = tasks.slice(-5);

  if (recentTasks.length === 0) {
    return (
      <div style={styles.longTasksSection}>
        <div style={styles.sectionTitle}>Long Tasks</div>
        <div style={styles.emptyState}>No long tasks detected</div>
      </div>
    );
  }

  return (
    <div style={styles.longTasksSection}>
      <div style={styles.sectionTitle}>Long Tasks ({tasks.length})</div>
      {recentTasks.map((task, i) => (
        <div key={i} style={styles.longTaskItem}>
          <span style={styles.longTaskDuration}>{Math.round(task.duration)}ms</span>
          <span style={styles.longTaskTime}>
            at {Math.round(task.startTime)}ms
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Overall score display
 */
function ScoreDisplay({
  score,
  rating,
}: {
  score: number;
  rating: PerformanceRating;
}): JSX.Element {
  const scoreCircleStyle = useMemo(
    (): CSSProperties => ({
      ...styles.scoreCircle,
      borderColor: getRatingColor(rating),
      color: getRatingColor(rating),
    }),
    [rating]
  );

  return (
    <div style={styles.scoreContainer}>
      <div style={scoreCircleStyle}>
        {score}
      </div>
      <div style={styles.scoreLabel}>Performance Score</div>
    </div>
  );
}

/**
 * Performance Observatory dashboard component
 *
 * @example
 * ```tsx
 * <PerformanceProvider>
 *   <App />
 *   <PerformanceObservatory devOnly position="bottom-right" />
 * </PerformanceProvider>
 * ```
 */
export function PerformanceObservatory({
  devOnly = true,
  defaultCollapsed = true,
  position = 'bottom-right',
  zIndex = 9999,
}: PerformanceObservatoryProps): JSX.Element | null {
  const { isObserving } = usePerformanceObservatory();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [activeTab, setActiveTab] = useState<'vitals' | 'resources' | 'tasks'>('vitals');
  const [snapshot] = useState<VitalsSnapshot | null>(null);
  const [resourceStats] = useState<ResourceStats | null>(null);
  const [longTasks] = useState<LongTaskEntry[]>([]);

  // Check if we should render
  const isDevEnvironment = import.meta.env?.DEV ?? isDev();
  if (devOnly && !isDevEnvironment) {
    return null;
  }

  const isCollecting = isObserving;

  const positionStyles = getPositionStyles(position);

  const collapsedButtonStyle = useMemo(
    (): CSSProperties => ({
      ...styles.collapsedButton,
      ...positionStyles,
      zIndex,
    }),
    [positionStyles, zIndex]
  );

  const containerStyle = useMemo(
    (): CSSProperties => ({
      ...styles.container,
      ...positionStyles,
      zIndex,
    }),
    [positionStyles, zIndex]
  );

  const scoreColorStyle = useMemo(
    (): CSSProperties => ({
      color: snapshot ? getRatingColor(snapshot.rating) : '#fff',
    }),
    [snapshot]
  );

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        style={collapsedButtonStyle}
        title="Open Performance Observatory"
      >
        <span style={styles.collapsedIcon}>
          {snapshot ? (
            <span style={scoreColorStyle}>
              {snapshot.score}
            </span>
          ) : (
            'P'
          )}
        </span>
      </button>
    );
  }

  const getTabStyle = (tab: 'vitals' | 'resources' | 'tasks'): CSSProperties => ({
    ...styles.tab,
    ...(activeTab === tab ? styles.tabActive : {}),
  });

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>Performance Observatory</span>
        <div style={styles.headerActions}>
          <span style={styles.status}>
            {isCollecting ? 'Collecting' : 'Idle'}
          </span>
          <button
            onClick={() => setIsCollapsed(true)}
            style={styles.closeButton}
          >
            x
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['vitals', 'resources', 'tasks'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={getTabStyle(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'vitals' && (
          <>
            {snapshot && (
              <ScoreDisplay score={snapshot.score} rating={snapshot.rating} />
            )}
            <div style={styles.metricsGrid}>
              {(['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as VitalMetricName[]).map((name) => (
                <MetricGauge
                  key={name}
                  name={name}
                  entry={snapshot?.[name]}
                />
              ))}
            </div>
          </>
        )}

        {activeTab === 'resources' && resourceStats && (
          <ResourceBreakdown stats={resourceStats} />
        )}

        {activeTab === 'tasks' && <LongTasksMonitor tasks={longTasks} />}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <span style={styles.footerPath}>{snapshot?.path ?? '/'}</span>
        <span style={styles.footerTime}>
          {snapshot
            ? new Date(snapshot.timestamp).toLocaleTimeString()
            : '--'}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

function getPositionStyles(
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
): React.CSSProperties {
  switch (position) {
    case 'bottom-right':
      return { bottom: 16, right: 16 };
    case 'bottom-left':
      return { bottom: 16, left: 16 };
    case 'top-right':
      return { top: 16, right: 16 };
    case 'top-left':
      return { top: 16, left: 16 };
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    width: 360,
    maxHeight: '80vh',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 13,
    color: '#e0e0e0',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  collapsedButton: {
    position: 'fixed',
    width: 48,
    height: 48,
    borderRadius: '50%',
    backgroundColor: '#1a1a2e',
    border: '2px solid #3b82f6',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
  },
  collapsedIcon: {
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#16213e',
    borderBottom: '1px solid #2a2a4a',
  },
  title: {
    fontWeight: 600,
    fontSize: 14,
    color: '#fff',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  status: {
    fontSize: 11,
    color: '#22c55e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#a0a0a0',
    cursor: 'pointer',
    fontSize: 18,
    padding: 0,
    lineHeight: 1,
  },
  tabs: {
    display: 'flex',
    backgroundColor: '#16213e',
    borderBottom: '1px solid #2a2a4a',
  },
  tab: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#a0a0a0',
    cursor: 'pointer',
    fontSize: 12,
    borderBottom: '2px solid transparent',
  },
  tabActive: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6',
  },
  content: {
    padding: 16,
    overflow: 'auto',
    flex: 1,
  },
  scoreContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    border: '3px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 700,
  },
  scoreLabel: {
    marginTop: 8,
    fontSize: 11,
    color: '#a0a0a0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 12,
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricName: {
    fontWeight: 600,
    fontSize: 12,
    color: '#fff',
  },
  metricBadge: {
    fontSize: 9,
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: 4,
    color: '#fff',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 8,
  },
  gaugeContainer: {
    height: 4,
    backgroundColor: '#2a2a4a',
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 8,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  gaugeMarker: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  metricTarget: {
    fontSize: 10,
    color: '#6b7280',
  },
  resourceSection: {
    padding: 0,
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: 12,
    color: '#fff',
    marginBottom: 12,
  },
  resourceTotal: {
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 12,
  },
  resourceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  resourceItem: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#16213e',
    padding: '8px 12px',
    borderRadius: 6,
  },
  resourceType: {
    flex: 1,
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  resourceCount: {
    marginRight: 16,
    color: '#6b7280',
  },
  resourceSize: {
    fontWeight: 600,
    color: '#3b82f6',
  },
  slowResources: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  slowResourcesTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: '#ef4444',
    marginBottom: 8,
  },
  slowResourceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    padding: '4px 0',
  },
  slowResourceName: {
    color: '#a0a0a0',
  },
  slowResourceDuration: {
    color: '#ef4444',
    fontWeight: 600,
  },
  longTasksSection: {
    padding: 0,
  },
  emptyState: {
    color: '#6b7280',
    fontStyle: 'italic',
    fontSize: 12,
  },
  longTaskItem: {
    display: 'flex',
    justifyContent: 'space-between',
    backgroundColor: '#16213e',
    padding: '8px 12px',
    borderRadius: 6,
    marginBottom: 8,
  },
  longTaskDuration: {
    fontWeight: 600,
    color: '#f59e0b',
  },
  longTaskTime: {
    color: '#6b7280',
    fontSize: 11,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 16px',
    backgroundColor: '#16213e',
    borderTop: '1px solid #2a2a4a',
    fontSize: 11,
    color: '#6b7280',
  },
  footerPath: {
    maxWidth: 200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  footerTime: {},
};

// ============================================================================
// Exports
// ============================================================================

export {
  PerformanceObservatoryContext,
  type PerformanceObservatoryContextValue,
  type ResourceStats,
  type LongTaskEntry,
};
