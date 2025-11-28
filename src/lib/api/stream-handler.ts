/**
 * @file Stream Handler
 * @description Streaming response handling utilities for Server-Sent Events (SSE), 
 * NDJSON streams, and custom streaming formats with subscription management.
 */

import type { StreamController, StreamEvent, StreamOptions } from './types';

/**
 * Default stream options
 */
const DEFAULT_STREAM_OPTIONS: StreamOptions = {
  ndjson: false,
  sse: false,
  bufferSize: 1000,
  inactivityTimeout: 30000,
};

/**
 * Create a stream controller for handling streaming responses
 *
 * @typeParam T - Type of streamed data items
 * @param response - Response with readable body stream
 * @param options - Stream handling options
 * @returns Stream controller for subscribing to events
 *
 * @example
 * ```typescript
 * // NDJSON streaming
 * const stream = streamResponse<Message>(response, { ndjson: true });
 *
 * const unsubscribe = stream.subscribe((event) => {
 *   if (event.type === 'data') {
 *     console.log('Received:', event.data);
 *   }
 * });
 *
 * // Later: cleanup
 * unsubscribe();
 * stream.abort();
 * ```
 */
export function streamResponse<T>(
  response: Response | { body: ReadableStream<Uint8Array> | null },
  options: StreamOptions = {}
): StreamController<T> {
  const opts = { ...DEFAULT_STREAM_OPTIONS, ...options };
  const subscribers: Set<(event: StreamEvent<T>) => void> = new Set();
  const dataBuffer: T[] = [];
  let isActive = true;
  let abortController: AbortController | null = new AbortController();
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

  // Get the body stream
  const { body } = response;
  if (body === null || body === undefined) {
    throw new Error('Response body is not a readable stream');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Emit event to all subscribers
  const emit = (event: StreamEvent<T>): void => {
    for (const subscriber of subscribers) {
      subscriber(event);
    }
  };

  // Reset inactivity timer
  const resetInactivityTimer = (): void => {
    if (inactivityTimer !== null) {
      clearTimeout(inactivityTimer);
    }
    if (opts.inactivityTimeout !== undefined && opts.inactivityTimeout !== null && opts.inactivityTimeout > 0) {
      inactivityTimer = setTimeout(() => {
        emit({
          type: 'error',
          error: new Error('Stream inactivity timeout'),
          timestamp: Date.now(),
        });
        cleanup();
      }, opts.inactivityTimeout);
    }
  };

  // Parse incoming data
  const parseData = (text: string): void => {
    buffer += text;

    if (opts.sse === true) {
      // Parse Server-Sent Events
      parseSSE(buffer, (data, remainder) => {
        buffer = remainder;
        if (data !== null && data !== undefined) {
          addData(data as T);
        }
      });
    } else if (opts.ndjson === true) {
      // Parse NDJSON (newline-delimited JSON)
      parseNDJSON(buffer, (data, remainder) => {
        buffer = remainder;
        if (data !== null && data !== undefined) {
          addData(data as T);
        }
      });
    } else if (opts.parser !== undefined) {
      // Custom parser
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.trim() !== '') {
          const data = opts.parser(line);
          if (data !== null && data !== undefined) {
            addData(data as T);
          }
        }
      }
    } else {
      // Raw text
      addData(text as unknown as T);
      buffer = '';
    }
  };

  // Add data to buffer and emit
  const addData = (data: T): void => {
    // Limit buffer size
    if (opts.bufferSize !== undefined && opts.bufferSize !== null && dataBuffer.length >= opts.bufferSize) {
      dataBuffer.shift();
    }
    dataBuffer.push(data);

    emit({
      type: 'data',
      data,
      timestamp: Date.now(),
    });

    resetInactivityTimer();
  };

  // Cleanup resources
  const cleanup = (): void => {
    isActive = false;
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
    if (abortController) {
      abortController = null;
    }
  };

  // Start reading
  const read = async (): Promise<void> => {
    try {
      resetInactivityTimer();

      while (isActive) {
        const { done, value } = await reader.read();

        if (done) {
          // Handle remaining buffer
          if (buffer.trim()) {
            parseData('');
          }

          emit({ type: 'end', timestamp: Date.now() });
          cleanup();
          break;
        }

        const text = decoder.decode(value, { stream: true });
        parseData(text);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        emit({ type: 'abort', timestamp: Date.now() });
      } else {
        emit({
          type: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: Date.now(),
        });
      }
      cleanup();
    }
  };

  // Start reading in background
  void read();

  return {
    subscribe: (callback: (event: StreamEvent<T>) => void) => {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
    abort: () => {
      if (abortController) {
        void reader.cancel();
        emit({ type: 'abort', timestamp: Date.now() });
        cleanup();
      }
    },
    isActive: () => isActive,
    getData: () => [...dataBuffer],
  };
}

/**
 * Parse Server-Sent Events format
 */
function parseSSE(
  buffer: string,
  callback: (data: unknown | null, remainder: string) => void
): void {
  const events = buffer.split('\n\n');
  const remainder = events.pop() ?? '';

  for (const event of events) {
    if (!event.trim()) continue;

    const lines = event.split('\n');
    let data = '';
    let eventType = 'message';

    for (const line of lines) {
      if (line.startsWith('data:')) {
        data += line.slice(5).trim();
      } else if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      }
    }

    if (data !== '') {
      try {
        const parsedData: unknown = JSON.parse(data);
        callback({ type: eventType, data: parsedData }, '');
      } catch {
        callback({ type: eventType, data: data as unknown }, '');
      }
    }
  }

  callback(null, remainder);
}

/**
 * Parse NDJSON format
 */
function parseNDJSON(
  buffer: string,
  callback: (data: unknown | null, remainder: string) => void
): void {
  const lines = buffer.split('\n');
  const remainder = lines.pop() ?? '';

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const data: unknown = JSON.parse(line);
      callback(data, '');
    } catch {
      // Skip invalid JSON lines
      console.warn('[StreamResponse] Invalid JSON line:', line);
    }
  }

  callback(null, remainder);
}
