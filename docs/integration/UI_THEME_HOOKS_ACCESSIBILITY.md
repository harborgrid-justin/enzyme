# UI + Theme + Hooks + Accessibility Integration Guide

> **Harbor React Framework** - Comprehensive integration patterns for UI components, theming, custom hooks, and WCAG 2.1 AA accessibility compliance.

## Table of Contents
- [Provider Composition](#provider-composition)
- [Theme-Aware Components](#theme-aware-components)
- [Accessible Data Tables](#accessible-data-tables)
- [Keyboard Navigation](#keyboard-navigation)
- [Focus Management](#focus-management)
- [Motion & Animation](#motion--animation)
- [Forms & Validation](#forms--validation)
- [WCAG 2.1 AA Checklist](#wcag-21-aa-checklist)

---

## Provider Composition

### Theme + Accessibility Stack

```
┌────────────────────────────────────────────────────────────┐
│  ThemeProvider (CSS variables, dark/light mode)            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AccessibilityProvider (preferences, announcements)  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  FocusManager (focus trap, restoration)        │  │  │
│  │  │  ┌──────────────────────────────────────────┐  │  │  │
│  │  │  │  App Components                          │  │  │  │
│  │  │  └──────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

#### Example 1: Complete Provider Setup

```tsx
// app/providers.tsx
import { ThemeProvider } from '@/lib/theme';
import { AccessibilityProvider, FocusManager } from '@/lib/ui';

export function UIProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      defaultTheme="system"
      storageKey="harbor-theme"
      enableSystem
    >
      <AccessibilityProvider
        announceRouteChanges
        reducedMotionDefault="system"
      >
        <FocusManager restoreFocus>
          {children}
        </FocusManager>
      </AccessibilityProvider>
    </ThemeProvider>
  );
}
```

---

## Theme-Aware Components

### Example 2: Theme-Responsive Component

```tsx
import { useTheme } from '@/lib/theme';
import { useIsMounted } from '@/lib/hooks';

export function ThemeAwareCard({
  children,
  variant = 'default'
}: {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
}) {
  const { theme, resolvedTheme } = useTheme();
  const isMounted = useIsMounted();

  // Prevent hydration mismatch
  if (!isMounted) {
    return <div className="card card--skeleton">{children}</div>;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <div
      className={`card card--${variant}`}
      style={{
        backgroundColor: isDark ? 'var(--color-surface-dark)' : 'var(--color-surface)',
        boxShadow: variant === 'elevated'
          ? isDark
            ? 'var(--shadow-elevated-dark)'
            : 'var(--shadow-elevated)'
          : undefined
      }}
    >
      {children}
    </div>
  );
}
```

### Example 3: Theme Toggle with Accessibility

```tsx
import { useTheme } from '@/lib/theme';
import { useId } from 'react';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const id = useId();

  const themes = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'system', label: 'System', icon: '💻' }
  ];

  return (
    <fieldset className="theme-toggle" role="radiogroup" aria-labelledby={`${id}-label`}>
      <legend id={`${id}-label`} className="sr-only">
        Choose color theme
      </legend>

      {themes.map(({ value, label, icon }) => (
        <label
          key={value}
          className={`theme-option ${theme === value ? 'theme-option--active' : ''}`}
        >
          <input
            type="radio"
            name="theme"
            value={value}
            checked={theme === value}
            onChange={() => setTheme(value as 'light' | 'dark' | 'system')}
            className="sr-only"
          />
          <span aria-hidden="true">{icon}</span>
          <span className="sr-only">{label}</span>
        </label>
      ))}

      <div aria-live="polite" className="sr-only">
        Current theme: {resolvedTheme}
      </div>
    </fieldset>
  );
}
```

### Example 4: Design Tokens with Theme

```tsx
import { useTheme } from '@/lib/theme';
import { useMemo } from 'react';

// Type-safe design tokens
interface DesignTokens {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    error: string;
    success: string;
  };
  spacing: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string>;
  typography: {
    fontFamily: string;
    fontSize: Record<'sm' | 'base' | 'lg' | 'xl' | '2xl', string>;
  };
}

export function useDesignTokens(): DesignTokens {
  const { resolvedTheme } = useTheme();

  return useMemo(() => ({
    colors: {
      primary: resolvedTheme === 'dark' ? '#60a5fa' : '#2563eb',
      secondary: resolvedTheme === 'dark' ? '#a78bfa' : '#7c3aed',
      background: resolvedTheme === 'dark' ? '#0f172a' : '#ffffff',
      surface: resolvedTheme === 'dark' ? '#1e293b' : '#f8fafc',
      text: resolvedTheme === 'dark' ? '#f1f5f9' : '#0f172a',
      textMuted: resolvedTheme === 'dark' ? '#94a3b8' : '#64748b',
      border: resolvedTheme === 'dark' ? '#334155' : '#e2e8f0',
      error: '#ef4444',
      success: '#22c55e'
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem'
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: {
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem'
      }
    }
  }), [resolvedTheme]);
}
```

---

## Accessible Data Tables

### Example 5: Fully Accessible DataTable

```tsx
import { DataTable } from '@/lib/ui/data/DataTable';
import { useTheme } from '@/lib/theme';
import { useId, useState, useCallback } from 'react';

interface Column<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

export function AccessibleDataTable<T extends { id: string }>({
  data,
  columns,
  caption,
  onRowSelect
}: {
  data: T[];
  columns: Column<T>[];
  caption: string;
  onRowSelect?: (row: T) => void;
}) {
  const id = useId();
  const { resolvedTheme } = useTheme();
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [focusedRow, setFocusedRow] = useState<number>(-1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowIndex: number, row: T) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedRow(Math.min(rowIndex + 1, data.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedRow(Math.max(rowIndex - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onRowSelect?.(row);
        break;
      case 'Home':
        e.preventDefault();
        setFocusedRow(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedRow(data.length - 1);
        break;
    }
  }, [data.length, onRowSelect]);

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [data, sortColumn, sortDirection]);

  return (
    <div className="table-container" role="region" aria-labelledby={`${id}-caption`}>
      <table
        className={`data-table data-table--${resolvedTheme}`}
        aria-describedby={`${id}-caption`}
      >
        <caption id={`${id}-caption`} className="sr-only">
          {caption}. Use arrow keys to navigate rows.
        </caption>

        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                scope="col"
                aria-sort={
                  sortColumn === col.key
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className="sort-button"
                    aria-label={`Sort by ${col.header}`}
                  >
                    {col.header}
                    <span aria-hidden="true" className="sort-indicator">
                      {sortColumn === col.key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sortedData.map((row, rowIndex) => (
            <tr
              key={row.id}
              tabIndex={focusedRow === rowIndex ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(e, rowIndex, row)}
              onFocus={() => setFocusedRow(rowIndex)}
              onClick={() => onRowSelect?.(row)}
              className={selectedRows.has(row.id) ? 'row--selected' : ''}
              aria-selected={selectedRows.has(row.id)}
              role="row"
            >
              {columns.map((col) => (
                <td key={String(col.key)} role="cell">
                  {col.render ? col.render(row[col.key], row) : String(row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div aria-live="polite" className="sr-only">
        {sortColumn && `Sorted by ${String(sortColumn)}, ${sortDirection}ending`}
      </div>
    </div>
  );
}
```

### Example 6: Table with Expandable Rows

```tsx
import { useState, useId } from 'react';

export function ExpandableTable<T extends { id: string }>({
  data,
  columns,
  renderExpanded
}: {
  data: T[];
  columns: Column<T>[];
  renderExpanded: (row: T) => React.ReactNode;
}) {
  const id = useId();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  return (
    <table aria-label="Expandable data table">
      <thead>
        <tr>
          <th scope="col" className="sr-only">Expand</th>
          {columns.map((col) => (
            <th key={String(col.key)} scope="col">{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => {
          const isExpanded = expandedRows.has(row.id);
          const rowId = `${id}-row-${row.id}`;
          const detailsId = `${id}-details-${row.id}`;

          return (
            <Fragment key={row.id}>
              <tr aria-expanded={isExpanded} aria-controls={detailsId}>
                <td>
                  <button
                    type="button"
                    onClick={() => toggleRow(row.id)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                    className="expand-button"
                  >
                    <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
                  </button>
                </td>
                {columns.map((col) => (
                  <td key={String(col.key)}>{String(row[col.key])}</td>
                ))}
              </tr>
              {isExpanded && (
                <tr id={detailsId} className="expanded-content">
                  <td colSpan={columns.length + 1}>
                    {renderExpanded(row)}
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
```

---

## Keyboard Navigation

### Example 7: Keyboard-Navigable Menu

```tsx
import { useState, useRef, useCallback, useEffect } from 'react';
import { useTheme } from '@/lib/theme';

interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function AccessibleMenu({
  items,
  trigger,
  label
}: {
  items: MenuItem[];
  trigger: React.ReactNode;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const menuRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { resolvedTheme } = useTheme();

  const enabledItems = items.filter((item) => !item.disabled);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setActiveIndex(0);
        } else {
          setActiveIndex((i) => (i + 1) % enabledItems.length);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setActiveIndex((i) => (i - 1 + enabledItems.length) % enabledItems.length);
        }
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && activeIndex >= 0) {
          enabledItems[activeIndex].onClick?.();
          setIsOpen(false);
          triggerRef.current?.focus();
        } else {
          setIsOpen(true);
          setActiveIndex(0);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        triggerRef.current?.focus();
        break;

      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;

      case 'End':
        e.preventDefault();
        setActiveIndex(enabledItems.length - 1);
        break;

      case 'Tab':
        setIsOpen(false);
        break;
    }
  }, [isOpen, activeIndex, enabledItems]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) &&
          !triggerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isOpen]);

  return (
    <div className="menu-container" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={label}
        onClick={() => setIsOpen(!isOpen)}
        className={`menu-trigger menu-trigger--${resolvedTheme}`}
      >
        {trigger}
      </button>

      {isOpen && (
        <ul
          ref={menuRef}
          role="menu"
          aria-label={label}
          className={`menu-list menu-list--${resolvedTheme}`}
        >
          {items.map((item, index) => (
            <li
              key={item.id}
              role="menuitem"
              aria-disabled={item.disabled}
              tabIndex={activeIndex === index ? 0 : -1}
              className={`menu-item ${activeIndex === index ? 'menu-item--active' : ''} ${item.disabled ? 'menu-item--disabled' : ''}`}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick?.();
                  setIsOpen(false);
                }
              }}
            >
              {item.icon && <span aria-hidden="true" className="menu-icon">{item.icon}</span>}
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Example 8: Tab Navigation

```tsx
import { useState, useRef, useId } from 'react';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

export function AccessibleTabs({ tabs, defaultTab }: { tabs: Tab[]; defaultTab?: string }) {
  const id = useId();
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const enabledTabs = tabs.filter((t) => !t.disabled);
  const currentIndex = enabledTabs.findIndex((t) => t.id === activeTab);

  const focusTab = (index: number) => {
    const tab = enabledTabs[index];
    if (tab) {
      tabRefs.current.get(tab.id)?.focus();
      setActiveTab(tab.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        focusTab((currentIndex + 1) % enabledTabs.length);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        focusTab((currentIndex - 1 + enabledTabs.length) % enabledTabs.length);
        break;
      case 'Home':
        e.preventDefault();
        focusTab(0);
        break;
      case 'End':
        e.preventDefault();
        focusTab(enabledTabs.length - 1);
        break;
    }
  };

  return (
    <div className="tabs">
      <div
        role="tablist"
        aria-label="Content tabs"
        onKeyDown={handleKeyDown}
        className="tab-list"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => el && tabRefs.current.set(tab.id, el)}
            role="tab"
            id={`${id}-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`${id}-panel-${tab.id}`}
            aria-disabled={tab.disabled}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            className={`tab ${activeTab === tab.id ? 'tab--active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${id}-panel-${tab.id}`}
          aria-labelledby={`${id}-tab-${tab.id}`}
          hidden={activeTab !== tab.id}
          tabIndex={0}
          className="tab-panel"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

---

## Focus Management

### Example 9: Modal with Focus Trap

```tsx
import { useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/lib/theme';
import { useLatestRef } from '@/lib/hooks';

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const { resolvedTheme } = useTheme();
  const onCloseRef = useLatestRef(onClose);

  // Store previous focus and focus modal on open
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCloseRef.current();
      return;
    }

    if (e.key !== 'Tab') return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (!focusableElements?.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }, [onCloseRef]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-hidden="true"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`modal modal--${resolvedTheme}`}
      >
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="modal-close"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </header>

        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
}
```

### Example 10: Skip Link Navigation

```tsx
export function SkipLinks() {
  return (
    <nav aria-label="Skip links" className="skip-links">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#main-navigation" className="skip-link">
        Skip to navigation
      </a>
      <a href="#search" className="skip-link">
        Skip to search
      </a>
    </nav>
  );
}

// CSS for skip links
const skipLinkStyles = `
.skip-links {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 9999;
}

.skip-link {
  position: absolute;
  left: -9999px;
  padding: 1rem;
  background: var(--color-primary);
  color: white;
  text-decoration: none;
  font-weight: 600;
}

.skip-link:focus {
  left: 0;
  top: 0;
}
`;
```

---

## Motion & Animation

### Example 11: Reduced Motion Support

```tsx
import { useReducedMotion } from '@/lib/hooks';
import { useTheme } from '@/lib/theme';

export function AnimatedCard({
  children,
  delay = 0
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();

  const animationStyles = prefersReducedMotion
    ? {} // No animation
    : {
        animation: `fadeSlideIn 0.3s ease-out ${delay}ms both`,
        '@keyframes fadeSlideIn': {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        }
      };

  return (
    <div
      className={`animated-card animated-card--${resolvedTheme}`}
      style={animationStyles}
    >
      {children}
    </div>
  );
}

// Hook implementation
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}
```

### Example 12: Accessible Spinner with Status

```tsx
import { Spinner } from '@/lib/ui/feedback/Spinner';
import { useReducedMotion } from '@/lib/hooks';

export function LoadingSpinner({
  label = 'Loading',
  size = 'md'
}: {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="loading-container"
    >
      <Spinner
        size={size}
        // Use static indicator for reduced motion
        variant={prefersReducedMotion ? 'static' : 'animated'}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

// After loading completes
export function LoadedContent({ isLoading, children }: { isLoading: boolean; children: React.ReactNode }) {
  return (
    <div aria-busy={isLoading}>
      {isLoading ? (
        <LoadingSpinner label="Loading content" />
      ) : (
        <>
          <div aria-live="polite" className="sr-only">
            Content loaded
          </div>
          {children}
        </>
      )}
    </div>
  );
}
```

---

## Forms & Validation

### Example 13: Accessible Form with Validation

```tsx
import { useState, useId } from 'react';
import { useTheme } from '@/lib/theme';

interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  validation?: (value: string) => string | null;
}

export function AccessibleForm({
  fields,
  onSubmit
}: {
  fields: FormField[];
  onSubmit: (data: Record<string, string>) => void;
}) {
  const id = useId();
  const { resolvedTheme } = useTheme();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = (name: string, value: string): string | null => {
    const field = fields.find((f) => f.name === name);
    if (!field) return null;

    if (field.required && !value.trim()) {
      return `${field.label} is required`;
    }

    return field.validation?.(value) ?? null;
  };

  const handleBlur = (name: string) => {
    setTouched((t) => ({ ...t, [name]: true }));
    const error = validate(name, values[name] ?? '');
    setErrors((e) => ({ ...e, [name]: error ?? '' }));
  };

  const handleChange = (name: string, value: string) => {
    setValues((v) => ({ ...v, [name]: value }));
    if (touched[name]) {
      const error = validate(name, value);
      setErrors((e) => ({ ...e, [name]: error ?? '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string> = {};
    let hasError = false;

    for (const field of fields) {
      const error = validate(field.name, values[field.name] ?? '');
      if (error) {
        newErrors[field.name] = error;
        hasError = true;
      }
    }

    setErrors(newErrors);
    setTouched(Object.fromEntries(fields.map((f) => [f.name, true])));

    if (!hasError) {
      onSubmit(values);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className={`form form--${resolvedTheme}`}>
      {fields.map((field) => {
        const fieldId = `${id}-${field.name}`;
        const errorId = `${fieldId}-error`;
        const hasError = touched[field.name] && errors[field.name];

        return (
          <div key={field.name} className="form-field">
            <label htmlFor={fieldId} className="form-label">
              {field.label}
              {field.required && <span aria-hidden="true" className="required-indicator">*</span>}
            </label>

            <input
              id={fieldId}
              type={field.type}
              name={field.name}
              value={values[field.name] ?? ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              onBlur={() => handleBlur(field.name)}
              aria-required={field.required}
              aria-invalid={hasError ? 'true' : undefined}
              aria-describedby={hasError ? errorId : undefined}
              className={`form-input ${hasError ? 'form-input--error' : ''}`}
            />

            {hasError && (
              <p id={errorId} role="alert" className="form-error">
                {errors[field.name]}
              </p>
            )}
          </div>
        );
      })}

      <button type="submit" className="form-submit">
        Submit
      </button>
    </form>
  );
}
```

### Example 14: Live Validation Feedback

```tsx
import { useState, useEffect, useId } from 'react';

export function PasswordField({
  value,
  onChange,
  label = 'Password'
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const id = useId();
  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  useEffect(() => {
    setRequirements({
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
      special: /[!@#$%^&*]/.test(value)
    });
  }, [value]);

  const allMet = Object.values(requirements).every(Boolean);

  return (
    <div className="password-field">
      <label htmlFor={id}>{label}</label>

      <input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={`${id}-requirements`}
        aria-invalid={value.length > 0 && !allMet}
      />

      <ul
        id={`${id}-requirements`}
        aria-label="Password requirements"
        className="password-requirements"
      >
        {Object.entries({
          length: 'At least 8 characters',
          uppercase: 'One uppercase letter',
          lowercase: 'One lowercase letter',
          number: 'One number',
          special: 'One special character (!@#$%^&*)'
        }).map(([key, text]) => (
          <li
            key={key}
            aria-current={requirements[key as keyof typeof requirements] ? 'true' : undefined}
            className={requirements[key as keyof typeof requirements] ? 'met' : 'unmet'}
          >
            <span aria-hidden="true">
              {requirements[key as keyof typeof requirements] ? '✓' : '○'}
            </span>
            {text}
          </li>
        ))}
      </ul>

      <div aria-live="polite" className="sr-only">
        {allMet && 'All password requirements met'}
      </div>
    </div>
  );
}
```

---

## WCAG 2.1 AA Checklist

### Perceivable

| Requirement | Implementation | Component |
|------------|----------------|-----------|
| **1.1.1** Non-text content | `alt` on images, `aria-label` on icons | All |
| **1.3.1** Info and relationships | Semantic HTML, ARIA roles | Tables, Forms |
| **1.3.2** Meaningful sequence | Logical DOM order | Layouts |
| **1.4.1** Use of color | Don't rely solely on color | Errors, Status |
| **1.4.3** Contrast (4.5:1) | Theme tokens meet ratio | ThemeProvider |
| **1.4.4** Resize text | Relative units (rem) | Typography |
| **1.4.10** Reflow | Responsive design | Layouts |
| **1.4.11** Non-text contrast | UI elements 3:1 | Buttons, Inputs |

### Operable

| Requirement | Implementation | Component |
|------------|----------------|-----------|
| **2.1.1** Keyboard | All interactive elements | Menus, Tables |
| **2.1.2** No keyboard trap | Focus management | Modals |
| **2.1.4** Character shortcuts | Allow disable/remap | Shortcuts |
| **2.4.1** Bypass blocks | Skip links | SkipLinks |
| **2.4.3** Focus order | Logical tab order | All |
| **2.4.6** Headings and labels | Descriptive text | Forms |
| **2.4.7** Focus visible | `:focus-visible` styles | All |
| **2.5.3** Label in name | Visible label matches accessible | Buttons |

### Understandable

| Requirement | Implementation | Component |
|------------|----------------|-----------|
| **3.1.1** Language of page | `lang` attribute | HTML root |
| **3.2.1** On focus | No unexpected changes | All |
| **3.2.2** On input | Predictable behavior | Forms |
| **3.3.1** Error identification | Clear error messages | Forms |
| **3.3.2** Labels or instructions | Field labels, hints | Forms |
| **3.3.3** Error suggestion | Helpful error text | Validation |

### Robust

| Requirement | Implementation | Component |
|------------|----------------|-----------|
| **4.1.1** Parsing | Valid HTML | All |
| **4.1.2** Name, role, value | ARIA attributes | All interactive |
| **4.1.3** Status messages | `aria-live` regions | Notifications |

---

## Component Accessibility Checklist

```tsx
// Accessibility HOC for consistent patterns
export function withAccessibility<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    role?: string;
    announceChanges?: boolean;
    focusable?: boolean;
  }
) {
  return function AccessibleComponent(props: P) {
    const id = useId();

    return (
      <>
        <Component
          {...props}
          role={options.role}
          tabIndex={options.focusable ? 0 : undefined}
          aria-describedby={options.announceChanges ? `${id}-live` : undefined}
        />
        {options.announceChanges && (
          <div id={`${id}-live`} aria-live="polite" className="sr-only" />
        )}
      </>
    );
  };
}
```

## Related Documentation

### Integration Guides
- [README.md](./README.md) - Integration overview
- [FEATURE_FLAGS_ERROR_BOUNDARIES_FULLSTACK.md](./FEATURE_FLAGS_ERROR_BOUNDARIES_FULLSTACK.md) - Feature flags with UI
- [PERFORMANCE_MONITORING_HYDRATION.md](./PERFORMANCE_MONITORING_HYDRATION.md) - UI performance

### React Hooks
- [Hooks Guide](../hooks/README.md) - General React hooks
- [State Hooks](../state/HOOKS.md) - State management hooks
- [Config Hooks](../config/HOOKS.md) - Configuration hooks
- [API Hooks](../api/HOOKS.md) - Data fetching hooks
- [Flag Hooks](../flags/HOOKS.md) - Feature flag hooks

### State & Config
- [State System](../state/README.md) - State management
- [State Slices](../state/SLICES.md) - UI and settings slices
- [Config System](../config/README.md) - Configuration management
- [Config Providers](../config/PROVIDERS.md) - Provider patterns

### Performance & Monitoring
- [Performance](../performance/README.md) - UI performance optimization
- [Render Tracking](../performance/RENDER_TRACKING.md) - Component tracking
- [Monitoring](../monitoring/README.md) - Error monitoring
- [Hydration](../hydration/README.md) - Progressive hydration

---

*Last updated: 2024 | Harbor React Framework v2.0*
