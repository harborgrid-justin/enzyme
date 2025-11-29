# Accessibility Features

> Comprehensive accessibility utilities including focus management, screen reader announcements, keyboard navigation, and ARIA helpers

## Overview

The Accessibility Enhancer module provides a complete suite of tools for building accessible web applications. It includes focus management, screen reader support, keyboard navigation helpers, ARIA utilities, reduced motion support, and color contrast checking.

## Location

```
/home/user/enzyme/src/lib/ux/accessibility-enhancer.ts
```

## Key Features

- **Screen Reader Announcements**: Live region announcements
- **Focus Management**: Focus trapping and roving tabindex
- **Keyboard Navigation**: Arrow key navigation helpers
- **ARIA Utilities**: ARIA attribute management
- **Skip Links**: Bypass navigation for keyboard users
- **Reduced Motion**: Respect user motion preferences
- **Color Contrast**: WCAG compliance checking
- **Auto-enhancement**: Automatic accessibility improvements

## Screen Reader Announcements

### Basic Announcements

```typescript
import { announce, announceAssertive } from '@missionfabric-js/enzyme/ux';

// Polite announcement (doesn't interrupt)
announce('Data loaded successfully');

// Assertive announcement (interrupts current speech)
announceAssertive('Error: Form submission failed');
```

### Announcement Types

**Polite** (default):
- Waits for current speech to finish
- Best for: success messages, status updates, informational content

```typescript
announce('5 new messages', 'polite');
```

**Assertive**:
- Interrupts current speech immediately
- Best for: errors, warnings, critical alerts

```typescript
announce('Connection lost', 'assertive');
```

### Specialized Announcements

```typescript
import {
  announceRouteChange,
  announceLoading,
  announceError,
  announceSuccess
} from '@missionfabric-js/enzyme/ux';

// Route changes
announceRouteChange('Dashboard');
// Announces: "Navigated to Dashboard"

// Loading states
announceLoading(true, 'user data');
// Announces: "Loading user data..."
announceLoading(false, 'user data');
// Announces: "user data loaded"

// Errors
announceError('Invalid email address');
// Announces: "Error: Invalid email address"

// Success
announceSuccess('Settings saved');
// Announces: "Settings saved"
```

### Initialize Announcer

The announcer is automatically initialized on first use, but you can manually initialize:

```typescript
import { initAnnouncer } from '@missionfabric-js/enzyme/ux';

// Initialize announcer elements
initAnnouncer();
```

This creates hidden live region elements:
- Polite live region (`role="status"`, `aria-live="polite"`)
- Assertive live region (`role="alert"`, `aria-live="assertive"`)

## Focus Management

### Get Focusable Elements

```typescript
import { getFocusableElements, getFirstFocusable, getLastFocusable } from '@missionfabric-js/enzyme/ux';

const container = document.getElementById('dialog');

// Get all focusable elements
const focusables = getFocusableElements(container);

// Get first focusable element
const first = getFirstFocusable(container);

// Get last focusable element
const last = getLastFocusable(container);
```

**Focusable elements include:**
- `<a>` with href
- `<button>` (not disabled)
- `<input>` (not disabled or hidden)
- `<select>` (not disabled)
- `<textarea>` (not disabled)
- Elements with `tabindex` (not -1)
- Contenteditable elements

### Focus Control

```typescript
import { focusFirst, focusLast } from '@missionfabric-js/enzyme/ux';

const modal = document.getElementById('modal');

// Focus first focusable element
focusFirst(modal);

// Focus last focusable element
focusLast(modal);
```

### Focus Trap

Trap focus within a container (essential for modals, dialogs):

```typescript
import { createFocusTrap } from '@missionfabric-js/enzyme/ux';

const modal = document.getElementById('modal');
const closeButton = document.getElementById('close-btn');

const trap = createFocusTrap({
  container: modal,
  initialFocus: closeButton,        // Focus this on activate
  returnFocus: true,                 // Return focus on deactivate
  escapeDeactivates: true,           // Escape key closes trap
  onEscape: () => closeModal(),
  clickOutsideDeactivates: true,     // Click outside closes trap
  onClickOutside: () => closeModal()
});

// Activate trap
trap.activate();

// Deactivate trap
trap.deactivate();

// Temporarily pause/resume
trap.pause();
trap.resume();
```

**Focus Trap Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | - | Element to trap focus within |
| `initialFocus` | `HTMLElement \| string` | - | Initial focus element or selector |
| `returnFocus` | `HTMLElement \| boolean` | `true` | Element to focus on deactivate |
| `escapeDeactivates` | `boolean` | `true` | Escape key deactivates trap |
| `onEscape` | `() => void` | - | Escape key callback |
| `clickOutsideDeactivates` | `boolean` | `false` | Click outside deactivates |
| `onClickOutside` | `() => void` | - | Click outside callback |

**Example: Modal with Focus Trap**

```typescript
function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef(null);
  const trapRef = useRef(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      trapRef.current = createFocusTrap({
        container: modalRef.current,
        escapeDeactivates: true,
        onEscape: onClose,
        clickOutsideDeactivates: true,
        onClickOutside: onClose
      });
      trapRef.current.activate();
    }

    return () => {
      trapRef.current?.deactivate();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={modalRef} className="modal">
      {children}
    </div>
  );
}
```

## Keyboard Navigation

### Roving Tabindex

Implement roving tabindex pattern for keyboard navigation:

```typescript
import { createRovingTabindex } from '@missionfabric-js/enzyme/ux';

const toolbar = document.getElementById('toolbar');

const rovingTabindex = createRovingTabindex({
  container: toolbar,
  itemSelector: 'button',
  orientation: 'horizontal',
  loop: true,
  initialIndex: 0,
  onFocus: (element, index) => {
    console.log(`Focused item ${index}`, element);
  }
});

// Initialize
rovingTabindex.init();

// Cleanup
rovingTabindex.destroy();

// Programmatically set focus
rovingTabindex.setFocusedIndex(2);
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | - | Container element |
| `itemSelector` | `string` | - | CSS selector for items |
| `orientation` | `'horizontal' \| 'vertical' \| 'both'` | - | Navigation direction |
| `loop` | `boolean` | `true` | Loop at edges |
| `initialIndex` | `number` | `0` | Initially focused index |
| `onFocus` | `(element, index) => void` | - | Focus callback |

**Keyboard Controls:**
- **Arrow Right/Down**: Next item
- **Arrow Left/Up**: Previous item
- **Home**: First item
- **End**: Last item

**Example: Toolbar**

```typescript
function Toolbar() {
  const toolbarRef = useRef(null);

  useEffect(() => {
    const roving = createRovingTabindex({
      container: toolbarRef.current,
      itemSelector: '[role="button"]',
      orientation: 'horizontal',
      loop: true
    });

    roving.init();
    return () => roving.destroy();
  }, []);

  return (
    <div ref={toolbarRef} role="toolbar" aria-label="Text formatting">
      <button role="button">Bold</button>
      <button role="button">Italic</button>
      <button role="button">Underline</button>
    </div>
  );
}
```

## Skip Links

Allow keyboard users to bypass navigation:

### Create Skip Link

```typescript
import { createSkipLink } from '@missionfabric-js/enzyme/ux';

const skipLink = createSkipLink({
  targetId: 'main-content',
  text: 'Skip to main content',
  className: 'skip-link'
});

document.body.insertBefore(skipLink, document.body.firstChild);
```

### Install Default Skip Links

```typescript
import { installSkipLinks } from '@missionfabric-js/enzyme/ux';

// Automatically creates skip links for:
// - Main content (id="main-content" or <main>)
// - Navigation (id="main-nav" or <nav>)
installSkipLinks();
```

**Skip Link Styling:**

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px 16px;
  z-index: 10000;
  text-decoration: none;
}

.skip-link:focus {
  top: 0;
}
```

## ARIA Utilities

### ARIA State Management

```typescript
import {
  setExpanded,
  setPressed,
  setSelected,
  setBusy,
  setDisabled,
  setHidden
} from '@missionfabric-js/enzyme/ux';

const button = document.getElementById('toggle');
const panel = document.getElementById('panel');

// Expandable (accordions, disclosures)
setExpanded(button, true, 'panel');
// Sets: aria-expanded="true" aria-controls="panel"

// Toggle buttons
setPressed(button, true);
// Sets: aria-pressed="true"

// Tabs, list items
setSelected(button, true);
// Sets: aria-selected="true"

// Loading states
setBusy(panel, true);
// Sets: aria-busy="true"

// Disabled elements
setDisabled(button, true);
// Sets: aria-disabled="true" tabindex="-1"

// Hidden elements
setHidden(panel, true);
// Sets: aria-hidden="true" inert
```

### Generate ARIA IDs

Create unique IDs for ARIA relationships:

```typescript
import { generateAriaId } from '@missionfabric-js/enzyme/ux';

const labelId = generateAriaId('label');
// Returns: "label-1"

const descId = generateAriaId('desc');
// Returns: "desc-2"
```

**Example: Accessible Form Field**

```typescript
function FormField({ label, description }) {
  const labelId = generateAriaId('label');
  const descId = generateAriaId('desc');
  const inputId = generateAriaId('input');

  return (
    <div>
      <label id={labelId} htmlFor={inputId}>
        {label}
      </label>
      <p id={descId}>{description}</p>
      <input
        id={inputId}
        aria-labelledby={labelId}
        aria-describedby={descId}
      />
    </div>
  );
}
```

## Reduced Motion

Respect user's motion preferences:

### Check Preference

```typescript
import { prefersReducedMotion } from '@missionfabric-js/enzyme/ux';

if (prefersReducedMotion()) {
  // Disable or reduce animations
}
```

### Listen to Changes

```typescript
import { onReducedMotionChange } from '@missionfabric-js/enzyme/ux';

const unsubscribe = onReducedMotionChange((prefersReduced) => {
  console.log('Prefers reduced motion:', prefersReduced);
  updateAnimations(!prefersReduced);
});

// Cleanup
unsubscribe();
```

### Safe Animation Duration

Get animation duration based on preference:

```typescript
import { getSafeAnimationDuration } from '@missionfabric-js/enzyme/ux';

const duration = getSafeAnimationDuration(
  300,  // Normal duration
  0     // Reduced duration (instant)
);

element.style.transitionDuration = `${duration}ms`;
```

**Example: Conditional Animations**

```typescript
import { prefersReducedMotion } from '@missionfabric-js/enzyme/ux';

function AnimatedComponent() {
  const shouldAnimate = !prefersReducedMotion();

  return (
    <div
      style={{
        transition: shouldAnimate ? 'all 300ms ease' : 'none',
        transform: shouldAnimate ? 'scale(1.1)' : 'none'
      }}
    >
      Content
    </div>
  );
}
```

## Color Contrast

Check WCAG color contrast compliance:

### Check Contrast Ratio

```typescript
import { getContrastRatio, checkContrast } from '@missionfabric-js/enzyme/ux';

const foreground: [number, number, number] = [0, 0, 0];      // Black
const background: [number, number, number] = [255, 255, 255]; // White

const ratio = getContrastRatio(foreground, background);
// Returns: 21

const result = checkContrast(foreground, background);
// Returns: {
//   ratio: 21,
//   aa: true,        // Normal text (4.5:1)
//   aaLarge: true,   // Large text (3:1)
//   aaa: true,       // Enhanced (7:1)
//   aaaLarge: true   // Enhanced large (4.5:1)
// }
```

### Convert Hex to RGB

```typescript
import { hexToRgb } from '@missionfabric-js/enzyme/ux';

const rgb = hexToRgb('#3b82f6');
// Returns: [59, 130, 246]
```

### Calculate Luminance

```typescript
import { getLuminance } from '@missionfabric-js/enzyme/ux';

const luminance = getLuminance(59, 130, 246);
// Returns: 0.213 (relative luminance)
```

**Example: Validate Theme Colors**

```typescript
import { hexToRgb, checkContrast } from '@missionfabric-js/enzyme/ux';

function validateTheme(textColor, backgroundColor) {
  const fg = hexToRgb(textColor);
  const bg = hexToRgb(backgroundColor);

  if (!fg || !bg) {
    console.error('Invalid color format');
    return false;
  }

  const result = checkContrast(fg, bg);

  if (!result.aa) {
    console.warn(
      `Color contrast ${result.ratio.toFixed(2)}:1 fails WCAG AA (4.5:1 required)`
    );
    return false;
  }

  return true;
}

// Usage
validateTheme('#6b7280', '#ffffff'); // true (9.7:1)
validateTheme('#d1d5db', '#ffffff'); // false (1.6:1)
```

## CSS Utilities

### Accessibility Styles

Import and use pre-built accessibility CSS:

```typescript
import { accessibilityStyles } from '@missionfabric-js/enzyme/ux';

// Inject into stylesheet or include in your CSS
```

**Included Styles:**

```css
/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Skip links */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px 16px;
  z-index: 10000;
  text-decoration: none;
}

.skip-link:focus {
  top: 0;
}

/* Focus visible */
:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Best Practices

### 1. Always Announce Dynamic Content Changes

```typescript
// Good
async function loadData() {
  announce('Loading data...');
  const data = await fetchData();
  announce('Data loaded successfully');
}

// Avoid
async function loadData() {
  const data = await fetchData();
  // No announcement
}
```

### 2. Trap Focus in Modals

```typescript
// Good
function Modal({ isOpen, children }) {
  useEffect(() => {
    if (isOpen) {
      const trap = createFocusTrap({
        container: modalRef.current,
        escapeDeactivates: true
      });
      trap.activate();
      return () => trap.deactivate();
    }
  }, [isOpen]);
  // ...
}

// Avoid: No focus management
```

### 3. Provide Skip Links

```typescript
// Good: Install skip links
useEffect(() => {
  installSkipLinks();
}, []);

// Avoid: No way to skip navigation
```

### 4. Use Semantic ARIA

```typescript
// Good
<button
  aria-expanded={isOpen}
  aria-controls="menu"
  onClick={toggle}
>
  Menu
</button>

// Avoid
<div onClick={toggle}>Menu</div>
```

### 5. Respect Reduced Motion

```typescript
// Good
const transition = prefersReducedMotion()
  ? 'none'
  : 'all 300ms ease';

// Avoid: Force animations
const transition = 'all 300ms ease';
```

### 6. Ensure Color Contrast

```typescript
// Good: Check contrast
const isValid = checkContrast(
  hexToRgb(textColor),
  hexToRgb(bgColor)
).aa;

// Avoid: Use without checking
```

## React Integration

### Custom Hooks

```typescript
// useAnnounce hook
function useAnnounce() {
  return useCallback((message, priority = 'polite') => {
    announce(message, priority);
  }, []);
}

// useFocusTrap hook
function useFocusTrap(isActive, containerRef) {
  useEffect(() => {
    if (isActive && containerRef.current) {
      const trap = createFocusTrap({
        container: containerRef.current
      });
      trap.activate();
      return () => trap.deactivate();
    }
  }, [isActive, containerRef]);
}

// useReducedMotion hook
function useReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(
    prefersReducedMotion()
  );

  useEffect(() => {
    return onReducedMotionChange(setPrefersReduced);
  }, []);

  return prefersReduced;
}
```

### Example Components

```typescript
// Accessible Modal
function AccessibleModal({ isOpen, onClose, children }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      announce('Modal opened');
      const trap = createFocusTrap({
        container: modalRef.current,
        escapeDeactivates: true,
        onEscape: onClose
      });
      trap.activate();

      return () => {
        trap.deactivate();
        announce('Modal closed');
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {children}
    </div>
  );
}

// Accessible Tabs
function AccessibleTabs({ tabs }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tabListRef = useRef(null);

  useEffect(() => {
    if (tabListRef.current) {
      const roving = createRovingTabindex({
        container: tabListRef.current,
        itemSelector: '[role="tab"]',
        orientation: 'horizontal',
        onFocus: (_, index) => setSelectedIndex(index)
      });
      roving.init();
      return () => roving.destroy();
    }
  }, []);

  return (
    <div>
      <div ref={tabListRef} role="tablist">
        {tabs.map((tab, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === selectedIndex}
            aria-controls={`panel-${i}`}
            onClick={() => setSelectedIndex(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={i}
          id={`panel-${i}`}
          role="tabpanel"
          hidden={i !== selectedIndex}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

## WCAG Compliance

This module helps achieve WCAG 2.1 compliance:

### Level A
- Keyboard accessible
- Text alternatives (via ARIA labels)
- Focus visible (CSS provided)

### Level AA
- Color contrast checking
- Resize text support
- Focus order (roving tabindex)

### Level AAA
- Enhanced contrast checking
- Extended keyboard support
- Reduced motion support

## See Also

- [Loading States](/home/user/enzyme/docs/ux/LOADING_STATES.md) - Accessible loading indicators
- [Skeleton Factory](/home/user/enzyme/docs/ux/SKELETON_FACTORY.md) - Loading placeholders
- [UI Components](/home/user/enzyme/docs/ui/README.md) - Accessible UI components
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Official WCAG documentation

---

**Version:** 3.0.0
**Last Updated:** 2025-11-29
