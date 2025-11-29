/**
 * @file Dynamic HTML Streaming Engine - Core Implementation
 * @description Advanced streaming engine with priority queues, lifecycle management,
 * backpressure handling, and comprehensive metrics collection.
 *
 * This engine implements a sophisticated priority-based streaming system that
 * optimizes content delivery for modern web applications. It supports:
 *
 * - Priority-based stream scheduling (critical, high, normal, low)
 * - Stream lifecycle management (start, pause, resume, abort)
 * - Backpressure handling with configurable strategies
 * - Chunk buffering with high-water mark monitoring
 * - Automatic retry with exponential backoff
 * - Comprehensive metrics and telemetry
 * - Event-driven architecture for extensibility
 *
 * @module streaming/streaming-engine
 * @version 1.0.0
 * @author Harbor Framework Team
 *
 * @example
 * ```typescript
 * const engine = new StreamingEngine({
 *   maxConcurrentStreams: 4,
 *   backpressureStrategy: BackpressureStrategy.Pause,
 *   debug: true,
 * });
 *
 * engine.registerBoundary('hero', {
 *   priority: StreamPriority.Critical,
 *   onStreamComplete: () => console.log('Hero streamed!'),
 * });
 *
 * engine.start('hero');
 * ```
 */

import {
  type StreamConfig,
  type EngineConfig,
  type StreamChunk,
  type StreamBoundaryData,
  type QueueEntry,
  type StreamError,
  type StreamMetrics,
  type BoundaryMetrics,
  type StreamEventHandler,
  type StreamEvent,
  type TransformContext,
  StreamState,
  StreamPriority,
  StreamErrorCode,
  StreamEventType,
  BackpressureStrategy,
  PRIORITY_VALUES,
  DEFAULT_ENGINE_CONFIG,
  DEFAULT_METRICS,
  createStreamError,
} from './types';

// Re-export for use in other modules
export { StreamState, StreamPriority };

// ============================================================================
// Priority Queue Implementation
// ============================================================================

/**
 * Generic priority queue using a binary heap.
 *
 * @description
 * Implements a min-heap based priority queue for efficient O(log n)
 * insertion and extraction of highest priority items.
 *
 * @template T - Type of items in the queue
 */
class PriorityQueue<T extends { priority: number }> {
  private heap: T[] = [];

  /**
   * Returns the number of items in the queue.
   */
  get size(): number {
    return this.heap.length;
  }

  /**
   * Returns whether the queue is empty.
   */
  get isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Inserts an item into the queue.
   * @param item - Item to insert
   */
  enqueue(item: T): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Removes and returns the highest priority item.
   * @returns The highest priority item or undefined if queue is empty
   */
  dequeue(): T | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const [result] = this.heap;
    const lastItem = this.heap.pop();
    if (lastItem !== undefined) {
      this.heap[0] = lastItem;
      this.bubbleDown(0);
    }

    return result;
  }

  /**
   * Returns the highest priority item without removing it.
   * @returns The highest priority item or undefined if queue is empty
   */
  peek(): T | undefined {
    return this.heap[0];
  }

  /**
   * Removes all items from the queue.
   */
  clear(): void {
    this.heap = [];
  }

  /**
   * Removes a specific item from the queue.
   * @param predicate - Function to identify the item to remove
   * @returns Whether an item was removed
   */
  remove(predicate: (item: T) => boolean): boolean {
    const index = this.heap.findIndex(predicate);
    if (index === -1) return false;

    if (index === this.heap.length - 1) {
      this.heap.pop();
      return true;
    }

    const lastItem = this.heap.pop();
    if (lastItem === undefined) return true;
    
    this.heap[index] = lastItem;
    const parentIndex = Math.floor((index - 1) / 2);
    const parentItem = this.heap[parentIndex];

    if (index > 0 && parentItem != null && this.heap[index].priority < parentItem.priority) {
      this.bubbleUp(index);
    } else {
      this.bubbleDown(index);
    }

    return true;
  }

  /**
   * Returns all items in the queue (not in priority order).
   */
  toArray(): T[] {
    return [...this.heap];
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const currentItem = this.heap[index];
      const parentItem = this.heap[parentIndex];
      if (!currentItem || !parentItem || currentItem.priority >= parentItem.priority) break;

      [this.heap[index], this.heap[parentIndex]] = [parentItem, currentItem];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const lastIndex = this.heap.length - 1;

    while (true) {
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;
      let smallestIndex = index;

      const leftChild = this.heap[leftChildIndex];
      const rightChild = this.heap[rightChildIndex];
      const smallestItem = this.heap[smallestIndex];

      if (
        leftChildIndex <= lastIndex &&
        leftChild &&
        smallestItem &&
        leftChild.priority < smallestItem.priority
      ) {
        smallestIndex = leftChildIndex;
      }

      const updatedSmallestItem = this.heap[smallestIndex];
      if (
        rightChildIndex <= lastIndex &&
        rightChild &&
        updatedSmallestItem &&
        rightChild.priority < updatedSmallestItem.priority
      ) {
        smallestIndex = rightChildIndex;
      }

      if (smallestIndex === index) break;

      const indexItem = this.heap[index];
      const smallestIndexItem = this.heap[smallestIndex];
      if (!indexItem || !smallestIndexItem) break;
      
      [this.heap[index], this.heap[smallestIndex]] = [smallestIndexItem, indexItem];
      index = smallestIndex;
    }
  }
}

// ============================================================================
// Stream Buffer Implementation
// ============================================================================

/**
 * Ring buffer for efficient chunk buffering with backpressure support.
 *
 * @description
 * Implements a circular buffer with high-water mark monitoring
 * for backpressure detection and handling.
 */
class StreamBuffer {
  private buffer: StreamChunk[] = [];
  private readonly capacity: number;
  private readonly highWaterMark: number;
  private head = 0;
  private tail = 0;
  private count = 0;
  private totalBytes = 0;

  constructor(capacity: number, highWaterMark: number) {
    this.capacity = capacity;
    this.highWaterMark = highWaterMark;
    this.buffer = new Array<StreamChunk | undefined>(capacity);
  }

  /**
   * Returns the number of chunks in the buffer.
   */
  get size(): number {
    return this.count;
  }

  /**
   * Returns the total bytes currently in the buffer.
   */
  get bytes(): number {
    return this.totalBytes;
  }

  /**
   * Returns the buffer utilization as a ratio (0-1).
   */
  get utilization(): number {
    return this.count / this.capacity;
  }

  /**
   * Returns whether backpressure should be applied.
   */
  get shouldApplyBackpressure(): boolean {
    return this.totalBytes >= this.highWaterMark;
  }

  /**
   * Returns whether the buffer is full.
   */
  get isFull(): boolean {
    return this.count >= this.capacity;
  }

  /**
   * Adds a chunk to the buffer.
   * @param chunk - Chunk to add
   * @returns Whether the chunk was added successfully
   */
  push(chunk: StreamChunk): boolean {
    if (this.isFull) return false;

    this.buffer[this.tail] = chunk;
    this.tail = (this.tail + 1) % this.capacity;
    this.count++;
    this.totalBytes += chunk.size;

    return true;
  }

  /**
   * Removes and returns the oldest chunk from the buffer.
   * @returns The oldest chunk or undefined if buffer is empty
   */
  shift(): StreamChunk | undefined {
    if (this.count === 0) return undefined;

    const chunk = this.buffer[this.head];
    if (!chunk) return undefined;

    this.buffer[this.head] = undefined;
    this.head = (this.head + 1) % this.capacity;
    this.count--;
    this.totalBytes -= chunk.size;

    return chunk;
  }

  /**
   * Returns the oldest chunk without removing it.
   */
  peek(): StreamChunk | undefined {
    return this.count > 0 ? this.buffer[this.head] : undefined;
  }

  /**
   * Clears all chunks from the buffer.
   */
  clear(): void {
    this.buffer = new Array<StreamChunk | undefined>(this.capacity);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
    this.totalBytes = 0;
  }

  /**
   * Drains all chunks from the buffer.
   * @returns Array of all chunks in order
   */
  drain(): StreamChunk[] {
    const chunks: StreamChunk[] = [];
    while (this.count > 0) {
      const chunk = this.shift();
      if (chunk) chunks.push(chunk);
    }
    return chunks;
  }
}

// ============================================================================
// Streaming Engine Implementation
// ============================================================================

/**
 * Core streaming engine with priority-based scheduling and lifecycle management.
 *
 * @description
 * The StreamingEngine is the heart of the Dynamic HTML Streaming system.
 * It manages multiple stream boundaries, coordinating their execution
 * based on priority levels and system resource availability.
 *
 * Key features:
 * - Priority-based scheduling with preemption support
 * - Stream lifecycle management (start, pause, resume, abort)
 * - Backpressure handling with configurable strategies
 * - Automatic retry with exponential backoff
 * - Comprehensive event system for monitoring
 * - Thread-safe operations for concurrent access
 *
 * @example
 * ```typescript
 * const engine = new StreamingEngine({ debug: true });
 *
 * // Register boundaries
 * engine.registerBoundary('nav', { priority: StreamPriority.Critical });
 * engine.registerBoundary('hero', { priority: StreamPriority.High });
 * engine.registerBoundary('sidebar', { priority: StreamPriority.Low });
 *
 * // Subscribe to events
 * const unsubscribe = engine.subscribe((event) => {
 *   console.log(`${event.type}: ${event.boundaryId}`);
 * });
 *
 * // Start streaming
 * engine.startAll();
 * ```
 */
export class StreamingEngine {
  private readonly config: EngineConfig;
  private readonly boundaries: Map<string, StreamBoundaryData> = new Map();
  private readonly priorityQueue: PriorityQueue<QueueEntry>;
  private readonly buffer: StreamBuffer;
  private readonly eventHandlers: Set<StreamEventHandler> = new Set();
  private metrics: StreamMetrics;
  private activeStreams = 0;
  private isProcessing = false;
  private processingTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly chunkLatencies: number[] = [];
  private readonly MAX_LATENCY_SAMPLES = 100;

  /**
   * Creates a new StreamingEngine instance.
   * @param config - Engine configuration options
   */
  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.priorityQueue = new PriorityQueue();
    this.buffer = new StreamBuffer(
      Math.ceil(this.config.bufferSize / 1024), // Approximate chunk capacity
      this.config.highWaterMark
    );
    this.metrics = this.createInitialMetrics();

    this.log('Engine initialized with config:', this.config);
  }

  // ==========================================================================
  // Public API - Boundary Management
  // ==========================================================================

  /**
   * Registers a new stream boundary with the engine.
   *
   * @param id - Unique identifier for the boundary
   * @param config - Stream configuration
   * @throws {Error} If boundary with same ID already exists
   *
   * @example
   * ```typescript
   * engine.registerBoundary('main-content', {
   *   priority: StreamPriority.High,
   *   placeholder: <ContentSkeleton />,
   *   onStreamComplete: () => console.log('Content ready!'),
   * });
   * ```
   */
  registerBoundary(id: string, config: StreamConfig): void {
    if (this.boundaries.has(id)) {
      const error: Error = createStreamError(
        StreamErrorCode.ConfigError,
        `Boundary with ID "${id}" already exists`,
        { boundaryId: id }
      );
      throw error;
    }

    const boundaryData: StreamBoundaryData = {
      id,
      config,
      state: StreamState.Idle,
      chunks: [],
      bytesReceived: 0,
      bytesDelivered: 0,
      retryCount: 0,
      abortController: new AbortController(),
    };

    this.boundaries.set(id, boundaryData);
    this.updateMetrics('register', id);
    this.log(`Registered boundary: ${id}`, config);
  }

  /**
   * Unregisters a stream boundary, aborting any active streams.
   *
   * @param id - Boundary identifier to unregister
   * @returns Whether the boundary was found and unregistered
   */
  unregisterBoundary(id: string): boolean {
    const boundary = this.boundaries.get(id);
    if (!boundary) return false;

    // Abort if streaming
    if (this.isActiveState(boundary.state)) {
      this.abort(id, 'Boundary unregistered');
    }

    // Remove from queue
    this.priorityQueue.remove((entry) => entry.boundaryId === id);

    this.boundaries.delete(id);
    this.updateMetrics('unregister', id);
    this.log(`Unregistered boundary: ${id}`);

    return true;
  }

  /**
   * Gets the current state of a boundary.
   * @param id - Boundary identifier
   * @returns Current state or null if not found
   */
  getState(id: string): StreamState | null {
    return this.boundaries.get(id)?.state ?? null;
  }

  /**
   * Gets the boundary data for inspection.
   * @param id - Boundary identifier
   * @returns Boundary data or undefined if not found
   */
  getBoundary(id: string): Readonly<StreamBoundaryData> | undefined {
    return this.boundaries.get(id);
  }

  /**
   * Returns all registered boundary IDs.
   */
  getBoundaryIds(): string[] {
    return Array.from(this.boundaries.keys());
  }

  // ==========================================================================
  // Public API - Lifecycle Management
  // ==========================================================================

  /**
   * Starts streaming for a specific boundary.
   *
   * @param id - Boundary identifier
   * @throws {Error} If boundary not found or in invalid state
   *
   * @example
   * ```typescript
   * engine.start('hero');
   * ```
   */
  start(id: string): void {
    const boundary = this.boundaries.get(id);
    if (!boundary) {
      const error: Error = createStreamError(
        StreamErrorCode.ConfigError,
        `Boundary "${id}" not found`,
        { boundaryId: id }
      );
      throw error;
    }

    if (!this.canTransitionTo(boundary.state, StreamState.Pending)) {
      const error: Error = createStreamError(
        StreamErrorCode.StateError,
        `Cannot start boundary "${id}" from state "${boundary.state}"`,
        { boundaryId: id }
      );
      throw error;
    }

    this.transitionState(boundary, StreamState.Pending);
    this.queueBoundary(boundary);
    this.processQueue();
  }

  /**
   * Starts streaming for all registered boundaries.
   */
  startAll(): void {
    for (const id of this.boundaries.keys()) {
      const boundary = this.boundaries.get(id);
      if (boundary != null && boundary.state === StreamState.Idle) {
        this.start(id);
      }
    }
  }

  /**
   * Pauses streaming for a specific boundary.
   *
   * @param id - Boundary identifier
   * @throws {Error} If boundary not found or not streaming
   */
  pause(id: string): void {
    const boundary = this.boundaries.get(id);
    if (!boundary) {
      const error: Error = createStreamError(
        StreamErrorCode.ConfigError,
        `Boundary "${id}" not found`,
        { boundaryId: id }
      );
      throw error;
    }

    if (!this.canTransitionTo(boundary.state, StreamState.Paused)) {
      const error: Error = createStreamError(
        StreamErrorCode.StateError,
        `Cannot pause boundary "${id}" from state "${boundary.state}"`,
        { boundaryId: id }
      );
      throw error;
    }

    this.transitionState(boundary, StreamState.Paused);
    this.emitEvent(StreamEventType.Pause, id);
    this.activeStreams--;
    this.processQueue();
  }

  /**
   * Resumes a paused stream.
   *
   * @param id - Boundary identifier
   * @throws {Error} If boundary not found or not paused
   */
  resume(id: string): void {
    const boundary = this.boundaries.get(id);
    if (!boundary) {
      const error: Error = createStreamError(
        StreamErrorCode.ConfigError,
        `Boundary "${id}" not found`,
        { boundaryId: id }
      );
      throw error;
    }

    if (boundary.state !== StreamState.Paused) {
      const error: Error = createStreamError(
        StreamErrorCode.StateError,
        `Cannot resume boundary "${id}" from state "${boundary.state}"`,
        { boundaryId: id }
      );
      throw error;
    }

    this.transitionState(boundary, StreamState.Streaming);
    this.activeStreams++;
    this.emitEvent(StreamEventType.Resume, id);
  }

  /**
   * Aborts streaming for a specific boundary.
   *
   * @param id - Boundary identifier
   * @param reason - Optional reason for abortion
   */
  abort(id: string, reason = 'User requested abort'): void {
    const boundary = this.boundaries.get(id);
    if (!boundary) return;

    if (this.isTerminalState(boundary.state)) return;

    boundary.abortController.abort(reason);
    this.transitionState(boundary, StreamState.Aborted);
    this.emitEvent(StreamEventType.Abort, id, { reason });

    if (this.isActiveState(boundary.state)) {
      this.activeStreams--;
    }

    boundary.config.onStreamAbort?.(reason);
    this.priorityQueue.remove((entry) => entry.boundaryId === id);
    this.processQueue();
  }

  /**
   * Aborts all active streams.
   * @param reason - Optional reason for abortion
   */
  abortAll(reason = 'Bulk abort requested'): void {
    for (const id of this.boundaries.keys()) {
      this.abort(id, reason);
    }
  }

  /**
   * Resets a boundary to idle state for restart.
   * @param id - Boundary identifier
   */
  reset(id: string): void {
    const boundary = this.boundaries.get(id);
    if (!boundary) return;

    if (this.isActiveState(boundary.state)) {
      this.abort(id, 'Reset requested');
    }

    boundary.state = StreamState.Idle;
    boundary.chunks = [];
    boundary.bytesReceived = 0;
    boundary.bytesDelivered = 0;
    boundary.startTime = undefined;
    boundary.endTime = undefined;
    boundary.lastError = undefined;
    boundary.retryCount = 0;
    boundary.abortController = new AbortController();

    this.log(`Reset boundary: ${id}`);
  }

  // ==========================================================================
  // Public API - Chunk Management
  // ==========================================================================

  /**
   * Processes an incoming chunk for a boundary.
   *
   * @param chunk - The chunk to process
   * @returns Whether the chunk was accepted
   *
   * @example
   * ```typescript
   * const chunk: StreamChunk = {
   *   id: crypto.randomUUID(),
   *   sequence: 0,
   *   data: '<div>Content</div>',
   *   timestamp: Date.now(),
   *   size: 18,
   *   isFinal: false,
   *   boundaryId: 'main',
   * };
   *
   * engine.processChunk(chunk);
   * ```
   */
  async processChunk(chunk: StreamChunk): Promise<boolean> {
    const boundary = this.boundaries.get(chunk.boundaryId);
    if (!boundary || !this.isActiveState(boundary.state)) {
      return false;
    }

    const startTime = performance.now();

    try {
      // Apply transformer if configured
      const transformedChunk = this.config.chunkTransformer
        ? await this.applyTransformer(chunk, boundary)
        : chunk;

      // Check buffer capacity
      if (this.buffer.shouldApplyBackpressure) {
        await this.handleBackpressure(boundary);
      }

      // Buffer the chunk
      if (!this.buffer.push(transformedChunk)) {
        return this.handleBufferFull(boundary, transformedChunk);
      }

      boundary.chunks.push(transformedChunk);
      boundary.bytesReceived += transformedChunk.size;

      // Track latency
      const latency = performance.now() - startTime;
      this.recordChunkLatency(latency);

      this.emitEvent(StreamEventType.Chunk, chunk.boundaryId, transformedChunk);
      this.updateMetrics('chunk', chunk.boundaryId, transformedChunk);

      // Handle final chunk
      if (transformedChunk.isFinal) {
        this.completeStream(boundary);
      }

      return true;
    } catch (error) {
      await this.handleChunkError(boundary, chunk, error);
      return false;
    }
  }

  /**
   * Delivers buffered chunks to the client.
   *
   * @param boundaryId - Boundary to deliver chunks for
   * @returns Array of delivered chunks
   */
  deliverChunks(boundaryId: string): StreamChunk[] {
    const boundary = this.boundaries.get(boundaryId);
    if (!boundary) return [];

    const delivered: StreamChunk[] = [];

    while (this.buffer.size > 0) {
      const chunk = this.buffer.peek();
      if (chunk?.boundaryId !== boundaryId) break;

      const deliveredChunk = this.buffer.shift();
      if (deliveredChunk != null) {
        delivered.push(deliveredChunk);
        boundary.bytesDelivered += deliveredChunk.size;
      }
    }

    return delivered;
  }

  // ==========================================================================
  // Public API - Events & Metrics
  // ==========================================================================

  /**
   * Subscribes to stream events.
   *
   * @param handler - Event handler function
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = engine.subscribe((event) => {
   *   switch (event.type) {
   *     case StreamEventType.Start:
   *       console.log(`Stream ${event.boundaryId} started`);
   *       break;
   *     case StreamEventType.Complete:
   *       console.log(`Stream ${event.boundaryId} completed`);
   *       break;
   *   }
   * });
   *
   * // Later...
   * unsubscribe();
   * ```
   */
  subscribe(handler: StreamEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Returns current streaming metrics.
   */
  getMetrics(): Readonly<StreamMetrics> {
    return { ...this.metrics };
  }

  /**
   * Returns the current engine configuration.
   */
  getConfig(): Readonly<EngineConfig> {
    return { ...this.config };
  }

  /**
   * Checks if streaming is supported in the current environment.
   */
  static isStreamingSupported(): boolean {
    return (
      typeof ReadableStream !== 'undefined' &&
      typeof TransformStream !== 'undefined' &&
      typeof AbortController !== 'undefined'
    );
  }

  /**
   * Disposes of the engine, cleaning up all resources.
   */
  dispose(): void {
    this.abortAll('Engine disposed');
    this.boundaries.clear();
    this.priorityQueue.clear();
    this.buffer.clear();
    this.eventHandlers.clear();

    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }

    this.log('Engine disposed');
  }

  // ==========================================================================
  // Priority Queue Processing
  // ==========================================================================

  private queueBoundary(boundary: StreamBoundaryData): void {
    const priority = this.getPriorityValue(boundary.config.priority);
    const deferMs = boundary.config.deferMs ?? 0;

    const entry: QueueEntry = {
      boundaryId: boundary.id,
      priority,
      queuedAt: Date.now(),
      scheduledTime: Date.now() + deferMs,
    };

    this.priorityQueue.enqueue(entry);
    this.log(`Queued boundary: ${boundary.id} with priority ${priority}, defer ${deferMs}ms`);
  }

  private processQueue(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const processNext = (): void => {
      // Check if we can process more streams
      if (this.activeStreams >= this.config.maxConcurrentStreams) {
        this.isProcessing = false;
        return;
      }

      const entry = this.priorityQueue.peek();
      if (!entry) {
        this.isProcessing = false;
        return;
      }

      const now = Date.now();
      const delay = entry.scheduledTime - now;

      if (delay > 0) {
        // Schedule for later
        this.processingTimer = setTimeout(() => {
          this.processingTimer = null;
          this.processEntry(entry);
          processNext();
        }, delay);
        this.isProcessing = false;
        return;
      }

      this.processEntry(entry);
      processNext();
    };

    processNext();
  }

  private processEntry(entry: QueueEntry): void {
    const poppedEntry = this.priorityQueue.dequeue();
    if (!poppedEntry || poppedEntry.boundaryId !== entry.boundaryId) {
      // Entry was removed from queue, skip
      return;
    }

    const boundary = this.boundaries.get(entry.boundaryId);
    if (!boundary || boundary.state !== StreamState.Pending) {
      return;
    }

    this.startStreaming(boundary);
  }

  private startStreaming(boundary: StreamBoundaryData): void {
    boundary.startTime = Date.now();
    this.transitionState(boundary, StreamState.Streaming);
    this.activeStreams++;

    this.emitEvent(StreamEventType.Start, boundary.id);
    boundary.config.onStreamStart?.();

    // Set up timeout
    if ((boundary.config.timeoutMs != null && boundary.config.timeoutMs > 0) || (this.config.globalTimeoutMs != null && this.config.globalTimeoutMs > 0)) {
      const timeout = boundary.config.timeoutMs ?? this.config.globalTimeoutMs ?? 0;
      setTimeout(() => {
        if (this.isActiveState(boundary.state)) {
          this.handleTimeout(boundary);
        }
      }, timeout);
    }

    this.log(`Started streaming: ${boundary.id}`);
  }

  private completeStream(boundary: StreamBoundaryData): void {
    boundary.endTime = Date.now();
    this.transitionState(boundary, StreamState.Completed);
    this.activeStreams--;

    this.emitEvent(StreamEventType.Complete, boundary.id);
    boundary.config.onStreamComplete?.();

    // Record boundary metrics
    this.recordBoundaryMetrics(boundary);
    this.processQueue();

    this.log(`Completed streaming: ${boundary.id}`);
  }

  // ==========================================================================
  // Backpressure & Buffer Management
  // ==========================================================================

  private async handleBackpressure(boundary: StreamBoundaryData): Promise<void> {
    this.metrics.backpressureEvents++;
    this.emitEvent(StreamEventType.Backpressure, boundary.id, {
      pressure: this.buffer.utilization,
    });

    switch (this.config.backpressureStrategy) {
      case BackpressureStrategy.Pause:
        // Pause until buffer drains
        await this.waitForBufferDrain();
        break;

      case BackpressureStrategy.Drop:
        // Will be handled in processChunk
        this.log(`Backpressure: dropping chunks for ${boundary.id}`);
        break;

      case BackpressureStrategy.Buffer:
        // Dynamic expansion not implemented - fall through to pause
        await this.waitForBufferDrain();
        break;

      case BackpressureStrategy.Error: {
        const error: Error = createStreamError(
          StreamErrorCode.BufferOverflow,
          'Buffer overflow - backpressure strategy is error',
          { boundaryId: boundary.id }
        );
        throw error;
      }
    }
  }

  private handleBufferFull(boundary: StreamBoundaryData, chunk: StreamChunk): boolean {
    if (this.config.backpressureStrategy === BackpressureStrategy.Drop) {
      this.log(`Dropped chunk ${chunk.id} for ${boundary.id} - buffer full`);
      return false;
    }

    const error: Error = createStreamError(
      StreamErrorCode.BufferOverflow,
      'Buffer full and backpressure strategy does not allow dropping',
      { boundaryId: boundary.id, chunkId: chunk.id }
    );
    throw error;
  }

  private async waitForBufferDrain(): Promise<void> {
    return new Promise((resolve) => {
      const checkBuffer = (): void => {
        if (!this.buffer.shouldApplyBackpressure) {
          resolve();
        } else {
          setTimeout(checkBuffer, 10);
        }
      };
      checkBuffer();
    });
  }

  // ==========================================================================
  // Error Handling & Retry
  // ==========================================================================

  private async handleChunkError(
    boundary: StreamBoundaryData,
    chunk: StreamChunk,
    error: unknown
  ): Promise<void> {
    const streamError = this.normalizeError(error, boundary.id, chunk.id);
    boundary.lastError = streamError;

    if (
      this.config.enableRetry &&
      streamError.retryable &&
      boundary.retryCount < this.config.maxRetries
    ) {
      await this.retryChunk(boundary, chunk);
    } else {
      this.handleStreamError(boundary, streamError);
    }
  }

  private async retryChunk(boundary: StreamBoundaryData, chunk: StreamChunk): Promise<void> {
    boundary.retryCount++;
    this.metrics.retryAttempts++;

    const delay = this.config.retryDelayMs * Math.pow(2, boundary.retryCount - 1);

    this.emitEvent(StreamEventType.Retry, boundary.id, {
      attempt: boundary.retryCount,
      maxAttempts: this.config.maxRetries,
    });

    this.log(`Retrying chunk ${chunk.id} for ${boundary.id}, attempt ${boundary.retryCount}`);

    await new Promise((resolve) => setTimeout(resolve, delay));

    // Re-attempt processing
    await this.processChunk(chunk);
  }

  private handleStreamError(boundary: StreamBoundaryData, error: StreamError): void {
    this.transitionState(boundary, StreamState.Error);

    if (this.isActiveState(boundary.state)) {
      this.activeStreams--;
    }

    this.emitEvent(StreamEventType.Error, boundary.id, error);
    boundary.config.onStreamError?.(error);
    this.updateMetrics('error', boundary.id);

    this.processQueue();
  }

  private handleTimeout(boundary: StreamBoundaryData): void {
    const error = createStreamError(
      StreamErrorCode.TimeoutError,
      `Stream timeout exceeded for boundary "${boundary.id}"`,
      { boundaryId: boundary.id }
    );

    this.handleStreamError(boundary, error);
  }

  private normalizeError(
    error: unknown,
    boundaryId: string,
    chunkId?: string
  ): StreamError {
    if (error instanceof Error) {
      return createStreamError(
        StreamErrorCode.UnknownError,
        error.message,
        {
          boundaryId,
          chunkId,
          cause: error,
          stack: error.stack,
        }
      );
    }

    return createStreamError(
      StreamErrorCode.UnknownError,
      String(error),
      { boundaryId, chunkId }
    );
  }

  // ==========================================================================
  // Chunk Transformation
  // ==========================================================================

  private async applyTransformer(
    chunk: StreamChunk,
    boundary: StreamBoundaryData
  ): Promise<StreamChunk> {
    if (!this.config.chunkTransformer) return chunk;

    const context: TransformContext = {
      boundaryId: boundary.id,
      config: boundary.config,
      totalChunks: boundary.chunks.length,
      totalBytes: boundary.bytesReceived,
    };

    return this.config.chunkTransformer(chunk, context);
  }

  // ==========================================================================
  // State Machine
  // ==========================================================================

  private transitionState(boundary: StreamBoundaryData, newState: StreamState): void {
    const oldState = boundary.state;

    if (!this.canTransitionTo(oldState, newState)) {
      this.log(`Invalid state transition: ${oldState} -> ${newState} for ${boundary.id}`);
      return;
    }

    boundary.state = newState;

    this.emitEvent(StreamEventType.StateChange, boundary.id, {
      from: oldState,
      to: newState,
    });

    this.log(`State transition: ${boundary.id} ${oldState} -> ${newState}`);
  }

  private canTransitionTo(from: StreamState, to: StreamState): boolean {
    const validTransitions: Record<StreamState, StreamState[]> = {
      [StreamState.Idle]: [StreamState.Pending],
      [StreamState.Pending]: [StreamState.Streaming, StreamState.Aborted],
      [StreamState.Streaming]: [
        StreamState.Paused,
        StreamState.Completed,
        StreamState.Error,
        StreamState.Aborted,
      ],
      [StreamState.Paused]: [StreamState.Streaming, StreamState.Aborted],
      [StreamState.Completed]: [],
      [StreamState.Error]: [],
      [StreamState.Aborted]: [],
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  private isActiveState(state: StreamState): boolean {
    return [StreamState.Streaming, StreamState.Paused].includes(state);
  }

  private isTerminalState(state: StreamState): boolean {
    return [StreamState.Completed, StreamState.Error, StreamState.Aborted].includes(state);
  }

  // ==========================================================================
  // Metrics & Telemetry
  // ==========================================================================

  private createInitialMetrics(): StreamMetrics {
    return {
      ...DEFAULT_METRICS,
      boundaryMetrics: new Map(),
      lastUpdated: Date.now(),
    };
  }

  private updateMetrics(
    action: 'register' | 'unregister' | 'chunk' | 'error',
    boundaryId: string,
    chunk?: StreamChunk
  ): void {
    if (!this.config.enableMetrics) return;

    this.metrics.lastUpdated = Date.now();
    this.metrics.activeStreams = this.activeStreams;

    switch (action) {
      case 'register': {
        const boundary = this.boundaries.get(boundaryId);
        if (boundary) {
          const priority = this.normalizePriority(boundary.config.priority);
          this.metrics.streamsByPriority[priority]++;
        }
        break;
      }

      case 'unregister':
        // Metrics are preserved for historical analysis
        break;

      case 'chunk':
        if (chunk) {
          this.metrics.totalBytesTransferred += chunk.size;
        }
        break;

      case 'error':
        this.metrics.failedStreams++;
        break;
    }

    this.metrics.bufferUtilization = this.buffer.utilization;
  }

  private recordChunkLatency(latency: number): void {
    this.chunkLatencies.push(latency);

    if (this.chunkLatencies.length > this.MAX_LATENCY_SAMPLES) {
      this.chunkLatencies.shift();
    }

    this.metrics.averageChunkLatency =
      this.chunkLatencies.reduce((sum, l) => sum + l, 0) / this.chunkLatencies.length;
  }

  private recordBoundaryMetrics(boundary: StreamBoundaryData): void {
    const duration = (boundary.endTime ?? Date.now()) - (boundary.startTime ?? Date.now());

    const [firstChunk] = boundary.chunks;
    const metrics: BoundaryMetrics = {
      boundaryId: boundary.id,
      timeToFirstChunk: firstChunk
        ? firstChunk.timestamp - (boundary.startTime ?? 0)
        : 0,
      timeToComplete: duration,
      chunksReceived: boundary.chunks.length,
      bytesReceived: boundary.bytesReceived,
      averageChunkSize: boundary.chunks.length > 0
        ? boundary.bytesReceived / boundary.chunks.length
        : 0,
      retries: boundary.retryCount,
      successful: boundary.state === StreamState.Completed,
    };

    this.metrics.boundaryMetrics.set(boundary.id, metrics);
    this.metrics.completedStreams++;

    // Update average time to first chunk
    const allTTFC = Array.from(this.metrics.boundaryMetrics.values()).map(
      (m) => m.timeToFirstChunk
    );
    this.metrics.averageTimeToFirstChunk =
      allTTFC.reduce((sum, t) => sum + t, 0) / allTTFC.length;
  }

  // ==========================================================================
  // Event Emission
  // ==========================================================================

  private emitEvent<T>(type: StreamEventType, boundaryId: string, payload?: T): void {
    const event: StreamEvent<T> = {
      type,
      boundaryId,
      timestamp: Date.now(),
      payload,
    };

    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        this.log(`Event handler error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private getPriorityValue(priority: StreamPriority | `${StreamPriority}`): number {
    return PRIORITY_VALUES[priority as StreamPriority] ?? PRIORITY_VALUES[StreamPriority.Normal];
  }

  private normalizePriority(priority: StreamPriority | `${StreamPriority}`): StreamPriority {
    if (Object.values(StreamPriority).includes(priority as StreamPriority)) {
      return priority as StreamPriority;
    }
    return StreamPriority.Normal;
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.info('[StreamingEngine]', ...args);
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new StreamingEngine instance with optional configuration.
 *
 * @param config - Partial engine configuration
 * @returns New StreamingEngine instance
 *
 * @example
 * ```typescript
 * const engine = createStreamingEngine({
 *   maxConcurrentStreams: 4,
 *   debug: true,
 * });
 * ```
 */
export function createStreamingEngine(config?: Partial<EngineConfig>): StreamingEngine {
  return new StreamingEngine(config);
}

/**
 * Creates a chunk with proper defaults.
 *
 * @param data - Chunk data
 * @param boundaryId - Parent boundary ID
 * @param options - Additional chunk options
 * @returns Properly formatted StreamChunk
 */
export function createChunk(
  data: string | Uint8Array,
  boundaryId: string,
  options?: Partial<Omit<StreamChunk, 'data' | 'boundaryId'>>
): StreamChunk {
  const dataSize = typeof data === 'string' ? new Blob([data]).size : data.byteLength;

  return {
    id: options?.id ?? `chunk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    sequence: options?.sequence ?? 0,
    data,
    timestamp: options?.timestamp ?? Date.now(),
    size: options?.size ?? dataSize,
    isFinal: options?.isFinal ?? false,
    boundaryId,
    checksum: options?.checksum,
    metadata: options?.metadata,
  };
}

/**
 * Calculates a simple checksum for chunk integrity verification.
 *
 * @param data - Data to checksum
 * @returns Hexadecimal checksum string
 */
export function calculateChecksum(data: string | Uint8Array): string {
  const bytes = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : data;

  let hash = 0;
  for (const byte of bytes) {
    hash = ((hash << 5) - hash + byte) | 0;
  }

  return Math.abs(hash).toString(16).padStart(8, '0');
}

// ============================================================================
// ReadableStream Integration
// ============================================================================

/**
 * Creates a ReadableStream that emits chunks from the engine.
 *
 * @param engine - StreamingEngine instance
 * @param boundaryId - Boundary to stream from
 * @returns ReadableStream of StreamChunks
 *
 * @example
 * ```typescript
 * const stream = createReadableStream(engine, 'main-content');
 *
 * const reader = stream.getReader();
 * while (true) {
 *   const { done, value } = await reader.read();
 *   if (done) break;
 *   console.log('Received chunk:', value);
 * }
 * ```
 */
export function createReadableStream(
  engine: StreamingEngine,
  boundaryId: string
): ReadableStream<StreamChunk> {
  let unsubscribe: (() => void) | null = null;

  return new ReadableStream({
    start(controller) {
      unsubscribe = engine.subscribe((event) => {
        if (event.boundaryId !== boundaryId) return;

        switch (event.type) {
          case StreamEventType.Chunk:
            controller.enqueue(event.payload as StreamChunk);
            break;
          case StreamEventType.Complete:
            controller.close();
            break;
          case StreamEventType.Error:
          case StreamEventType.Abort:
            controller.error(event.payload);
            break;
        }
      });
    },

    cancel() {
      engine.abort(boundaryId, 'Stream cancelled by consumer');
      unsubscribe?.();
    },
  });
}

/**
 * Creates a TransformStream for processing chunks.
 *
 * @param transformer - Chunk transformer function
 * @returns TransformStream for chunk processing
 */
export function createChunkTransformStream(
  transformer: (chunk: StreamChunk) => StreamChunk | Promise<StreamChunk>
): TransformStream<StreamChunk, StreamChunk> {
  return new TransformStream({
    async transform(chunk, controller) {
      const transformed = await transformer(chunk);
      controller.enqueue(transformed);
    },
  });
}
