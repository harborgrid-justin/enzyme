# Migration Guide

> **Scope**: This document covers migration from other frameworks to Harbor React.
> It provides step-by-step guides for migrating from Next.js, Create React App, and Vite templates.

---

## Table of Contents

1. [Migration Overview](#migration-overview)
2. [From Next.js](#from-nextjs)
3. [From Create React App](#from-create-react-app)
4. [From Plain Vite](#from-plain-vite)
5. [Common Migration Tasks](#common-migration-tasks)
6. [Feature Equivalents](#feature-equivalents)
7. [Troubleshooting](#troubleshooting)

---

## Migration Overview

### Harbor React Advantages

| Feature | Next.js | CRA | Harbor React |
|---------|---------|-----|--------------|
| Build Tool | Webpack/Turbopack | Webpack | Vite (faster) |
| Rendering | SSR/SSG/CSR | CSR only | CSR + Streaming |
| Routing | File-based | Manual | File-based + Registry |
| State | Manual | Manual | Zustand + TanStack Query |
| Config | next.config.js | Eject needed | Centralized hub |
| Deployment | Vercel-optimized | Any host | Any host |

### Migration Checklist

- [ ] Set up Harbor React project
- [ ] Migrate configuration/environment
- [ ] Migrate routing
- [ ] Migrate data fetching
- [ ] Migrate state management
- [ ] Migrate components
- [ ] Update imports and paths
- [ ] Test functionality
- [ ] Deploy

---

## From Next.js

### 1. Create Harbor React Project

```bash
# Create new project
git clone <harbor-template> my-app
cd my-app
npm install
```

### 2. Migrate Environment Variables

**Before (Next.js):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=My App
```

**After (Harbor React):**
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_NAME=My App
```

**Usage change:**
```typescript
// Before
process.env.NEXT_PUBLIC_API_URL

// After
import { env } from '@/config';
env.apiBaseUrl
```

### 3. Migrate Routing

**Before (Next.js Pages Router):**
```
pages/
├── index.tsx           # /
├── about.tsx           # /about
├── products/
│   ├── index.tsx       # /products
│   └── [id].tsx        # /products/:id
└── _app.tsx
```

**After (Harbor React):**
```
src/routes/root/
├── Home.tsx            # /
├── about/
│   └── index.tsx       # /about
├── products/
│   ├── index.tsx       # /products
│   └── [id].tsx        # /products/:id
└── RootLayout.tsx
```

**Route component change:**
```tsx
// Before (Next.js)
import { useRouter } from 'next/router';

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;
  // ...
}

// After (Harbor React)
import { useParams, useNavigate } from 'react-router-dom';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // ...
}
```

### 4. Migrate Data Fetching

**Before (Next.js getServerSideProps):**
```tsx
export async function getServerSideProps(context) {
  const data = await fetchData(context.params.id);
  return { props: { data } };
}

export default function Page({ data }) {
  return <div>{data.title}</div>;
}
```

**After (Harbor React with TanStack Query):**
```tsx
import { useQuery } from '@tanstack/react-query';

export default function Page() {
  const { id } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['item', id],
    queryFn: () => fetchData(id),
  });

  if (isLoading) return <Loading />;
  if (error) return <Error error={error} />;

  return <div>{data.title}</div>;
}
```

### 5. Migrate next/link

**Before:**
```tsx
import Link from 'next/link';

<Link href="/products/123">View Product</Link>
<Link href={{ pathname: '/products', query: { category: 'electronics' } }}>
  Electronics
</Link>
```

**After:**
```tsx
import { Link } from 'react-router-dom';
import { ROUTES, buildRouteWithQuery } from '@/config';

<Link to={ROUTES.products.detail('123')}>View Product</Link>
<Link to={buildRouteWithQuery(ROUTES.products.list, { category: 'electronics' })}>
  Electronics
</Link>
```

### 6. Migrate next/image

**Before:**
```tsx
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority
/>
```

**After:**
```tsx
// Use standard img with loading hints
<img
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  loading="eager"
  fetchPriority="high"
/>

// Or use a library like @unpic/react
import { Image } from '@unpic/react';

<Image src="/hero.jpg" alt="Hero" layout="constrained" width={1200} height={600} />
```

---

## From Create React App

### 1. Create Harbor React Project

```bash
# Create new project alongside CRA
git clone <harbor-template> my-new-app
cd my-new-app
npm install
```

### 2. Copy Source Files

```bash
# Copy components and utilities
cp -r ../old-cra-app/src/components ./src/
cp -r ../old-cra-app/src/hooks ./src/lib/
cp -r ../old-cra-app/src/utils ./src/lib/
```

### 3. Migrate Environment Variables

**Before (CRA):**
```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_APP_NAME=My App
```

**After (Harbor React):**
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_NAME=My App
```

**Usage:**
```typescript
// Before
process.env.REACT_APP_API_URL

// After
import { env } from '@/config';
env.apiBaseUrl
```

### 4. Update Import Paths

**Before (relative imports):**
```typescript
import Button from '../../components/Button';
import { fetchData } from '../../utils/api';
```

**After (alias imports):**
```typescript
import { Button } from '@/lib/ui';
import { fetchData } from '@/lib/services';
```

### 5. Migrate Routing

**Before (React Router in CRA):**
```tsx
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**After (Harbor React):**
```
src/routes/root/
├── Home.tsx
├── products/
│   ├── index.tsx
│   └── [id].tsx
└── RootLayout.tsx
```

Routes are auto-discovered from file structure.

### 6. Migrate State Management

**Before (React Context or Redux):**
```tsx
// Context
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Redux
const themeSlice = createSlice({
  name: 'theme',
  initialState: { value: 'light' },
  reducers: {
    setTheme: (state, action) => {
      state.value = action.payload;
    },
  },
});
```

**After (Zustand):**
```typescript
import { useGlobalStore } from '@/lib/state';

// Use
const theme = useGlobalStore((s) => s.preferences.theme);
const setTheme = useGlobalStore((s) => s.setTheme);

// Or create feature store
import { create } from 'zustand';

const useThemeStore = create((set) => ({
  theme: 'light',
  setTheme: (theme) => set({ theme }),
}));
```

---

## From Plain Vite

### 1. Install Additional Dependencies

```bash
npm install @tanstack/react-query zustand react-router-dom zod
npm install -D @testing-library/react vitest
```

### 2. Add Configuration Structure

Copy Harbor React's `src/config/` directory and customize.

### 3. Set Up Routing

Copy `src/lib/routing/` and `src/routes/` structure.

### 4. Add State Management

Copy `src/lib/state/` for Zustand setup.

### 5. Add Query Client

Copy `src/lib/queries/` for TanStack Query setup.

---

## Common Migration Tasks

### Updating Imports

Use find and replace to update import patterns:

```typescript
// Find
import { something } from '../../utils/something';

// Replace with
import { something } from '@/lib/utils';
```

### Converting API Calls

**Before (fetch/axios directly):**
```typescript
const response = await fetch('/api/products');
const products = await response.json();
```

**After (service + hook):**
```typescript
// Service
export const productsService = {
  getProducts: () => http.get('/products').then(r => r.data),
};

// Hook
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: productsService.getProducts,
  });
}

// Component
const { data: products, isLoading } = useProducts();
```

### Converting Forms

**Before (uncontrolled/manual):**
```tsx
function Form() {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    // ...
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

**After (react-hook-form + zod):**
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
});

function Form() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data) => {
    // data is typed and validated
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## Feature Equivalents

### Next.js to Harbor React

| Next.js | Harbor React |
|---------|--------------|
| `getServerSideProps` | TanStack Query + loader |
| `getStaticProps` | TanStack Query with staleTime |
| `next/router` | `react-router-dom` |
| `next/link` | `Link` from react-router-dom |
| `next/image` | Standard `<img>` or image library |
| `next/head` | `react-helmet-async` |
| API routes | External API server |
| `_app.tsx` | `RootProviders.tsx` |
| `_document.tsx` | `index.html` |

### CRA to Harbor React

| CRA | Harbor React |
|-----|--------------|
| `REACT_APP_*` env vars | `VITE_*` env vars |
| `process.env.*` | `import { env } from '@/config'` |
| Webpack config (eject) | `vite.config.ts` |
| `src/index.tsx` | `src/main.tsx` |
| `public/index.html` | `index.html` (root) |
| Jest | Vitest |

---

## Troubleshooting

### Import Errors

**Error:** `Cannot find module '@/...'`

**Solution:** Ensure `tsconfig.json` has path aliases configured:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Environment Variable Issues

**Error:** `import.meta.env.VITE_* is undefined`

**Solutions:**
1. Ensure variable starts with `VITE_`
2. Restart dev server after adding new variables
3. Check `.env` file is in project root

### Router Not Working

**Error:** Routes not matching

**Solution:** Ensure router is set up in `main.tsx`:
```tsx
import { RouterProvider } from 'react-router-dom';
import { router } from '@/lib/routing';

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);
```

### Query Client Missing

**Error:** `No QueryClient set, use QueryClientProvider`

**Solution:** Ensure `QueryClientProvider` wraps app:
```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queries';

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

### Styles Not Loading

**Error:** Tailwind classes not working

**Solution:**
1. Check `tailwind.config.ts` content paths
2. Ensure `index.css` imports Tailwind
3. Verify `postcss.config.js` exists

---

## Migration Support

## Related Documentation

- [Documentation Index](./INDEX.md) - Main documentation hub
- [Getting Started Guide](./GETTING_STARTED.md) - Complete setup guide
- [Architecture Overview](./ARCHITECTURE.md) - System architecture
- [Configuration Guide](./CONFIGURATION.md) - Application configuration
- [Environment Setup](./ENVIRONMENT.md) - Environment variables

### Getting Help

1. Check existing documentation
2. Search for similar issues
3. Open GitHub issue with migration details

---

<p align="center">
  <strong>Migration Guide</strong><br>
  Smooth transition to Harbor React
</p>
