/**
 * TelemetryService - Privacy-compliant telemetry and analytics
 */

import * as vscode from 'vscode';
import { LoggerService } from '../services/logger-service';
import { CONFIG_KEYS } from '../core/constants';

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
  private logger: LoggerService;
  private enabled: boolean = false;
  private events: TelemetryEvent[] = [];
  private maxEventHistory: number = 1000;
  private sessionId: string;
  private sessionStart: number;

  private constructor(logger: LoggerService) {
    this.logger = logger;
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.loadConfiguration();
  }

  /**
   * Create the telemetry service
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
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
   */
  public trackEvent(
    name: string,
    properties?: Record<string, string | number | boolean>,
    measurements?: Record<string, number>
  ): void {
    if (!this.enabled) {
      return;
    }

    const event: TelemetryEvent = {
      name: this.anonymizeName(name),
      properties: this.anonymizeProperties(properties),
      measurements,
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
   * Track error
   */
  public trackError(error: Error, properties?: Record<string, string>): void {
    if (!this.enabled) {
      return;
    }

    this.trackEvent('error.occurred', {
      errorName: error.name,
      errorMessage: this.anonymizeErrorMessage(error.message),
      ...properties,
    });
  }

  /**
   * Track performance metric
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
   */
  private anonymizeName(name: string): string {
    // Remove any potential PII from event names
    return name.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>');
  }

  /**
   * Anonymize properties
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
          .replace(/\/[^\/\s]+\/[^\/\s]+/g, '/<path>')
          .replace(/[A-Za-z]:\\[^\s]+/g, '<path>');
        anonymized[key] = anonymizedValue;
      } else {
        anonymized[key] = value;
      }
    }

    return anonymized;
  }

  /**
   * Anonymize error message
   */
  private anonymizeErrorMessage(message: string): string {
    // Remove file paths and potential PII
    return message
      .replace(/\/[^\/\s]+\/[^\/\s]+/g, '/<path>')
      .replace(/[A-Za-z]:\\[^\s]+/g, '<path>')
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>');
  }

  /**
   * Get event history
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

    const topEvents = Array.from(eventCounts.entries())
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
