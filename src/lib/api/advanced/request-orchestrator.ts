/**
 * Request Orchestrator
 *
 * Orchestrates complex API request patterns including parallel requests,
 * sequential chains, conditional execution, and dependency resolution.
 *
 * @module api/advanced/request-orchestrator
 */

import type { GatewayResponse, GatewayRequest } from './api-gateway';

// =============================================================================
// Types
// =============================================================================

/**
 * Request definition for orchestration.
 */
export interface OrchestratedRequest<T = unknown> {
  /** Unique request identifier */
  id: string;
  /** The request to execute */
  request: GatewayRequest | (() => Promise<T>);
  /** Dependencies (other request IDs that must complete first) */
  dependsOn?: string[];
  /** Transform the result before storing */
  transform?: (result: T) => unknown;
  /** Condition to determine if request should execute */
  condition?: (results: Record<string, unknown>) => boolean;
  /** Custom error handler */
  onError?: (error: Error, results: Record<string, unknown>) => T | Promise<T>;
  /** Priority (higher executes first when dependencies are equal) */
  priority?: number;
  /** Request metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Orchestration result.
 */
export interface OrchestrationResult<T extends Record<string, unknown>> {
  /** Whether all requests succeeded */
  success: boolean;
  /** Results keyed by request ID */
  results: T;
  /** Errors keyed by request ID */
  errors: Record<string, Error>;
  /** Execution order */
  executionOrder: string[];
  /** Total duration in milliseconds */
  duration: number;
  /** Individual request durations */
  durations: Record<string, number>;
}

/**
 * Batch request configuration.
 */
export interface BatchConfig {
  /** Maximum concurrent requests */
  maxConcurrency?: number;
  /** Stop on first error */
  stopOnError?: boolean;
  /** Delay between batches in milliseconds */
  batchDelay?: number;
  /** Timeout for entire batch in milliseconds */
  timeout?: number;
}

/**
 * Chain configuration.
 */
export interface ChainConfig {
  /** Stop chain on error */
  stopOnError?: boolean;
  /** Delay between requests in milliseconds */
  delay?: number;
  /** Pass result to next request */
  passResult?: boolean;
}

/**
 * Waterfall step.
 */
export interface WaterfallStep<TInput, TOutput> {
  /** Step identifier */
  id: string;
  /** Execute function */
  execute: (input: TInput, context: WaterfallContext) => Promise<TOutput>;
  /** Condition to skip step */
  skip?: (input: TInput, context: WaterfallContext) => boolean;
  /** Error handler */
  onError?: (error: Error, input: TInput, context: WaterfallContext) => TOutput | Promise<TOutput>;
}

/**
 * Waterfall execution context.
 */
export interface WaterfallContext {
  /** All results so far */
  results: Record<string, unknown>;
  /** Original input */
  originalInput: unknown;
  /** Metadata */
  metadata: Record<string, unknown>;
}

// =============================================================================
// Request Orchestrator Class
// =============================================================================

/**
 * Request Orchestrator for complex API request patterns.
 *
 * @example
 * ```typescript
 * const orchestrator = new RequestOrchestrator(apiGateway.request.bind(apiGateway));
 *
 * // Parallel requests
 * const results = await orchestrator.parallel([
 *   { path: '/users', method: 'GET' },
 *   { path: '/posts', method: 'GET' },
 *   { path: '/comments', method: 'GET' },
 * ]);
 *
 * // Dependent requests
 * const orchestrated = await orchestrator.orchestrate([
 *   { id: 'user', request: { path: '/users/1', method: 'GET' } },
 *   {
 *     id: 'posts',
 *     request: { path: '/posts?userId=1', method: 'GET' },
 *     dependsOn: ['user'],
 *   },
 * ]);
 * ```
 */
export class RequestOrchestrator {
  private executor: <T>(request: GatewayRequest) => Promise<GatewayResponse<T>>;

  /**
   * Create a new orchestrator.
   *
   * @param executor - Function to execute requests
   */
  constructor(executor: <T>(request: GatewayRequest) => Promise<GatewayResponse<T>>) {
    this.executor = executor;
  }

  // ===========================================================================
  // Parallel Execution
  // ===========================================================================

  /**
   * Execute multiple requests in parallel.
   *
   * @param requests - Requests to execute
   * @param config - Batch configuration
   * @returns Array of results
   */
  async parallel<T = unknown>(
    requests: GatewayRequest[],
    config?: BatchConfig
  ): Promise<GatewayResponse<T>[]> {
    const maxConcurrency = config?.maxConcurrency ?? Infinity;
    const stopOnError = config?.stopOnError ?? false;
    const results: GatewayResponse<T>[] = [];
    const errors: Error[] = [];

    // Process in batches
    for (let i = 0; i < requests.length; i += maxConcurrency) {
      const batch = requests.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (request) => {
        try {
          return await this.executor<T>(request);
        } catch (error) {
          if (stopOnError) throw error;
          errors.push(error as Error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter((r): r is GatewayResponse<T> => r !== null));

      // Add delay between batches if configured
      if (config?.batchDelay && i + maxConcurrency < requests.length) {
        await this.delay(config.batchDelay);
      }
    }

    if (errors.length > 0 && stopOnError) {
      throw errors[0];
    }

    return results;
  }

  /**
   * Execute requests in parallel, settling all regardless of errors.
   *
   * @param requests - Requests to execute
   * @returns Results and errors
   */
  async allSettled<T = unknown>(
    requests: GatewayRequest[]
  ): Promise<{
    fulfilled: GatewayResponse<T>[];
    rejected: { request: GatewayRequest; error: Error }[];
  }> {
    const results = await Promise.allSettled(
      requests.map(request => this.executor<T>(request))
    );

    const fulfilled: GatewayResponse<T>[] = [];
    const rejected: { request: GatewayRequest; error: Error }[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        fulfilled.push(result.value);
      } else {
        rejected.push({ request: requests[index]!, error: result.reason });
      }
    });

    return { fulfilled, rejected };
  }

  /**
   * Race multiple requests, returning the first to complete.
   *
   * @param requests - Requests to race
   * @returns First completed result
   */
  async race<T = unknown>(requests: GatewayRequest[]): Promise<GatewayResponse<T>> {
    return Promise.race(requests.map(request => this.executor<T>(request)));
  }

  // ===========================================================================
  // Sequential Execution
  // ===========================================================================

  /**
   * Execute requests sequentially.
   *
   * @param requests - Requests to execute in order
   * @param config - Chain configuration
   * @returns Array of results
   */
  async sequence<T = unknown>(
    requests: GatewayRequest[],
    config?: ChainConfig
  ): Promise<GatewayResponse<T>[]> {
    const results: GatewayResponse<T>[] = [];

    for (const request of requests) {
      try {
        const result = await this.executor<T>(request);
        results.push(result);

        if (config?.delay) {
          await this.delay(config.delay);
        }
      } catch (error) {
        if (config?.stopOnError !== false) {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Execute a waterfall pattern where each step's output feeds the next.
   *
   * @param steps - Waterfall steps
   * @param initialInput - Initial input to first step
   * @returns Final result and all intermediate results
   */
  async waterfall<TInput, TOutput>(
    steps: WaterfallStep<unknown, unknown>[],
    initialInput: TInput
  ): Promise<{ result: TOutput; results: Record<string, unknown> }> {
    const context: WaterfallContext = {
      results: {},
      originalInput: initialInput,
      metadata: {},
    };

    let currentInput: unknown = initialInput;

    for (const step of steps) {
      // Check skip condition
      if (step.skip?.(currentInput, context)) {
        continue;
      }

      try {
        const result = await step.execute(currentInput, context);
        context.results[step.id] = result;
        currentInput = result;
      } catch (error) {
        if (step.onError) {
          const recovered = await step.onError(error as Error, currentInput, context);
          context.results[step.id] = recovered;
          currentInput = recovered;
        } else {
          throw error;
        }
      }
    }

    return {
      result: currentInput as TOutput,
      results: context.results,
    };
  }

  // ===========================================================================
  // Dependency-Based Orchestration
  // ===========================================================================

  /**
   * Orchestrate requests with dependencies.
   *
   * Requests are executed in optimal order based on their dependencies,
   * maximizing parallelism while respecting dependency constraints.
   *
   * @param requests - Orchestrated requests
   * @returns Orchestration result
   */
  async orchestrate<T extends Record<string, unknown>>(
    requests: OrchestratedRequest[]
  ): Promise<OrchestrationResult<T>> {
    const startTime = Date.now();
    const results: Record<string, unknown> = {};
    const errors: Record<string, Error> = {};
    const durations: Record<string, number> = {};
    const executionOrder: string[] = [];

    // Build dependency graph
    const { levels, requestMap } = this.buildDependencyGraph(requests);

    // Execute level by level
    for (const level of levels) {
      const levelRequests = level
        .map(id => requestMap.get(id)!)
        .filter(req => {
          // Check condition
          if (req.condition && !req.condition(results)) {
            return false;
          }
          return true;
        })
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

      const levelPromises = levelRequests.map(async (req) => {
        const reqStartTime = Date.now();

        try {
          let result: unknown;

          if (typeof req.request === 'function') {
            result = await req.request();
          } else {
            const response = await this.executor(req.request);
            result = response.data;
          }

          if (req.transform) {
            result = req.transform(result);
          }

          results[req.id] = result;
          durations[req.id] = Date.now() - reqStartTime;
          executionOrder.push(req.id);
        } catch (error) {
          if (req.onError) {
            try {
              const recovered = await req.onError(error as Error, results);
              results[req.id] = recovered;
              durations[req.id] = Date.now() - reqStartTime;
              executionOrder.push(req.id);
            } catch (recoveryError) {
              errors[req.id] = recoveryError as Error;
            }
          } else {
            errors[req.id] = error as Error;
          }
        }
      });

      await Promise.all(levelPromises);
    }

    return {
      success: Object.keys(errors).length === 0,
      results: results as T,
      errors,
      executionOrder,
      duration: Date.now() - startTime,
      durations,
    };
  }

  /**
   * Build dependency graph and determine execution levels.
   */
  private buildDependencyGraph(
    requests: OrchestratedRequest[]
  ): {
    levels: string[][];
    requestMap: Map<string, OrchestratedRequest>;
  } {
    const requestMap = new Map<string, OrchestratedRequest>();
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>();

    // Initialize
    for (const req of requests) {
      requestMap.set(req.id, req);
      inDegree.set(req.id, 0);
      dependents.set(req.id, []);
    }

    // Build graph
    for (const req of requests) {
      if (req.dependsOn) {
        for (const dep of req.dependsOn) {
          if (!requestMap.has(dep)) {
            throw new Error(`Unknown dependency: ${dep}`);
          }
          inDegree.set(req.id, (inDegree.get(req.id) ?? 0) + 1);
          dependents.get(dep)!.push(req.id);
        }
      }
    }

    // Topological sort with levels
    const levels: string[][] = [];
    const remaining = new Set(requests.map(r => r.id));

    while (remaining.size > 0) {
      const level: string[] = [];

      for (const id of remaining) {
        if (inDegree.get(id) === 0) {
          level.push(id);
        }
      }

      if (level.length === 0) {
        throw new Error('Circular dependency detected');
      }

      levels.push(level);

      for (const id of level) {
        remaining.delete(id);
        for (const dependent of dependents.get(id) ?? []) {
          inDegree.set(dependent, (inDegree.get(dependent) ?? 1) - 1);
        }
      }
    }

    return { levels, requestMap };
  }

  // ===========================================================================
  // Retry & Fallback Patterns
  // ===========================================================================

  /**
   * Execute with fallback options.
   *
   * @param primary - Primary request
   * @param fallbacks - Fallback requests in order of preference
   * @returns First successful result
   */
  async withFallback<T = unknown>(
    primary: GatewayRequest,
    fallbacks: GatewayRequest[]
  ): Promise<GatewayResponse<T>> {
    const allRequests = [primary, ...fallbacks];

    for (let i = 0; i < allRequests.length; i++) {
      try {
        return await this.executor<T>(allRequests[i]!);
      } catch (error) {
        if (i === allRequests.length - 1) {
          throw error;
        }
      }
    }

    throw new Error('All requests failed');
  }

  /**
   * Execute with retry and exponential backoff.
   *
   * @param request - Request to execute
   * @param maxRetries - Maximum retry attempts
   * @param baseDelay - Base delay in milliseconds
   * @returns Response
   */
  async withRetry<T = unknown>(
    request: GatewayRequest,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<GatewayResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executor<T>(request);
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          await this.delay(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Execute with timeout.
   *
   * @param request - Request to execute
   * @param timeout - Timeout in milliseconds
   * @returns Response
   */
  async withTimeout<T = unknown>(
    request: GatewayRequest,
    timeout: number
  ): Promise<GatewayResponse<T>> {
    return Promise.race([
      this.executor<T>(request),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      ),
    ]);
  }

  // ===========================================================================
  // Aggregation Patterns
  // ===========================================================================

  /**
   * Aggregate paginated results.
   *
   * @param baseRequest - Base request
   * @param options - Pagination options
   * @returns All aggregated results
   */
  async paginate<T = unknown>(
    baseRequest: GatewayRequest,
    options: {
      /** Page parameter name */
      pageParam?: string;
      /** Limit parameter name */
      limitParam?: string;
      /** Items per page */
      pageSize?: number;
      /** Maximum pages to fetch */
      maxPages?: number;
      /** Extract items from response */
      getItems?: (data: unknown) => T[];
      /** Check if more pages exist */
      hasMore?: (data: unknown, page: number) => boolean;
    } = {}
  ): Promise<T[]> {
    const {
      pageParam = 'page',
      limitParam = 'limit',
      pageSize = 100,
      maxPages = 100,
      getItems = (data: unknown) => (data as { items: T[] }).items ?? (data as T[]),
      hasMore = (data: unknown) => getItems(data).length >= pageSize,
    } = options;

    const allItems: T[] = [];
    let page = 1;

    while (page <= maxPages) {
      const request: GatewayRequest = {
        ...baseRequest,
        params: {
          ...baseRequest.params,
          [pageParam]: page,
          [limitParam]: pageSize,
        },
      };

      const response = await this.executor(request);
      const items = getItems(response.data);
      allItems.push(...items);

      if (!hasMore(response.data, page)) {
        break;
      }

      page++;
    }

    return allItems;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Delay execution.
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new request orchestrator.
 *
 * @param executor - Request executor function
 * @returns RequestOrchestrator instance
 */
export function createRequestOrchestrator(
  executor: <T>(request: GatewayRequest) => Promise<GatewayResponse<T>>
): RequestOrchestrator {
  return new RequestOrchestrator(executor);
}
