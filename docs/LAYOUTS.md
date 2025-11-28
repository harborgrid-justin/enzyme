# Adaptive & Context-Aware Layouts Guide

> **Intelligent layout systems** - Content-aware, context-aware, and adaptive layouts that respond to content type, DOM context, and viewport changes with zero CLS.

---

## Table of Contents

1. [Overview](#overview)
2. [Adaptive Layouts](#adaptive-layouts)
3. [Context-Aware Layouts](#context-aware-layouts)
4. [Layout Morphing](#layout-morphing)
5. [CLS Prevention](#cls-prevention)
6. [Configuration](#configuration)
7. [Usage Patterns](#usage-patterns)
8. [Best Practices](#best-practices)

---

## Overview

Harbor React includes two complementary layout systems:

### 1. Adaptive Layouts

Content-aware layouts that automatically adjust based on content type and density:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ADAPTIVE LAYOUTS                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Content Analysis ─▶ Layout Decision ─▶ Morph Transition                │
│                                                                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │   Few Items     │───▶│   Grid Layout   │───▶│   Smooth        │     │
│  │   (< 10)        │    │   (Cards)       │    │   Transition    │     │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘     │
│                                                                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │   Many Items    │───▶│   List Layout   │───▶│   Smooth        │     │
│  │   (> 10)        │    │   (Compact)     │    │   Transition    │     │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Context-Aware Layouts

Layouts that understand their DOM position and parent constraints:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CONTEXT-AWARE LAYOUTS                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  DOM Context ─▶ Parent Constraints ─▶ Optimal Layout                    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Parent: Sidebar (narrow)                                        │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  Child adapts to: Single column, compact spacing        │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Parent: Main Content (wide)                                     │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  Child adapts to: Multi-column, generous spacing        │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Adaptive Layouts

### Architecture

```typescript
interface AdaptiveLayout {
  /**
   * Analyzes content to determine optimal layout
   */
  contentAnalyzer: ContentAnalyzer;

  /**
   * Computes and applies layout
   */
  layoutEngine: LayoutEngine;

  /**
   * Handles layout transitions
   */
  morphTransition: MorphTransition;

  /**
   * Prevents layout shifts
   */
  clsGuard: CLSGuard;
}

interface ContentAnalyzer {
  analyze(items: unknown[]): ContentProfile;
}

interface ContentProfile {
  count: number;
  density: 'sparse' | 'normal' | 'dense';
  hasImages: boolean;
  hasLongText: boolean;
  averageItemSize: { width: number; height: number };
}
```

### AdaptiveContainer Component

```tsx
import { AdaptiveContainer } from '@/lib/layouts';

function ProductList({ products }) {
  return (
    <AdaptiveContainer
      items={products}
      layouts={{
        sparse: 'grid', // < 6 items
        normal: 'grid', // 6-20 items
        dense: 'list',  // > 20 items
      }}
      transitions={{
        duration: 300,
        easing: 'ease-out',
      }}
    >
      {(layout) =>
        products.map((product) => (
          <ProductCard key={product.id} layout={layout} product={product} />
        ))
      }
    </AdaptiveContainer>
  );
}
```

### Layout Modes

#### Grid Layout

Best for visual content with few items:

```tsx
<AdaptiveContainer
  items={items}
  gridConfig={{
    minColumnWidth: 280,
    maxColumns: 4,
    gap: 24,
    aspectRatio: 16 / 9,
  }}
>
  {(layout) => <GridContent layout={layout} />}
</AdaptiveContainer>
```

#### List Layout

Best for dense content or many items:

```tsx
<AdaptiveContainer
  items={items}
  listConfig={{
    itemHeight: 72,
    gap: 8,
    showDividers: true,
  }}
>
  {(layout) => <ListContent layout={layout} />}
</AdaptiveContainer>
```

#### Compact Layout

Best for limited space or accessibility:

```tsx
<AdaptiveContainer
  items={items}
  compactConfig={{
    columns: 1,
    spacing: 'tight',
    showIcons: false,
  }}
>
  {(layout) => <CompactContent layout={layout} />}
</AdaptiveContainer>
```

### Threshold Configuration

```tsx
<AdaptiveContainer
  items={items}
  thresholds={{
    // Switch from grid to list at 20 items
    gridToList: 20,
    // Switch to compact at 50 items
    listToCompact: 50,
    // Consider viewport too
    viewportBreakpoints: {
      sm: { maxItems: 10, layout: 'list' },
      md: { maxItems: 20, layout: 'grid' },
      lg: { maxItems: 40, layout: 'grid' },
    },
  }}
>
  {(layout) => <Content layout={layout} />}
</AdaptiveContainer>
```

---

## Context-Aware Layouts

### DOM Context System

```typescript
interface DOMContext {
  /**
   * Chain of layout ancestors
   */
  ancestors: LayoutAncestor[];

  /**
   * Current viewport information
   */
  viewport: ViewportInfo;

  /**
   * Nearest scroll container
   */
  scrollContainer: ScrollContainer;

  /**
   * Portal root if in portal
   */
  portalRoot?: Element;
}

interface LayoutAncestor {
  type: 'grid' | 'flex' | 'block' | 'inline';
  dimensions: DOMRect;
  constraints: LayoutConstraints;
}

interface LayoutConstraints {
  maxWidth?: number;
  minWidth?: number;
  availableWidth: number;
  availableHeight: number;
}
```

### useDOMContext Hook

```tsx
import { useDOMContext } from '@/lib/layouts';

function ContextAwareCard() {
  const context = useDOMContext();

  // Adapt based on available space
  const isNarrow = context.ancestors[0]?.constraints.availableWidth < 300;

  return (
    <div className={isNarrow ? 'compact-card' : 'full-card'}>
      {isNarrow ? <CompactView /> : <FullView />}
    </div>
  );
}
```

### useLayoutAncestry Hook

```tsx
import { useLayoutAncestry } from '@/lib/layouts';

function AdaptiveWidget() {
  const ancestry = useLayoutAncestry();

  // Find nearest grid parent
  const gridParent = ancestry.find((a) => a.type === 'grid');

  // Adapt columns based on grid
  const columns = gridParent
    ? Math.floor(gridParent.constraints.availableWidth / 200)
    : 1;

  return (
    <div style={{ gridColumn: `span ${columns}` }}>
      <WidgetContent />
    </div>
  );
}
```

### useViewportPosition Hook

```tsx
import { useViewportPosition } from '@/lib/layouts';

function PositionAwareTooltip({ children, content }) {
  const { isAboveFold, distanceFromEdge } = useViewportPosition();

  // Position tooltip based on available space
  const position = isAboveFold ? 'below' : 'above';
  const alignment = distanceFromEdge.right < 200 ? 'right' : 'left';

  return (
    <Tooltip position={position} alignment={alignment} content={content}>
      {children}
    </Tooltip>
  );
}
```

### Context Provider

```tsx
import { LayoutContextProvider } from '@/lib/layouts';

function App() {
  return (
    <LayoutContextProvider
      config={{
        observeResize: true,
        observeScroll: true,
        debounceMs: 16,
      }}
    >
      <AppContent />
    </LayoutContextProvider>
  );
}
```

---

## Layout Morphing

### Smooth Transitions Between Layouts

```typescript
interface MorphTransition {
  /**
   * Starting layout state
   */
  from: LayoutState;

  /**
   * Target layout state
   */
  to: LayoutState;

  /**
   * Animation duration in ms
   */
  duration: number;

  /**
   * Easing function
   */
  easing: string;

  /**
   * Callback when transition completes
   */
  onComplete?: () => void;
}
```

### Using MorphContainer

```tsx
import { MorphContainer } from '@/lib/layouts';

function AnimatedLayout({ layout, children }) {
  return (
    <MorphContainer
      layout={layout}
      transition={{
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      preserveAspectRatio
    >
      {children}
    </MorphContainer>
  );
}
```

### Layout State Snapshots

```tsx
import { useLayoutSnapshot, useMorphTransition } from '@/lib/layouts';

function MorphingGrid({ items, columns }) {
  const containerRef = useRef(null);
  const snapshot = useLayoutSnapshot(containerRef);
  const { startMorph } = useMorphTransition();

  const handleColumnsChange = (newColumns) => {
    // Capture current positions
    const beforeSnapshot = snapshot.capture();

    // Update columns
    setColumns(newColumns);

    // Animate to new positions
    requestAnimationFrame(() => {
      startMorph(beforeSnapshot, {
        duration: 250,
        easing: 'ease-out',
      });
    });
  };

  return (
    <div ref={containerRef} style={{ columns }}>
      {items.map((item) => (
        <GridItem key={item.id} item={item} />
      ))}
    </div>
  );
}
```

---

## CLS Prevention

### Zero-CLS Layout Reservations

Prevent Cumulative Layout Shift with space reservations:

```tsx
import { LayoutReservation } from '@/lib/layouts';

function ImageGallery({ images }) {
  return (
    <div className="gallery">
      {images.map((image) => (
        <LayoutReservation
          key={image.id}
          aspectRatio={image.width / image.height}
          fallbackHeight={200}
        >
          <img
            src={image.src}
            alt={image.alt}
            loading="lazy"
          />
        </LayoutReservation>
      ))}
    </div>
  );
}
```

### CLSGuard Component

```tsx
import { CLSGuard } from '@/lib/layouts';

function DynamicContent({ content }) {
  return (
    <CLSGuard
      minHeight={100}
      estimatedHeight={300}
      onShift={(delta) => {
        console.log(`Layout shifted by ${delta}px`);
      }}
    >
      <DynamicComponent content={content} />
    </CLSGuard>
  );
}
```

### Skeleton Placeholders

```tsx
import { SkeletonLayout } from '@/lib/layouts';

function ProductCardSkeleton() {
  return (
    <SkeletonLayout
      structure={[
        { type: 'image', aspectRatio: 16 / 9 },
        { type: 'text', lines: 1, width: '80%' },
        { type: 'text', lines: 1, width: '60%' },
        { type: 'text', lines: 2, width: '100%' },
      ]}
      animate
    />
  );
}

function ProductList({ products, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

---

## Configuration

### LayoutConfig Interface

```typescript
interface LayoutConfig {
  /**
   * Adaptive layout settings
   */
  adaptive: {
    enabled: boolean;
    thresholds: {
      sparse: number;
      dense: number;
    };
    defaultLayout: 'grid' | 'list' | 'compact';
  };

  /**
   * Context awareness settings
   */
  context: {
    enabled: boolean;
    observeResize: boolean;
    observeScroll: boolean;
    debounceMs: number;
  };

  /**
   * Morph transition settings
   */
  morph: {
    enabled: boolean;
    defaultDuration: number;
    defaultEasing: string;
  };

  /**
   * CLS prevention settings
   */
  cls: {
    enabled: boolean;
    reserveSpace: boolean;
    trackShifts: boolean;
  };
}
```

### Global Configuration

```tsx
import { configureLayouts } from '@/lib/layouts';

configureLayouts({
  adaptive: {
    enabled: true,
    thresholds: {
      sparse: 6,
      dense: 30,
    },
    defaultLayout: 'grid',
  },
  context: {
    enabled: true,
    observeResize: true,
    observeScroll: true,
    debounceMs: 16,
  },
  morph: {
    enabled: true,
    defaultDuration: 300,
    defaultEasing: 'ease-out',
  },
  cls: {
    enabled: true,
    reserveSpace: true,
    trackShifts: true,
  },
});
```

---

## Usage Patterns

### Responsive Dashboard

```tsx
function Dashboard() {
  return (
    <LayoutContextProvider>
      <div className="dashboard">
        {/* Sidebar adapts to viewport */}
        <ContextAwareSidebar />

        {/* Main content with adaptive grid */}
        <main>
          <AdaptiveContainer
            items={widgets}
            layouts={{
              sparse: 'grid',
              normal: 'grid',
              dense: 'list',
            }}
          >
            {(layout) => (
              <WidgetGrid layout={layout} widgets={widgets} />
            )}
          </AdaptiveContainer>
        </main>
      </div>
    </LayoutContextProvider>
  );
}
```

### Context-Aware Sidebar

```tsx
function ContextAwareSidebar() {
  const context = useDOMContext();
  const isCollapsed = context.viewport.width < 1024;

  return (
    <MorphContainer
      layout={isCollapsed ? 'collapsed' : 'expanded'}
      transition={{ duration: 200 }}
    >
      <aside className={isCollapsed ? 'w-16' : 'w-64'}>
        <NavItems collapsed={isCollapsed} />
      </aside>
    </MorphContainer>
  );
}
```

### Portal-Aware Modals

```tsx
function ContextAwareModal({ children }) {
  const context = useDOMContext();

  // Detect if we're in a portal
  const inPortal = context.portalRoot !== undefined;

  // Adjust positioning based on context
  const position = inPortal
    ? { position: 'fixed', inset: 0 }
    : { position: 'absolute', top: '50%', left: '50%' };

  return (
    <div style={position}>
      {children}
    </div>
  );
}
```

---

## Best Practices

### 1. Reserve Space for Dynamic Content

```tsx
// DO: Reserve space
<LayoutReservation aspectRatio={16/9}>
  <AsyncImage />
</LayoutReservation>

// DON'T: Let content push layout
<AsyncImage /> // Will cause CLS
```

### 2. Use Appropriate Thresholds

```tsx
// DO: Set thresholds based on content type
<AdaptiveContainer
  thresholds={{
    // Products look better in grid
    gridToList: 30,
  }}
>
  <Products />
</AdaptiveContainer>

// DON'T: Use defaults blindly
```

### 3. Smooth Transitions

```tsx
// DO: Animate layout changes
<MorphContainer transition={{ duration: 300 }}>
  {content}
</MorphContainer>

// DON'T: Instant layout changes (jarring)
```

### 4. Consider Performance

```tsx
// DO: Debounce resize observers
<LayoutContextProvider config={{ debounceMs: 16 }}>
  {children}
</LayoutContextProvider>

// DON'T: Update on every pixel change
```

### 5. Test Different Content Amounts

```tsx
// DO: Test with various content sizes
// - Empty state
// - Few items
// - Many items
// - Edge cases
```

---

## API Reference

### Components

| Component | Description |
|-----------|-------------|
| `AdaptiveContainer` | Content-aware layout container |
| `MorphContainer` | Animated layout transitions |
| `LayoutReservation` | CLS-preventing space reservation |
| `CLSGuard` | Layout shift detector |
| `SkeletonLayout` | Structured skeleton placeholders |
| `LayoutContextProvider` | DOM context provider |

### Hooks

| Hook | Description |
|------|-------------|
| `useDOMContext` | Access DOM context |
| `useLayoutAncestry` | Get layout ancestors |
| `useViewportPosition` | Viewport-relative position |
| `useLayoutSnapshot` | Capture layout state |
| `useMorphTransition` | Trigger morph animations |

---

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Performance Guide](./PERFORMANCE.md)
- [Design System](./DESIGN_SYSTEM.md)
- [Components Reference](./COMPONENTS_REFERENCE.md)

---

<p align="center">
  <strong>Adaptive & Context-Aware Layouts</strong><br>
  Intelligent layouts for dynamic content
</p>
