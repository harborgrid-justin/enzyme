# Use Code Snippets

Enzyme provides intelligent code snippets to accelerate development.

## Available Snippets

### Components
- `enzyme-component` - Functional React component
- `enzyme-component-memo` - Memoized component
- `enzyme-component-lazy` - Lazy-loaded component

### Hooks
- `enzyme-hook` - Custom React hook
- `enzyme-use-auth` - useAuth hook
- `enzyme-use-feature` - useFeatureFlag hook
- `enzyme-use-api` - useApiRequest hook

### State Management
- `enzyme-store` - Zustand store
- `enzyme-store-persist` - Persistent store
- `enzyme-store-slice` - Store slice

### Routes
- `enzyme-route` - Route configuration
- `enzyme-route-loader` - Route with loader
- `enzyme-route-protected` - Protected route

### API
- `enzyme-api` - API client
- `enzyme-api-endpoint` - API endpoint
- `enzyme-api-interceptor` - Request interceptor

### Tests
- `enzyme-test` - Component test
- `enzyme-test-hook` - Hook test
- `enzyme-test-store` - Store test

## How to Use

1. Start typing the snippet prefix (e.g., `enzyme-component`)
2. Select from IntelliSense suggestions
3. Press Tab to insert
4. Fill in placeholders (use Tab to navigate)

## Example: Component Snippet

Type `enzyme-component` and press Tab:

```typescript
import React from 'react';

interface ${1:ComponentName}Props {
  ${2:// props}
}

export function ${1:ComponentName}({ ${3:props} }: ${1:ComponentName}Props) {
  return (
    <div>
      ${4:// component body}
    </div>
  );
}

export default ${1:ComponentName};
```

## Customization

Modify snippets in:
- TypeScript: `snippets/typescript.json`
- React: `snippets/react.json`
