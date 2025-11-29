# Skeleton Factory

> Dynamic skeleton screen generation with configurable patterns, responsive layouts, and animation options

## Overview

The Skeleton Factory provides a comprehensive system for generating skeleton screens (loading placeholders) that improve perceived performance by showing content structure while data loads. It supports pre-built patterns, custom configurations, and various animation styles.

## Location

```
/home/user/enzyme/src/lib/ux/skeleton-factory.ts
```

## Key Features

- **Pre-built Patterns**: Ready-to-use skeleton patterns for common layouts
- **Custom Skeletons**: Build custom skeleton structures programmatically
- **Animation Variants**: Pulse, wave, shimmer, or no animation
- **Responsive Layouts**: Automatically adapts to different screen sizes
- **Component-based**: Returns React elements for easy integration
- **Factory Pattern**: Reusable and configurable
- **Type-safe**: Full TypeScript support

## Quick Start

```typescript
import { SkeletonFactory, createTextSkeleton, createCardSkeleton } from '@missionfabric-js/enzyme/ux';

// Using convenience functions
function LoadingArticle() {
  return (
    <div>
      {createTextSkeleton({ lines: 1, width: '80%' })}
      {createCardSkeleton({ hasImage: true, textLines: 3 })}
    </div>
  );
}

// Using factory instance
function CustomSkeleton() {
  const factory = new SkeletonFactory({
    defaultAnimation: 'shimmer',
    baseColor: '#e5e7eb',
    highlightColor: '#f3f4f6',
  });

  return factory.createFromPattern('profile');
}
```

## Skeleton Types

### Text Skeleton

Creates skeleton placeholders for text content.

```typescript
createTextSkeleton({
  lines: 3,
  width: '100%',
  lastLineWidth: '60%',
  gap: '0.5rem'
})
```

**Options:**
- `lines` - Number of text lines (default: 1)
- `width` - Width of each line (default: '100%')
- `lastLineWidth` - Width of the last line (default: same as width)
- `gap` - Spacing between lines

### Paragraph Skeleton

Creates skeleton for paragraph text with natural line variation.

```typescript
createParagraphSkeleton({
  lines: 4,
  lineVariation: true
})
```

**Options:**
- `lines` - Number of paragraph lines (default: 4)
- `lineVariation` - Randomize line widths for natural appearance (default: false)

### Avatar Skeleton

Creates skeleton for user avatars or profile images.

```typescript
createAvatarSkeleton({
  size: '48px',
  shape: 'circle' // 'circle' | 'square' | 'rounded'
})
```

**Shapes:**
- `circle` - Fully rounded (50% border radius)
- `rounded` - Rounded corners (8px)
- `square` - No rounding

### Card Skeleton

Creates skeleton for card components with optional image, title, and content.

```typescript
createCardSkeleton({
  hasImage: true,
  imageHeight: '200px',
  hasTitle: true,
  hasSubtitle: true,
  textLines: 3,
  hasButton: true
})
```

**Options:**
- `hasImage` - Include image placeholder (default: true)
- `imageHeight` - Height of image (default: '200px')
- `hasTitle` - Include title placeholder (default: true)
- `hasSubtitle` - Include subtitle placeholder (default: false)
- `textLines` - Number of content lines (default: 3)
- `hasButton` - Include button placeholder (default: false)

### List Skeleton

Creates skeleton for list items.

```typescript
createListSkeleton({
  items: 5,
  hasAvatar: true,
  hasSecondaryText: true
})
```

**Options:**
- `items` - Number of list items (default: 5)
- `hasAvatar` - Include avatar in each item (default: false)
- `hasSecondaryText` - Include secondary text line (default: false)

### Table Skeleton

Creates skeleton for data tables.

```typescript
createTableSkeleton({
  rows: 10,
  columns: 4,
  hasHeader: true
})
```

**Options:**
- `rows` - Number of table rows (default: 5)
- `columns` - Number of columns (default: 4)
- `hasHeader` - Include header row (default: true)

## Pre-built Patterns

The factory includes several pre-built patterns accessible via `createFromPattern()`:

### Article Pattern

```typescript
const factory = new SkeletonFactory();
const articleSkeleton = factory.createFromPattern('article');
```

**Structure:**
- Heading (80% width)
- Byline text (40% width)
- Featured image (100% width, 300px height)
- 3 paragraphs of text

### Profile Pattern

```typescript
const profileSkeleton = factory.createFromPattern('profile');
```

**Structure:**
- Avatar (circular)
- Name heading
- Bio text line

### Comment Pattern

```typescript
const commentSkeleton = factory.createFromPattern('comment');
```

**Structure:**
- Small avatar (32px)
- Username text
- Comment text

### Form Pattern

```typescript
const formSkeleton = factory.createFromPattern('form');
```

**Structure:**
- Label
- Input field
- Multiple form fields
- Submit button

### Dashboard Widget Pattern

```typescript
const widgetSkeleton = factory.createFromPattern('dashboard-widget');
```

**Structure:**
- Widget title
- Subtitle/metric
- Visualization placeholder

## Animation Types

### Pulse Animation

Gentle opacity pulsing effect.

```typescript
const factory = new SkeletonFactory({
  defaultAnimation: 'pulse',
  speed: 1500 // Animation duration in ms
});
```

**Best for:** Simple loading states, minimal distraction

### Wave Animation

Shimmer effect moving across the skeleton.

```typescript
const factory = new SkeletonFactory({
  defaultAnimation: 'wave',
  speed: 1500
});
```

**Best for:** Modern, engaging loading experience

### Shimmer Animation

Gradient shimmer effect.

```typescript
const factory = new SkeletonFactory({
  defaultAnimation: 'shimmer',
  speed: 1500
});
```

**Best for:** Premium feel, attention-grabbing

### No Animation

Static skeleton without animation.

```typescript
const factory = new SkeletonFactory({
  defaultAnimation: 'none'
});
```

**Best for:** Reduced motion accessibility, performance

## Configuration

### Factory Configuration

```typescript
interface SkeletonFactoryConfig {
  defaultAnimation: 'pulse' | 'wave' | 'shimmer' | 'none';
  baseColor: string;          // Background color
  highlightColor: string;     // Animation highlight color
  speed: number;              // Animation speed (ms)
  borderRadius: string;       // Default border radius
  textHeight: string;         // Default text line height
  headingHeight: string;      // Default heading height
  avatarSize: string;         // Default avatar size
  thumbnailSize: string;      // Default thumbnail size
}
```

**Defaults:**
```typescript
{
  defaultAnimation: 'pulse',
  baseColor: '#e5e7eb',
  highlightColor: '#f3f4f6',
  speed: 1500,
  borderRadius: '4px',
  textHeight: '1rem',
  headingHeight: '1.5rem',
  avatarSize: '40px',
  thumbnailSize: '80px'
}
```

### Theme Integration

Customize colors to match your theme:

```typescript
import { colorTokens } from '@missionfabric-js/enzyme/theme';

const factory = new SkeletonFactory({
  baseColor: colorTokens.background.secondary,
  highlightColor: colorTokens.background.tertiary,
});
```

## Custom Patterns

### Registering Custom Patterns

```typescript
const factory = new SkeletonFactory();

factory.registerPattern({
  name: 'my-custom-card',
  elements: [
    { type: 'image', width: '100%', height: '180px' },
    { type: 'heading', width: '70%' },
    { type: 'text', width: '100%', count: 2 },
    { type: 'button', width: '100px', height: '36px' }
  ],
  animation: 'wave',
  baseColor: '#f3f4f6',
  highlightColor: '#ffffff'
});

// Use the pattern
const skeleton = factory.createFromPattern('my-custom-card');
```

### Creating from Elements

```typescript
const skeleton = factory.createFromElements([
  {
    type: 'custom',
    className: 'skeleton-row',
    children: [
      { type: 'avatar', borderRadius: '50%' },
      {
        type: 'custom',
        children: [
          { type: 'text', width: '150px' },
          { type: 'text', width: '100px' }
        ]
      }
    ]
  }
], {
  animation: 'shimmer',
  speed: 2000
});
```

## React Integration

### Using with React Hook

```typescript
import { useSkeletonFactory } from '@missionfabric-js/enzyme/ux';

function MyComponent() {
  const factory = useSkeletonFactory({
    defaultAnimation: 'wave',
    baseColor: '#e5e7eb'
  });

  return (
    <div>
      {factory.createText({ lines: 3 })}
    </div>
  );
}
```

### Singleton Instance

```typescript
import { getSkeletonFactory } from '@missionfabric-js/enzyme/ux';

const factory = getSkeletonFactory();
const skeleton = factory.createCard();
```

### Reset Factory

```typescript
import { resetSkeletonFactory } from '@missionfabric-js/enzyme/ux';

// Reset the singleton instance
resetSkeletonFactory();
```

## CSS Injection

Generate CSS for global stylesheet:

```typescript
const factory = new SkeletonFactory();
const css = factory.generateCSS();

// Inject into stylesheet or <style> tag
```

The generated CSS includes:
- Base skeleton styles
- Animation keyframes
- Element-specific styles
- Responsive classes

## Best Practices

### 1. Match Content Structure

Make skeleton match the actual content layout:

```typescript
// Good: Matches actual card structure
function ProductCard({ loading, product }) {
  if (loading) {
    return createCardSkeleton({
      hasImage: true,
      imageHeight: '200px',
      hasTitle: true,
      textLines: 2,
      hasButton: true
    });
  }

  return <ActualProductCard product={product} />;
}
```

### 2. Use Appropriate Animations

```typescript
// Use reduced motion for accessibility
import { prefersReducedMotion } from '@missionfabric-js/enzyme/ux';

const factory = new SkeletonFactory({
  defaultAnimation: prefersReducedMotion() ? 'none' : 'wave'
});
```

### 3. Progressive Enhancement

Show skeleton after a delay to avoid flash:

```typescript
function SmartSkeleton({ loading, children }) {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setShowSkeleton(true);
    }, 200); // Delay skeleton for fast loads

    return () => clearTimeout(timer);
  }, [loading]);

  if (loading && showSkeleton) {
    return createCardSkeleton();
  }

  return children;
}
```

### 4. Consistent Theming

```typescript
// Create factory with theme colors
import { colorTokens } from '@missionfabric-js/enzyme/theme';

const themedFactory = new SkeletonFactory({
  baseColor: colorTokens.background.secondary,
  highlightColor: colorTokens.background.tertiary,
});
```

### 5. Reusable Patterns

```typescript
// Create reusable patterns for your app
const AppSkeletons = {
  userCard: () => factory.createFromPattern('profile'),
  article: () => factory.createFromPattern('article'),
  dataTable: () => factory.createTable({ rows: 10, columns: 5 }),
};

// Use throughout app
function UserList({ loading }) {
  if (loading) {
    return Array(5).fill(null).map((_, i) =>
      <div key={i}>{AppSkeletons.userCard()}</div>
    );
  }
  // ...
}
```

## Accessibility

Skeletons include proper accessibility attributes:

- `aria-hidden="true"` - Hides from screen readers
- `aria-label="Loading content"` - Describes loading state
- Animation respects `prefers-reduced-motion`
- Semantic structure maintained

## Performance

- **React Elements**: Returns React elements, not HTML strings
- **Memoization**: Factory instances can be memoized
- **Lazy Loading**: Skeletons help with perceived performance
- **Minimal Bundle**: ~3KB gzipped

## Examples

### Blog Post Skeleton

```typescript
function BlogPostSkeleton() {
  const factory = new SkeletonFactory();

  return (
    <article>
      {factory.createText({ lines: 1, width: '80%' })} {/* Title */}
      {factory.createText({ lines: 1, width: '40%' })} {/* Meta */}
      {factory.createFromElements([
        { type: 'image', width: '100%', height: '400px' }
      ])} {/* Featured image */}
      {factory.createParagraph({ lines: 8, lineVariation: true })} {/* Content */}
    </article>
  );
}
```

### User Profile Skeleton

```typescript
function UserProfileSkeleton() {
  return (
    <div>
      {createAvatarSkeleton({ size: '80px', shape: 'circle' })}
      {createTextSkeleton({ lines: 1, width: '200px' })} {/* Name */}
      {createTextSkeleton({ lines: 1, width: '150px' })} {/* Username */}
      {createParagraphSkeleton({ lines: 3 })} {/* Bio */}
    </div>
  );
}
```

### Dashboard Skeleton

```typescript
function DashboardSkeleton() {
  const factory = new SkeletonFactory({ defaultAnimation: 'shimmer' });

  return (
    <div className="dashboard-grid">
      {Array(4).fill(null).map((_, i) => (
        <div key={i}>
          {factory.createFromPattern('dashboard-widget')}
        </div>
      ))}
    </div>
  );
}
```

## See Also

- [Loading States](/home/user/enzyme/docs/ux/LOADING_STATES.md) - Progressive loading indicators
- [Accessibility](/home/user/enzyme/docs/ux/ACCESSIBILITY.md) - Accessibility features
- [UI Components](/home/user/enzyme/docs/ui/README.md) - UI component library
- [Theme System](/home/user/enzyme/docs/theme/README.md) - Theming and design tokens

---

**Version:** 3.0.0
**Last Updated:** 2025-11-29
