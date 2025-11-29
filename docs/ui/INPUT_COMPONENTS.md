# Input Components

> Interactive input components for user interactions

## Overview

Input components provide accessible, styled, and performant interactive elements for user input and actions. All components support keyboard navigation, proper ARIA attributes, and theme integration.

---

## Button

A versatile button component with multiple variants, sizes, loading states, and icon support.

### Location

```
/home/user/enzyme/src/lib/ui/inputs/Button.tsx
```

### Features

- 5 variants (primary, secondary, outline, ghost, destructive)
- 3 sizes (sm, md, lg)
- Loading state with spinner
- Left and right icon support
- Full width option
- Disabled state
- Ref forwarding
- Full keyboard support
- WCAG compliant focus indicators

### Props

```typescript
interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: CSSProperties;  // Custom styles merged with base styles
}
```

### Variants

#### Primary
- **Appearance**: Filled button with primary brand color
- **Background**: Primary blue (#3b82f6)
- **Text**: White
- **Hover**: Darker blue (#2563eb)
- **Use**: Primary actions, CTAs, main form submissions

#### Secondary
- **Appearance**: Filled button with secondary color
- **Background**: Light gray (#f1f5f9)
- **Text**: Primary text color
- **Hover**: Medium gray
- **Use**: Secondary actions, cancel buttons

#### Outline
- **Appearance**: Transparent background with border
- **Background**: Transparent
- **Border**: Gray border
- **Text**: Primary text color
- **Hover**: Light gray background
- **Use**: Tertiary actions, alternate choices

#### Ghost
- **Appearance**: Transparent with no border
- **Background**: Transparent
- **Border**: None
- **Text**: Secondary text color
- **Hover**: Light gray background
- **Use**: Low-emphasis actions, icon buttons

#### Destructive
- **Appearance**: Filled button with error color
- **Background**: Red (#ef4444)
- **Text**: White
- **Hover**: Darker red
- **Use**: Delete, remove, destructive actions

### Sizes

| Size | Padding | Font Size | Min Height | Icon Size |
|------|---------|-----------|------------|-----------|
| sm   | 0.25rem 0.5rem | 0.875rem | 2rem | 14px |
| md   | 0.5rem 1rem | 0.875rem | 2.5rem | 16px |
| lg   | 0.5rem 1.5rem | 1rem | 3rem | 20px |

### Basic Usage

```typescript
import { Button } from '@missionfabric-js/enzyme';

function MyForm() {
  return (
    <div>
      <Button variant="primary">Submit</Button>
      <Button variant="secondary">Cancel</Button>
    </div>
  );
}
```

### With Icons

```typescript
import { CheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

function ButtonExamples() {
  return (
    <>
      {/* Left icon */}
      <Button variant="primary" leftIcon={<CheckIcon />}>
        Save Changes
      </Button>

      {/* Right icon */}
      <Button variant="outline" rightIcon={<ArrowRightIcon />}>
        Next Step
      </Button>

      {/* Both icons */}
      <Button leftIcon={<CheckIcon />} rightIcon={<ArrowRightIcon />}>
        Complete
      </Button>
    </>
  );
}
```

### Loading State

```typescript
function SaveButton() {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveData();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Button
      variant="primary"
      isLoading={isSaving}
      onClick={handleSave}
    >
      Save Changes
    </Button>
  );
}
```

The loading state:
- Displays a spinner in place of content
- Keeps button dimensions stable
- Automatically sets `disabled` and `aria-busy` attributes
- Spinner color adapts to button variant

### Full Width

```typescript
<Button variant="primary" fullWidth>
  Full Width Button
</Button>
```

### With Ref

```typescript
function FocusButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <Button ref={buttonRef} variant="primary">
      Auto-focused Button
    </Button>
  );
}
```

### Disabled State

```typescript
<Button variant="primary" disabled>
  Cannot Click
</Button>
```

Disabled buttons:
- 50% opacity
- Not clickable (pointer-events: none)
- Cursor shows "not-allowed"
- Proper `aria-disabled` attribute

### Custom Styling

```typescript
<Button
  variant="primary"
  style={{
    borderRadius: '20px',
    padding: '1rem 2rem',
  }}
>
  Custom Styled
</Button>
```

---

## IconButton

Icon-only button variant for actions without text labels.

### Props

```typescript
interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  icon: ReactNode;
  'aria-label': string;  // Required for accessibility
}
```

### Usage

```typescript
import { IconButton } from '@missionfabric-js/enzyme';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

function ActionButtons() {
  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <IconButton
        icon={<PencilIcon width={16} />}
        variant="ghost"
        aria-label="Edit item"
      />
      <IconButton
        icon={<TrashIcon width={16} />}
        variant="destructive"
        aria-label="Delete item"
      />
    </div>
  );
}
```

### Size Reference

IconButtons automatically apply square padding:
- **sm**: 0.25rem padding, 14px icon recommended
- **md**: 0.5rem padding, 16px icon recommended (default)
- **lg**: 0.5rem padding, 20px icon recommended

### Accessibility

IconButton requires `aria-label` to describe the action for screen readers since there's no visible text.

---

## ButtonGroup

Container component for grouping related buttons.

### Props

```typescript
interface ButtonGroupProps {
  children: ReactNode;
  direction?: 'horizontal' | 'vertical';
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: CSSProperties;
}
```

### Gap Sizes

| Size | Spacing |
|------|---------|
| sm   | 0.25rem |
| md   | 0.5rem |
| lg   | 1rem |

### Usage

```typescript
import { ButtonGroup, Button } from '@missionfabric-js/enzyme';

function FormActions() {
  return (
    <ButtonGroup gap="md">
      <Button variant="primary">Save</Button>
      <Button variant="secondary">Save as Draft</Button>
      <Button variant="outline">Cancel</Button>
    </ButtonGroup>
  );
}
```

### Vertical Layout

```typescript
<ButtonGroup direction="vertical" gap="sm">
  <Button variant="outline">Option 1</Button>
  <Button variant="outline">Option 2</Button>
  <Button variant="outline">Option 3</Button>
</ButtonGroup>
```

### Custom Gap

```typescript
<ButtonGroup gap="lg">
  <Button variant="primary">Submit</Button>
  <Button variant="destructive">Delete</Button>
</ButtonGroup>
```

---

## Component Composition

Buttons can be composed with other components:

### With Tooltip

```typescript
import { Button } from '@missionfabric-js/enzyme';
import { Tooltip } from '@some-tooltip-library';

<Tooltip content="Save your changes">
  <Button variant="primary" leftIcon={<SaveIcon />}>
    Save
  </Button>
</Tooltip>
```

### With Dropdown

```typescript
import { Button, IconButton } from '@missionfabric-js/enzyme';
import { Menu } from '@headlessui/react';

<Menu>
  <Menu.Button as={Button} variant="outline">
    Options
  </Menu.Button>
  <Menu.Items>
    <Menu.Item>{/* ... */}</Menu.Item>
  </Menu.Items>
</Menu>
```

### In Forms

```typescript
function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" name="email" />
      <input type="password" name="password" />

      <ButtonGroup gap="md">
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          fullWidth
        >
          Sign In
        </Button>
        <Button
          type="button"
          variant="ghost"
          fullWidth
        >
          Forgot Password?
        </Button>
      </ButtonGroup>
    </form>
  );
}
```

---

## Accessibility

All button components include comprehensive accessibility features:

### ARIA Attributes
- `aria-disabled` for disabled state
- `aria-busy` for loading state
- `aria-label` for icon-only buttons
- Proper `role="button"` inherited from `<button>` element

### Keyboard Support
- **Enter**: Activates button
- **Space**: Activates button
- **Tab**: Focuses button (standard browser behavior)

### Focus Indicators
- Visible focus ring on keyboard navigation
- 2px outline in primary color
- 2px offset from button
- Only shows on `:focus-visible` (not on mouse click)
- WCAG 2.4.7 compliant

### Screen Readers
- Button text announced
- Loading state announced as "Loading..."
- Disabled state announced
- Icon-only buttons require descriptive labels

---

## Performance

Buttons are optimized for performance:

- **Memoization**: All buttons are wrapped with `React.memo`
- **Static Styles**: Base styles extracted to prevent re-creation
- **Dynamic Styles**: Computed styles memoized with `useMemo`
- **Stable Callbacks**: Event handlers preserved across renders
- **Style Injection**: Focus styles injected once at module load

---

## Theming

Buttons use theme tokens for consistent styling:

```typescript
import { tokens, colorTokens } from '@missionfabric-js/enzyme';

// Spacing
padding: tokens.spacing.sm
gap: tokens.spacing.sm

// Border radius
borderRadius: tokens.radius.md

// Font
fontWeight: tokens.fontWeight.medium

// Colors
primary: colorTokens.primary.default
hover: colorTokens.primary.hover
```

### Custom Variant

You can create custom button styles:

```typescript
<Button
  style={{
    backgroundColor: colorTokens.success.default,
    color: colorTokens.neutral.white,
  }}
>
  Custom Success Button
</Button>
```

---

## Best Practices

1. **Use Semantic Variants**: Choose variants that match action importance
2. **Loading States**: Always show loading state for async actions
3. **Descriptive Labels**: Use clear, action-oriented text
4. **Icon Consistency**: Use icons consistently across your app
5. **Disabled State**: Disable buttons when actions are unavailable
6. **Form Types**: Use `type="submit"` for form submissions
7. **Aria Labels**: Always provide labels for icon-only buttons

---

## Examples

### Dialog Actions

```typescript
<ButtonGroup gap="md">
  <Button variant="outline" onClick={onCancel}>
    Cancel
  </Button>
  <Button variant="primary" onClick={onConfirm}>
    Confirm
  </Button>
</ButtonGroup>
```

### Destructive Action

```typescript
<Button
  variant="destructive"
  leftIcon={<TrashIcon />}
  onClick={handleDelete}
  isLoading={isDeleting}
>
  Delete Account
</Button>
```

### Pagination

```typescript
<ButtonGroup gap="sm">
  <IconButton
    icon={<ChevronLeftIcon />}
    variant="outline"
    disabled={currentPage === 0}
    aria-label="Previous page"
  />
  <IconButton
    icon={<ChevronRightIcon />}
    variant="outline"
    disabled={currentPage === lastPage}
    aria-label="Next page"
  />
</ButtonGroup>
```

---

## See Also

- [Feedback Components](/home/user/enzyme/docs/ui/FEEDBACK_COMPONENTS.md) - For loading spinners
- [Theme Tokens](/home/user/enzyme/docs/theme/DESIGN_TOKENS.md) - For customization
- [Layout Components](/home/user/enzyme/docs/ui/LAYOUT_COMPONENTS.md) - For page layouts
