/**
 * TelemetryService - Privacy-compliant telemetry and analytics
 */

import * as vscode from 'vscode';
import { CONFIG_KEYS } from '../core/constants';
import type { LoggerService } from '../services/logger-service';

/**
 * Telemetry event
 */
export interface TelemetryEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
  measurements?: Record<string, number>;
  timestamp: number;
}

/**
 * TelemetryService - Manages opt-in telemetry
 */
export class TelemetryService {
  private static instance: TelemetryService;
  private readonly logger: LoggerService;
  private enabled = false;
  private events: TelemetryEvent[] = [];
  private readonly maxEventHistory = 1000;
  private readonly sessionId: string;
  private readonly sessionStart: number;

  /**
   *
   * @param logger
   */
  private constructor(logger: LoggerService) {
    this.logger = logger;
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.loadConfiguration();
  }

  /**
   * Create the telemetry service
   * @param logger
   */
  public static create(logger: LoggerService): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService(logger);
    }
    return TelemetryService.instance;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      throw new Error('TelemetryService not created. Call create() first.');
    }
    return TelemetryService.instance;
  }

  /**
   * Load configuration
   */
  private loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration();
    this.enabled = config.get<boolean>(CONFIG_KEYS.TELEMETRY_ENABLED, false);
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Enable telemetry
   */
  public enable(): void {
    this.enabled = true;
    this.logger.info('Telemetry enabled');
    this.trackEvent('telemetry.enabled');
  }

  /**
   * Disable telemetry
   */
  public disable(): void {
    this.enabled = false;
    this.logger.info('Telemetry disabled');
    this.events = [];
  }

  /**
   * Check if telemetry is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Track an event
   * @param name
   * @param properties
   * @param measurements
   */
  public trackEvent(
    name: string,
    properties?: Record<string, string | number | boolean>,
    measurements?: Record<string, number>
  ): void {
    if (!this.enabled) {
      return;
    }

    const anonymizedProps = this.anonymizeProperties(properties);
    const event: TelemetryEvent = {
      name: this.anonymizeName(name),
      ...(anonymizedProps ? { properties: anonymizedProps } : {}),
      ...(measurements ? { measurements } : {}),
      timestamp: Date.now(),
    };

    this.events.push(event);

    // Trim event history
    if (this.events.length > this.maxEventHistory) {
      this.events.shift();
    }

    this.logger.debug('Telemetry event tracked', { name: event.name });
  }

  /**
   * Track error with enhanced context
   *
   * @param error - Error to track (supports EnzymeError for enhanced tracking)
   * @param properties - Additional properties
   *
   * @example
   * ```typescript
   * telemetryService.trackError(error, { component: 'MyComponent' });
   * ```
   */
  public trackError(error: Error | any, properties?: Record<string, string>): void {
    if (!this.enabled) {
      return;
    }

    // Enhanced tracking for EnzymeError
    const isEnzymeError = error && typeof error === 'object' && 'code' in error && 'category' in error;

    if (isEnzymeError) {
      this.trackEvent('error.occurred', {
        errorName: error.name,
        errorCode: error.code,
        errorCategory: error.category,
        errorSeverity: error.severity,
        errorMessage: this.anonymizeErrorMessage(error.message),
        ...properties,
      });
    } else {
      // Standard error tracking
      this.trackEvent('error.occurred', {
        errorName: error.name,
        errorMessage: this.anonymizeErrorMessage(error.message),
        ...properties,
      });
    }
  }

  /**
   * Track performance metric
   * @param name
   * @param duration
   * @param properties
   */
  public trackPerformance(
    name: string,
    duration: number,
    properties?: Record<string, string | number | boolean>
  ): void {
    if (!this.enabled) {
      return;
    }

    this.trackEvent(
      `performance.${name}`,
      properties,
      { duration }
    );
  }

  /**
   * Track usage
   * @param feature
   * @param action
   */
  public trackUsage(feature: string, action: string): void {
    if (!this.enabled) {
      return;
    }

    this.trackEvent('usage', {
      feature,
      action,
    });
  }

  /**
   * Anonymize event name
   * @param name
   */
  private anonymizeName(name: string): string {
    // Remove any potential PII from event names
    return name.replace(/[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}/gi, '<uuid>');
  }

  /**
   * Anonymize properties
   * @param properties
   */
  private anonymizeProperties(
    properties?: Record<string, string | number | boolean>
  ): Record<string, string | number | boolean> | undefined {
    if (!properties) {
      return undefined;
    }

    const anonymized: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'string') {
        // Remove potential file paths
        const anonymizedValue = value
          .replace(/(?:\/[^\s/]+){2}/g, '/<path>')
          .replace(/[A-Za-z]:\\\S+/g, '<path>');
        anonymized[key] = anonymizedValue;
      } else {
        anonymized[key] = value;
      }
    }

    return anonymized;
  }

  /**
   * Anonymize error message
   * @param message
   */
  private anonymizeErrorMessage(message: string): string {
    // Remove file paths and potential PII
    return message
      .replace(/(?:\/[^\s/]+){2}/g, '/<path>')
      .replace(/[A-Za-z]:\\\S+/g, '<path>')
      .replace(/[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}/gi, '<uuid>');
  }

  /**
   * Get event history
   * @param count
   */
  public getEventHistory(count?: number): TelemetryEvent[] {
    if (count) {
      return this.events.slice(-count);
    }
    return [...this.events];
  }

  /**
   * Get session statistics
   */
  public getSessionStatistics(): {
    sessionId: string;
    duration: number;
    eventCount: number;
    topEvents: Array<{ name: string; count: number }>;
  } {
    const eventCounts = new Map<string, number>();

    for (const event of this.events) {
      const count = eventCounts.get(event.name) || 0;
      eventCounts.set(event.name, count + 1);
    }

    const topEvents = [...eventCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      sessionId: this.sessionId,
      duration: Date.now() - this.sessionStart,
      eventCount: this.events.length,
      topEvents,
    };
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.events = [];
    this.logger.debug('Telemetry history cleared');
  }

  /**
   * Dispose the service
   */
  public dispose(): void {
    if (this.enabled) {
      this.trackEvent('session.ended', {
        duration: Date.now() - this.sessionStart,
        eventCount: this.events.length,
      });
    }

    this.events = [];
  }
}
