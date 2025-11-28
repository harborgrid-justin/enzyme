# Accessibility Examples

> **Module**: `@/lib/ux/accessibility-enhancer`, `@/lib/ux/accessibility-auto`
> **Standard**: WCAG 2.1 AA Compliance

This guide provides comprehensive examples for implementing accessible React components.

---

## Table of Contents

- [Screen Reader Announcements](#screen-reader-announcements)
- [Focus Management](#focus-management)
- [Keyboard Navigation](#keyboard-navigation)
- [Reduced Motion](#reduced-motion)
- [ARIA Patterns](#aria-patterns)
- [Form Accessibility](#form-accessibility)
- [Data Table Accessibility](#data-table-accessibility)
- [Modal Accessibility](#modal-accessibility)

---

## Screen Reader Announcements

### Basic Announcements

```tsx
import { announce, announceAssertive } from '@/lib/ux/accessibility-enhancer';

function SaveButton() {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    announce('Saving changes...');

    try {
      await saveData();
      announce('Changes saved successfully');
    } catch (error) {
      announceAssertive('Error saving changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <button onClick={handleSave} disabled={saving}>
      {saving ? 'Saving...' : 'Save'}
    </button>
  );
}
```

### Live Region for Dynamic Content

```tsx
function NotificationArea() {
  const [notifications, setNotifications] = useState<string[]>([]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      {notifications.map((msg, i) => (
        <p key={i}>{msg}</p>
      ))}
    </div>
  );
}
```

### Announcing Loading States

```tsx
import { announce } from '@/lib/ux/accessibility-enhancer';

function DataLoader({ isLoading, error, data }) {
  useEffect(() => {
    if (isLoading) {
      announce('Loading data, please wait...');
    } else if (error) {
      announceAssertive(`Error loading data: ${error.message}`);
    } else if (data) {
      announce(`Loaded ${data.length} items`);
    }
  }, [isLoading, error, data]);

  return <div>{/* content */}</div>;
}
```

---

## Focus Management

### Focus Trap

```tsx
import { useFocusTrap } from '@/lib/ux/accessibility-auto';

function Modal({ isOpen, onClose, children }) {
  const containerRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <h2 id="modal-title">Modal Title</h2>
      {children}
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

### Auto-focus First Element

```tsx
function SearchPanel({ isOpen }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus input when panel opens
      inputRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div role="search" hidden={!isOpen}>
      <input
        ref={inputRef}
        type="search"
        aria-label="Search"
        placeholder="Search..."
      />
    </div>
  );
}
```

### Return Focus on Close

```tsx
function Dropdown({ trigger, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setIsOpen(false);
    // Return focus to trigger
    triggerRef.current?.focus();
  };

  return (
    <div>
      <button
        ref={triggerRef}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen(!isOpen)}
      >
        {trigger}
      </button>
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
```

---

## Keyboard Navigation

### Roving Tab Index

```tsx
import { createRovingTabindex } from '@/lib/ux/accessibility-enhancer';

function TabList({ tabs, activeTab, onTabChange }) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        const nextIndex = (index + 1) % tabs.length;
        setFocusedIndex(nextIndex);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        const prevIndex = (index - 1 + tabs.length) % tabs.length;
        setFocusedIndex(prevIndex);
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(tabs.length - 1);
        break;
    }
  };

  return (
    <div role="tablist">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          tabIndex={index === focusedIndex ? 0 : -1}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

### Keyboard Shortcuts

```tsx
import { useKeyboardShortcuts } from '@/lib/hooks';

function Editor() {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    registerShortcut('ctrl+s', handleSave, 'Save document');
    registerShortcut('ctrl+z', handleUndo, 'Undo');
    registerShortcut('ctrl+shift+z', handleRedo, 'Redo');

    return () => {
      unregisterShortcut('ctrl+s');
      unregisterShortcut('ctrl+z');
      unregisterShortcut('ctrl+shift+z');
    };
  }, []);

  return <div>{/* editor content */}</div>;
}
```

### Skip Links

```tsx
function SkipLinks() {
  return (
    <nav aria-label="Skip links">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#main-navigation" className="skip-link">
        Skip to navigation
      </a>
    </nav>
  );
}

// CSS
// .skip-link {
//   position: absolute;
//   left: -10000px;
//   &:focus {
//     left: 10px;
//     top: 10px;
//     z-index: 1000;
//   }
// }
```

---

## Reduced Motion

### Respecting User Preferences

```tsx
import { useAccessibilityPreferences } from '@/lib/ux/accessibility-auto';

function AnimatedComponent() {
  const { reducedMotion } = useAccessibilityPreferences();

  const animationStyle = reducedMotion
    ? { animation: 'none' }
    : { animation: 'slideIn 0.3s ease-out' };

  return <div style={animationStyle}>Content</div>;
}
```

### CSS-based Reduced Motion

```tsx
function FadeIn({ children }) {
  return (
    <div className="fade-in">
      {children}
      <style>{`
        .fade-in {
          animation: fadeIn 0.5s ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .fade-in {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
```

### Alternative for Motion-Sensitive Content

```tsx
function LoadingIndicator() {
  const { reducedMotion } = useAccessibilityPreferences();

  if (reducedMotion) {
    // Static indicator for reduced motion
    return (
      <div role="status" aria-label="Loading">
        Loading...
      </div>
    );
  }

  // Animated spinner for standard motion
  return (
    <div
      role="status"
      aria-label="Loading"
      className="spinner"
    />
  );
}
```

---

## ARIA Patterns

### Accordion

```tsx
function Accordion({ items }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      {items.map((item) => (
        <div key={item.id}>
          <h3>
            <button
              id={`accordion-header-${item.id}`}
              aria-expanded={expandedId === item.id}
              aria-controls={`accordion-panel-${item.id}`}
              onClick={() =>
                setExpandedId(expandedId === item.id ? null : item.id)
              }
            >
              {item.title}
            </button>
          </h3>
          <div
            id={`accordion-panel-${item.id}`}
            role="region"
            aria-labelledby={`accordion-header-${item.id}`}
            hidden={expandedId !== item.id}
          >
            {item.content}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Disclosure Widget

```tsx
function Disclosure({ summary, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <div>
      <button
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen(!isOpen)}
      >
        {summary}
      </button>
      <div id={contentId} hidden={!isOpen}>
        {children}
      </div>
    </div>
  );
}
```

### Alert Dialog

```tsx
function AlertDialog({ isOpen, title, message, onConfirm, onCancel }) {
  const containerRef = useFocusTrap(isOpen);
  const titleId = useId();
  const descId = useId();

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <h2 id={titleId}>{title}</h2>
      <p id={descId}>{message}</p>
      <div>
        <button onClick={onCancel}>Cancel</button>
        <button onClick={onConfirm} autoFocus>
          Confirm
        </button>
      </div>
    </div>
  );
}
```

---

## Form Accessibility

### Labeled Inputs

```tsx
function FormField({ label, id, error, ...props }) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={errorId}
        {...props}
      />
      {error && (
        <span id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
```

### Required Fields

```tsx
function RequiredField({ label, ...props }) {
  return (
    <div>
      <label>
        {label}
        <span aria-hidden="true"> *</span>
        <span className="sr-only"> (required)</span>
      </label>
      <input required aria-required="true" {...props} />
    </div>
  );
}
```

### Form Error Summary

```tsx
function FormErrorSummary({ errors }) {
  if (Object.keys(errors).length === 0) return null;

  return (
    <div role="alert" aria-labelledby="error-summary-title">
      <h2 id="error-summary-title">Please fix the following errors:</h2>
      <ul>
        {Object.entries(errors).map(([field, message]) => (
          <li key={field}>
            <a href={`#${field}`}>{message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Data Table Accessibility

### Accessible Data Table

```tsx
function AccessibleTable({ data, columns, caption }) {
  return (
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.id} scope="col">
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((col, colIndex) => (
              colIndex === 0 ? (
                <th key={col.id} scope="row">
                  {row[col.id]}
                </th>
              ) : (
                <td key={col.id}>{row[col.id]}</td>
              )
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Sortable Table Headers

```tsx
function SortableHeader({ column, sortConfig, onSort }) {
  const isSorted = sortConfig?.column === column.id;
  const direction = isSorted ? sortConfig.direction : null;

  return (
    <th scope="col">
      <button
        onClick={() => onSort(column.id)}
        aria-sort={
          direction === 'asc'
            ? 'ascending'
            : direction === 'desc'
            ? 'descending'
            : 'none'
        }
      >
        {column.label}
        <span aria-hidden="true">
          {direction === 'asc' ? ' ↑' : direction === 'desc' ? ' ↓' : ''}
        </span>
      </button>
    </th>
  );
}
```

---

## Modal Accessibility

### Complete Modal Implementation

```tsx
function AccessibleModal({ isOpen, onClose, title, children }) {
  const containerRef = useFocusTrap(isOpen);
  const titleId = useId();
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      announce(`${title} dialog opened`);
    } else {
      previousActiveElement.current?.focus();
    }
  }, [isOpen, title]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <h2 id={titleId}>{title}</h2>
      <button
        onClick={onClose}
        aria-label="Close dialog"
        className="close-button"
      >
        ×
      </button>
      {children}
    </div>
  );
}
```

---

## See Also

- [Button Examples](./button-examples.md)
- [Form Examples](./form-examples.md)
- [Error Handling Examples](./error-handling-examples.md)
