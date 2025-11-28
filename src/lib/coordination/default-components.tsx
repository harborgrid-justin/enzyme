/**
 * @file Provider Orchestrator Default Components
 * @module coordination/default-components
 * @description Default fallback components for provider orchestration.
 */

import type { FC } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Fallback loading component props.
 */
export interface LoadingFallbackProps {
  message?: string;
}

/**
 * Fallback error component props.
 */
export interface ErrorFallbackProps {
  error: Error;
  resetError?: () => void;
}

// ============================================================================
// Default Components
// ============================================================================

/**
 * Default loading fallback component.
 */
export const DefaultLoadingFallback: FC<LoadingFallbackProps> = ({ message }) => (
  <div
    role="status"
    aria-live="polite"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
    }}
  >
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e5e7eb',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px',
        }}
      />
      <p style={{ color: '#6b7280', margin: 0 }}>
        {message ?? 'Loading application...'}
      </p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);

DefaultLoadingFallback.displayName = 'DefaultLoadingFallback';

/**
 * Default error fallback component.
 */
export const DefaultErrorFallback: FC<ErrorFallbackProps> = ({ error, resetError }) => (
  <div
    role="alert"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#fef2f2',
    }}
  >
    <div style={{ maxWidth: '600px', padding: '32px' }}>
      <div
        style={{
          width: '48px',
          height: '48px',
          backgroundColor: '#ef4444',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
      <h2 style={{ color: '#991b1b', textAlign: 'center', marginBottom: '8px' }}>
        Application Error
      </h2>
      <p style={{ color: '#dc2626', textAlign: 'center', marginBottom: '16px' }}>
        {error.message}
      </p>
      {resetError && (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={resetError}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  </div>
);

DefaultErrorFallback.displayName = 'DefaultErrorFallback';
