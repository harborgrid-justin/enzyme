/**
 * @file Performance Profiler
 * @description Profile component renders, state updates, and API calls
 */

// ============================================================================
// Types
// ============================================================================

export enum ProfileEventType {
  RENDER = 'render',
  STATE_UPDATE = 'state_update',
  API_CALL = 'api_call',
  CUSTOM = 'custom',
}

export interface ProfileEvent {
  id: string;
  type: ProfileEventType;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
  children?: ProfileEvent[];
}

export interface FlameGraphNode {
  name: string;
  value: number;
  startTime: number;
  children: FlameGraphNode[];
  metadata?: Record<string, unknown>;
}

export interface PerformanceMetrics {
  totalEvents: number;
  totalDuration: number;
  avgDuration: number;
  maxDuration: number;
  byType: Record<ProfileEventType, {
    count: number;
    totalDuration: number;
    avgDuration: number;
  }>;
  bottlenecks: Array<{
    event: ProfileEvent;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export interface ProfilerOptions {
  /** Enable automatic profiling */
  autoStart?: boolean;
  /** Maximum events to keep */
  maxEvents?: number;
  /** Sample rate (0-1) */
  sampleRate?: number;
}

// ============================================================================
// Performance Profiler
// ============================================================================

export class PerformanceProfiler {
  private options: Required<ProfilerOptions>;
  private events: ProfileEvent[] = [];
  private activeEvents = new Map<string, ProfileEvent>();
  private eventStack: ProfileEvent[] = [];
  private isProfiling = false;
  private eventIdCounter = 0;

  constructor(options: ProfilerOptions = {}) {
    this.options = {
      autoStart: options.autoStart ?? false,
      maxEvents: options.maxEvents ?? 10000,
      sampleRate: options.sampleRate ?? 1.0,
    };

    if (this.options.autoStart) {
      this.start();
    }
  }

  /**
   * Start profiling
   */
  start(): void {
    this.isProfiling = true;
  }

  /**
   * Stop profiling
   */
  stop(): void {
    this.isProfiling = false;
  }

  /**
   * Start profiling an event
   */
  startEvent(
    type: ProfileEventType,
    name: string,
    metadata?: Record<string, unknown>
  ): string {
    if (!this.isProfiling) {
      return '';
    }

    // Sample rate check
    if (Math.random() > this.options.sampleRate) {
      return '';
    }

    const eventId = this.generateEventId();
    const event: ProfileEvent = {
      id: eventId,
      type,
      name,
      startTime: performance.now(),
      metadata,
      children: [],
    };

    this.activeEvents.set(eventId, event);
    this.eventStack.push(event);

    return eventId;
  }

  /**
   * End profiling an event
   */
  endEvent(eventId: string): void {
    if (!eventId) {
      return;
    }

    const event = this.activeEvents.get(eventId);
    if (!event) {
      return;
    }

    event.endTime = performance.now();
    event.duration = event.endTime - event.startTime;

    // Remove from stack
    const stackIndex = this.eventStack.indexOf(event);
    if (stackIndex !== -1) {
      this.eventStack.splice(stackIndex, 1);
    }

    // Add as child to parent if exists
    if (this.eventStack.length > 0) {
      const parent = this.eventStack[this.eventStack.length - 1];
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(event);
    } else {
      // Top-level event
      this.events.push(event);
    }

    this.activeEvents.delete(eventId);

    // Enforce max events
    if (this.events.length > this.options.maxEvents) {
      this.events = this.events.slice(-this.options.maxEvents);
    }
  }

  /**
   * Profile a synchronous function
   */
  profile<T>(
    type: ProfileEventType,
    name: string,
    fn: () => T,
    metadata?: Record<string, unknown>
  ): T {
    const eventId = this.startEvent(type, name, metadata);
    try {
      return fn();
    } finally {
      this.endEvent(eventId);
    }
  }

  /**
   * Profile an asynchronous function
   */
  async profileAsync<T>(
    type: ProfileEventType,
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const eventId = this.startEvent(type, name, metadata);
    try {
      return await fn();
    } finally {
      this.endEvent(eventId);
    }
  }

  /**
   * Get all events
   */
  getEvents(type?: ProfileEventType): ProfileEvent[] {
    if (type) {
      return this.filterEventsByType(this.events, type);
    }
    return [...this.events];
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {
      totalEvents: 0,
      totalDuration: 0,
      avgDuration: 0,
      maxDuration: 0,
      byType: {
        [ProfileEventType.RENDER]: { count: 0, totalDuration: 0, avgDuration: 0 },
        [ProfileEventType.STATE_UPDATE]: { count: 0, totalDuration: 0, avgDuration: 0 },
        [ProfileEventType.API_CALL]: { count: 0, totalDuration: 0, avgDuration: 0 },
        [ProfileEventType.CUSTOM]: { count: 0, totalDuration: 0, avgDuration: 0 },
      },
      bottlenecks: [],
    };

    const allEvents = this.flattenEvents(this.events);

    for (const event of allEvents) {
      if (event.duration === undefined) {
        continue;
      }

      metrics.totalEvents++;
      metrics.totalDuration += event.duration;
      metrics.maxDuration = Math.max(metrics.maxDuration, event.duration);

      const typeMetrics = metrics.byType[event.type];
      typeMetrics.count++;
      typeMetrics.totalDuration += event.duration;
    }

    // Calculate averages
    if (metrics.totalEvents > 0) {
      metrics.avgDuration = metrics.totalDuration / metrics.totalEvents;
    }

    for (const typeMetrics of Object.values(metrics.byType)) {
      if (typeMetrics.count > 0) {
        typeMetrics.avgDuration = typeMetrics.totalDuration / typeMetrics.count;
      }
    }

    // Detect bottlenecks
    metrics.bottlenecks = this.detectBottlenecks(allEvents);

    return metrics;
  }

  /**
   * Generate flame graph data
   */
  generateFlameGraph(): FlameGraphNode[] {
    return this.events.map((event) => this.eventToFlameNode(event));
  }

  /**
   * Get bottlenecks
   */
  getBottlenecks(): ProfileEvent[] {
    const allEvents = this.flattenEvents(this.events);
    return allEvents
      .filter((e) => e.duration && e.duration > 16) // Over 1 frame
      .sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0))
      .slice(0, 10);
  }

  /**
   * Get slow events by threshold
   */
  getSlowEvents(thresholdMs = 100): ProfileEvent[] {
    const allEvents = this.flattenEvents(this.events);
    return allEvents
      .filter((e) => e.duration && e.duration > thresholdMs)
      .sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
    this.activeEvents.clear();
    this.eventStack = [];
  }

  /**
   * Export profiling data
   */
  export(): string {
    return JSON.stringify(
      {
        version: '1.0.0',
        exportTime: Date.now(),
        events: this.events,
        metrics: this.getMetrics(),
      },
      null,
      2
    );
  }

  /**
   * Import profiling data
   */
  import(json: string): void {
    try {
      const data = JSON.parse(json);
      if (data.events && Array.isArray(data.events)) {
        this.events = data.events;
      }
    } catch (error) {
      throw new Error(
        `Failed to import profiling data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Detect performance bottlenecks
   */
  private detectBottlenecks(
    events: ProfileEvent[]
  ): Array<{ event: ProfileEvent; severity: 'low' | 'medium' | 'high' }> {
    const bottlenecks: Array<{ event: ProfileEvent; severity: 'low' | 'medium' | 'high' }> = [];

    for (const event of events) {
      if (!event.duration) {
        continue;
      }

      let severity: 'low' | 'medium' | 'high' = 'low';

      if (event.duration > 100) {
        severity = 'high';
      } else if (event.duration > 50) {
        severity = 'medium';
      } else if (event.duration > 16) {
        severity = 'low';
      } else {
        continue;
      }

      bottlenecks.push({ event, severity });
    }

    return bottlenecks.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Convert event to flame graph node
   */
  private eventToFlameNode(event: ProfileEvent): FlameGraphNode {
    return {
      name: event.name,
      value: event.duration ?? 0,
      startTime: event.startTime,
      children: (event.children ?? []).map((child) => this.eventToFlameNode(child)),
      metadata: event.metadata,
    };
  }

  /**
   * Flatten event tree
   */
  private flattenEvents(events: ProfileEvent[]): ProfileEvent[] {
    const flattened: ProfileEvent[] = [];

    for (const event of events) {
      flattened.push(event);
      if (event.children && event.children.length > 0) {
        flattened.push(...this.flattenEvents(event.children));
      }
    }

    return flattened;
  }

  /**
   * Filter events by type recursively
   */
  private filterEventsByType(events: ProfileEvent[], type: ProfileEventType): ProfileEvent[] {
    const filtered: ProfileEvent[] = [];

    for (const event of events) {
      if (event.type === type) {
        filtered.push(event);
      }
      if (event.children && event.children.length > 0) {
        filtered.push(...this.filterEventsByType(event.children, type));
      }
    }

    return filtered;
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${this.eventIdCounter++}`;
  }
}

// ============================================================================
// Global Profiler Instance
// ============================================================================

let globalProfiler: PerformanceProfiler | null = null;

/**
 * Get or create global profiler instance
 */
export function getGlobalProfiler(options?: ProfilerOptions): PerformanceProfiler {
  if (!globalProfiler) {
    globalProfiler = new PerformanceProfiler(options);
  }
  return globalProfiler;
}

/**
 * Reset global profiler
 */
export function resetGlobalProfiler(): void {
  globalProfiler = null;
}
