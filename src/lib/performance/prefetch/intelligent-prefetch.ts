/**
 * @file Intelligent Prefetch Engine
 * @description ML-like prefetch prediction using user behavior patterns,
 * navigation history, and heuristics to predict and prefetch resources.
 *
 * Features:
 * - Behavior-based prediction
 * - Navigation pattern learning
 * - Viewport-based prefetching
 * - Network-aware decisions
 * - Probability scoring
 * - Prefetch budgeting
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Navigation event for pattern learning
 */
export interface NavigationEvent {
  from: string;
  to: string;
  timestamp: number;
  duration: number;
  interactionType: 'click' | 'hover' | 'focus' | 'scroll' | 'programmatic';
}

/**
 * Prefetch candidate
 */
export interface PrefetchCandidate {
  url: string;
  type: 'route' | 'data' | 'asset';
  probability: number;
  priority: 'high' | 'medium' | 'low';
  size?: number;
  reason: string[];
}

/**
 * Prediction result
 */
export interface PredictionResult {
  candidates: PrefetchCandidate[];
  confidence: number;
  factors: PredictionFactor[];
  timestamp: number;
}

/**
 * Prediction factor
 */
export interface PredictionFactor {
  name: string;
  weight: number;
  value: number;
  description: string;
}

/**
 * User behavior metrics
 */
export interface BehaviorMetrics {
  sessionDuration: number;
  pageViews: number;
  avgTimeOnPage: number;
  scrollDepth: number;
  clickRate: number;
  hoverPatterns: Map<string, number>;
  navigationPatterns: Map<string, number>;
}

/**
 * Intelligent prefetch configuration
 */
export interface IntelligentPrefetchConfig {
  /** Enable prediction */
  enabled: boolean;
  /** Minimum probability to trigger prefetch */
  probabilityThreshold: number;
  /** Maximum concurrent prefetches */
  maxConcurrentPrefetches: number;
  /** Prefetch budget in bytes */
  prefetchBudget: number;
  /** Enable network quality awareness */
  networkAware: boolean;
  /** Minimum network quality for prefetch */
  minNetworkQuality: '4g' | '3g' | '2g' | 'slow-2g';
  /** Enable data saver respect */
  respectDataSaver: boolean;
  /** Learning rate for pattern updates */
  learningRate: number;
  /** History size for pattern learning */
  maxHistorySize: number;
  /** Debug mode */
  debug: boolean;
}

/**
 * Network information interface
 */
interface NetworkInformation {
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  saveData?: boolean;
  downlink?: number;
  rtt?: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: IntelligentPrefetchConfig = {
  enabled: true,
  probabilityThreshold: 0.6,
  maxConcurrentPrefetches: 3,
  prefetchBudget: 5 * 1024 * 1024, // 5MB
  networkAware: true,
  minNetworkQuality: '3g',
  respectDataSaver: true,
  learningRate: 0.1,
  maxHistorySize: 100,
  debug: false,
};

const NETWORK_QUALITY_SCORES: Record<string, number> = {
  '4g': 4,
  '3g': 3,
  '2g': 2,
  'slow-2g': 1,
};

// ============================================================================
// Intelligent Prefetch Engine
// ============================================================================

/**
 * ML-like prefetch prediction engine
 */
export class IntelligentPrefetchEngine {
  private config: IntelligentPrefetchConfig;
  private navigationHistory: NavigationEvent[] = [];
  private transitionProbabilities: Map<string, Map<string, number>> = new Map();
  private hoverHistory: Map<string, number> = new Map();
  private prefetchedUrls: Set<string> = new Set();
  private currentBudgetUsed = 0;
  private sessionStartTime: number;
  private pageViewCount = 0;
  private listeners: Set<(prediction: PredictionResult) => void> = new Set();

  constructor(config: Partial<IntelligentPrefetchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionStartTime = Date.now();
    this.loadStoredPatterns();
  }

  /**
   * Record a navigation event
   */
  recordNavigation(event: Omit<NavigationEvent, 'timestamp'>): void {
    const fullEvent: NavigationEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.navigationHistory.push(fullEvent);
    this.pageViewCount++;

    // Trim history if needed
    if (this.navigationHistory.length > this.config.maxHistorySize) {
      this.navigationHistory.shift();
    }

    // Update transition probabilities
    this.updateTransitionProbabilities(fullEvent);
    this.persistPatterns();
  }

  /**
   * Record a hover event
   */
  recordHover(url: string): void {
    const count = this.hoverHistory.get(url) ?? 0;
    this.hoverHistory.set(url, count + 1);
  }

  /**
   * Get prefetch predictions for current page
   */
  predict(currentUrl: string, availableUrls: string[]): PredictionResult {
    if (this.config.enabled !== true || !this.shouldPrefetch()) {
      return this.emptyPrediction();
    }

    const candidates: PrefetchCandidate[] = [];
    const factors: PredictionFactor[] = [];

    for (const url of availableUrls) {
      if (this.prefetchedUrls.has(url)) {
        continue;
      }

      const probability = this.calculateProbability(currentUrl, url);
      const candidateFactors = this.getPredictionFactors(currentUrl, url);

      if (probability >= this.config.probabilityThreshold) {
        candidates.push({
          url,
          type: this.inferResourceType(url),
          probability,
          priority: this.calculatePriority(probability),
          reason: candidateFactors.map((f) => f.description),
        });

        factors.push(...candidateFactors);
      }
    }

    // Sort by probability and priority
    candidates.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.probability - a.probability;
    });

    // Limit to max concurrent
    const limitedCandidates = candidates.slice(0, this.config.maxConcurrentPrefetches);

    const result: PredictionResult = {
      candidates: limitedCandidates,
      confidence: this.calculateConfidence(),
      factors: this.deduplicateFactors(factors),
      timestamp: Date.now(),
    };

    // Notify listeners
    this.notifyListeners(result);

    return result;
  }

  /**
   * Mark URL as prefetched
   */
  markPrefetched(url: string, size?: number): void {
    this.prefetchedUrls.add(url);
    if (size) {
      this.currentBudgetUsed += size;
    }
  }

  /**
   * Check if URL was prefetched
   */
  wasPrefetched(url: string): boolean {
    return this.prefetchedUrls.has(url);
  }

  /**
   * Get behavior metrics
   */
  getBehaviorMetrics(): BehaviorMetrics {
    const sessionDuration = Date.now() - this.sessionStartTime;
    const avgTimeOnPage =
      this.pageViewCount > 0 ? sessionDuration / this.pageViewCount : 0;

    return {
      sessionDuration,
      pageViews: this.pageViewCount,
      avgTimeOnPage,
      scrollDepth: this.calculateScrollDepth(),
      clickRate: this.calculateClickRate(),
      hoverPatterns: new Map(this.hoverHistory),
      navigationPatterns: this.getNavigationPatterns(),
    };
  }

  /**
   * Subscribe to predictions
   */
  subscribe(callback: (prediction: PredictionResult) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Reset learning data
   */
  reset(): void {
    this.navigationHistory = [];
    this.transitionProbabilities.clear();
    this.hoverHistory.clear();
    this.prefetchedUrls.clear();
    this.currentBudgetUsed = 0;
    this.pageViewCount = 0;
    this.clearStoredPatterns();
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(): number {
    return Math.max(0, this.config.prefetchBudget - this.currentBudgetUsed);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private calculateProbability(fromUrl: string, toUrl: string): number {
    let probability = 0;
    let weights = 0;

    // Factor 1: Historical transition probability (weight: 0.4)
    const transitionProb = this.getTransitionProbability(fromUrl, toUrl);
    probability += transitionProb * 0.4;
    weights += 0.4;

    // Factor 2: Hover frequency (weight: 0.25)
    const hoverScore = this.getHoverScore(toUrl);
    probability += hoverScore * 0.25;
    weights += 0.25;

    // Factor 3: Recency bias (weight: 0.15)
    const recencyScore = this.getRecencyScore(toUrl);
    probability += recencyScore * 0.15;
    weights += 0.15;

    // Factor 4: URL similarity (weight: 0.1)
    const similarityScore = this.getUrlSimilarity(fromUrl, toUrl);
    probability += similarityScore * 0.1;
    weights += 0.1;

    // Factor 5: Time-based patterns (weight: 0.1)
    const timeScore = this.getTimeBasedScore(toUrl);
    probability += timeScore * 0.1;
    weights += 0.1;

    return Math.min(1, probability / weights);
  }

  private getPredictionFactors(fromUrl: string, toUrl: string): PredictionFactor[] {
    const factors: PredictionFactor[] = [];

    const transitionProb = this.getTransitionProbability(fromUrl, toUrl);
    if (transitionProb > 0) {
      factors.push({
        name: 'historical_transition',
        weight: 0.4,
        value: transitionProb,
        description: `Historical transition probability: ${(transitionProb * 100).toFixed(1)}%`,
      });
    }

    const hoverScore = this.getHoverScore(toUrl);
    if (hoverScore > 0) {
      factors.push({
        name: 'hover_frequency',
        weight: 0.25,
        value: hoverScore,
        description: `Hover frequency score: ${(hoverScore * 100).toFixed(1)}%`,
      });
    }

    const recencyScore = this.getRecencyScore(toUrl);
    if (recencyScore > 0) {
      factors.push({
        name: 'recency',
        weight: 0.15,
        value: recencyScore,
        description: `Recently visited similar pages`,
      });
    }

    return factors;
  }

  private getTransitionProbability(fromUrl: string, toUrl: string): number {
    const fromPath = this.normalizeUrl(fromUrl);
    const toPath = this.normalizeUrl(toUrl);

    const transitions = this.transitionProbabilities.get(fromPath);
    if (!transitions) {
      return 0;
    }

    return transitions.get(toPath) ?? 0;
  }

  private getHoverScore(url: string): number {
    const hoverCount = this.hoverHistory.get(url) ?? 0;
    const maxHover = Math.max(...Array.from(this.hoverHistory.values()), 1);
    return hoverCount / maxHover;
  }

  private getRecencyScore(url: string): number {
    const normalizedUrl = this.normalizeUrl(url);

    // Check recent navigations
    const recentNavs = this.navigationHistory.slice(-20);
    let recencyScore = 0;

    for (let i = 0; i < recentNavs.length; i++) {
      const nav = recentNavs[i];
      if (nav && this.normalizeUrl(nav.to) === normalizedUrl) {
        // More recent = higher score
        recencyScore = Math.max(recencyScore, (i + 1) / recentNavs.length);
      }
    }

    return recencyScore;
  }

  private getUrlSimilarity(url1: string, url2: string): number {
    const path1 = this.normalizeUrl(url1).split('/');
    const path2 = this.normalizeUrl(url2).split('/');

    let matches = 0;
    const maxLen = Math.max(path1.length, path2.length);

    for (let i = 0; i < Math.min(path1.length, path2.length); i++) {
      if (path1[i] === path2[i]) {
        matches++;
      }
    }

    return matches / maxLen;
  }

  private getTimeBasedScore(_url: string): number {
    // Simplified time-based scoring
    const hour = new Date().getHours();

    // Peak usage hours (9-17) get higher scores
    if (hour >= 9 && hour <= 17) {
      return 0.8;
    }

    // Evening hours
    if (hour >= 18 && hour <= 22) {
      return 0.6;
    }

    return 0.4;
  }

  private updateTransitionProbabilities(event: NavigationEvent): void {
    const fromPath = this.normalizeUrl(event.from);
    const toPath = this.normalizeUrl(event.to);

    if (!this.transitionProbabilities.has(fromPath)) {
      this.transitionProbabilities.set(fromPath, new Map());
    }

    const transitions = this.transitionProbabilities.get(fromPath)!;
    const currentProb = transitions.get(toPath) ?? 0;

    // Update using exponential moving average
    const newProb = currentProb + this.config.learningRate * (1 - currentProb);
    transitions.set(toPath, newProb);

    // Decay other probabilities
    for (const [path, prob] of transitions.entries()) {
      if (path !== toPath) {
        transitions.set(path, prob * (1 - this.config.learningRate / 2));
      }
    }
  }

  private shouldPrefetch(): boolean {
    // Check network conditions
    if (this.config.networkAware) {
      const networkInfo = this.getNetworkInfo();

      if (this.config.respectDataSaver && networkInfo?.saveData) {
        this.log('Skipping prefetch: Data saver enabled');
        return false;
      }

      if (networkInfo?.effectiveType) {
        const currentQuality = NETWORK_QUALITY_SCORES[networkInfo.effectiveType] ?? 0;
        const minQuality = NETWORK_QUALITY_SCORES[this.config.minNetworkQuality] ?? 0;

        if (currentQuality < minQuality) {
          this.log(`Skipping prefetch: Network quality ${networkInfo.effectiveType} below threshold`);
          return false;
        }
      }
    }

    // Check budget
    if (this.currentBudgetUsed >= this.config.prefetchBudget) {
      this.log('Skipping prefetch: Budget exhausted');
      return false;
    }

    return true;
  }

  private calculatePriority(probability: number): 'high' | 'medium' | 'low' {
    if (probability >= 0.8) return 'high';
    if (probability >= 0.65) return 'medium';
    return 'low';
  }

  private calculateConfidence(): number {
    // Confidence based on data volume
    const historySize = this.navigationHistory.length;
    const minForConfidence = 10;
    const maxForConfidence = 50;

    if (historySize < minForConfidence) {
      return historySize / minForConfidence * 0.5;
    }

    if (historySize >= maxForConfidence) {
      return 1;
    }

    return 0.5 + (historySize - minForConfidence) / (maxForConfidence - minForConfidence) * 0.5;
  }

  private inferResourceType(url: string): 'route' | 'data' | 'asset' {
    if (url.includes('/api/') || url.endsWith('.json')) {
      return 'data';
    }

    if (
      url.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ico)(\?|$)/)
    ) {
      return 'asset';
    }

    return 'route';
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.pathname;
    } catch {
      return url;
    }
  }

  private getNavigationPatterns(): Map<string, number> {
    const patterns = new Map<string, number>();

    for (const [from, transitions] of this.transitionProbabilities.entries()) {
      for (const [to, prob] of transitions.entries()) {
        const key = `${from} -> ${to}`;
        patterns.set(key, prob);
      }
    }

    return patterns;
  }

  private calculateScrollDepth(): number {
    if (typeof window === 'undefined') return 0;

    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;

    return Math.min(1, (scrollTop + windowHeight) / documentHeight);
  }

  private calculateClickRate(): number {
    // Simplified click rate calculation
    const sessionMinutes = (Date.now() - this.sessionStartTime) / 60000;
    if (sessionMinutes < 1) return 0;

    return this.navigationHistory.filter(
      (n) => n.interactionType === 'click'
    ).length / sessionMinutes;
  }

  private getNetworkInfo(): NetworkInformation | null {
    const nav = navigator as Navigator & {
      connection?: NetworkInformation;
    };
    return nav.connection ?? null;
  }

  private deduplicateFactors(factors: PredictionFactor[]): PredictionFactor[] {
    const seen = new Set<string>();
    return factors.filter((f) => {
      const key = `${f.name}-${f.value.toFixed(2)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private emptyPrediction(): PredictionResult {
    return {
      candidates: [],
      confidence: 0,
      factors: [],
      timestamp: Date.now(),
    };
  }

  private notifyListeners(prediction: PredictionResult): void {
    this.listeners.forEach((callback) => callback(prediction));
  }

  private loadStoredPatterns(): void {
    try {
      const stored = sessionStorage.getItem('prefetch-patterns');
      if (stored) {
        const data = JSON.parse(stored);
        this.transitionProbabilities = new Map(
          Object.entries(data.transitions ?? {}).map(([k, v]) => [
            k,
            new Map(Object.entries(v as Record<string, number>)),
          ])
        );
      }
    } catch {
      // Ignore storage errors
    }
  }

  private persistPatterns(): void {
    try {
      const data = {
        transitions: Object.fromEntries(
          Array.from(this.transitionProbabilities.entries()).map(([k, v]) => [
            k,
            Object.fromEntries(v),
          ])
        ),
      };
      sessionStorage.setItem('prefetch-patterns', JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  private clearStoredPatterns(): void {
    try {
      sessionStorage.removeItem('prefetch-patterns');
    } catch {
      // Ignore storage errors
    }
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.info(`[IntelligentPrefetch] ${message}`, ...args);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let engineInstance: IntelligentPrefetchEngine | null = null;

/**
 * Get or create the global intelligent prefetch engine
 */
export function getIntelligentPrefetchEngine(
  config?: Partial<IntelligentPrefetchConfig>
): IntelligentPrefetchEngine {
  if (!engineInstance) {
    engineInstance = new IntelligentPrefetchEngine(config);
  }
  return engineInstance;
}

/**
 * Reset the engine instance
 */
export function resetIntelligentPrefetchEngine(): void {
  if (engineInstance) {
    engineInstance.reset();
    engineInstance = null;
  }
}
