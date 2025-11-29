/* eslint-disable react-refresh/only-export-components */
/* @refresh reset */
/**
 * @file Create Feature Page
 * @description Factory to generate standardized feature pages (auth + flags + vm + view)
 * Performance optimized: static styles extracted to module-level constants
 */

import React, { Suspense, useMemo, memo, useCallback, type CSSProperties } from 'react';
import { useAuth } from '../auth/useAuth';
import { useFeatureFlag } from '../flags/useFeatureFlag';
import { QueryErrorBoundary } from '../monitoring/QueryErrorBoundary';
import { Spinner } from '../ui/feedback/Spinner';
import type {
  CreateFeatureOptions,
  FeatureConfig,
  FeatureViewModel,
} from './types';
import { hasFeatureAccess } from './types';

// ============================================================================
// STATIC STYLES - Extracted outside components to prevent re-creation
// ============================================================================

// Loading component styles
const loadingContainerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '200px',
};

// Error component styles
const errorContainerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  textAlign: 'center',
};

const errorTitleStyle: CSSProperties = {
  color: '#dc2626',
  marginBottom: '1rem',
};

const errorMessageStyle: CSSProperties = {
  color: '#6b7280',
  marginBottom: '1rem',
};

const retryButtonStyle: CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '0.375rem',
  cursor: 'pointer',
};

// Access denied / Feature not available component styles
const statusContainerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  textAlign: 'center',
  minHeight: '300px',
};

const warningIconStyle: CSSProperties = {
  width: '4rem',
  height: '4rem',
  color: '#f59e0b',
  marginBottom: '1rem',
};

const grayIconStyle: CSSProperties = {
  width: '4rem',
  height: '4rem',
  color: '#6b7280',
  marginBottom: '1rem',
};

const statusTitleStyle: CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: '600',
  marginBottom: '0.5rem',
};

const statusDescriptionStyle: CSSProperties = {
  color: '#6b7280',
};

// Page header styles
const pageHeaderContainerStyle: CSSProperties = {
  marginBottom: '1.5rem',
};

const tabContainerStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  borderBottom: '1px solid #e5e7eb',
};

const tabBadgeStyle: CSSProperties = {
  marginLeft: '0.5rem',
  padding: '0.125rem 0.5rem',
  fontSize: '0.75rem',
  backgroundColor: '#e5e7eb',
  borderRadius: '9999px',
};

// ============================================================================
// DEFAULT COMPONENTS
// ============================================================================

/**
 * Default loading component - memoized
 */
const DefaultLoading = memo(() => {
  return (
    <div style={loadingContainerStyle}>
      <Spinner size="lg" />
    </div>
  );
});

DefaultLoading.displayName = 'DefaultLoading';

/**
 * Default error component - memoized
 */
const DefaultError = memo(({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) => {
  return (
    <div style={errorContainerStyle}>
      <h2 style={errorTitleStyle}>Failed to load</h2>
      <p style={errorMessageStyle}>{error.message}</p>
      <button onClick={retry} style={retryButtonStyle}>
        Try Again
      </button>
    </div>
  );
});

DefaultError.displayName = 'DefaultError';

/**
 * Access denied component - memoized
 */
const AccessDenied = memo(({ reason }: { reason: string }) => {
  return (
    <div style={statusContainerStyle}>
      <svg
        style={warningIconStyle}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <h2 style={statusTitleStyle}>Access Denied</h2>
      <p style={statusDescriptionStyle}>{reason}</p>
    </div>
  );
});

AccessDenied.displayName = 'AccessDenied';

/**
 * Feature not available component (feature flag disabled) - memoized
 */
const FeatureNotAvailable = memo(({ featureName }: { featureName: string }) => {
  return (
    <div style={statusContainerStyle}>
      <svg
        style={grayIconStyle}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
        />
      </svg>
      <h2 style={statusTitleStyle}>Feature Not Available</h2>
      <p style={statusDescriptionStyle}>
        {featureName} is currently not available.
      </p>
    </div>
  );
});

FeatureNotAvailable.displayName = 'FeatureNotAvailable';

/**
 * Page header component - memoized
 */
const PageHeader = memo(({
  config,
  activeTab,
  onTabChange,
}: {
  config: FeatureConfig;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}) => {
  const { metadata, tabs, showTitle = true } = config;

  // Memoize title style based on tabs presence
  const titleStyle = useMemo<CSSProperties>(() => ({
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: tabs?.length ? '1rem' : 0,
  }), [tabs?.length]);

  // Memoize tab button style generator
  const getTabButtonStyle = useCallback((tab: { id: string; disabled?: boolean }): CSSProperties => ({
    padding: '0.75rem 1rem',
    border: 'none',
    background: 'none',
    cursor: tab.disabled ? 'not-allowed' : 'pointer',
    opacity: tab.disabled ? 0.5 : 1,
    borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
    color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
    fontWeight: activeTab === tab.id ? '500' : '400',
  }), [activeTab]);

  // Stable tab click handler using data-* attributes
  const handleTabClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const {tabId} = event.currentTarget.dataset;
    if (tabId && onTabChange) {
      onTabChange(tabId);
    }
  }, [onTabChange]);

  return (
    <div style={pageHeaderContainerStyle}>
      {showTitle && (
        <h1 style={titleStyle}>
          {metadata.name}
        </h1>
      )}

      {tabs && tabs.length > 0 && (
        <div style={tabContainerStyle}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              onClick={handleTabClick}
              disabled={tab.disabled}
              style={getTabButtonStyle(tab)}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span style={tabBadgeStyle}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

PageHeader.displayName = 'PageHeader';

// ============================================================================
// FEATURE PAGE FACTORY
// ============================================================================

/**
 * Create a standardized feature page component
 */
export function createFeaturePage<
  TData = unknown,
  TViewModel extends FeatureViewModel<TData> = FeatureViewModel<TData>
>(
  options: CreateFeatureOptions<TData, TViewModel>
): React.FC {
  const {
    config,
    useViewModel,
    View,
    Loading = DefaultLoading,
    Error: ErrorComponent = DefaultError,
  } = options;

  /**
   * Inner feature content component
   */
  function FeatureContent() {
    const viewModel = useViewModel();

    if (viewModel.isLoading && !viewModel.data) {
      return <Loading />;
    }

    return (
      <>
        <PageHeader
          config={config}
          activeTab={viewModel.activeTab}
          onTabChange={viewModel.setActiveTab}
        />
        <View viewModel={viewModel} isLoading={viewModel.isLoading} />
      </>
    );
  }

  /**
   * Feature page component with guards
   */
  function FeaturePage() {
    const { roles, isAuthenticated } = useAuth();
    const featureFlagEnabled = useFeatureFlag(config.access.featureFlag ?? '');

    // Collect all enabled flags for access check
    const enabledFlags = useMemo(() => {
      const flags: string[] = [];
      if (config.access.featureFlag && featureFlagEnabled) {
        flags.push(config.access.featureFlag);
      }
      // In a real app, you'd check all required flags here
      return flags;
    }, [featureFlagEnabled]);

    // Check access
    const hasAccess = useMemo(() => {
      return hasFeatureAccess(config.access, roles, enabledFlags);
    }, [roles, enabledFlags]);

    // Check feature flag
    if (config.access.featureFlag && !featureFlagEnabled) {
      return <FeatureNotAvailable featureName={config.metadata.name} />;
    }

    // Check authentication
    if (config.access.requireAuth && !isAuthenticated) {
      return <AccessDenied reason="Please log in to access this feature." />;
    }

    // Check role-based access
    if (!hasAccess) {
      return (
        <AccessDenied reason="You don't have permission to access this feature." />
      );
    }

    return (
      <QueryErrorBoundary
        queryKey={config.metadata.id}
        fallback={({ error, retry }) => (
          <ErrorComponent
            error={error instanceof Error ? error : new Error(error?.message ?? 'Unknown error')}
            retry={retry}
          />
        )}
      >
        <Suspense fallback={config.loadingFallback ?? <Loading />}>
          <FeatureContent />
        </Suspense>
      </QueryErrorBoundary>
    );
  }

  // Set display name for debugging
  FeaturePage.displayName = `FeaturePage(${config.metadata.id})`;

  return FeaturePage;
}

/**
 * Create a feature page with lazy loading
 */
export function createLazyFeaturePage<
  TData = unknown,
  TViewModel extends FeatureViewModel<TData> = FeatureViewModel<TData>
>(
  optionsFactory: () => Promise<{ default: CreateFeatureOptions<TData, TViewModel> }>
): React.LazyExoticComponent<React.FC> {
  return React.lazy(async () => {
    const { default: options } = await optionsFactory();
    return { default: createFeaturePage(options) };
  });
}
