# UX Module

> Loading states, skeletons, and optimistic UI patterns.

## Overview

The UX module provides loading indicators, skeleton screens, smart defaults based on device/network conditions, and
optimistic update patterns.

## Quick Start

```tsx
import {
  LoadingSpinner,
  SkeletonFactory,
  useSmartDefaults,
  useOptimisticUpdate
} from '@/lib/ux';

function UserProfile() {
  const defaults = useSmartDefaults();
  const { mutate, isPending } = useOptimisticUpdate();

  if (isPending) {
    return <SkeletonFactory type="profile" />;
  }

  return (
    <ProfileCard
      imageQuality={defaults.imageQuality}
      animationsEnabled={defaults.animationsEnabled}
    />
  );
}
```

## Exports

| Export                | Type      | Description                   |
|-----------------------|-----------|-------------------------------|
| `LoadingSpinner`      | Component | Animated loading indicator    |
| `SkeletonFactory`     | Component | Generate skeleton screens     |
| `useSmartDefaults`    | Hook      | Device/network aware defaults |
| `useOptimisticUpdate` | Hook      | Optimistic mutation handling  |
| `useLoadingState`     | Hook      | Unified loading state         |

## See Also

- [Performance](../docs/PERFORMANCE.md)
- [Accessibility](../docs/examples/accessibility-examples.md)
