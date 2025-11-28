/**
 * @file Page Layout Component
 * @description Standard page wrapper (title, metadata, padding)
 * Uses theme tokens for consistent styling
 */

import React, { type ReactNode, useEffect, memo, useMemo, type CSSProperties } from 'react';
import { colorTokens, tokens } from '../../theme/tokens';

/**
 * Page component props
 */
export interface PageProps {
  /** Page title (shown in browser tab and header) */
  title?: string;
  
  /** Page description for metadata */
  description?: string;
  
  /** Page content */
  children: ReactNode;
  
  /** Additional CSS class */
  className?: string;
  
  /** Custom page styles */
  style?: React.CSSProperties;
  
  /** Whether to show the title in page */
  showTitle?: boolean;
  
  /** Header actions (buttons, etc.) */
  actions?: ReactNode;
  
  /** Max width constraint */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Back button handler */
  onBack?: () => void;
}

/**
 * Max width values
 */
const maxWidthMap = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  full: '100%',
};

/**
 * Padding values
 */
const paddingMap = {
  none: '0',
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
};

// ============================================================================
// STATIC STYLES - Extracted outside component to prevent re-creation
// ============================================================================

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '1.5rem',
};

const headerLeftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
};

const backButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '2rem',
  height: '2rem',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  borderRadius: tokens.radius.md,
  color: colorTokens.text.secondary,
};

const titleStyle: CSSProperties = {
  fontSize: tokens.fontSize['2xl'],
  fontWeight: tokens.fontWeight.semibold,
  margin: 0,
  color: colorTokens.text.primary,
};

const actionsContainerStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
};

/**
 * Page component - memoized for performance
 */
export const Page = memo(function Page({
  title,
  description,
  children,
  className = '',
  style,
  showTitle = true,
  actions,
  maxWidth = 'xl',
  padding = 'md',
  isLoading = false,
  onBack,
}: PageProps): React.ReactElement {
  // Update document title
  useEffect(() => {
    if (title !== undefined && title !== '') {
      const baseTitle = 'App'; // Could come from config
      document.title = `${title} | ${baseTitle}`;
    }
  }, [title]);

  // Update meta description
  useEffect(() => {
    if (description !== undefined && description !== '') {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', description);
      }
    }
  }, [description]);

  // Memoize container style
  const containerStyle = useMemo<CSSProperties>(() => ({
    maxWidth: maxWidthMap[maxWidth],
    margin: '0 auto',
    padding: paddingMap[padding],
    opacity: isLoading ? 0.7 : 1,
    transition: 'opacity 0.2s',
    ...style,
  }), [maxWidth, padding, isLoading, style]);

  return (
    <div className={className} style={containerStyle}>
      {/* Page Header */}
      {(showTitle === true && title !== undefined && title !== '') || actions !== undefined || onBack !== undefined ? (
        <header style={headerStyle}>
          <div style={headerLeftStyle}>
            {onBack !== undefined && (
              <button
                onClick={onBack}
                style={backButtonStyle}
                aria-label="Go back"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}

            {showTitle === true && title !== undefined && title !== '' && (
              <h1 style={titleStyle}>
                {title}
              </h1>
            )}
          </div>

          {actions !== undefined && (
            <div style={actionsContainerStyle}>
              {actions}
            </div>
          )}
        </header>
      ) : null}

      {/* Page Content */}
      <main>{children}</main>
    </div>
  );
});

Page.displayName = 'Page';
