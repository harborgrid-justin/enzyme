/**
 * @file Interaction Replay System
 * @description Captures and replays user interactions during the hydration process.
 *
 * When a user interacts with a component that hasn't been hydrated yet, this system:
 * 1. Captures the interaction details (event type, target, position, etc.)
 * 2. Optionally prevents default behavior to avoid inconsistent state
 * 3. Stores the interaction in a bounded buffer
 * 4. After hydration completes, replays the interactions in order
 *
 * This provides a seamless user experience where interactions aren't lost,
 * even when they occur before the component is fully interactive.
 *
 * Key Design Decisions:
 * - Interactions are captured per-boundary for targeted replay
 * - Buffer has time and size limits to prevent memory issues
 * - Synthetic events are used for replay to match original behavior
 * - Visual feedback can be shown during capture (optional)
 *
 * @module hydration/interaction-replay
 */

import type {
  CapturedInteraction,
  ReplayableInteractionType,
  InteractionReplayConfig,
  HydrationBoundaryId,
} from './types';
import { DEFAULT_REPLAY_CONFIG } from './types';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a unique ID for captured interactions.
 */
function generateInteractionId(): string {
  return `interaction-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Generates a unique selector for an element.
 * Uses a combination of strategies for reliable re-targeting.
 *
 * @param element - The DOM element to create a selector for
 * @returns A CSS selector string
 */
function generateSelector(element: Element): string {
  // Try ID first (most reliable)
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  // Try data-testid (common in React apps)
  const testId = element.getAttribute('data-testid');
  if (testId !== null && testId !== '') {
    return `[data-testid="${CSS.escape(testId)}"]`;
  }

  // Try data-hydration-target (our custom attribute)
  const hydrationTarget = element.getAttribute('data-hydration-target');
  if (hydrationTarget !== null && hydrationTarget !== '') {
    return `[data-hydration-target="${CSS.escape(hydrationTarget)}"]`;
  }

  // Build path from root
  const path: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    // Add classes for specificity
    if (current.classList.length > 0) {
      const classes = Array.from(current.classList)
        .filter((c) => !c.startsWith('hydration-'))
        .slice(0, 2)
        .map((c) => `.${CSS.escape(c)}`)
        .join('');
      selector += classes;
    }

    // Add nth-child for disambiguation
    const parent = current.parentElement;
    if (parent && current != null) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

/**
 * Extracts key information from a keyboard event.
 */
function extractKeyInfo(event: KeyboardEvent): CapturedInteraction['keyInfo'] {
  return {
    key: event.key,
    code: event.code,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
  };
}

/**
 * Extracts pointer position from a mouse or touch event.
 */
function extractPointerPosition(
  event: MouseEvent | TouchEvent
): CapturedInteraction['pointerPosition'] {
  if ('touches' in event && event.touches.length > 0) {
    const [touch] = event.touches;
    if (touch == null) return undefined;
    return {
      clientX: touch.clientX,
      clientY: touch.clientY,
    };
  }

  if ('clientX' in event) {
    return {
      clientX: event.clientX,
      clientY: event.clientY,
    };
  }

  return undefined;
}

/**
 * Creates event init options from a captured interaction.
 */
function createEventInit(interaction: CapturedInteraction): EventInit {
  const init: EventInit = {
    bubbles: true,
    cancelable: true,
    ...interaction.eventInit,
  };

  return init;
}

/**
 * Creates the appropriate event for replay.
 */
function createReplayEvent(interaction: CapturedInteraction): Event {
  switch (interaction.type) {
    case 'click':
      return new MouseEvent('click', {
        ...createEventInit(interaction),
        clientX: interaction.pointerPosition?.clientX ?? 0,
        clientY: interaction.pointerPosition?.clientY ?? 0,
      } as MouseEventInit);

    case 'focus':
      return new FocusEvent('focus', createEventInit(interaction));

    case 'input':
      return new InputEvent('input', {
        ...createEventInit(interaction),
        data: interaction.inputValue ?? '',
        inputType: 'insertText',
      } as InputEventInit);

    case 'change':
      return new Event('change', createEventInit(interaction));

    case 'keydown':
      return new KeyboardEvent('keydown', {
        ...createEventInit(interaction),
        ...interaction.keyInfo,
      } as KeyboardEventInit);

    case 'keyup':
      return new KeyboardEvent('keyup', {
        ...createEventInit(interaction),
        ...interaction.keyInfo,
      } as KeyboardEventInit);

    case 'submit':
      return new SubmitEvent('submit', createEventInit(interaction));

    case 'touchstart':
      return new TouchEvent('touchstart', createEventInit(interaction) as TouchEventInit);

    case 'touchend':
      return new TouchEvent('touchend', createEventInit(interaction) as TouchEventInit);

    default:
      return new Event(interaction.type, createEventInit(interaction));
  }
}

// ============================================================================
// Interaction Buffer Class
// ============================================================================

/**
 * Bounded buffer for storing captured interactions.
 * Automatically evicts old interactions based on time and size limits.
 */
class InteractionBuffer {
  private readonly buffer: CapturedInteraction[] = [];
  private readonly maxSize: number;
  private readonly maxAge: number;

  constructor(maxSize: number, maxAge: number) {
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  /**
   * Adds an interaction to the buffer.
   */
  push(interaction: CapturedInteraction): void {
    // Remove stale interactions
    this.evictStale();

    // Remove oldest if at capacity
    while (this.buffer.length >= this.maxSize) {
      this.buffer.shift();
    }

    this.buffer.push(interaction);
  }

  /**
   * Removes and returns all interactions from the buffer.
   */
  drain(): CapturedInteraction[] {
    const interactions = [...this.buffer];
    this.buffer.length = 0;
    return interactions;
  }

  /**
   * Returns the number of interactions in the buffer.
   */
  get size(): number {
    return this.buffer.length;
  }

  /**
   * Checks if the buffer is empty.
   */
  isEmpty(): boolean {
    return this.buffer.length === 0;
  }

  /**
   * Clears all interactions from the buffer.
   */
  clear(): void {
    this.buffer.length = 0;
  }

  /**
   * Returns a copy of all interactions without removing them.
   */
  peek(): readonly CapturedInteraction[] {
    return [...this.buffer];
  }

  /**
   * Removes interactions older than maxAge.
   */
  private evictStale(): void {
    const now = Date.now();
    const cutoff = now - this.maxAge;

    while (this.buffer.length > 0 && this.buffer[0] && this.buffer[0].capturedAt < cutoff) {
      this.buffer.shift();
    }
  }
}

// ============================================================================
// Interaction Replay Manager
// ============================================================================

/**
 * Manages interaction capture and replay for hydration boundaries.
 *
 * @example
 * ```typescript
 * const replayManager = new InteractionReplayManager();
 *
 * // Start capturing for a boundary
 * replayManager.startCapture('boundary-1', containerElement);
 *
 * // ... user interacts with the component ...
 *
 * // After hydration, replay interactions
 * await replayManager.replayInteractions('boundary-1');
 * ```
 */
export class InteractionReplayManager {
  /** Configuration */
  private readonly config: InteractionReplayConfig;

  /** Buffers per boundary */
  private readonly buffers = new Map<HydrationBoundaryId, InteractionBuffer>();

  /** Active event listeners per boundary */
  private readonly listeners = new Map<
    HydrationBoundaryId,
    Map<ReplayableInteractionType, (e: Event) => void>
  >();

  /** Container elements per boundary */
  private readonly containers = new Map<HydrationBoundaryId, HTMLElement>();

  /** Debug mode */
  private readonly debug: boolean;

  /**
   * Creates a new InteractionReplayManager.
   *
   * @param config - Replay configuration
   * @param debug - Enable debug logging
   */
  constructor(config: Partial<InteractionReplayConfig> = {}, debug = false) {
    this.config = {
      ...DEFAULT_REPLAY_CONFIG,
      ...config,
    };
    this.debug = debug;
  }

  // ==========================================================================
  // Capture API
  // ==========================================================================

  /**
   * Starts capturing interactions for a hydration boundary.
   *
   * @param boundaryId - ID of the hydration boundary
   * @param container - Container element to capture events from
   */
  startCapture(boundaryId: HydrationBoundaryId, container: HTMLElement): void {
    // Clean up any existing capture
    this.stopCapture(boundaryId);

    // Create buffer
    const buffer = new InteractionBuffer(
      this.config.maxBufferSize,
      this.config.maxBufferTime
    );
    this.buffers.set(boundaryId, buffer);
    this.containers.set(boundaryId, container);

    // Create event listeners
    const listenerMap = new Map<ReplayableInteractionType, (e: Event) => void>();

    for (const eventType of this.config.captureTypes) {
      const listener = this.createCaptureListener(boundaryId, eventType);
      listenerMap.set(eventType, listener);
      container.addEventListener(eventType, listener, { capture: true, passive: false });
    }

    this.listeners.set(boundaryId, listenerMap);

    // Add capture indicator if configured
    if (this.config.showCaptureIndicator) {
      container.classList.add('hydration-capture-active');
    }

    this.log(`Started capture for boundary: ${boundaryId}`);
  }

  /**
   * Stops capturing interactions for a hydration boundary.
   *
   * @param boundaryId - ID of the hydration boundary
   */
  stopCapture(boundaryId: HydrationBoundaryId): void {
    const container = this.containers.get(boundaryId);
    const listenerMap = this.listeners.get(boundaryId);

    if (container && listenerMap) {
      for (const [eventType, listener] of listenerMap) {
        container.removeEventListener(eventType, listener, { capture: true });
      }

      if (this.config.showCaptureIndicator) {
        container.classList.remove('hydration-capture-active');
      }
    }

    this.listeners.delete(boundaryId);
    this.containers.delete(boundaryId);

    this.log(`Stopped capture for boundary: ${boundaryId}`);
  }

  /**
   * Creates a capture listener for a specific event type.
   */
  private createCaptureListener(
    boundaryId: HydrationBoundaryId,
    eventType: ReplayableInteractionType
  ): (e: Event) => void {
    return (event: Event) => {
      const target = event.target as Element | null;

      if (!target) {
        return;
      }

      // Capture the interaction
      const interaction = this.captureInteraction(event, target, eventType);

      // Store in buffer
      const buffer = this.buffers.get(boundaryId);
      if (buffer) {
        buffer.push(interaction);
        this.log(`Captured ${eventType} for boundary: ${boundaryId}`);
      }

      // Optionally prevent default
      if (this.config.preventDefaultDuringCapture && event.cancelable) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
  }

  /**
   * Captures details of an interaction.
   */
  private captureInteraction(
    event: Event,
    target: Element,
    type: ReplayableInteractionType
  ): CapturedInteraction {
    const interaction: CapturedInteraction = {
      id: generateInteractionId(),
      type,
      targetSelector: generateSelector(target),
      eventInit: {
        bubbles: event.bubbles,
        cancelable: event.cancelable,
        composed: event.composed,
      },
      capturedAt: Date.now(),
    };

    // Add type-specific data
    if (type === 'input' || type === 'change') {
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return {
          ...interaction,
          inputValue: target.value,
        };
      }
    }

    if (type === 'keydown' || type === 'keyup') {
      return {
        ...interaction,
        keyInfo: extractKeyInfo(event as KeyboardEvent),
      };
    }

    if (type === 'click' || type === 'touchstart' || type === 'touchend') {
      return {
        ...interaction,
        pointerPosition: extractPointerPosition(event as MouseEvent | TouchEvent),
      };
    }

    return interaction;
  }

  // ==========================================================================
  // Replay API
  // ==========================================================================

  /**
   * Replays all captured interactions for a boundary.
   *
   * @param boundaryId - ID of the hydration boundary
   * @returns Number of interactions replayed
   */
  async replayInteractions(boundaryId: HydrationBoundaryId): Promise<number> {
    // Stop capturing first
    this.stopCapture(boundaryId);

    // Get and clear buffer
    const buffer = this.buffers.get(boundaryId);
    if (!buffer || buffer.isEmpty()) {
      this.buffers.delete(boundaryId);
      return 0;
    }

    const interactions = buffer.drain();
    this.buffers.delete(boundaryId);

    this.log(`Replaying ${interactions.length} interactions for boundary: ${boundaryId}`);

    // Replay each interaction with delay
    let replayed = 0;

    for (const interaction of interactions) {
      const success = this.replayInteraction(interaction);
      if (success) {
        replayed++;
      }

      // Small delay between replays to allow DOM updates
      if (this.config.replayDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.config.replayDelay));
      }
    }

    this.log(`Replayed ${replayed}/${interactions.length} interactions for boundary: ${boundaryId}`);

    return replayed;
  }

  /**
   * Replays a single interaction.
   */
  private replayInteraction(interaction: CapturedInteraction): boolean {
    try {
      // Find target element
      const target = document.querySelector(interaction.targetSelector);

      if (target == null) {
        this.log(`Target not found for replay: ${interaction.targetSelector}`, 'warn');
        return false;
      }

      // Handle special cases
      if (interaction.type === 'focus') {
        if (target instanceof HTMLElement) {
          target.focus();
          return true;
        }
        return false;
      }

      if (interaction.type === 'input' && interaction.inputValue !== undefined) {
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          // Set value directly and dispatch event
          target.value = interaction.inputValue;
          target.dispatchEvent(createReplayEvent(interaction));
          return true;
        }
      }

      // Dispatch synthetic event
      const event = createReplayEvent(interaction);
      target.dispatchEvent(event);

      return true;
    } catch (error) {
      this.log(`Failed to replay interaction: ${String(error)}`, 'error');
      return false;
    }
  }

  // ==========================================================================
  // Query API
  // ==========================================================================

  /**
   * Returns the number of captured interactions for a boundary.
   *
   * @param boundaryId - ID of the hydration boundary
   * @returns Number of captured interactions
   */
  getCapturedCount(boundaryId: HydrationBoundaryId): number {
    const buffer = this.buffers.get(boundaryId);
    return buffer?.size ?? 0;
  }

  /**
   * Returns all captured interactions for a boundary without removing them.
   *
   * @param boundaryId - ID of the hydration boundary
   * @returns Array of captured interactions
   */
  peekCaptured(boundaryId: HydrationBoundaryId): readonly CapturedInteraction[] {
    const buffer = this.buffers.get(boundaryId);
    return buffer?.peek() ?? [];
  }

  /**
   * Checks if a boundary has any captured interactions.
   *
   * @param boundaryId - ID of the hydration boundary
   * @returns true if there are captured interactions
   */
  hasCaptured(boundaryId: HydrationBoundaryId): boolean {
    const buffer = this.buffers.get(boundaryId);
    return buffer ? !buffer.isEmpty() : false;
  }

  /**
   * Checks if a boundary is currently capturing interactions.
   *
   * @param boundaryId - ID of the hydration boundary
   * @returns true if capture is active
   */
  isCapturing(boundaryId: HydrationBoundaryId): boolean {
    return this.listeners.has(boundaryId);
  }

  // ==========================================================================
  // Cleanup API
  // ==========================================================================

  /**
   * Clears all captured interactions for a boundary without replaying.
   *
   * @param boundaryId - ID of the hydration boundary
   */
  clearCaptured(boundaryId: HydrationBoundaryId): void {
    this.stopCapture(boundaryId);
    this.buffers.delete(boundaryId);
  }

  /**
   * Cleans up all resources.
   * Call this when unmounting the hydration system.
   */
  dispose(): void {
    // Stop all captures
    for (const boundaryId of this.listeners.keys()) {
      this.stopCapture(boundaryId);
    }

    // Clear all buffers
    this.buffers.clear();
    this.containers.clear();

    this.log('InteractionReplayManager disposed');
  }

  // ==========================================================================
  // Internal
  // ==========================================================================

  /**
   * Debug logging helper.
   */
  private log(message: string, level: 'log' | 'warn' | 'error' = 'log'): void {
    if (this.debug) {
      const logger = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
      logger(`[InteractionReplay] ${message}`);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let replayManagerInstance: InteractionReplayManager | null = null;

/**
 * Gets or creates the global InteractionReplayManager instance.
 *
 * @param config - Replay configuration (only used if creating new instance)
 * @param debug - Enable debug logging
 * @returns The global InteractionReplayManager instance
 */
export function getInteractionReplayManager(
  config?: Partial<InteractionReplayConfig>,
  debug = false
): InteractionReplayManager {
  replayManagerInstance ??= new InteractionReplayManager(config, debug);
  return replayManagerInstance;
}

/**
 * Resets the global InteractionReplayManager instance.
 * Primarily useful for testing.
 */
export function resetInteractionReplayManager(): void {
  if (replayManagerInstance) {
    replayManagerInstance.dispose();
    replayManagerInstance = null;
  }
}

// ============================================================================
// Exports
// ============================================================================

export type {
  CapturedInteraction,
  ReplayableInteractionType,
  InteractionReplayConfig,
};
