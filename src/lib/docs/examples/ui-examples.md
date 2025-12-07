# UI Component Examples

> 28+ practical UI component examples for the Harbor React Library covering buttons, forms, modals, and more.

## Table of Contents

- [Buttons](#buttons)
- [Forms and Inputs](#forms-and-inputs)
- [Modals and Dialogs](#modals-and-dialogs)
- [Tooltips and Popovers](#tooltips-and-popovers)
- [Tables and Lists](#tables-and-lists)
- [Loading States](#loading-states)
- [Theming](#theming)
- [Responsive Design](#responsive-design)
- [Accessibility](#accessibility)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

---

## Buttons

### Example 1: Button Variants

**Use Case:** Different button styles for different actions
**Difficulty:** ⭐ Basic

```tsx
import { Button } from '@/lib/ui';

function ButtonExamples() {
  return (
    <div className="button-group">
      {/* Primary action */}
      <Button variant="primary">Save Changes</Button>

      {/* Secondary action */}
      <Button variant="secondary">Cancel</Button>

      {/* Destructive action */}
      <Button variant="destructive">Delete</Button>

      {/* Ghost/subtle button */}
      <Button variant="ghost">Learn More</Button>

      {/* Link-styled button */}
      <Button variant="link">View Details</Button>

      {/* Outlined button */}
      <Button variant="outline">Export</Button>
    </div>
  );
}
```

**Explanation:** Different variants communicate action importance and type.

**See Also:**

- [Example 2](#example-2-button-sizes)
- [Button Component Docs](../components/BUTTON.md)

---

### Example 2: Button Sizes

**Use Case:** Buttons for different contexts
**Difficulty:** ⭐ Basic

```tsx
function ButtonSizes() {
  return (
    <div className="space-y-4">
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="md">Medium (Default)</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  );
}
```

**Explanation:** Size variants for different UI contexts (compact tables vs. hero CTAs).

---

### Example 3: Icon Buttons

**Use Case:** Buttons with icons
**Difficulty:** ⭐ Basic

```tsx
import { Button } from '@/lib/ui';
import { PlusIcon, TrashIcon, DownloadIcon } from '@/lib/icons';

function IconButtons() {
  return (
    <div className="button-group">
      {/* Icon only */}
      <Button variant="ghost" size="icon" aria-label="Add item">
        <PlusIcon />
      </Button>

      {/* Icon with text */}
      <Button>
        <PlusIcon className="mr-2" />
        Add Item
      </Button>

      {/* Icon on right */}
      <Button>
        Download
        <DownloadIcon className="ml-2" />
      </Button>

      {/* Loading state with icon */}
      <Button disabled>
        <LoadingIcon className="mr-2 animate-spin" />
        Processing...
      </Button>
    </div>
  );
}
```

**Explanation:** Icons enhance button meaning and usability.

---

### Example 4: Button States

**Use Case:** Interactive states
**Difficulty:** ⭐⭐ Intermediate

```tsx
function ButtonStates() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await performAction();
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Default */}
      <Button>Default</Button>

      {/* Hover (CSS handled) */}
      <Button>Hover Me</Button>

      {/* Active/Pressed */}
      <Button className="active">Active</Button>

      {/* Disabled */}
      <Button disabled>Disabled</Button>

      {/* Loading */}
      <Button disabled={loading} onClick={handleClick}>
        {loading ? (
          <>
            <LoadingIcon className="mr-2 animate-spin" />
            Loading...
          </>
        ) : (
          'Click Me'
        )}
      </Button>

      {/* Focus (CSS handled with focus-visible) */}
      <Button>Tab to Focus</Button>
    </div>
  );
}
```

**Explanation:** Different states provide visual feedback to users.

---

## Forms and Inputs

### Example 5: Input Component

**Use Case:** Standard form inputs
**Difficulty:** ⭐ Basic

```tsx
import { Input, Label } from '@/lib/ui';

function InputExample() {
  return (
    <div className="space-y-4">
      {/* Basic input */}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
        />
      </div>

      {/* With error */}
      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          error
          aria-invalid="true"
          aria-describedby="username-error"
        />
        <p id="username-error" className="text-sm text-red-600 mt-1">
          Username is already taken
        </p>
      </div>

      {/* Disabled */}
      <div>
        <Label htmlFor="disabled">Disabled</Label>
        <Input
          id="disabled"
          disabled
          value="Cannot edit"
        />
      </div>

      {/* With icon */}
      <div className="relative">
        <Label htmlFor="search">Search</Label>
        <SearchIcon className="absolute left-3 top-9 text-gray-400" />
        <Input
          id="search"
          className="pl-10"
          placeholder="Search..."
        />
      </div>
    </div>
  );
}
```

**Explanation:** Input components with labels, error states, and accessibility features.

---

### Example 6: Select Component

**Use Case:** Dropdown selection
**Difficulty:** ⭐ Basic

```tsx
import { Select, Label } from '@/lib/ui';

function SelectExample() {
  const [value, setValue] = useState('');

  return (
    <div className="space-y-4">
      {/* Basic select */}
      <div>
        <Label htmlFor="country">Country</Label>
        <Select
          id="country"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        >
          <option value="">Select a country</option>
          <option value="us">United States</option>
          <option value="uk">United Kingdom</option>
          <option value="ca">Canada</option>
        </Select>
      </div>

      {/* With groups */}
      <div>
        <Label htmlFor="timezone">Timezone</Label>
        <Select id="timezone">
          <optgroup label="North America">
            <option value="est">Eastern Time</option>
            <option value="cst">Central Time</option>
            <option value="pst">Pacific Time</option>
          </optgroup>
          <optgroup label="Europe">
            <option value="gmt">GMT</option>
            <option value="cet">Central European Time</option>
          </optgroup>
        </Select>
      </div>
    </div>
  );
}
```

**Explanation:** Select components for choosing from predefined options.

---

### Example 7: Checkbox and Radio

**Use Case:** Boolean and single-choice inputs
**Difficulty:** ⭐ Basic

```tsx
import { Checkbox, Radio, Label } from '@/lib/ui';

function ChoiceInputs() {
  const [agreed, setAgreed] = useState(false);
  const [plan, setPlan] = useState('basic');

  return (
    <div className="space-y-6">
      {/* Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="terms"
          checked={agreed}
          onCheckedChange={setAgreed}
        />
        <Label htmlFor="terms" className="cursor-pointer">
          I agree to the terms and conditions
        </Label>
      </div>

      {/* Radio group */}
      <div className="space-y-3">
        <Label>Select a plan</Label>

        <div className="flex items-center space-x-2">
          <Radio
            id="basic"
            name="plan"
            value="basic"
            checked={plan === 'basic'}
            onChange={(e) => setPlan(e.target.value)}
          />
          <Label htmlFor="basic" className="cursor-pointer">
            Basic - $9/month
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Radio
            id="pro"
            name="plan"
            value="pro"
            checked={plan === 'pro'}
            onChange={(e) => setPlan(e.target.value)}
          />
          <Label htmlFor="pro" className="cursor-pointer">
            Pro - $29/month
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Radio
            id="enterprise"
            name="plan"
            value="enterprise"
            checked={plan === 'enterprise'}
            onChange={(e) => setPlan(e.target.value)}
          />
          <Label htmlFor="enterprise" className="cursor-pointer">
            Enterprise - Contact us
          </Label>
        </div>
      </div>
    </div>
  );
}
```

**Explanation:** Checkboxes for multiple choices, radios for single choice.

---

### Example 8: Textarea Component

**Use Case:** Multi-line text input
**Difficulty:** ⭐ Basic

```tsx
import { Textarea, Label } from '@/lib/ui';

function TextareaExample() {
  const [value, setValue] = useState('');
  const maxLength = 500;

  return (
    <div className="space-y-4">
      {/* Basic textarea */}
      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          placeholder="Tell us about yourself..."
          rows={4}
        />
      </div>

      {/* With character count */}
      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={maxLength}
          rows={6}
        />
        <p className="text-sm text-gray-600 mt-1">
          {value.length}/{maxLength} characters
        </p>
      </div>

      {/* Auto-resize */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          className="resize-none"
          rows={3}
          style={{ minHeight: '80px' }}
          onInput={(e) => {
            e.currentTarget.style.height = 'auto';
            e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
          }}
        />
      </div>
    </div>
  );
}
```

**Explanation:** Textarea for longer text input with optional character counting and auto-resize.

---

## Modals and Dialogs

### Example 9: Basic Modal

**Use Case:** Standard modal dialog
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/lib/ui';

function BasicModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Open Modal
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modal Title</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p>This is the modal content.</p>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

**Explanation:** Standard modal with header, content, and footer.

---

### Example 10: Confirmation Dialog

**Use Case:** Confirm destructive actions
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { AlertDialog, AlertDialogContent, AlertDialogHeader } from '@/lib/ui';

function DeleteConfirmation({ itemName, onConfirm }: ConfirmationProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete
      </Button>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete "{itemName}". This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Explanation:** Alert dialog for confirming destructive actions with clear messaging.

---

### Example 11: Form Modal

**Use Case:** Modal with form submission
**Difficulty:** ⭐⭐ Intermediate

```tsx
function CreateUserModal() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await createUser(formData);
    setOpen(false);
    setFormData({ name: '', email: '' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        Create User
      </Button>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Explanation:** Modal containing a form with validation and submission.

---

## Tooltips and Popovers

### Example 12: Tooltip Component

**Use Case:** Contextual help text
**Difficulty:** ⭐ Basic

```tsx
import { Tooltip, TooltipTrigger, TooltipContent } from '@/lib/ui';

function TooltipExample() {
  return (
    <div className="space-y-4">
      {/* Basic tooltip */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon">
            <InfoIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>This is helpful information</p>
        </TooltipContent>
      </Tooltip>

      {/* Tooltip with position */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="underline cursor-help">Hover me</span>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Tooltip on the right</p>
        </TooltipContent>
      </Tooltip>

      {/* Rich tooltip */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button>Premium Feature</Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">Unlock Premium</p>
            <p className="text-sm">
              This feature is available on our Pro and Enterprise plans.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
```

**Explanation:** Tooltips provide contextual information on hover/focus.

---

### Example 13: Popover Component

**Use Case:** Interactive popup content
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { Popover, PopoverTrigger, PopoverContent } from '@/lib/ui';

function PopoverExample() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open Settings</Button>
      </PopoverTrigger>

      <PopoverContent className="w-80">
        <div className="space-y-4">
          <h4 className="font-medium">Preferences</h4>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications">Notifications</Label>
              <Switch id="notifications" />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <Switch id="dark-mode" />
            </div>

            <div>
              <Label htmlFor="language">Language</Label>
              <Select id="language" className="w-full">
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
              </Select>
            </div>
          </div>

          <Button className="w-full">Save Changes</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

**Explanation:** Popovers display interactive content triggered by user action.

---

## Tables and Lists

### Example 14: Data Table

**Use Case:** Display tabular data
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/lib/ui';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

function UserTable({ users }: { users: User[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.role}</TableCell>
            <TableCell>
              <Badge variant={user.status === 'active' ? 'success' : 'secondary'}>
                {user.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm">
                Edit
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

**Explanation:** Structured table for displaying and managing data.

---

### Example 15: Sortable Table

**Use Case:** User-sortable columns
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function SortableTable({ data }: { data: User[] }) {
  const [sortBy, setSortBy] = useState<keyof User>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortBy, sortOrder]);

  const handleSort = (column: keyof User) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <button
              onClick={() => handleSort('name')}
              className="flex items-center gap-2"
            >
              Name
              {sortBy === 'name' && (
                <ChevronIcon
                  className={sortOrder === 'asc' ? '' : 'rotate-180'}
                />
              )}
            </button>
          </TableHead>
          <TableHead>
            <button onClick={() => handleSort('email')}>
              Email
              {sortBy === 'email' && <ChevronIcon />}
            </button>
          </TableHead>
          {/* More columns */}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map((user) => (
          <TableRow key={user.id}>{/* Cells */}</TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

**Explanation:** Interactive table with sortable columns.

---

### Example 16: List with Empty State

**Use Case:** Handle empty data gracefully
**Difficulty:** ⭐ Basic

```tsx
function UserList({ users }: { users: User[] }) {
  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No users</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating a new user.
        </p>
        <div className="mt-6">
          <Button>
            <PlusIcon className="mr-2" />
            Add User
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-200">
      {users.map((user) => (
        <li key={user.id} className="py-4">
          <div className="flex items-center space-x-4">
            <Avatar src={user.avatar} alt={user.name} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <Button variant="ghost" size="sm">
              View
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

**Explanation:** Proper empty state improves user experience.

---

## Loading States

### Example 17: Skeleton Loaders

**Use Case:** Content placeholders during loading
**Difficulty:** ⭐ Basic

```tsx
import { Skeleton } from '@/lib/ui';

function ProductCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex justify-between">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

function ProductList({ isLoading, products }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

**Explanation:** Skeletons maintain layout and reduce perceived loading time.

---

### Example 18: Spinner Component

**Use Case:** Inline loading indicators
**Difficulty:** ⭐ Basic

```tsx
import { Spinner } from '@/lib/ui';

function SpinnerExamples() {
  return (
    <div className="space-y-8">
      {/* Different sizes */}
      <div className="flex items-center gap-4">
        <Spinner size="sm" />
        <Spinner size="md" />
        <Spinner size="lg" />
      </div>

      {/* In button */}
      <Button disabled>
        <Spinner size="sm" className="mr-2" />
        Loading...
      </Button>

      {/* Full page */}
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading content...</p>
        </div>
      </div>

      {/* Inline with text */}
      <div className="flex items-center gap-2">
        <Spinner size="sm" />
        <span>Processing your request</span>
      </div>
    </div>
  );
}
```

**Explanation:** Spinners indicate ongoing processes.

---

### Example 19: Progress Bar

**Use Case:** Show progress of operations
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { Progress } from '@/lib/ui';

function ProgressExamples() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 10));
    }, 500);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* Basic progress */}
      <div>
        <Progress value={progress} />
        <p className="text-sm text-gray-600 mt-2">{progress}% complete</p>
      </div>

      {/* With color variants */}
      <Progress value={75} variant="success" />
      <Progress value={50} variant="warning" />
      <Progress value={25} variant="error" />

      {/* File upload progress */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span>Uploading file.pdf</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Indeterminate (unknown duration) */}
      <Progress indeterminate />
    </div>
  );
}
```

**Explanation:** Progress bars show deterministic operation progress.

---

## Theming

### Example 20: Theme Provider

**Use Case:** App-wide theming
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { ThemeProvider, useTheme } from '@/lib/ui';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="app-theme">
      <MainApp />
    </ThemeProvider>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
```

**Explanation:** ThemeProvider manages app-wide theme state.

---

### Example 21: CSS Variables Theming

**Use Case:** Dynamic theme customization
**Difficulty:** ⭐⭐ Intermediate

```css
/* globals.css */
:root {
  --color-primary: 220 90% 56%;
  --color-secondary: 240 5% 64%;
  --color-background: 0 0% 100%;
  --color-foreground: 240 10% 4%;
  --color-border: 240 6% 90%;
  --radius: 0.5rem;
}

.dark {
  --color-primary: 220 90% 56%;
  --color-secondary: 240 4% 16%;
  --color-background: 240 10% 4%;
  --color-foreground: 0 0% 98%;
  --color-border: 240 4% 16%;
}
```

```tsx
// Component using theme variables
function ThemedButton() {
  return (
    <button
      style={{
        backgroundColor: 'hsl(var(--color-primary))',
        color: 'hsl(var(--color-background))',
        borderRadius: 'var(--radius)',
      }}
    >
      Themed Button
    </button>
  );
}
```

**Explanation:** CSS variables enable dynamic theming without JavaScript.

---

### Example 22: Custom Brand Colors

**Use Case:** Override default theme
**Difficulty:** ⭐⭐ Intermediate

```tsx
function BrandedApp() {
  return (
    <ThemeProvider
      theme={{
        colors: {
          primary: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            500: '#0ea5e9',
            900: '#0c4a6e',
          },
          secondary: {
            500: '#8b5cf6',
          },
        },
        fonts: {
          sans: 'Inter, system-ui, sans-serif',
          mono: 'JetBrains Mono, monospace',
        },
        radius: {
          default: '0.75rem',
          full: '9999px',
        },
      }}
    >
      <App />
    </ThemeProvider>
  );
}
```

**Explanation:** Customize theme to match brand guidelines.

---

## Responsive Design

### Example 23: Responsive Grid

**Use Case:** Adapt layout to screen size
**Difficulty:** ⭐⭐ Intermediate

```tsx
function ResponsiveGrid({ items }: { items: Product[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item) => (
        <ProductCard key={item.id} product={item} />
      ))}
    </div>
  );
}

// Responsive padding and margins
function ResponsiveContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
      {children}
    </div>
  );
}

// Responsive text sizes
function ResponsiveHeading() {
  return (
    <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold">
      Responsive Heading
    </h1>
  );
}
```

**Explanation:** Tailwind breakpoints adapt layout to different screen sizes.

---

### Example 24: Mobile Navigation

**Use Case:** Different nav for mobile/desktop
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Logo />
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <NavLink href="/products">Products</NavLink>
            <NavLink href="/pricing">Pricing</NavLink>
            <NavLink href="/about">About</NavLink>
            <Button>Sign In</Button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <MenuIcon />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <MobileNavLink href="/products">Products</MobileNavLink>
            <MobileNavLink href="/pricing">Pricing</MobileNavLink>
            <MobileNavLink href="/about">About</MobileNavLink>
            <Button className="w-full mt-4">Sign In</Button>
          </div>
        </div>
      )}
    </nav>
  );
}
```

**Explanation:** Responsive navigation adapts to mobile and desktop layouts.

---

## Accessibility

### Example 25: Accessible Form

**Use Case:** Fully accessible form components
**Difficulty:** ⭐⭐ Intermediate

```tsx
function AccessibleForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-6">
        {/* Accessible input with error */}
        <div>
          <Label htmlFor="email" required>
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            required
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-red-600 mt-1" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        {/* Accessible checkbox group */}
        <fieldset>
          <legend className="text-sm font-medium text-gray-900">
            Preferences
          </legend>
          <div className="mt-4 space-y-2">
            <div className="flex items-center">
              <Checkbox id="newsletter" />
              <Label htmlFor="newsletter" className="ml-2">
                Subscribe to newsletter
              </Label>
            </div>
            <div className="flex items-center">
              <Checkbox id="updates" />
              <Label htmlFor="updates" className="ml-2">
                Receive product updates
              </Label>
            </div>
          </div>
        </fieldset>

        {/* Submit with loading state */}
        <Button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </div>
    </form>
  );
}
```

**Explanation:** Proper ARIA attributes and semantic HTML ensure accessibility.

---

### Example 26: Focus Management

**Use Case:** Keyboard navigation and focus
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
function ModalWithFocusManagement({ open, onClose }: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus close button when modal opens
  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    }
  }, [open]);

  // Trap focus within modal
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose();
    }

    // Trap Tab key
    if (e.key === 'Tab') {
      const focusableElements = e.currentTarget.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle id="modal-title">Modal Title</DialogTitle>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close modal"
          >
            <CloseIcon />
          </button>
        </DialogHeader>
        {/* Content */}
      </DialogContent>
    </Dialog>
  );
}
```

**Explanation:** Proper focus management improves keyboard navigation.

---

### Example 27: Screen Reader Announcements

**Use Case:** Live region updates for screen readers
**Difficulty:** ⭐⭐ Intermediate

```tsx
function SearchResults({ query, results, isLoading }: SearchProps) {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (isLoading) {
      setAnnouncement('Searching...');
    } else if (results.length === 0) {
      setAnnouncement('No results found');
    } else {
      setAnnouncement(`${results.length} results found for "${query}"`);
    }
  }, [isLoading, results, query]);

  return (
    <div>
      {/* Screen reader announcement */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Visual results */}
      {isLoading ? (
        <Spinner />
      ) : (
        <ul>
          {results.map((result) => (
            <li key={result.id}>{result.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Explanation:** Live regions announce dynamic content changes to screen readers.

---

### Example 28: Skip Navigation Link

**Use Case:** Allow keyboard users to skip to main content
**Difficulty:** ⭐ Basic

```tsx
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Skip link - visually hidden until focused */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
                   bg-white px-4 py-2 rounded shadow-lg z-50"
      >
        Skip to main content
      </a>

      <Header />

      <main id="main-content" tabIndex={-1}>
        {children}
      </main>

      <Footer />
    </>
  );
}
```

**Explanation:** Skip links improve keyboard navigation by bypassing repetitive content.

---

## Best Practices

### Component Design

- ✅ **DO** use semantic HTML elements
- ✅ **DO** provide proper ARIA labels
- ✅ **DO** ensure keyboard accessibility
- ✅ **DO** support theming
- ❌ **DON'T** rely on color alone for meaning
- ❌ **DON'T** disable focus outlines without alternative

### Forms

- ✅ **DO** associate labels with inputs
- ✅ **DO** provide clear error messages
- ✅ **DO** indicate required fields
- ✅ **DO** validate on both client and server
- ❌ **DON'T** use placeholder as label
- ❌ **DON'T** auto-submit without confirmation

### Loading States

- ✅ **DO** show loading indicators
- ✅ **DO** use skeletons for layout preservation
- ✅ **DO** indicate progress when possible
- ✅ **DO** provide cancel options for long operations
- ❌ **DON'T** block entire UI unnecessarily
- ❌ **DON'T** show generic spinners for everything

### Responsive Design

- ✅ **DO** test on actual devices
- ✅ **DO** use mobile-first approach
- ✅ **DO** ensure touch targets are large enough (44x44px)
- ✅ **DO** handle orientation changes
- ❌ **DON'T** assume screen size
- ❌ **DON'T** disable zoom

---

## Anti-Patterns

### ❌ Missing Focus States

```tsx
// BAD
<button className="outline-none">Click Me</button>

// GOOD
<button className="focus-visible:ring-2 focus-visible:ring-primary">
  Click Me
</button>
```

### ❌ Inaccessible Modals

```tsx
// BAD
<div className="modal" onClick={onClose}>
  <div className="content">{children}</div>
</div>

// GOOD
<Dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="title"
  onKeyDown={(e) => e.key === 'Escape' && onClose()}
>
  <DialogContent>{children}</DialogContent>
</Dialog>
```

### ❌ Non-Descriptive Buttons

```tsx
// BAD
<button>Click here</button>
<button><DeleteIcon /></button>

// GOOD
<button>Delete user account</button>
<button aria-label="Delete user account"><DeleteIcon /></button>
```

---

## See Also

- [UI Component Library](../COMPONENTS.md) - Complete component documentation
- [Accessibility Guide](../ACCESSIBILITY.md) - Accessibility best practices
- [Theming Guide](../THEMING.md) - Advanced theming documentation
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Documentation Index](../INDEX.md) - All documentation resources
