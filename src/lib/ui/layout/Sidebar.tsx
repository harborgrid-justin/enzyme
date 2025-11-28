/**
 * @file Sidebar Layout Component
 * @description Reusable sidebar layout component
 * Performance optimized: static styles extracted, dynamic styles memoized
 */

import React, { type ReactNode, useState, useCallback, useMemo, memo, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, useRef } from 'react';

/**
 * Custom hook for keyboard navigation in sidebar menu
 * Handles ArrowUp, ArrowDown, Home, End keys for menu item navigation
 */
function useSidebarKeyboardNavigation(
  containerRef: React.RefObject<HTMLElement | null>,
  onToggleExpand?: (itemId: string) => void
): (event: ReactKeyboardEvent, item: SidebarItem) => void {
  return useCallback((event: ReactKeyboardEvent, item: SidebarItem) => {
    if (!containerRef.current) return;

    const menuItems = containerRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled])'
    );
    if (menuItems.length === 0) return;

    const currentIndex = Array.from(menuItems).findIndex(
      (menuItem) => menuItem === event.currentTarget
    );

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex < menuItems.length - 1) {
          menuItems[currentIndex + 1]?.focus();
        } else {
          menuItems[0]?.focus(); // Wrap to start
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex <= 0) {
          menuItems[menuItems.length - 1]?.focus(); // Wrap to end
        } else {
          menuItems[currentIndex - 1]?.focus();
        }
        break;
      case 'Home':
        event.preventDefault();
        menuItems[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        menuItems[menuItems.length - 1]?.focus();
        break;
      case 'ArrowRight':
        // Expand item with children
        if (item.items && item.items.length > 0) {
          event.preventDefault();
          onToggleExpand?.(item.id);
        }
        break;
      case 'ArrowLeft':
        // Collapse item with children
        if (item.items && item.items.length > 0) {
          event.preventDefault();
          onToggleExpand?.(item.id);
        }
        break;
    }
  }, [containerRef, onToggleExpand]);
}

/**
 * Sidebar item definition
 */
export interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  items?: SidebarItem[];
  badge?: string | number;
  disabled?: boolean;
}

/**
 * Sidebar props
 */
export interface SidebarProps {
  /** Sidebar items */
  items: SidebarItem[];

  /** Currently active item ID */
  activeId?: string;

  /** Item click handler */
  onItemClick?: (item: SidebarItem) => void;

  /** Header content */
  header?: ReactNode;

  /** Footer content */
  footer?: ReactNode;

  /** Whether sidebar is collapsed */
  collapsed?: boolean;

  /** Collapse toggle handler */
  onCollapsedChange?: (collapsed: boolean) => void;

  /** Width when expanded */
  width?: number;

  /** Width when collapsed */
  collapsedWidth?: number;
}

// ============================================================================
// STATIC STYLES - Extracted outside component to prevent re-creation
// ============================================================================

const baseSidebarStyle: CSSProperties = {
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#1f2937',
  color: '#f3f4f6',
  transition: 'width 0.2s ease-in-out',
  overflow: 'hidden',
};

const navStyle: CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '0.5rem',
};

const collapseButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.75rem',
  border: 'none',
  backgroundColor: 'transparent',
  color: '#9ca3af',
  cursor: 'pointer',
  borderTop: '1px solid #374151',
};

const iconContainerStyle: CSSProperties = {
  flexShrink: 0,
};

const labelContainerStyle: CSSProperties = {
  flex: 1,
};

const badgeStyle: CSSProperties = {
  padding: '0.125rem 0.5rem',
  fontSize: '0.75rem',
  backgroundColor: '#4b5563',
  borderRadius: '9999px',
};

const nestedContainerStyle: CSSProperties = {
  marginTop: '0.25rem',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Props for SidebarNavItem component
 */
interface SidebarNavItemProps {
  item: SidebarItem;
  isActive: boolean;
  isExpanded: boolean;
  collapsed: boolean;
  onItemClick: (item: SidebarItem) => void;
  onKeyDown?: (event: ReactKeyboardEvent, item: SidebarItem) => void;
  activeId?: string;
  depth?: number;
}

/**
 * Sidebar navigation item - memoized for performance
 */
const SidebarNavItem = memo(function SidebarNavItem({
  item,
  isActive,
  isExpanded,
  collapsed,
  onItemClick,
  onKeyDown,
  activeId,
  depth = 0,
}: SidebarNavItemProps): React.ReactElement {
  const hasChildren = item.items !== undefined && item.items.length > 0;

  // Memoize button style based on state
  const buttonStyle = useMemo((): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
    padding: collapsed ? '0.75rem' : '0.75rem 1rem',
    paddingLeft: collapsed ? undefined : `${1 + depth * 0.75}rem`,
    border: 'none',
    backgroundColor: isActive ? '#374151' : 'transparent',
    color: isActive ? '#f9fafb' : '#d1d5db',
    cursor: item.disabled ? 'not-allowed' : 'pointer',
    opacity: item.disabled ? 0.5 : 1,
    borderRadius: '0.375rem',
    textAlign: 'left',
    fontSize: '0.875rem',
    justifyContent: collapsed ? 'center' : 'flex-start',
  }), [collapsed, depth, isActive, item.disabled]);

  // Memoize chevron style
  const chevronStyle = useMemo((): CSSProperties => ({
    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s',
  }), [isExpanded]);

  // Memoize click handler
  const handleClick = useCallback(() => {
    onItemClick(item);
  }, [onItemClick, item]);

  // Memoize keyboard handler
  const handleKeyDown = useCallback((event: ReactKeyboardEvent) => {
    onKeyDown?.(event, item);
  }, [onKeyDown, item]);

  return (
    <div>
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={item.disabled === true}
        aria-label={collapsed ? item.label : undefined}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-current={isActive ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
        style={buttonStyle}
      >
        {item.icon !== undefined && (
          <span style={iconContainerStyle} aria-hidden={!collapsed ? 'true' : undefined}>{item.icon}</span>
        )}

        {!collapsed && (
          <>
            <span style={labelContainerStyle}>{item.label}</span>

            {item.badge !== undefined && (
              <span style={badgeStyle} aria-label={`${item.badge} items`}>
                {item.badge}
              </span>
            )}

            {hasChildren && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                style={chevronStyle}
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </>
        )}
      </button>

      {/* Nested items */}
      {hasChildren && isExpanded && !collapsed && item.items !== undefined && (
        <div role="group" aria-label={`${item.label} submenu`} style={nestedContainerStyle}>
          {item.items.map((child) => (
            <SidebarNavItem
              key={child.id}
              item={child}
              isActive={activeId === child.id}
              isExpanded={false}
              collapsed={collapsed}
              onItemClick={onItemClick}
              onKeyDown={onKeyDown}
              activeId={activeId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
});

SidebarNavItem.displayName = 'SidebarNavItem';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Sidebar component - memoized for performance
 */
export const Sidebar = memo(function Sidebar({
  items,
  activeId,
  onItemClick,
  header,
  footer,
  collapsed = false,
  onCollapsedChange,
  width = 256,
  collapsedWidth = 64,
}: SidebarProps): React.ReactElement {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const navRef = useRef<HTMLElement>(null);

  // Memoize toggle handler
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // Keyboard navigation handler for sidebar menu items
  const handleKeyDown = useSidebarKeyboardNavigation(navRef, toggleGroup);

  // Memoize item click handler
  const handleItemClick = useCallback(
    (item: SidebarItem) => {
      if (item.items !== undefined && item.items.length > 0) {
        toggleGroup(item.id);
      } else {
        item.onClick?.();
        onItemClick?.(item);
      }
    },
    [onItemClick, toggleGroup]
  );

  // Memoize collapse toggle handler
  const handleCollapseToggle = useCallback(() => {
    onCollapsedChange?.(!collapsed);
  }, [onCollapsedChange, collapsed]);

  // Memoize current width
  const currentWidth = useMemo(() => collapsed ? collapsedWidth : width, [collapsed, collapsedWidth, width]);

  // Memoize sidebar style with dynamic width
  const sidebarStyle = useMemo((): CSSProperties => ({
    ...baseSidebarStyle,
    width: currentWidth,
    minWidth: currentWidth,
  }), [currentWidth]);

  // Memoize header padding style
  const headerStyle = useMemo((): CSSProperties => ({
    padding: collapsed ? '1rem 0.5rem' : '1rem',
    borderBottom: '1px solid #374151',
  }), [collapsed]);

  // Memoize footer padding style
  const footerStyle = useMemo((): CSSProperties => ({
    padding: collapsed ? '1rem 0.5rem' : '1rem',
    borderTop: '1px solid #374151',
  }), [collapsed]);

  // Memoize collapse icon style
  const collapseIconStyle = useMemo((): CSSProperties => ({
    transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s',
  }), [collapsed]);

  return (
    <aside style={sidebarStyle}>
      {/* Header */}
      {header !== undefined && (
        <div style={headerStyle}>
          {header}
        </div>
      )}

      {/* Navigation */}
      <nav ref={navRef} aria-label="Main navigation" style={navStyle}>
        {items.map((item) => (
          <SidebarNavItem
            key={item.id}
            item={item}
            isActive={activeId === item.id}
            isExpanded={expandedGroups.has(item.id)}
            collapsed={collapsed}
            onItemClick={handleItemClick}
            onKeyDown={handleKeyDown}
            activeId={activeId}
          />
        ))}
      </nav>

      {/* Collapse toggle */}
      {onCollapsedChange !== undefined && (
        <button
          onClick={handleCollapseToggle}
          style={collapseButtonStyle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            style={collapseIconStyle}
          >
            <path
              fillRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}

      {/* Footer */}
      {footer !== undefined && (
        <div style={footerStyle}>
          {footer}
        </div>
      )}
    </aside>
  );
});
