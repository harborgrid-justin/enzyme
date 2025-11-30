# Advanced Layouts

Intelligent, adaptive layout components that respond to container size and content density, not viewport dimensions.

## Table of Contents

- [Overview](#overview)
- [Adaptive Layouts](#adaptive-layouts)
- [Context-Aware Layouts](#context-aware-layouts)
- [Responsive Patterns](#responsive-patterns)
- [Examples](#examples)

## Overview

The Advanced Layouts module provides container query-based responsive design, adaptive grids, and context-aware components that respond to their actual available space rather than viewport dimensions.

### Key Features

- **Container Queries**: Respond to container size, not viewport
- **Adaptive Grid**: Auto-organizing masonry and grid layouts
- **Content Density Detection**: Automatically adjust based on content
- **Context-Aware Components**: Components that know their layout context
- **Responsive Utilities**: Hooks and helpers for adaptive UIs

## Quick Start

```tsx
import {
  AppLayout,
  SidebarLayout,
  ResponsiveContainer,
  useLayoutContext
} from '@missionfabric-js/enzyme/layouts';

function App() {
  return (
    <AppLayout
      header={<Header />}
      sidebar={<Sidebar />}
      footer={<Footer />}
    >
      <MainContent />
    </AppLayout>
  );
}

function MainContent() {
  const { isMobile, sidebarCollapsed } = useLayoutContext();

  return (
    <ResponsiveContainer
      mobile={<MobileView />}
      desktop={<DesktopView />}
    />
  );
}
```

### Available Exports

| Export | Type | Description |
|--------|------|-------------|
| `AppLayout` | Component | Main application layout |
| `SidebarLayout` | Component | Sidebar-based layout |
| `ResponsiveContainer` | Component | Viewport-aware container |
| `AdaptiveContainer` | Component | Container query-based container |
| `AdaptiveGrid` | Component | Self-organizing grid with masonry |
| `FlexBox` | Component | Context-aware flex container |
| `GridBox` | Component | Context-aware grid container |
| `useLayoutContext` | Hook | Access layout state |
| `useContainerQuery` | Hook | Container query hook |

## Adaptive Layouts

### AdaptiveContainer

Container that provides size information to children via container queries.

```tsx
import { AdaptiveContainer } from '@missionfabric-js/enzyme/layouts';

function Page() {
  return (
    <AdaptiveContainer
      breakpoints={{
        sm: 400,
        md: 600,
        lg: 800,
        xl: 1000
      }}
      detectDensity
      padding={24}
      maxWidth={1200}
      centered
    >
      <YourContent />
    </AdaptiveContainer>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `breakpoints` | `ContainerBreakpoints` | See below | Container breakpoints |
| `detectDensity` | `boolean` | `true` | Enable density detection |
| `padding` | `number \| BoxSpacing` | `16` | Container padding |
| `maxWidth` | `number \| string` | - | Maximum width |
| `centered` | `boolean` | `false` | Center container |
| `children` | `ReactNode` | - | Child content |

#### ContainerBreakpoints

```typescript
interface ContainerBreakpoints {
  xs?: number;  // Extra small
  sm?: number;  // Small
  md?: number;  // Medium
  lg?: number;  // Large
  xl?: number;  // Extra large
}
```

### AdaptiveGrid

Self-organizing grid with masonry support.

```tsx
import { AdaptiveGrid } from '@missionfabric-js/enzyme/layouts';

function Gallery({ items }) {
  return (
    <AdaptiveGrid
      minColumnWidth={250}
      maxColumns={4}
      gap={20}
      masonry
    >
      {items.map(item => (
        <Card key={item.id} {...item} />
      ))}
    </AdaptiveGrid>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `minColumnWidth` | `number` | `200` | Minimum column width |
| `maxColumns` | `number` | `6` | Maximum columns |
| `gap` | `number` | `16` | Gap between items |
| `autoRows` | `boolean` | `true` | Auto-size rows |
| `autoFlow` | `'row' \| 'column' \| 'dense'` | `'row'` | Grid auto flow |
| `masonry` | `boolean` | `false` | Enable masonry layout |
| `children` | `ReactNode` | - | Grid items |

### AdaptiveStack

Responsive stack that switches between vertical and horizontal based on space.

```tsx
import { AdaptiveStack } from '@missionfabric-js/enzyme/layouts';

function ResponsiveActions() {
  return (
    <AdaptiveStack
      direction="horizontal"
      breakAt={600}
      gap={16}
      align="center"
    >
      <button>Save</button>
      <button>Cancel</button>
      <button>Delete</button>
    </AdaptiveStack>
  );
}
```

## Context-Aware Layouts

### ContextAwareBox

Generic container that provides layout context to children.

```tsx
import { ContextAwareBox } from '@missionfabric-js/enzyme/layouts';

function Component() {
  return (
    <ContextAwareBox
      layoutHint="flex"
      onContextReady={(context) => {
        console.log('Container width:', context.containerWidth);
      }}
    >
      <Content />
    </ContextAwareBox>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `ElementType` | `'div'` | HTML element to render |
| `layoutHint` | `LayoutType` | - | Layout type hint |
| `provideContext` | `boolean` | `false` | Provide context to children |
| `onContextReady` | `(context: DOMContext) => void` | - | Context ready callback |

### FlexBox

Context-aware flex container.

```tsx
import { FlexBox } from '@missionfabric-js/enzyme/layouts';

function Header() {
  return (
    <FlexBox
      direction="row"
      justify="between"
      align="center"
      gap={16}
    >
      <Logo />
      <Navigation />
      <UserMenu />
    </FlexBox>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `direction` | `'row' \| 'column' \| 'row-reverse' \| 'column-reverse'` | `'row'` | Flex direction |
| `justify` | `'start' \| 'end' \| 'center' \| 'between' \| 'around' \| 'evenly'` | - | Justify content |
| `align` | `'start' \| 'end' \| 'center' \| 'stretch' \| 'baseline'` | - | Align items |
| `wrap` | `boolean \| 'reverse'` | - | Flex wrap |
| `gap` | `number \| string` | - | Gap between items |

### GridBox

Context-aware grid container.

```tsx
import { GridBox } from '@missionfabric-js/enzyme/layouts';

function Dashboard() {
  return (
    <GridBox
      columns={3}
      gap={24}
      autoFlow="dense"
    >
      <Widget span={2}>Revenue</Widget>
      <Widget>Users</Widget>
      <Widget>Orders</Widget>
      <Widget span={2}>Chart</Widget>
      <Widget>Stats</Widget>
    </GridBox>
  );
}
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `number \| string` | - | Grid columns |
| `rows` | `number \| string` | - | Grid rows |
| `gap` | `number \| string` | - | Gap between items |
| `rowGap` | `number \| string` | - | Row gap |
| `columnGap` | `number \| string` | - | Column gap |
| `autoFlow` | `'row' \| 'column' \| 'dense'` | - | Auto flow direction |

## Responsive Patterns

### Container Queries

Use container size instead of viewport:

```tsx
import { AdaptiveContainer, useContainerQuery } from '@missionfabric-js/enzyme/layouts';

function ResponsiveCard() {
  const isLarge = useContainerQuery('lg');
  const isSmall = useContainerQuery('sm');

  return (
    <div>
      {isLarge && <LargeLayout />}
      {!isLarge && isSmall && <MediumLayout />}
      {!isSmall && <SmallLayout />}
    </div>
  );
}

function Page() {
  return (
    <AdaptiveContainer breakpoints={{ sm: 400, lg: 800 }}>
      <ResponsiveCard />
    </AdaptiveContainer>
  );
}
```

### Responsive Values

Get different values based on container size:

```tsx
import { useContainerValue } from '@missionfabric-js/enzyme/layouts';

function ResponsiveGrid() {
  const columns = useContainerValue({
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 6
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {items.map(item => <Item key={item.id} {...item} />)}
    </div>
  );
}
```

### Content Density Adaptation

Adjust UI based on content density:

```tsx
import { AdaptiveContainer } from '@missionfabric-js/enzyme/layouts';

function DensityAwareList({ items }) {
  return (
    <AdaptiveContainer detectDensity>
      {({ density }) => (
        <div data-density={density}>
          {density === 'high' ? (
            // Compact view for high density
            <CompactList items={items} />
          ) : density === 'low' ? (
            // Expanded view for low density
            <ExpandedList items={items} />
          ) : (
            // Normal view
            <NormalList items={items} />
          )}
        </div>
      )}
    </AdaptiveContainer>
  );
}
```

## Examples

### Responsive Product Grid

```tsx
import { AdaptiveContainer, AdaptiveGrid } from '@missionfabric-js/enzyme/layouts';

function ProductGrid({ products }) {
  return (
    <AdaptiveContainer
      breakpoints={{ sm: 400, md: 800, lg: 1200 }}
      padding={24}
      maxWidth={1400}
      centered
    >
      <AdaptiveGrid
        minColumnWidth={280}
        maxColumns={5}
        gap={24}
        masonry
      >
        {products.map(product => (
          <ProductCard key={product.id} {...product} />
        ))}
      </AdaptiveGrid>
    </AdaptiveContainer>
  );
}
```

### Adaptive Dashboard Layout

```tsx
import { AdaptiveContainer, GridBox, useContainerQuery } from '@missionfabric-js/enzyme/layouts';

function Dashboard() {
  return (
    <AdaptiveContainer breakpoints={{ sm: 600, lg: 1000 }}>
      <DashboardContent />
    </AdaptiveContainer>
  );
}

function DashboardContent() {
  const isLarge = useContainerQuery('lg');
  const isSmall = useContainerQuery('sm');

  if (isLarge) {
    return (
      <GridBox columns={3} gap={24}>
        <MetricsPanel span={2} />
        <Sidebar />
        <Chart span={3} />
        <Table span={2} />
        <Stats />
      </GridBox>
    );
  }

  if (isSmall) {
    return (
      <GridBox columns={2} gap={16}>
        <MetricsPanel span={2} />
        <Chart span={2} />
        <Table span={2} />
        <Stats span={2} />
        <Sidebar span={2} />
      </GridBox>
    );
  }

  // Mobile: Single column
  return (
    <FlexBox direction="column" gap={16}>
      <MetricsPanel />
      <Chart />
      <Table />
      <Stats />
      <Sidebar />
    </FlexBox>
  );
}
```

### Masonry Photo Gallery

```tsx
import { AdaptiveGrid } from '@missionfabric-js/enzyme/layouts';

function PhotoGallery({ photos }) {
  return (
    <AdaptiveGrid
      minColumnWidth={300}
      maxColumns={4}
      gap={16}
      masonry
    >
      {photos.map(photo => (
        <Photo
          key={photo.id}
          src={photo.url}
          alt={photo.caption}
          aspectRatio={photo.aspectRatio}
        />
      ))}
    </AdaptiveGrid>
  );
}

function Photo({ src, alt, aspectRatio }) {
  return (
    <div style={{ aspectRatio }}>
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
}
```

### Responsive Form Layout

```tsx
import { AdaptiveContainer, FlexBox, GridBox, useContainerQuery } from '@missionfabric-js/enzyme/layouts';

function RegistrationForm() {
  return (
    <AdaptiveContainer
      breakpoints={{ sm: 500 }}
      padding={32}
      maxWidth={800}
      centered
    >
      <FormContent />
    </AdaptiveContainer>
  );
}

function FormContent() {
  const isWide = useContainerQuery('sm');

  if (isWide) {
    return (
      <GridBox columns={2} gap={24}>
        <Input label="First Name" />
        <Input label="Last Name" />
        <Input label="Email" span={2} />
        <Input label="Phone" />
        <Input label="Country" />
        <Button type="submit" span={2}>Register</Button>
      </GridBox>
    );
  }

  return (
    <FlexBox direction="column" gap={16}>
      <Input label="First Name" />
      <Input label="Last Name" />
      <Input label="Email" />
      <Input label="Phone" />
      <Input label="Country" />
      <Button type="submit">Register</Button>
    </FlexBox>
  );
}
```

### Sidebar Layout with Breakpoints

```tsx
import { AdaptiveContainer, FlexBox, useContainerQuery } from '@missionfabric-js/enzyme/layouts';

function AppLayout({ children }) {
  return (
    <AdaptiveContainer breakpoints={{ md: 768, lg: 1024 }}>
      <LayoutContent>{children}</LayoutContent>
    </AdaptiveContainer>
  );
}

function LayoutContent({ children }) {
  const isLarge = useContainerQuery('lg');
  const isMedium = useContainerQuery('md');

  if (isLarge) {
    // Desktop: Side-by-side with fixed sidebar
    return (
      <FlexBox direction="row" gap={0}>
        <Sidebar width={280} />
        <main style={{ flex: 1 }}>{children}</main>
      </FlexBox>
    );
  }

  if (isMedium) {
    // Tablet: Collapsible sidebar
    return (
      <FlexBox direction="row" gap={0}>
        <CollapsibleSidebar />
        <main style={{ flex: 1 }}>{children}</main>
      </FlexBox>
    );
  }

  // Mobile: Bottom navigation
  return (
    <FlexBox direction="column" gap={0}>
      <main style={{ flex: 1 }}>{children}</main>
      <BottomNavigation />
    </FlexBox>
  );
}
```

## Best Practices

1. **Use Container Queries**: Prefer container-based breakpoints over viewport
2. **Progressive Enhancement**: Start with mobile layout, enhance for larger containers
3. **Content-First Design**: Let content determine breakpoints
4. **Minimize Re-layouts**: Use CSS for layout when possible
5. **Test at Different Sizes**: Components should work in any container size
6. **Avoid Fixed Dimensions**: Use relative units and flex/grid

## Performance Tips

1. **Memoize Calculations**: Container queries are automatically optimized
2. **Use CSS Containment**: AdaptiveContainer uses `container-type`
3. **Minimize Context Updates**: Context only updates when size changes
4. **Lazy Load Images**: Use responsive image loading in grids
5. **Virtual Scrolling**: For large lists, use virtualization

## API Reference

See the [Advanced Features Overview](../advanced/README.md) for complete API documentation.

## Related Documentation

### Main Documentation
- [Documentation Index](../INDEX.md) - All documentation resources
- [Architecture Guide](../ARCHITECTURE.md) - System architecture
- [Layouts Overview](../LAYOUTS.md) - Adaptive and context-aware layouts guide
- [Advanced Features](../advanced/README.md) - Advanced feature guides

### UI Components
- [UI Components](../ui/README.md) - UI component library
- [Layout Components](../ui/LAYOUT_COMPONENTS.md) - Page, Sidebar, TopNav components
- [Data Components](../ui/DATA_COMPONENTS.md) - Responsive data tables

### Theme & Styling
- [Theme System](../theme/README.md) - Theme-aware responsive design
- [Design Tokens](../theme/DESIGN_TOKENS.md) - Spacing, breakpoint tokens
- [Design System](../DESIGN_SYSTEM.md) - Design tokens and layout patterns

### UX & Performance
- [Loading States](../ux/LOADING_STATES.md) - Layout-aware loading states
- [Skeleton Factory](../ux/SKELETON_FACTORY.md) - Skeleton layouts
- [Performance Guide](../performance/README.md) - Layout performance optimization

### Hooks & Integration
- [Hooks](../hooks/README.md) - Layout hooks and utilities
- [Integration Patterns](../integration/README.md) - How modules work together
- [UI + Theme Integration](../integration/UI_THEME_HOOKS_ACCESSIBILITY.md) - Layout integration
