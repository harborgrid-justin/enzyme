/**
 * @file Analytics Hooks
 * @description React hooks for analytics tracking with automatic page views,
 * event tracking, and consent management
 */

import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import type React from 'react';
import {
  analytics,
  trackEvent,
  trackPageView,
  trackFeature,
  trackPerformance,
  type AnalyticsEventType,
  type UserProperties,
  type ConsentCategories,
} from '../utils/analytics';

/**
 * Hook to track page views automatically
 */
export function usePageView(
  pageName?: string,
  properties?: Record<string, unknown>
): void {
  const tracked = useRef(false);
  // Memoize properties to avoid unnecessary effect re-runs if caller passes unstable object
  // Use JSON.stringify for deep comparison since properties is an object
  const stableProperties = useMemo(
    () => properties,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(properties)]
  );

  useEffect(() => {
    // Only track once per mount
    if (tracked.current) return;
    tracked.current = true;

    trackPageView(pageName, stableProperties);
  }, [pageName, stableProperties]);
}

/**
 * Hook to get event tracking function
 */
export function useTrackEvent(): (
  name: string,
  properties?: Record<string, unknown>,
  type?: AnalyticsEventType
) => void {
  return useCallback(
    (name: string, properties?: Record<string, unknown>, type?: AnalyticsEventType) => {
      trackEvent(name, properties, type);
    },
    []
  );
}

/**
 * Hook to track feature usage
 */
export function useTrackFeature(featureName: string): {
  trackAction: (action: string, context?: Record<string, unknown>) => void;
  trackView: (context?: Record<string, unknown>) => void;
  trackInteraction: (element: string, context?: Record<string, unknown>) => void;
} {
  const trackAction = useCallback(
    (action: string, context?: Record<string, unknown>) => {
      trackFeature(featureName, action, context);
    },
    [featureName]
  );

  const trackView = useCallback(
    (context?: Record<string, unknown>) => {
      trackFeature(featureName, 'view', context);
    },
    [featureName]
  );

  const trackInteraction = useCallback(
    (element: string, context?: Record<string, unknown>) => {
      trackFeature(featureName, `interact:${element}`, context);
    },
    [featureName]
  );

  return { trackAction, trackView, trackInteraction };
}

/**
 * Hook to track component render performance
 *
 * @param componentName - Name of the component to track
 */
export function useTrackRenderPerformance(componentName: string): void {
  // Initialize with a function to avoid calling performance.now during render
  const renderStart = useRef<number | null>(null);
  const renderCount = useRef(0);
  const componentNameRef = useRef(componentName);

  // Keep component name ref updated
  // eslint-disable-next-line react-hooks/refs
  componentNameRef.current = componentName;

  // Intentionally runs on every render to measure render performance
  useEffect(() => {
    // Initialize renderStart on first effect run
    if (renderStart.current === null) {
      renderStart.current = performance.now();
      return;
    }

    const renderTime = performance.now() - renderStart.current;
    renderCount.current++;

    // Track slow renders (> 16ms = 60fps threshold)
    if (renderTime > 16) {
      trackPerformance(`render:${componentNameRef.current}`, renderTime, {
        renderCount: renderCount.current,
        slow: true,
      });
    }

    // Reset for next render
    renderStart.current = performance.now();
  }); // No dependency array - intentionally runs on every render to track render performance
}

/**
 * Hook to track interaction timing
 */
export function useTrackInteractionTiming(
  interactionName: string
): {
  startTiming: () => void;
  endTiming: (context?: Record<string, unknown>) => void;
  cancelTiming: () => void;
} {
  const startTime = useRef<number | null>(null);

  const startTiming = useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const endTiming = useCallback(
    (context?: Record<string, unknown>) => {
      if (startTime.current === null) return;

      const duration = performance.now() - startTime.current;
      trackPerformance(`interaction:${interactionName}`, duration, context);
      startTime.current = null;
    },
    [interactionName]
  );

  const cancelTiming = useCallback(() => {
    startTime.current = null;
  }, []);

  return { startTiming, endTiming, cancelTiming };
}

/**
 * Hook to track form analytics
 */
export function useTrackForm(formName: string): {
  trackFieldFocus: (fieldName: string) => void;
  trackFieldBlur: (fieldName: string, hasValue: boolean) => void;
  trackFieldError: (fieldName: string, error: string) => void;
  trackSubmitAttempt: () => void;
  trackSubmitSuccess: (context?: Record<string, unknown>) => void;
  trackSubmitError: (error: string) => void;
  trackAbandonment: () => void;
} {
  const formStartTime = useRef<number | null>(null);
  const focusedFields = useRef<Set<string>>(new Set());

  useEffect(() => {
    formStartTime.current = Date.now();
    // Capture refs for cleanup
    const fieldsRef = focusedFields;
    const timeRef = formStartTime;
    return () => {
      // Track abandonment if form was started but not submitted
      const fieldsCount = fieldsRef.current.size;
      const startTime = timeRef.current;
      if (fieldsCount > 0) {
        trackEvent(`form:${formName}:abandoned`, {
          fieldsInteracted: fieldsCount,
          timeSpent: Date.now() - (startTime ?? Date.now()),
        });
      }
    };
  }, [formName]);

  const trackFieldFocus = useCallback(
    (fieldName: string) => {
      focusedFields.current.add(fieldName);
      trackEvent(`form:${formName}:field_focus`, { field: fieldName });
    },
    [formName]
  );

  const trackFieldBlur = useCallback(
    (fieldName: string, hasValue: boolean) => {
      trackEvent(`form:${formName}:field_blur`, { field: fieldName, hasValue });
    },
    [formName]
  );

  const trackFieldError = useCallback(
    (fieldName: string, error: string) => {
      trackEvent(`form:${formName}:field_error`, { field: fieldName, error });
    },
    [formName]
  );

  const trackSubmitAttempt = useCallback(() => {
    trackEvent(`form:${formName}:submit_attempt`, {
      fieldsInteracted: focusedFields.current.size,
      timeSpent: Date.now() - (formStartTime.current ?? Date.now()),
    });
  }, [formName]);

  const trackSubmitSuccess = useCallback(
    (context?: Record<string, unknown>) => {
      focusedFields.current.clear(); // Clear to prevent abandonment tracking
      trackEvent(`form:${formName}:submit_success`, {
        timeSpent: Date.now() - (formStartTime.current ?? Date.now()),
        ...context,
      });
    },
    [formName]
  );

  const trackSubmitError = useCallback(
    (error: string) => {
      trackEvent(`form:${formName}:submit_error`, { error });
    },
    [formName]
  );

  const trackAbandonment = useCallback(() => {
    trackEvent(`form:${formName}:abandoned`, {
      fieldsInteracted: focusedFields.current.size,
      timeSpent: Date.now() - (formStartTime.current ?? Date.now()),
    });
    focusedFields.current.clear();
  }, [formName]);

  return {
    trackFieldFocus,
    trackFieldBlur,
    trackFieldError,
    trackSubmitAttempt,
    trackSubmitSuccess,
    trackSubmitError,
    trackAbandonment,
  };
}

/**
 * Hook for click tracking
 */
export function useTrackClick(
  eventName: string,
  properties?: Record<string, unknown>
): (event?: React.MouseEvent) => void {
  return useCallback(
    (event?: React.MouseEvent) => {
      trackEvent(eventName, {
        ...properties,
        element: event?.currentTarget?.tagName?.toLowerCase(),
        coordinates: event
          ? { x: event.clientX, y: event.clientY }
          : undefined,
      }, 'click');
    },
    [eventName, properties]
  );
}

/**
 * Hook to manage analytics consent
 */
export function useAnalyticsConsent(): {
  consent: ConsentCategories;
  setConsent: (consent: Partial<ConsentCategories>) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  hasConsented: boolean;
} {
  const consent = useMemo(() => analytics.getConsent(), []);

  const setConsent = useCallback((newConsent: Partial<ConsentCategories>) => {
    analytics.setConsent(newConsent);
  }, []);

  const acceptAll = useCallback(() => {
    analytics.setConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    });
  }, []);

  const rejectAll = useCallback(() => {
    analytics.setConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    });
  }, []);

  const hasConsented = consent.analytics || consent.marketing;

  return { consent, setConsent, acceptAll, rejectAll, hasConsented };
}

/**
 * Hook to identify user for analytics
 */
export function useAnalyticsIdentify(): (
  userId: string,
  properties?: UserProperties
) => void {
  return useCallback((userId: string, properties?: UserProperties) => {
    analytics.identify(userId, properties);
  }, []);
}

/**
 * Hook to reset analytics (for logout)
 */
export function useAnalyticsReset(): () => void {
  return useCallback(() => {
    analytics.reset();
  }, []);
}

/**
 * Hook to track search queries
 */
export function useTrackSearch(searchContext: string): {
  trackSearch: (query: string, resultsCount: number) => void;
  trackSearchClick: (query: string, resultIndex: number, resultId: string) => void;
  trackNoResults: (query: string) => void;
} {
  const trackSearch = useCallback(
    (query: string, resultsCount: number) => {
      trackEvent(`search:${searchContext}`, {
        query: query.substring(0, 100), // Truncate for privacy
        queryLength: query.length,
        resultsCount,
      }, 'search');
    },
    [searchContext]
  );

  const trackSearchClick = useCallback(
    (query: string, resultIndex: number, resultId: string) => {
      trackEvent(`search:${searchContext}:click`, {
        queryLength: query.length,
        resultIndex,
        resultId,
      }, 'click');
    },
    [searchContext]
  );

  const trackNoResults = useCallback(
    (query: string) => {
      trackEvent(`search:${searchContext}:no_results`, {
        queryLength: query.length,
        queryPreview: query.substring(0, 20),
      }, 'search');
    },
    [searchContext]
  );

  return { trackSearch, trackSearchClick, trackNoResults };
}

/**
 * Hook to track scroll depth
 */
export function useTrackScrollDepth(pageName: string): void {
  const trackedDepths = useRef<Set<number>>(new Set());

  useEffect(() => {
    const milestones = [25, 50, 75, 100];

    const handleScroll = (): void => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollTop = window.scrollY;
      const scrollPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

      for (const milestone of milestones) {
        if (scrollPercent >= milestone && !trackedDepths.current.has(milestone)) {
          trackedDepths.current.add(milestone);
          trackEvent(`scroll:${pageName}`, {
            depth: milestone,
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pageName]);
}

// Default intervals for time on page tracking - stable reference
const DEFAULT_TIME_INTERVALS = [30, 60, 120, 300];

/**
 * Hook to track time on page
 */
export function useTrackTimeOnPage(pageName: string, intervals: number[] = DEFAULT_TIME_INTERVALS): void {
  const trackedIntervals = useRef<Set<number>>(new Set());
  // Memoize intervals to avoid effect re-runs if caller passes unstable reference
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableIntervals = useMemo(() => intervals, [JSON.stringify(intervals)]);

  useEffect(() => {
    const startTime = Date.now();

    const checkInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;

      for (const interval of stableIntervals) {
        if (elapsed >= interval && !trackedIntervals.current.has(interval)) {
          trackedIntervals.current.add(interval);
          trackEvent(`time_on_page:${pageName}`, {
            seconds: interval,
          });
        }
      }
    }, 5000);

    return () => {
      clearInterval(checkInterval);

      // Track final time on unmount
      const finalTime = (Date.now() - startTime) / 1000;
      trackEvent(`time_on_page:${pageName}:exit`, {
        seconds: Math.round(finalTime),
      });
    };
  }, [pageName, stableIntervals]);
}

/**
 * Hook to create a tracked section
 */
export function useTrackedSection(sectionName: string): {
  sectionRef: React.RefObject<HTMLElement | null>;
  isVisible: boolean;
  viewDuration: number;
} {
  const sectionRef = useRef<HTMLElement>(null);
  const isVisible = useRef(false);
  const viewStart = useRef<number | null>(null);
  const totalDuration = useRef(0);
  const [viewDuration, setViewDuration] = useState(0);

  useEffect(() => {
    if (sectionRef.current === null || sectionRef.current === undefined) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry === undefined || entry === null) return;

        if (entry.isIntersecting && !isVisible.current) {
          isVisible.current = true;
          viewStart.current = Date.now();

          trackEvent(`section:${sectionName}:enter`);
        } else if (!entry.isIntersecting && isVisible.current) {
          isVisible.current = false;

          if (viewStart.current !== null && viewStart.current !== undefined) {
            const duration = Date.now() - viewStart.current;
            totalDuration.current += duration;
            setViewDuration(totalDuration.current);

            trackEvent(`section:${sectionName}:exit`, {
              viewDuration: duration,
              totalDuration: totalDuration.current,
            });
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(sectionRef.current);

    return () => {
      observer.disconnect();

      // Track final duration on unmount
      if (isVisible.current && viewStart.current !== null && viewStart.current !== undefined) {
        const duration = Date.now() - viewStart.current;
        trackEvent(`section:${sectionName}:unmount`, {
          viewDuration: duration,
          totalDuration: totalDuration.current + duration,
        });
      }
    };
  }, [sectionName]);

  return {
    sectionRef,
    // eslint-disable-next-line react-hooks/refs
    isVisible: isVisible.current,
    viewDuration,
  };
}

