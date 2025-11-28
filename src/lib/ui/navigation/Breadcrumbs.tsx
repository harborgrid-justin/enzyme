/**
 * @file Breadcrumbs Component
 * @description Auto-generated breadcrumbs based on route info
 */

import React, { useMemo, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { AppLink } from '../../routing/linking';

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

/**
 * Breadcrumbs props
 */
export interface BreadcrumbsProps {
  /** Custom breadcrumb items (overrides auto-generation) */
  items?: BreadcrumbItem[];
  
  /** Path to label mapping for auto-generation */
  pathLabels?: Record<string, string>;
  
  /** Home path */
  homePath?: string;
  
  /** Home label */
  homeLabel?: string;
  
  /** Home icon */
  homeIcon?: React.ReactNode;
  
  /** Separator element */
  separator?: React.ReactNode;
  
  /** Maximum items to show (collapses middle items) */
  maxItems?: number;
  
  /** Custom class name */
  className?: string;
}

/**
 * Default separator icon - memoized for performance
 */
const DefaultSeparator = memo(function DefaultSeparator(): React.ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="currentColor"
      style={{ color: '#9ca3af' }}
    >
      <path
        fillRule="evenodd"
        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
});

DefaultSeparator.displayName = 'DefaultSeparator';

/**
 * Default home icon - memoized for performance
 */
const DefaultHomeIcon = memo(function DefaultHomeIcon(): React.ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  );
});

DefaultHomeIcon.displayName = 'DefaultHomeIcon';

/**
 * Generate breadcrumb items from path
 */
function generateBreadcrumbs(
  pathname: string,
  pathLabels: Record<string, string>,
  homePath: string,
  homeLabel: string,
  homeIcon?: React.ReactNode
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [];
  
  // Add home
  items.push({
    label: homeLabel,
    path: homePath,
    icon: homeIcon,
  });
  
  // Split path and build breadcrumbs
  const segments = pathname.split('/').filter(Boolean);
  let currentPath = '';
  
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    
    // Check for custom label
    let label = pathLabels[currentPath] ?? pathLabels[segment];
    
    if (label === undefined || label === '') {
      // Convert segment to readable label
      // Handle dynamic segments like :id or [id]
      if (segment.startsWith(':') || segment.startsWith('[')) {
        label = segment.replace(/[:[\]]/g, '');
      } else {
        // Convert kebab-case or camelCase to Title Case
        label = segment
          .replace(/[-_]/g, ' ')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
    
    items.push({
      label,
      path: isLast ? undefined : currentPath,
    });
  });
  
  return items;
}

/**
 * Breadcrumbs component - memoized for performance
 */
export const Breadcrumbs = memo(function Breadcrumbs({
  items: customItems,
  pathLabels = {},
  homePath = '/',
  homeLabel = 'Home',
  homeIcon,
  separator,
  maxItems,
  className,
}: BreadcrumbsProps): React.ReactElement | null {
  const location = useLocation();
  
  // Generate or use custom items
  const items = useMemo(() => {
    if (customItems) {
      return customItems;
    }
    return generateBreadcrumbs(
      location.pathname,
      pathLabels,
      homePath,
      homeLabel,
      homeIcon || <DefaultHomeIcon />
    );
  }, [customItems, location.pathname, pathLabels, homePath, homeLabel, homeIcon]);
  
  // Collapse items if needed
  const displayItems = useMemo(() => {
    if (maxItems === undefined || maxItems === null || items.length <= maxItems) {
      return items;
    }
    
    const firstItems = items.slice(0, 1);
    const lastItems = items.slice(-(maxItems - 2));
    
    return [
      ...firstItems,
      { label: '...', path: undefined },
      ...lastItems,
    ];
  }, [items, maxItems]);
  
  // Don't render if only home
  if (items.length <= 1) {
    return null;
  }
  
  const separatorElement = separator ?? <DefaultSeparator />;
  
  return (
    <nav
      aria-label="Breadcrumb"
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        fontSize: '0.875rem',
      }}
    >
      <ol
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
      >
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          
          return (
            <li
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {index > 0 && (
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {separatorElement}
                </span>
              )}
              
              {item.path !== undefined && item.path !== '' && !isLast ? (
                <AppLink
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    color: '#6b7280',
                    textDecoration: 'none',
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </AppLink>
              ) : (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    color: isLast ? '#111827' : '#6b7280',
                    fontWeight: isLast ? '500' : '400',
                  }}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});
