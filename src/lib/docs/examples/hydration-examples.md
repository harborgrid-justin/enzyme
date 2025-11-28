# Hydration Examples

> 22+ practical hydration examples for optimizing SSR/SSG performance in the Harbor React Library.

## Table of Contents

- [Basic Hydration](#basic-hydration)
- [Priority Boundaries](#priority-boundaries)
- [Interaction Replay](#interaction-replay)
- [Metrics and Monitoring](#metrics-and-monitoring)
- [Progressive Enhancement](#progressive-enhancement)
- [Lazy Hydration](#lazy-hydration)
- [Partial Hydration](#partial-hydration)
- [Advanced Patterns](#advanced-patterns)
- [Best Practices](#best-practices)
- [Anti-Patterns](#anti-patterns)

---

## Basic Hydration

### Example 1: HydrationProvider Setup
**Use Case:** Basic SSR hydration setup
**Difficulty:** ⭐ Basic

```tsx
import { HydrationProvider } from '@/lib/hydration';

function App({ Component, pageProps }: AppProps) {
  return (
    <HydrationProvider>
      <Component {...pageProps} />
    </HydrationProvider>
  );
}

export default App;
```

**Explanation:** HydrationProvider manages hydration state and optimization for SSR/SSG apps.

**See Also:**
- [Example 2](#example-2-hydration-with-configuration)
- [Hydration Guide](../HYDRATION.md)

---

### Example 2: Hydration with Configuration
**Use Case:** Configure hydration behavior
**Difficulty:** ⭐ Basic

```tsx
import { HydrationProvider } from '@/lib/hydration';

function App({ Component, pageProps }: AppProps) {
  return (
    <HydrationProvider
      config={{
        // Enable progressive hydration
        progressive: true,

        // Track hydration metrics
        metrics: process.env.NODE_ENV === 'development',

        // Prioritize above-the-fold content
        prioritizeFold: true,

        // Replay user interactions
        replayInteractions: true,

        // Custom hydration delay
        delay: 0,
      }}
    >
      <Component {...pageProps} />
    </HydrationProvider>
  );
}
```

**Explanation:** Configuration controls hydration strategy and performance optimizations.

---

### Example 3: Detecting Hydration State
**Use Case:** Conditionally render based on hydration
**Difficulty:** ⭐ Basic

```tsx
import { useHydrationStatus } from '@/lib/hydration';

function InteractiveComponent() {
  const { isHydrated, isHydrating } = useHydrationStatus();

  if (isHydrating) {
    return <Skeleton />;
  }

  if (!isHydrated) {
    // Server-side or pre-hydration
    return <StaticContent />;
  }

  // Fully hydrated - interactive
  return (
    <button onClick={handleClick}>
      Click me!
    </button>
  );
}
```

**Explanation:** useHydrationStatus lets components adapt to hydration state.

---

## Priority Boundaries

### Example 4: Priority Hydration Boundary
**Use Case:** Hydrate critical sections first
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { HydrationBoundary } from '@/lib/hydration';

function HomePage() {
  return (
    <div>
      {/* High priority - hydrate immediately */}
      <HydrationBoundary priority="high">
        <Header />
        <Hero />
        <CallToAction />
      </HydrationBoundary>

      {/* Normal priority - hydrate after high priority */}
      <HydrationBoundary priority="normal">
        <Features />
        <Testimonials />
      </HydrationBoundary>

      {/* Low priority - hydrate when idle */}
      <HydrationBoundary priority="low">
        <Footer />
        <Newsletter />
      </HydrationBoundary>
    </div>
  );
}
```

**Explanation:** Priority boundaries control the order of component hydration.

---

### Example 5: Visible Hydration
**Use Case:** Hydrate only when visible in viewport
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { HydrationBoundary } from '@/lib/hydration';

function LongPage() {
  return (
    <div>
      <Hero />

      {/* Hydrate when scrolled into view */}
      <HydrationBoundary whenVisible>
        <ProductGrid />
      </HydrationBoundary>

      <HydrationBoundary whenVisible rootMargin="200px">
        <Reviews />
      </HydrationBoundary>

      <HydrationBoundary whenVisible>
        <RelatedProducts />
      </HydrationBoundary>
    </div>
  );
}
```

**Explanation:** `whenVisible` defers hydration until component is in viewport.

---

### Example 6: Interaction-Based Hydration
**Use Case:** Hydrate on user interaction
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { HydrationBoundary } from '@/lib/hydration';

function ProductPage() {
  return (
    <div>
      <ProductInfo />

      {/* Hydrate when user hovers */}
      <HydrationBoundary whenHover>
        <ImageGallery />
      </HydrationBoundary>

      {/* Hydrate when user clicks */}
      <HydrationBoundary whenClick>
        <ReviewForm />
      </HydrationBoundary>

      {/* Hydrate when user focuses (for forms) */}
      <HydrationBoundary whenFocus>
        <SearchInput />
      </HydrationBoundary>
    </div>
  );
}
```

**Explanation:** Defer expensive component hydration until user interaction.

---

## Interaction Replay

### Example 7: Replaying Captured Interactions
**Use Case:** Preserve clicks during hydration
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { HydrationBoundary } from '@/lib/hydration';

function Newsletter() {
  const [email, setEmail] = useState('');

  return (
    <HydrationBoundary
      replayInteractions
      priority="low"
    >
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />
        {/* Click captured during hydration will replay */}
        <button type="submit">Subscribe</button>
      </form>
    </HydrationBoundary>
  );
}
```

**Explanation:** Interaction replay prevents losing clicks/inputs during hydration.

---

### Example 8: Custom Interaction Replay
**Use Case:** Define which events to replay
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { HydrationBoundary } from '@/lib/hydration';

function InteractiveWidget() {
  return (
    <HydrationBoundary
      replayInteractions={{
        events: ['click', 'submit', 'change'],
        timeout: 5000, // Only replay within 5s of page load
      }}
    >
      <ComplexForm />
    </HydrationBoundary>
  );
}
```

**Explanation:** Configure which events to capture and replay.

---

## Metrics and Monitoring

### Example 9: Hydration Metrics Collection
**Use Case:** Track hydration performance
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { useHydrationMetrics } from '@/lib/hydration';
import { useEffect } from 'react';

function PerformanceMonitor() {
  const metrics = useHydrationMetrics();

  useEffect(() => {
    if (metrics.isComplete) {
      // Send to analytics
      analytics.track('Hydration Complete', {
        duration: metrics.totalDuration,
        componentsHydrated: metrics.componentsCount,
        interactionsReplayed: metrics.replayedInteractions,
        ttfb: metrics.timeToFirstByte,
        fcp: metrics.firstContentfulPaint,
        lcp: metrics.largestContentfulPaint,
      });
    }
  }, [metrics.isComplete]);

  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="hydration-metrics">
        <h3>Hydration Metrics</h3>
        <dl>
          <dt>Status:</dt>
          <dd>{metrics.isComplete ? 'Complete' : 'In Progress'}</dd>

          <dt>Duration:</dt>
          <dd>{metrics.totalDuration}ms</dd>

          <dt>Components:</dt>
          <dd>{metrics.componentsCount}</dd>

          <dt>Replayed:</dt>
          <dd>{metrics.replayedInteractions}</dd>
        </dl>
      </div>
    );
  }

  return null;
}
```

**Explanation:** Track and analyze hydration performance metrics.

---

### Example 10: Performance Budgets
**Use Case:** Enforce hydration performance limits
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { HydrationProvider } from '@/lib/hydration';

function App({ Component, pageProps }: AppProps) {
  return (
    <HydrationProvider
      config={{
        performanceBudget: {
          // Maximum hydration time
          maxHydrationTime: 3000, // 3 seconds

          // Maximum component count per boundary
          maxComponentsPerBoundary: 50,

          // Warn if exceeded
          onBudgetExceeded: (metrics) => {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Hydration budget exceeded:', metrics);
            }

            // Track in production
            analytics.track('Performance Budget Exceeded', metrics);
          },
        },
      }}
    >
      <Component {...pageProps} />
    </HydrationProvider>
  );
}
```

**Explanation:** Set performance budgets to catch hydration regressions.

---

## Progressive Enhancement

### Example 11: Progressive Hydration
**Use Case:** Basic HTML works, JS enhances
**Difficulty:** ⭐⭐ Intermediate

```tsx
function ProductCard({ product }: { product: Product }) {
  const { isHydrated } = useHydrationStatus();

  return (
    <article className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <p className="price">${product.price}</p>

      {/* Progressive enhancement: form works without JS */}
      <form action="/api/cart/add" method="POST">
        <input type="hidden" name="productId" value={product.id} />

        {isHydrated ? (
          // Enhanced experience with JS
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              addToCartOptimistic(product);
            }}
          >
            Add to Cart
          </button>
        ) : (
          // Works without JS
          <button type="submit">
            Add to Cart
          </button>
        )}
      </form>
    </article>
  );
}
```

**Explanation:** Core functionality works without JavaScript, enhanced when hydrated.

---

### Example 12: No-JS Fallbacks
**Use Case:** Graceful degradation for disabled JS
**Difficulty:** ⭐⭐ Intermediate

```tsx
function SearchForm() {
  const { isHydrated } = useHydrationStatus();
  const [query, setQuery] = useState('');

  if (!isHydrated) {
    // Server-rendered form that submits to server
    return (
      <form action="/search" method="GET">
        <input
          type="search"
          name="q"
          placeholder="Search products..."
          required
        />
        <button type="submit">Search</button>
      </form>
    );
  }

  // Enhanced client-side search
  return (
    <form onSubmit={handleClientSearch}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
      />
      <button type="submit">Search</button>

      {query && (
        <SearchSuggestions query={query} />
      )}
    </form>
  );
}
```

**Explanation:** Provide functional fallbacks for non-JavaScript users.

---

## Lazy Hydration

### Example 13: Lazy Component Hydration
**Use Case:** Defer heavy component hydration
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { LazyHydrate } from '@/lib/hydration';
import dynamic from 'next/dynamic';

// Dynamically import heavy component
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  ssr: true,
  loading: () => <ChartSkeleton />,
});

function Dashboard() {
  return (
    <div>
      <DashboardHeader />

      {/* Lazy hydrate when visible */}
      <LazyHydrate whenVisible>
        <HeavyChart data={chartData} />
      </LazyHydrate>

      <DashboardFooter />
    </div>
  );
}
```

**Explanation:** Combine code splitting with lazy hydration for optimal performance.

---

### Example 14: Idle Hydration
**Use Case:** Hydrate during browser idle time
**Difficulty:** ⭐⭐ Intermediate

```tsx
import { HydrationBoundary } from '@/lib/hydration';

function BlogPost({ content }: { content: string }) {
  return (
    <article>
      {/* Critical content - hydrate immediately */}
      <header>
        <h1>{content.title}</h1>
        <AuthorInfo author={content.author} />
      </header>

      {/* Main content */}
      <div dangerouslySetInnerHTML={{ __html: content.body }} />

      {/* Non-critical - hydrate when browser is idle */}
      <HydrationBoundary whenIdle>
        <CommentSection postId={content.id} />
      </HydrationBoundary>

      <HydrationBoundary whenIdle timeout={5000}>
        <RelatedPosts categoryId={content.categoryId} />
      </HydrationBoundary>
    </article>
  );
}
```

**Explanation:** `whenIdle` uses requestIdleCallback to hydrate during idle time.

---

### Example 15: Media Query-Based Hydration
**Use Case:** Conditionally hydrate based on viewport
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { HydrationBoundary } from '@/lib/hydration';

function ResponsiveFeature() {
  return (
    <>
      {/* Desktop: hydrate immediately */}
      <HydrationBoundary whenMediaQuery="(min-width: 768px)">
        <DesktopNavigation />
      </HydrationBoundary>

      {/* Mobile: hydrate on interaction */}
      <HydrationBoundary
        whenMediaQuery="(max-width: 767px)"
        whenClick
      >
        <MobileNavigation />
      </HydrationBoundary>
    </>
  );
}
```

**Explanation:** Hydrate different components based on screen size.

---

## Partial Hydration

### Example 16: Island Architecture
**Use Case:** Hydrate only interactive islands
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { Island } from '@/lib/hydration';

function LandingPage() {
  return (
    <div>
      {/* Static content - no hydration needed */}
      <header>
        <h1>Welcome to Our Site</h1>
        <p>This is static content that doesn't need JS</p>
      </header>

      {/* Interactive island */}
      <Island name="hero-cta">
        <CallToAction />
      </Island>

      {/* More static content */}
      <section>
        <h2>Features</h2>
        <FeatureList items={features} />
      </section>

      {/* Another interactive island */}
      <Island name="newsletter" priority="low">
        <NewsletterForm />
      </Island>

      {/* Static footer */}
      <footer>
        <p>&copy; 2024 Company</p>
      </footer>
    </div>
  );
}
```

**Explanation:** Islands architecture hydrates only interactive components, keeping static content static.

---

### Example 17: Selective Component Hydration
**Use Case:** Fine-grained hydration control
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { useHydration } from '@/lib/hydration';

interface SelectiveProps {
  staticData: string;
  interactiveFeature?: boolean;
}

function SelectiveComponent({ staticData, interactiveFeature }: SelectiveProps) {
  const shouldHydrate = interactiveFeature;

  useHydration({
    enabled: shouldHydrate,
    priority: 'normal',
  });

  if (!shouldHydrate) {
    // Render static version
    return <div className="static">{staticData}</div>;
  }

  // Render interactive version
  return (
    <div className="interactive">
      {staticData}
      <InteractiveControls />
    </div>
  );
}
```

**Explanation:** Components can conditionally opt into/out of hydration.

---

## Advanced Patterns

### Example 18: Hydration Error Handling
**Use Case:** Gracefully handle hydration mismatches
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { HydrationProvider, HydrationErrorBoundary } from '@/lib/hydration';

function App({ Component, pageProps }: AppProps) {
  return (
    <HydrationProvider
      config={{
        onHydrationError: (error, info) => {
          // Log to error tracking service
          errorTracking.captureException(error, {
            context: 'hydration',
            componentStack: info.componentStack,
          });

          // In development, show detailed error
          if (process.env.NODE_ENV === 'development') {
            console.error('Hydration error:', error, info);
          }
        },
      }}
    >
      <HydrationErrorBoundary
        fallback={(error) => (
          <div className="hydration-error">
            <h2>Content Loading Error</h2>
            <p>Please refresh the page.</p>
            {process.env.NODE_ENV === 'development' && (
              <pre>{error.message}</pre>
            )}
          </div>
        )}
      >
        <Component {...pageProps} />
      </HydrationErrorBoundary>
    </HydrationProvider>
  );
}
```

**Explanation:** Handle hydration errors gracefully with fallback UI.

---

### Example 19: Streaming Hydration
**Use Case:** Hydrate as HTML streams in
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { Suspense } from 'react';
import { HydrationBoundary } from '@/lib/hydration';

function StreamingPage() {
  return (
    <div>
      {/* Above the fold - render immediately */}
      <Hero />

      {/* Stream in and hydrate when ready */}
      <Suspense fallback={<ProductsSkeleton />}>
        <HydrationBoundary streaming>
          <ProductGrid />
        </HydrationBoundary>
      </Suspense>

      <Suspense fallback={<ReviewsSkeleton />}>
        <HydrationBoundary streaming priority="low">
          <Reviews />
        </HydrationBoundary>
      </Suspense>
    </div>
  );
}
```

**Explanation:** Stream HTML and progressively hydrate as content arrives.

---

### Example 20: Resumable Hydration
**Use Case:** Resume from server-side state
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
// Server-side: Serialize state
export async function getServerSideProps() {
  const initialState = await fetchInitialData();

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
      appState: serialize(initialState),
    },
  };
}

// Client-side: Resume from serialized state
function App({ dehydratedState, appState }: PageProps) {
  return (
    <HydrationProvider
      config={{
        resumable: true,
        initialState: appState,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <Hydrate state={dehydratedState}>
          <MainApp />
        </Hydrate>
      </QueryClientProvider>
    </HydrationProvider>
  );
}
```

**Explanation:** Resumable hydration picks up from server state without re-running logic.

---

### Example 21: Hydration Scheduling
**Use Case:** Custom hydration scheduling strategy
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { HydrationScheduler } from '@/lib/hydration';

const customScheduler = new HydrationScheduler({
  strategy: 'custom',

  // Define hydration order
  schedule: (boundaries) => {
    // Sort by priority and position
    return boundaries.sort((a, b) => {
      // High priority first
      if (a.priority !== b.priority) {
        return a.priority === 'high' ? -1 : 1;
      }

      // Then by viewport position (top to bottom)
      return a.position.top - b.position.top;
    });
  },

  // Custom delay between hydrations
  delayBetween: (previous, next) => {
    // No delay for high priority
    if (next.priority === 'high') return 0;

    // Longer delay for low priority
    if (next.priority === 'low') return 100;

    return 50;
  },
});

function App({ Component, pageProps }: AppProps) {
  return (
    <HydrationProvider scheduler={customScheduler}>
      <Component {...pageProps} />
    </HydrationProvider>
  );
}
```

**Explanation:** Custom scheduling strategies for fine-tuned hydration control.

---

### Example 22: Conditional Hydration Based on Device
**Use Case:** Skip hydration on low-end devices
**Difficulty:** ⭐⭐⭐ Advanced

```tsx
import { HydrationProvider } from '@/lib/hydration';

function getDeviceCapabilities() {
  if (typeof navigator === 'undefined') return 'high';

  const memory = (navigator as any).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  const connection = (navigator as any).connection;

  // Low-end device detection
  if (
    (memory && memory < 4) ||
    (cores && cores < 4) ||
    (connection && connection.effectiveType === '2g')
  ) {
    return 'low';
  }

  return 'high';
}

function App({ Component, pageProps }: AppProps) {
  const deviceCapability = getDeviceCapabilities();

  return (
    <HydrationProvider
      config={{
        // Skip heavy hydration on low-end devices
        skipHeavy: deviceCapability === 'low',

        // Adjust priorities
        priorityMultiplier: deviceCapability === 'low' ? 0.5 : 1,

        // Enable data saver mode
        dataSaver: deviceCapability === 'low',
      }}
    >
      <Component {...pageProps} />
    </HydrationProvider>
  );
}
```

**Explanation:** Adapt hydration strategy based on device capabilities.

---

## Best Practices

### Hydration Strategy
- ✅ **DO** hydrate critical above-the-fold content first
- ✅ **DO** defer non-critical hydration
- ✅ **DO** use visibility-based hydration for below-fold content
- ✅ **DO** monitor hydration performance
- ❌ **DON'T** hydrate everything immediately
- ❌ **DON'T** ignore hydration mismatches

### Performance
- ✅ **DO** use priority boundaries strategically
- ✅ **DO** lazy load heavy components
- ✅ **DO** implement progressive enhancement
- ✅ **DO** track Core Web Vitals
- ❌ **DON'T** block main thread during hydration
- ❌ **DON'T** hydrate static content

### User Experience
- ✅ **DO** replay user interactions
- ✅ **DO** provide loading states
- ✅ **DO** ensure core functionality works without JS
- ✅ **DO** handle errors gracefully
- ❌ **DON'T** make users wait for hydration
- ❌ **DON'T** lose user input during hydration

### Development
- ✅ **DO** test with slow connections
- ✅ **DO** measure real-world performance
- ✅ **DO** use hydration metrics in CI
- ✅ **DO** document hydration decisions
- ❌ **DON'T** optimize prematurely
- ❌ **DON'T** ignore development warnings

---

## Anti-Patterns

### ❌ Hydrating Everything
```tsx
// BAD - Hydrates entire page unnecessarily
function Page() {
  return (
    <HydrationBoundary priority="high">
      <Header />
      <Hero />
      <StaticContent />
      <Footer />
    </HydrationBoundary>
  );
}

// GOOD - Selective hydration
function Page() {
  return (
    <>
      <HydrationBoundary priority="high">
        <Header />
        <Hero />
      </HydrationBoundary>

      {/* Static - no hydration */}
      <StaticContent />

      <HydrationBoundary priority="low" whenVisible>
        <Footer />
      </HydrationBoundary>
    </>
  );
}
```

### ❌ Ignoring Hydration Mismatches
```tsx
// BAD - Different content on server/client
function BadComponent() {
  return <div>{Date.now()}</div>;
}

// GOOD - Consistent rendering
function GoodComponent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return <div>{Date.now()}</div>;
}
```

### ❌ Blocking Interactions
```tsx
// BAD - Button doesn't work until hydration
function BadButton() {
  return <button onClick={handleClick}>Click</button>;
}

// GOOD - Works without JS, enhanced with JS
function GoodButton() {
  return (
    <form action="/api/action" method="POST">
      <button type="submit">Click</button>
    </form>
  );
}
```

---

## See Also

- [Hydration Guide](../HYDRATION.md) - Complete hydration documentation
- [Performance Examples](./performance-examples.md) - Performance optimization patterns
- [SSR/SSG Guide](../SSR.md) - Server-side rendering documentation
- [React Hydration Docs](https://react.dev/reference/react-dom/client/hydrateRoot) - Official React docs
- [Documentation Index](../INDEX.md) - All documentation resources
