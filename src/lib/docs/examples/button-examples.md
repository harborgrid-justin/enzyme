# Button Component Examples

> **Module**: `@/lib/ui/inputs`
> **Component**: `Button`, `IconButton`, `ButtonGroup`

This guide provides comprehensive examples for using the Button component system.

---

## Table of Contents

- [Basic Usage](#basic-usage)
- [Variants](#variants)
- [Sizes](#sizes)
- [Loading States](#loading-states)
- [Icons](#icons)
- [Full Width](#full-width)
- [Button Groups](#button-groups)
- [Icon Buttons](#icon-buttons)
- [Form Integration](#form-integration)
- [Accessibility](#accessibility)

---

## Basic Usage

### Simple Button

```tsx
import { Button } from '@/lib/ui/inputs';

function MyComponent() {
  return (
    <Button onClick={() => console.log('Clicked!')}>
      Click Me
    </Button>
  );
}
```

### With Type Safety

```tsx
import { Button, type ButtonProps } from '@/lib/ui/inputs';

const MyButton: React.FC<ButtonProps> = (props) => {
  return <Button {...props} />;
};
```

---

## Variants

### Primary (Default)

```tsx
<Button variant="primary">Primary Action</Button>
```

### Secondary

```tsx
<Button variant="secondary">Secondary Action</Button>
```

### Outline

```tsx
<Button variant="outline">Outline Button</Button>
```

### Ghost

```tsx
<Button variant="ghost">Ghost Button</Button>
```

### Destructive

```tsx
<Button variant="destructive">Delete Item</Button>
```

### All Variants Together

```tsx
function VariantShowcase() {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
  );
}
```

---

## Sizes

### Small

```tsx
<Button size="sm">Small Button</Button>
```

### Medium (Default)

```tsx
<Button size="md">Medium Button</Button>
```

### Large

```tsx
<Button size="lg">Large Button</Button>
```

### Size Comparison

```tsx
function SizeShowcase() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  );
}
```

---

## Loading States

### Basic Loading

```tsx
function LoadingExample() {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    await someAsyncOperation();
    setIsLoading(false);
  };

  return (
    <Button loading={isLoading} onClick={handleClick}>
      {isLoading ? 'Saving...' : 'Save'}
    </Button>
  );
}
```

### Loading with Disabled State

```tsx
<Button loading disabled>
  Processing...
</Button>
```

### Loading Preserves Width

```tsx
function WidthPreservingLoad() {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      loading={loading}
      onClick={() => setLoading(true)}
      style={{ minWidth: '120px' }}
    >
      {loading ? 'Loading' : 'Submit Form'}
    </Button>
  );
}
```

---

## Icons

### Left Icon

```tsx
import { PlusIcon } from '@heroicons/react/24/outline';

<Button leftIcon={<PlusIcon width={16} height={16} />}>
  Add Item
</Button>
```

### Right Icon

```tsx
import { ArrowRightIcon } from '@heroicons/react/24/outline';

<Button rightIcon={<ArrowRightIcon width={16} height={16} />}>
  Continue
</Button>
```

### Both Icons

```tsx
import { DocumentIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

<Button
  leftIcon={<DocumentIcon width={16} height={16} />}
  rightIcon={<ArrowDownTrayIcon width={16} height={16} />}
>
  Download Report
</Button>
```

### Icon with Loading

```tsx
function IconLoadingExample() {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      leftIcon={<SaveIcon width={16} height={16} />}
      loading={loading}
      onClick={() => setLoading(true)}
    >
      Save Changes
    </Button>
  );
}
```

---

## Full Width

### Full Width Button

```tsx
<Button fullWidth>Full Width Button</Button>
```

### In a Form

```tsx
function LoginForm() {
  return (
    <form style={{ maxWidth: '400px' }}>
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <Button fullWidth variant="primary" type="submit">
        Sign In
      </Button>
    </form>
  );
}
```

---

## Button Groups

### Horizontal Group

```tsx
import { ButtonGroup, Button } from '@/lib/ui/inputs';

<ButtonGroup>
  <Button variant="outline">Left</Button>
  <Button variant="outline">Middle</Button>
  <Button variant="outline">Right</Button>
</ButtonGroup>
```

### Vertical Group

```tsx
<ButtonGroup direction="vertical">
  <Button variant="outline">Top</Button>
  <Button variant="outline">Middle</Button>
  <Button variant="outline">Bottom</Button>
</ButtonGroup>
```

### With Gap

```tsx
<ButtonGroup gap={12}>
  <Button>Option A</Button>
  <Button>Option B</Button>
  <Button>Option C</Button>
</ButtonGroup>
```

### Toggle Group Pattern

```tsx
function ToggleGroup() {
  const [selected, setSelected] = useState('day');

  return (
    <ButtonGroup>
      {['day', 'week', 'month'].map((period) => (
        <Button
          key={period}
          variant={selected === period ? 'primary' : 'outline'}
          onClick={() => setSelected(period)}
        >
          {period.charAt(0).toUpperCase() + period.slice(1)}
        </Button>
      ))}
    </ButtonGroup>
  );
}
```

---

## Icon Buttons

### Basic Icon Button

```tsx
import { IconButton } from '@/lib/ui/inputs';
import { TrashIcon } from '@heroicons/react/24/outline';

<IconButton
  icon={<TrashIcon width={20} height={20} />}
  aria-label="Delete item"
  onClick={handleDelete}
/>
```

### Icon Button Variants

```tsx
<IconButton
  icon={<EditIcon />}
  variant="ghost"
  aria-label="Edit"
/>

<IconButton
  icon={<TrashIcon />}
  variant="destructive"
  aria-label="Delete"
/>
```

### Icon Button Sizes

```tsx
<IconButton icon={<PlusIcon />} size="sm" aria-label="Add" />
<IconButton icon={<PlusIcon />} size="md" aria-label="Add" />
<IconButton icon={<PlusIcon />} size="lg" aria-label="Add" />
```

### Icon Button in Toolbar

```tsx
function Toolbar() {
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      <IconButton icon={<BoldIcon />} aria-label="Bold" variant="ghost" />
      <IconButton icon={<ItalicIcon />} aria-label="Italic" variant="ghost" />
      <IconButton icon={<UnderlineIcon />} aria-label="Underline" variant="ghost" />
    </div>
  );
}
```

---

## Form Integration

### Submit Button

```tsx
function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <Button type="submit" loading={isSubmitting}>
        Send Message
      </Button>
    </form>
  );
}
```

### Form with Cancel

```tsx
function EditForm({ onCancel, onSave }) {
  return (
    <form>
      {/* form fields */}
      <ButtonGroup>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          Save Changes
        </Button>
      </ButtonGroup>
    </form>
  );
}
```

### Disabled While Invalid

```tsx
function ValidatedForm() {
  const [isValid, setIsValid] = useState(false);

  return (
    <form>
      <input onChange={(e) => setIsValid(e.target.value.length > 0)} />
      <Button type="submit" disabled={!isValid}>
        Submit
      </Button>
    </form>
  );
}
```

---

## Accessibility

### Proper Labels

```tsx
// For icon-only buttons, always provide aria-label
<IconButton
  icon={<CloseIcon />}
  aria-label="Close dialog"
/>

// For regular buttons, children serve as label
<Button>Submit Form</Button>
```

### Loading Announcement

```tsx
// The Button component automatically sets aria-busy during loading
<Button loading aria-label="Submitting form">
  Submit
</Button>
// Announces: "Submitting form, busy"
```

### Disabled State

```tsx
// aria-disabled is automatically set
<Button disabled>
  Cannot Click
</Button>
```

### Focus Visible

```tsx
// Focus styles are automatically applied for keyboard navigation
// No additional configuration needed
<Button>Keyboard Accessible</Button>
```

### With Screen Reader Only Text

```tsx
<Button>
  Delete
  <span className="sr-only"> item: Product Name</span>
</Button>
```

---

## Advanced Patterns

### Confirmation Button

```tsx
function ConfirmButton({ onConfirm, children }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <ButtonGroup>
        <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        <Button variant="destructive" size="sm" onClick={onConfirm}>
          Confirm
        </Button>
      </ButtonGroup>
    );
  }

  return (
    <Button variant="destructive" onClick={() => setConfirming(true)}>
      {children}
    </Button>
  );
}
```

### Async Button with Error Handling

```tsx
function AsyncButton({ onClick, children }) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  const handleClick = async () => {
    setState('loading');
    try {
      await onClick();
      setState('idle');
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  };

  return (
    <Button
      onClick={handleClick}
      loading={state === 'loading'}
      variant={state === 'error' ? 'destructive' : 'primary'}
    >
      {state === 'error' ? 'Error - Retry?' : children}
    </Button>
  );
}
```

### Button with Tooltip

```tsx
function ButtonWithTooltip({ tooltip, ...props }) {
  return (
    <div title={tooltip}>
      <Button {...props} />
    </div>
  );
}

// Usage
<ButtonWithTooltip tooltip="Save your changes">
  Save
</ButtonWithTooltip>
```

---

## See Also

- [Theme Tokens Examples](./theme-tokens-examples.md)
- [Accessibility Examples](./accessibility-examples.md)
- [Form Examples](./form-examples.md)
