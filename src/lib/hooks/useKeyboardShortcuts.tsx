/**
 * @file Keyboard Shortcuts Hook
 * @description Hook for managing and documenting keyboard shortcuts
 *
 * WCAG 2.1 Reference:
 * - 2.1.1 Keyboard (Level A)
 * - 2.1.4 Character Key Shortcuts (Level A)
 * - 3.3.5 Help (Level AAA)
 */

/* @refresh reset */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFeatureFlag } from '../flags/useFeatureFlag';
import { flagKeys } from '../flags/flagKeys';

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  /** Unique identifier for the shortcut */
  id: string;
  /** Human-readable description of what the shortcut does */
  description: string;
  /** Key combination (e.g., 'Ctrl+S', 'Escape', 'Alt+N') */
  keys: string;
  /** Category for grouping shortcuts */
  category?: string;
  /** Whether the shortcut is enabled */
  enabled?: boolean;
  /** The handler function to execute */
  handler: (event: KeyboardEvent) => void;
}

/**
 * Parsed key combination
 */
interface ParsedKeys {
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  key: string;
}

/**
 * Options for the keyboard shortcuts hook
 */
export interface UseKeyboardShortcutsOptions {
  /** Whether to prevent default behavior when a shortcut is triggered */
  preventDefault?: boolean;
  /** Whether to stop propagation when a shortcut is triggered */
  stopPropagation?: boolean;
  /** Scope element (defaults to document) */
  scope?: HTMLElement | null;
  /** Whether shortcuts are globally enabled */
  enabled?: boolean;
}

/**
 * Parse a key combination string into modifier flags and key
 */
function parseKeyCombo(keys: string): ParsedKeys {
  const parts = keys.toLowerCase().split('+');
  const key = parts.pop() ?? '';

  return {
    ctrlKey: parts.includes('ctrl') || parts.includes('control'),
    shiftKey: parts.includes('shift'),
    altKey: parts.includes('alt'),
    metaKey: parts.includes('meta') || parts.includes('cmd') || parts.includes('command'),
    key: key === 'space' ? ' ' : key,
  };
}

/**
 * Check if an event matches a parsed key combination
 */
function matchesKeyCombo(event: KeyboardEvent, parsed: ParsedKeys): boolean {
  const eventKey = event.key.toLowerCase();

  return (
    event.ctrlKey === parsed.ctrlKey &&
    event.shiftKey === parsed.shiftKey &&
    event.altKey === parsed.altKey &&
    event.metaKey === parsed.metaKey &&
    (eventKey === parsed.key || event.code.toLowerCase() === parsed.key)
  );
}

/**
 * Format a key combination for display
 */
export function formatKeyCombo(keys: string): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  return keys
    .split('+')
    .map((key) => {
      const k = key.trim().toLowerCase();
      switch (k) {
        case 'ctrl':
        case 'control':
          return isMac ? '^' : 'Ctrl';
        case 'alt':
          return isMac ? '?' : 'Alt';
        case 'shift':
          return isMac ? '?' : 'Shift';
        case 'meta':
        case 'cmd':
        case 'command':
          return isMac ? '?' : 'Win';
        case 'space':
          return 'Space';
        case 'escape':
        case 'esc':
          return 'Esc';
        case 'enter':
        case 'return':
          return isMac ? '?' : 'Enter';
        case 'backspace':
          return isMac ? '?' : 'Backspace';
        case 'delete':
          return isMac ? '?' : 'Delete';
        case 'arrowup':
          return isMac ? '?' : 'Up';
        case 'arrowdown':
          return isMac ? '?' : 'Down';
        case 'arrowleft':
          return isMac ? '?' : 'Left';
        case 'arrowright':
          return isMac ? '?' : 'Right';
        default:
          return key.toUpperCase();
      }
    })
    .join(isMac ? '' : ' + ');
}

/**
 * Hook for managing keyboard shortcuts with documentation
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { shortcuts } = useKeyboardShortcuts([
 *     {
 *       id: 'save',
 *       description: 'Save changes',
 *       keys: 'Ctrl+S',
 *       category: 'Actions',
 *       handler: () => saveDocument(),
 *     },
 *     {
 *       id: 'close',
 *       description: 'Close panel',
 *       keys: 'Escape',
 *       category: 'Navigation',
 *       handler: () => closePanel(),
 *     },
 *   ]);
 *
 *   return (
 *     <div>
 *       <KeyboardShortcutsHelp shortcuts={shortcuts} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
): {
  shortcuts: KeyboardShortcut[];
  shortcutsByCategory: Record<string, KeyboardShortcut[]>;
  enableShortcut: (id: string) => void;
  disableShortcut: (id: string) => void;
  toggleShortcut: (id: string) => void;
  /** Whether keyboard shortcuts are globally enabled via feature flag */
  isFeatureEnabled: boolean;
} {
  // Check if keyboard shortcuts are enabled via feature flag
  const keyboardShortcutsFeatureEnabled = useFeatureFlag(flagKeys.KEYBOARD_SHORTCUTS);

  const {
    preventDefault = true,
    stopPropagation = false,
    scope = null,
    enabled = true,
  } = options;

  // Combine feature flag with options.enabled
  const effectivelyEnabled = enabled && keyboardShortcutsFeatureEnabled;

  const [enabledShortcuts, setEnabledShortcuts] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    shortcuts.forEach((s) => {
      initial[s.id] = s.enabled !== false;
    });
    return initial;
  });

  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  // Parse all key combinations once
  const parsedShortcuts = useMemo(() => {
    return shortcuts.map((shortcut) => ({
      ...shortcut,
      parsed: parseKeyCombo(shortcut.keys),
    }));
  }, [shortcuts]);

  // Group shortcuts by category
  const shortcutsByCategory = useMemo(() => {
    const grouped: Record<string, KeyboardShortcut[]> = {};
    shortcuts.forEach((shortcut) => {
      const category = shortcut.category ?? 'General';
      grouped[category] ??= [];
      grouped[category].push(shortcut);
    });
    return grouped;
  }, [shortcuts]);

  // Handle keydown events
  useEffect(() => {
    if (!effectivelyEnabled) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Allow Escape to work in inputs
        if (event.key !== 'Escape') {
          return;
        }
      }

      for (const shortcut of parsedShortcuts) {
        if (enabledShortcuts[shortcut.id] !== true) continue;

        if (matchesKeyCombo(event, shortcut.parsed)) {
          if (preventDefault) {
            event.preventDefault();
          }
          if (stopPropagation) {
            event.stopPropagation();
          }
          shortcut.handler(event);
          return;
        }
      }
    };

    const element = scope ?? document;
    element.addEventListener('keydown', handleKeyDown as EventListener);

    return () => {
      element.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [effectivelyEnabled, parsedShortcuts, enabledShortcuts, preventDefault, stopPropagation, scope]);

  const enableShortcut = useCallback((id: string) => {
    setEnabledShortcuts((prev) => ({ ...prev, [id]: true }));
  }, []);

  const disableShortcut = useCallback((id: string) => {
    setEnabledShortcuts((prev) => ({ ...prev, [id]: false }));
  }, []);

  const toggleShortcut = useCallback((id: string) => {
    setEnabledShortcuts((prev) => ({ ...prev, [id]: prev[id] !== true }));
  }, []);

  return {
    shortcuts,
    shortcutsByCategory,
    enableShortcut,
    disableShortcut,
    toggleShortcut,
    isFeatureEnabled: keyboardShortcutsFeatureEnabled,
  };
}

/**
 * Component to display keyboard shortcuts help
 *
 * @example
 * ```tsx
 * <KeyboardShortcutsHelp
 *   shortcuts={shortcuts}
 *   title="Keyboard Shortcuts"
 * />
 * ```
 */
export interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function KeyboardShortcutsHelp({
  shortcuts,
  title = 'Keyboard Shortcuts',
  className,
  style,
}: KeyboardShortcutsHelpProps): React.ReactElement {
  // Group by category
  const grouped = useMemo(() => {
    const result: Record<string, KeyboardShortcut[]> = {};
    shortcuts.forEach((s) => {
      const cat = s.category ?? 'General';
      result[cat] ??= [];
      result[cat].push(s);
    });
    return result;
  }, [shortcuts]);

  return (
    <div
      className={className}
      style={{
        padding: '1rem',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        ...style,
      }}
      role="region"
      aria-label={title}
    >
      <h2
        style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          marginBottom: '1rem',
          color: '#111827',
        }}
      >
        {title}
      </h2>

      {Object.entries(grouped).map(([category, categoryShortcuts]) => (
        <div key={category} style={{ marginBottom: '1rem' }}>
          <h3
            style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#6b7280',
              marginBottom: '0.5rem',
            }}
          >
            {category}
          </h3>
          <dl style={{ margin: 0 }}>
            {categoryShortcuts.map((shortcut) => (
              <div
                key={shortcut.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.375rem 0',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                <dt style={{ fontSize: '0.875rem', color: '#374151' }}>
                  {shortcut.description}
                </dt>
                <dd style={{ margin: 0 }}>
                  <kbd
                    className="keyboard-hint"
                    style={{
                      display: 'inline-block',
                      padding: '0.125rem 0.375rem',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.25rem',
                      color: '#374151',
                    }}
                  >
                    {formatKeyCombo(shortcut.keys)}
                  </kbd>
                </dd>
              </div>
          ))}
        </dl>
      </div>
    ))}
  </div>
);
}