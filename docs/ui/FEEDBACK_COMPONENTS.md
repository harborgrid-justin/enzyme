# Feedback Components

> Visual feedback components for loading states, notifications, and user interactions

## Overview

Feedback components provide visual and accessible feedback to users during asynchronous operations, state changes, and notifications. All components respect user preferences for reduced motion and include proper ARIA attributes.

---

## Spinner

A versatile loading spinner component with multiple sizes and color variants.

### Location

```
/home/user/enzyme/src/lib/ui/feedback/Spinner.tsx
```

### Features

- Multiple sizes (xs, sm, md, lg, xl)
- Color variants (default, primary, secondary, white)
- Custom colors supported
- Respects `prefers-reduced-motion`
- Accessible with screen reader labels
- Centered variant available

### Props

```typescript
interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'secondary' | 'white';
  color?: string;              // Custom color
  label?: string;              // Screen reader label
  className?: string;
  centered?: boolean;          // Center in container
}
```

### Size Reference

| Size | Dimension | Border Width | Use Case |
|------|-----------|--------------|----------|
| xs   | 12px      | 2px          | Inline text, small buttons |
| sm   | 16px      | 2px          | Small UI elements |
| md   | 24px      | 3px          | Default size, buttons |
| lg   | 32px      | 4px          | Cards, sections |
| xl   | 48px      | 4px          | Full page loading |

### Visual Appearance

The spinner appears as a rotating circular border:
- Transparent border with colored top border
- Smooth 360-degree rotation animation
- Animation slows to 1.5s with stepped timing for reduced motion

### Basic Usage

```typescript
import { Spinner } from '@missionfabric-js/enzyme';

function LoadingButton() {
  return (
    <button disabled>
      <Spinner size="sm" variant="white" label="Loading..." />
      Loading...
    </button>
  );
}
```

### Variants

```typescript
// Default gray spinner
<Spinner variant="default" />

// Primary brand color
<Spinner variant="primary" />

// Secondary color
<Spinner variant="secondary" />

// White (for dark backgrounds)
<Spinner variant="white" />

// Custom color
<Spinner color="#ff6b6b" />
```

### Centered Spinner

```typescript
function LoadingSection() {
  return (
    <div style={{ height: '200px' }}>
      <Spinner centered size="lg" />
    </div>
  );
}
```

### Accessibility

- Uses `role="status"` for screen readers
- Includes hidden label with `aria-label`
- Announces loading state to assistive technologies
- Respects `prefers-reduced-motion` media query

---

## SpinnerWithText

Inline spinner with accompanying text label.

### Props

```typescript
interface SpinnerWithTextProps {
  text?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'secondary' | 'white';
  className?: string;
}
```

### Visual Appearance

- Horizontal layout with spinner and text side-by-side
- Text size adapts based on spinner size
- Gap between spinner and text for visual clarity

### Usage

```typescript
import { SpinnerWithText } from '@missionfabric-js/enzyme';

function LoadingMessage() {
  return <SpinnerWithText text="Loading data..." size="sm" />;
}
```

---

## LoadingOverlay

Full-page loading overlay with focus trap to prevent interaction with background content.

### Location

```
/home/user/enzyme/src/lib/ui/feedback/Spinner.tsx
```

### Features

- Blocks all interaction with underlying content
- Focus trap prevents tabbing to background elements
- Optional backdrop blur
- Centered spinner with optional message
- Automatic focus management
- WCAG compliant focus indicators
- Uses theme z-index tokens for proper layering

### Props

```typescript
interface LoadingOverlayProps {
  visible?: boolean;           // Show/hide overlay
  text?: string;               // Loading message
  blur?: boolean;              // Apply backdrop blur (default: true)
}
```

### Visual Appearance

- Full-screen overlay covering entire viewport
- Semi-transparent white background (80% opacity)
- Optional backdrop blur effect (4px)
- Large primary-colored spinner centered
- Text message below spinner (if provided)
- Positioned at z-index 300 (modal layer)

### Usage

```typescript
import { LoadingOverlay } from '@missionfabric-js/enzyme';

function App() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await submitData();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <LoadingOverlay visible={isLoading} text="Saving changes..." />
      <form onSubmit={handleSubmit}>
        {/* Form content */}
      </form>
    </>
  );
}
```

### Without Blur

```typescript
<LoadingOverlay visible={true} text="Processing..." blur={false} />
```

### Accessibility

The LoadingOverlay implements comprehensive accessibility features:

- **Role**: `alertdialog` with `aria-modal="true"`
- **Focus Trap**: Automatically focuses overlay when shown, traps Tab key
- **Focus Restoration**: Restores focus to previous element when hidden
- **Keyboard**: Tab key is trapped within overlay
- **Screen Reader**: Announces loading state with `aria-live="assertive"`
- **Focus Indicator**: Visible focus ring on keyboard navigation (WCAG 2.4.7 compliant)

---

## Toast Notifications

A complete toast notification system with multiple variants and positions.

### Location

```
/home/user/enzyme/src/lib/ui/feedback/Toasts.tsx
```

### Features

- Multiple variants (success, error, warning, info)
- Configurable positions (6 positions)
- Auto-dismiss with configurable duration
- Manual dismiss option
- Stacking with max limit
- Animated entrance (position-aware)
- Icon indicators
- Screen reader announcements
- Respects reduced motion preferences

### Setup

Wrap your app with the `ToastProvider`:

```typescript
import { ToastProvider } from '@missionfabric-js/enzyme';

function Root() {
  return (
    <ToastProvider
      position="top-right"
      maxToasts={5}
      defaultDuration={5000}
    >
      <App />
    </ToastProvider>
  );
}
```

### ToastProvider Props

```typescript
interface ToastProviderProps {
  children: ReactNode;
  position?: 'top-left' | 'top-center' | 'top-right' |
            'bottom-left' | 'bottom-center' | 'bottom-right';
  maxToasts?: number;          // Maximum visible toasts (default: 5)
  defaultDuration?: number;    // Auto-dismiss duration in ms (default: 5000)
}
```

### Using Toasts

```typescript
import { useToast } from '@missionfabric-js/enzyme';

function MyComponent() {
  const { showToast, dismissToast, dismissAll } = useToast();

  const handleSuccess = () => {
    showToast('Operation completed successfully!', 'success');
  };

  const handleError = () => {
    showToast('An error occurred', 'error');
  };

  const handleWarning = () => {
    showToast('Please review your input', 'warning');
  };

  const handleInfo = () => {
    showToast('New update available', 'info');
  };

  return (
    <div>
      <button onClick={handleSuccess}>Show Success</button>
      <button onClick={handleError}>Show Error</button>
      <button onClick={handleWarning}>Show Warning</button>
      <button onClick={handleInfo}>Show Info</button>
      <button onClick={dismissAll}>Clear All</button>
    </div>
  );
}
```

### useToast Hook API

```typescript
interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string | ReactNode, variant: ToastVariant) => string;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}

type ToastVariant = 'success' | 'error' | 'warning' | 'info';
```

### Toast Variants

Each variant has distinct colors and icons:

#### Success
- **Color**: Green
- **Icon**: Checkmark in circle
- **Use**: Successful operations, confirmations
- **Background**: Light green (#dcfce7)
- **Border**: Medium green
- **Icon Color**: Dark green (#22c55e)

#### Error
- **Color**: Red
- **Icon**: X in circle
- **Use**: Errors, failures, critical issues
- **Background**: Light red (#fee2e2)
- **Border**: Medium red
- **Icon Color**: Dark red (#ef4444)

#### Warning
- **Color**: Yellow/Orange
- **Icon**: Triangle with exclamation
- **Use**: Warnings, caution messages
- **Background**: Light yellow (#fef3c7)
- **Border**: Medium yellow
- **Icon Color**: Orange (#f59e0b)

#### Info
- **Color**: Blue
- **Icon**: Information i in circle
- **Use**: Information, tips, updates
- **Background**: Light blue (#dbeafe)
- **Border**: Medium blue
- **Icon Color**: Blue (#3b82f6)

### Position Options

```typescript
type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';
```

Visual positioning:
- **Top positions**: Stacks downward, newest at top
- **Bottom positions**: Stacks upward, newest at bottom
- **Center positions**: Centered horizontally
- **Left/Right**: Aligned to viewport edges with margin

### Animations

Toasts animate in based on their position:
- **Left**: Slides in from left
- **Right**: Slides in from right
- **Center**: Slides down from top
- **Duration**: 300ms ease-out
- **Reduced Motion**: No animation, instant appearance

### Custom Messages

Toasts support ReactNode for custom content:

```typescript
showToast(
  <div>
    <strong>Upload Complete</strong>
    <p>Your file has been successfully uploaded.</p>
  </div>,
  'success'
);
```

### Manual Dismiss

```typescript
const toastId = showToast('Processing...', 'info');

// Later...
dismissToast(toastId);
```

### Accessibility

The toast system includes comprehensive accessibility:

- **Role**: Each toast has `role="alert"` for screen reader announcements
- **Live Region**: `aria-live="polite"` and `aria-atomic="true"`
- **Icon Labels**: Icons are hidden from screen readers with `aria-hidden="true"`
- **Variant Announcement**: Screen reader text announces toast type
- **Dismiss Button**: Labeled with `aria-label="Dismiss"`
- **Keyboard**: Tab to dismiss button, Enter/Space to activate
- **z-index**: Uses theme token (600) for proper layering

### Styling

Toasts use theme tokens for consistent styling:

```typescript
// Spacing
padding: tokens.spacing.md
gap: tokens.spacing.md
borderRadius: tokens.radius.lg

// Shadow
boxShadow: tokens.shadow.md

// Colors (from theme colorTokens)
success: colorTokens.success (lighter, light, default)
error: colorTokens.error (lighter, light, default)
warning: colorTokens.warning (lighter, light, default)
info: colorTokens.info (lighter, light, default)
```

### Best Practices

1. **Duration**: Use longer durations for important messages
2. **Limit Count**: Keep maxToasts reasonable (3-5) to avoid clutter
3. **Position**: Choose based on UI layout (avoid covering important content)
4. **Variant**: Use appropriate variant for message severity
5. **Messages**: Keep messages concise and actionable
6. **Avoid Overuse**: Don't spam users with too many toasts

### Example: Form Submission

```typescript
function ContactForm() {
  const { showToast } = useToast();

  const handleSubmit = async (data: FormData) => {
    try {
      await submitForm(data);
      showToast('Message sent successfully!', 'success');
    } catch (error) {
      showToast(
        error.message || 'Failed to send message. Please try again.',
        'error'
      );
    }
  };

  return <form onSubmit={handleSubmit}>{/* fields */}</form>;
}
```

## Performance

All feedback components are optimized for performance:

- Static styles extracted to prevent re-creation
- Dynamic styles memoized with `useMemo`
- Callbacks stabilized with `useCallback`
- Components wrapped with `React.memo`
- Animation styles injected once at module load
- Focus management optimized with refs

## See Also

- [Input Components](/home/user/enzyme/docs/ui/INPUT_COMPONENTS.md) - For button loading states
- [Theme Tokens](/home/user/enzyme/docs/theme/DESIGN_TOKENS.md) - For customization
