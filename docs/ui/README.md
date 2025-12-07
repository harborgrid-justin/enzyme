# UI Components Library

> Comprehensive, accessible, and performant React components for @missionfabric-js/enzyme

## Overview

The Enzyme UI component library provides a complete set of production-ready React components built with performance, accessibility, and developer experience in mind. All components are fully typed, memoized for optimal performance, and follow WCAG 2.1 AA accessibility standards.

## Design Principles

### 1. Accessibility First
- All components meet WCAG 2.1 AA standards
- Proper ARIA attributes and semantic HTML
- Keyboard navigation support
- Screen reader friendly
- Focus management and visible focus indicators

### 2. Performance Optimized
- Static styles extracted to prevent re-creation
- Dynamic styles memoized with `useMemo`
- Components wrapped with `React.memo`
- Stable callbacks using `useCallback`
- Minimal re-renders

### 3. Theme Integration
- Consistent use of design tokens from the theme system
- CSS variable support for dynamic theming
- Dark mode support built-in
- Customizable via theme tokens

### 4. TypeScript Native
- Full TypeScript support with comprehensive types
- Proper generic type preservation
- IntelliSense-friendly API
- Type-safe prop validation

## Component Categories

### Layout Components
- **[Page](/home/user/enzyme/docs/ui/LAYOUT_COMPONENTS.md#page)** - Standard page wrapper with title, metadata, and padding
- **[Sidebar](/home/user/enzyme/docs/ui/LAYOUT_COMPONENTS.md#sidebar)** - Collapsible sidebar navigation with nested items
- **[TopNav](/home/user/enzyme/docs/ui/LAYOUT_COMPONENTS.md#topnav)** - Global top navigation with dropdowns and user menu

### Navigation Components
- **[MainNav](/home/user/enzyme/docs/ui/NAVIGATION_COMPONENTS.md#mainnav)** - Main navigation with auth and feature flag integration
- **[Breadcrumbs](/home/user/enzyme/docs/ui/NAVIGATION_COMPONENTS.md#breadcrumbs)** - Auto-generated breadcrumb navigation

### Data Display Components
- **[DataTable](/home/user/enzyme/docs/ui/DATA_COMPONENTS.md#datatable)** - Feature-rich data table with sorting, pagination, and selection
- **[VirtualizedDataTable](/home/user/enzyme/docs/ui/DATA_COMPONENTS.md#virtualizeddatatable)** - High-performance virtualized table for large datasets

### Feedback Components
- **[Spinner](/home/user/enzyme/docs/ui/FEEDBACK_COMPONENTS.md#spinner)** - Loading spinner with multiple sizes and variants
- **[LoadingOverlay](/home/user/enzyme/docs/ui/FEEDBACK_COMPONENTS.md#loadingoverlay)** - Full-page loading overlay with focus trap
- **[Toast](/home/user/enzyme/docs/ui/FEEDBACK_COMPONENTS.md#toast)** - Toast notification system with multiple variants

### Input Components
- **[Button](/home/user/enzyme/docs/ui/INPUT_COMPONENTS.md#button)** - Versatile button with variants, sizes, and loading states
- **[IconButton](/home/user/enzyme/docs/ui/INPUT_COMPONENTS.md#iconbutton)** - Icon-only button variant
- **[ButtonGroup](/home/user/enzyme/docs/ui/INPUT_COMPONENTS.md#buttongroup)** - Group related buttons

## Quick Start

### Installation

The UI components are part of the @missionfabric-js/enzyme package:

```bash
npm install @missionfabric-js/enzyme
```

### Basic Usage

```tsx
import { Button, DataTable, Page, useToast } from '@missionfabric-js/enzyme';

function MyComponent() {
  const { showToast } = useToast();

  const handleClick = () => {
    showToast('Action completed!', 'success');
  };

  return (
    <Page title="My Page">
      <Button onClick={handleClick}>
        Click Me
      </Button>
    </Page>
  );
}
```

### With Theme Provider

All UI components work seamlessly with the theme system:

```tsx
import { ThemeProvider } from '@missionfabric-js/enzyme';
import { App } from './App';

function Root() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}
```

## Importing Components

Components can be imported individually or as a group:

```tsx
// Individual imports (tree-shakeable)
import { Button } from '@missionfabric-js/enzyme/ui';
import { DataTable } from '@missionfabric-js/enzyme/ui/data';

// Group imports
import * as UI from '@missionfabric-js/enzyme/ui';
```

## Styling Approach

The component library uses a hybrid styling approach:

1. **Inline Styles with Theme Tokens**: Most components use inline styles powered by design tokens from the theme system
2. **CSS Variables**: Theme-aware colors use CSS variables for dynamic theme switching
3. **Static Styles**: Performance-critical static styles are extracted outside components
4. **Memoized Dynamic Styles**: Dynamic styles are memoized with `useMemo`

Example:

```tsx
// Static style extracted
const baseButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: tokens.radius.md,
};

// Dynamic style memoized
const buttonStyle = useMemo(() => ({
  ...baseButtonStyle,
  backgroundColor: variantProps.background,
  color: variantProps.color,
}), [variantProps]);
```

## Accessibility Features

All components include:

- **Semantic HTML**: Proper use of semantic elements
- **ARIA Attributes**: Comprehensive ARIA labeling and roles
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Visible focus indicators and focus trapping where appropriate
- **Screen Reader Support**: Hidden labels and live regions
- **Color Contrast**: WCAG AA compliant color combinations

## Performance Considerations

### Memoization Strategy

All components follow a consistent memoization pattern:

```tsx
export const Component = memo(({ prop1, prop2 }) => {
  // Memoize computed values
  const computedValue = useMemo(() => {
    return expensiveComputation(prop1);
  }, [prop1]);

  // Stable callbacks
  const handleClick = useCallback(() => {
    doSomething(prop2);
  }, [prop2]);

  return <div onClick={handleClick}>{computedValue}</div>;
});
```

### Code Splitting

Large components support lazy loading:

```tsx
import { lazy, Suspense } from 'react';

const LazyDataTable = lazy(() => import('@missionfabric-js/enzyme/ui/data'));

function MyComponent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyDataTable data={data} columns={columns} />
    </Suspense>
  );
}
```

## Responsive Design

Components are responsive by default and adapt to different screen sizes:

- Mobile-first approach
- Flexible layouts using flexbox and grid
- Breakpoint-aware components
- Touch-friendly interactive elements

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Component Documentation

### Component Categories

For detailed documentation on each component category:

- **[Data Components](/home/user/enzyme/docs/ui/DATA_COMPONENTS.md)** - DataTable, VirtualizedDataTable
- **[Feedback Components](/home/user/enzyme/docs/ui/FEEDBACK_COMPONENTS.md)** - Spinner, LoadingOverlay, Toast
- **[Input Components](/home/user/enzyme/docs/ui/INPUT_COMPONENTS.md)** - Button, IconButton, ButtonGroup
- **[Layout Components](/home/user/enzyme/docs/ui/LAYOUT_COMPONENTS.md)** - Page, Sidebar, TopNav
- **[Navigation Components](/home/user/enzyme/docs/ui/NAVIGATION_COMPONENTS.md)** - MainNav, Breadcrumbs

### Related Documentation

**Theme System:**
- **[Theme System Overview](/home/user/enzyme/docs/theme/README.md)** - Theming and design tokens
- **[Dark Mode](/home/user/enzyme/docs/theme/DARK_MODE.md)** - Dark mode implementation guide
- **[Theme Provider](/home/user/enzyme/docs/theme/PROVIDER.md)** - Theme provider setup
- **[Design Tokens](/home/user/enzyme/docs/theme/DESIGN_TOKENS.md)** - Complete token reference

**UX Utilities:**
- **[UX Utilities](/home/user/enzyme/docs/ux/README.md)** - Loading states, skeletons, accessibility
- **[Skeleton Factory](/home/user/enzyme/docs/ux/SKELETON_FACTORY.md)** - Loading placeholders
- **[Loading States](/home/user/enzyme/docs/ux/LOADING_STATES.md)** - Progressive loading indicators
- **[Accessibility](/home/user/enzyme/docs/ux/ACCESSIBILITY.md)** - Accessibility utilities

**Layout & Design:**
- **[Layouts](/home/user/enzyme/docs/LAYOUTS.md)** - Adaptive and context-aware layouts
- **[Design System](/home/user/enzyme/docs/DESIGN_SYSTEM.md)** - Design tokens and patterns
- **[Components Reference](/home/user/enzyme/docs/COMPONENTS_REFERENCE.md)** - Complete component API

## Contributing

When adding new components:

1. Follow the established patterns for memoization and styling
2. Ensure WCAG 2.1 AA compliance
3. Add comprehensive TypeScript types
4. Include usage examples in documentation
5. Write unit tests for critical functionality
6. Document all props and their purposes

## Examples

See the [examples directory](/home/user/enzyme/examples/ui) for complete usage examples of each component.
