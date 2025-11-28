# Getting Started Guide

> **Scope**: This document provides a complete guide to starting your first Harbor React project.
> From installation to your first feature, with best practices and common patterns.
> For a faster setup, see [Quick Start](./QUICKSTART.md).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Creating Your First Feature](#creating-your-first-feature)
6. [Adding Routes](#adding-routes)
7. [Fetching Data](#fetching-data)
8. [Managing State](#managing-state)
9. [Styling Components](#styling-components)
10. [Testing](#testing)
11. [Building for Production](#building-for-production)
12. [Next Steps](#next-steps)

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Node.js | 20.x or higher | `node --version` |
| npm | 10.x or higher | `npm --version` |
| Git | Any recent version | `git --version` |

**Recommended:**
- VS Code with recommended extensions
- Chrome DevTools for debugging

---

## Installation

### Option 1: Clone Template (Recommended)

```bash
# Clone the repository
git clone <repository-url> my-harbor-app
cd my-harbor-app

# Install dependencies
npm install

# Start development server
npm run dev
```

### Option 2: Using degit

```bash
# Clone without git history
npx degit harborgrid/white-cross/reuse/templates/react my-harbor-app
cd my-harbor-app
npm install
npm run dev
```

### Verify Installation

Open http://localhost:3000 in your browser. You should see the Harbor React welcome page.

```bash
# Run validation to ensure everything is working
npm run validate
```

---

## Project Structure

```
my-harbor-app/
├── src/
│   ├── app/                    # Application shell
│   │   ├── RootProviders.tsx   # Provider composition
│   │   ├── AppShell.tsx        # Layout wrapper
│   │   ├── AppErrorBoundary.tsx
│   │   └── AppSuspenseBoundary.tsx
│   │
│   ├── config/                 # Configuration hub
│   │   ├── env.ts              # Environment variables
│   │   ├── routes.registry.ts  # Route definitions
│   │   ├── api.config.ts       # API configuration
│   │   ├── design-tokens.ts    # Design system
│   │   └── index.ts            # Unified exports
│   │
│   ├── features/               # Feature modules
│   │   ├── reports/            # Example feature
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── wiring/
│   │   │   ├── config.ts
│   │   │   ├── model.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── lib/                    # Shared library
│   │   ├── auth/               # Authentication
│   │   ├── hooks/              # Custom hooks
│   │   ├── performance/        # Performance monitoring
│   │   ├── routing/            # Router utilities
│   │   ├── services/           # HTTP clients
│   │   ├── state/              # Zustand store
│   │   ├── theme/              # Theming
│   │   └── ui/                 # UI components
│   │
│   ├── routes/                 # Route components
│   │   ├── root/               # Main app routes
│   │   │   ├── dashboard/
│   │   │   ├── RootLayout.tsx
│   │   │   └── Home.tsx
│   │   └── auth/               # Auth routes
│   │       ├── Login.tsx
│   │       └── Logout.tsx
│   │
│   ├── test/                   # Test utilities
│   ├── types/                  # Global types
│   └── main.tsx                # Entry point
│
├── docs/                       # Documentation
├── public/                     # Static assets
├── .env                        # Environment variables
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

### Key Directories Explained

| Directory | Purpose |
|-----------|---------|
| `src/app/` | Application shell, providers, error boundaries |
| `src/config/` | All configuration in one place |
| `src/features/` | Self-contained feature modules |
| `src/lib/` | Shared utilities and infrastructure |
| `src/routes/` | Page components organized by route |
| `src/test/` | Test utilities, mocks, and setup |

---

## Development Workflow

### Available Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run dev:host         # Expose to network

# Code Quality
npm run lint             # Check for linting errors
npm run lint:fix         # Fix linting errors
npm run format           # Format with Prettier
npm run type-check       # TypeScript checking

# Testing
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:ui          # Run tests with UI
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run Playwright E2E tests

# Building
npm run build            # Production build
npm run preview          # Preview production build

# Validation
npm run validate         # Run all checks
```

### VS Code Setup

When you open the project, VS Code will prompt you to install recommended extensions. Accept to get:

- **ESLint** - Linting with auto-fix
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - Class autocomplete
- **TypeScript** - Enhanced TypeScript support

### Environment Configuration

Copy the environment template and customize:

```bash
cp .env .env.local
```

Edit `.env.local`:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api
VITE_API_TIMEOUT=30000

# Feature Flags
VITE_FEATURE_FLAGS_ENABLED=true
VITE_FEATURE_FLAGS_SOURCE=local

# Development
VITE_APP_ENV=development
VITE_LOG_LEVEL=debug
```

---

## Creating Your First Feature

Let's create a "Products" feature following Harbor React patterns.

### Step 1: Create Feature Structure

```bash
mkdir -p src/features/products/{components,hooks,wiring}
```

### Step 2: Define the Model

```typescript
// src/features/products/model.ts
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}
```

### Step 3: Create Feature Configuration

```typescript
// src/features/products/config.ts
import type { FeatureConfig } from '@/lib/feature/types';

export const productsConfig: FeatureConfig = {
  metadata: {
    id: 'products',
    name: 'Products',
    description: 'Product catalog management',
    icon: 'package',
    category: 'inventory',
    order: 10,
    version: '1.0.0',
  },
  access: {
    requireAuth: true,
    allowedRoles: ['admin', 'manager', 'viewer'],
    permissions: ['products:view'],
  },
  tabs: [
    { id: 'list', label: 'All Products', path: '/products' },
    { id: 'new', label: 'Add Product', path: '/products/new' },
  ],
  defaultTab: 'list',
};
```

### Step 4: Build the API Layer

```typescript
// src/features/products/wiring/api.ts
import { createApiClient } from '@/lib/services/apiClients';
import type { Product, ProductFilters } from '../model';

const productsApi = createApiClient<Product>({
  basePath: '/api/products',
  cacheTtl: 5 * 60 * 1000,
});

export const productsService = {
  async getProducts(filters?: ProductFilters) {
    return productsApi.getAll(filters);
  },

  async getProduct(id: string) {
    return productsApi.getById(id);
  },

  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
    return productsApi.create(data);
  },

  async updateProduct(id: string, data: Partial<Product>) {
    return productsApi.update(id, data);
  },

  async deleteProduct(id: string) {
    return productsApi.delete(id);
  },
};
```

### Step 5: Create Query Hooks

```typescript
// src/features/products/hooks/index.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService } from '../wiring/api';
import type { ProductFilters } from '../model';

// Query key factory
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters?: ProductFilters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

// Queries
export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => productsService.getProducts(filters),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productsService.getProduct(id),
    enabled: !!id,
  });
}

// Mutations
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsService.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      productsService.updateProduct(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsService.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}
```

### Step 6: Build Components

```tsx
// src/features/products/components/ProductsPage.tsx
import { useState } from 'react';
import { useProducts } from '../hooks';
import { ProductList } from './ProductList';
import { ProductFilters } from './ProductFilters';
import type { ProductFilters as Filters } from '../model';

export function ProductsPage() {
  const [filters, setFilters] = useState<Filters>({});
  const { data: products, isLoading, error } = useProducts(filters);

  if (error) {
    return (
      <div className="text-red-600">
        Error loading products: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Products</h1>
        <a
          href="/products/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Add Product
        </a>
      </div>

      <ProductFilters filters={filters} onChange={setFilters} />

      <ProductList products={products ?? []} isLoading={isLoading} />
    </div>
  );
}

export default ProductsPage;
```

```tsx
// src/features/products/components/ProductList.tsx
import type { Product } from '../model';
import { formatPrice } from '../model';

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
}

export function ProductList({ products, isLoading }: ProductListProps) {
  if (isLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (products.length === 0) {
    return <div className="text-gray-500">No products found.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
      <h3 className="font-semibold">{product.name}</h3>
      <p className="text-gray-600 text-sm mt-1">{product.description}</p>
      <div className="mt-4 flex justify-between items-center">
        <span className="text-lg font-bold">{formatPrice(product.price)}</span>
        <span
          className={`px-2 py-1 rounded text-xs ${
            product.inStock
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {product.inStock ? 'In Stock' : 'Out of Stock'}
        </span>
      </div>
    </div>
  );
}
```

### Step 7: Create Public API

```typescript
// src/features/products/index.ts

// Feature definition
export { productsFeature, default as productsFeatureDefault } from './feature';

// Configuration
export { productsConfig } from './config';

// Model
export type { Product, ProductFilters } from './model';
export { formatPrice } from './model';

// Hooks
export {
  productKeys,
  useProducts,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from './hooks';

// Components
export { ProductsPage } from './components/ProductsPage';
export { ProductList } from './components/ProductList';
```

### Step 8: Register Feature

```typescript
// src/features/index.ts
export * from './reports';
export * from './products'; // Add your new feature
```

---

## Adding Routes

### File-System Routing

Create route components in `src/routes/`:

```tsx
// src/routes/root/products/index.tsx
import { ProductsPage } from '@/features/products';

export default function ProductsRoute() {
  return <ProductsPage />;
}
```

```tsx
// src/routes/root/products/[id].tsx
import { useParams } from 'react-router-dom';
import { ProductDetailPage } from '@/features/products';

export default function ProductDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <ProductDetailPage productId={id!} />;
}
```

### Route Registry

Add routes to the registry:

```typescript
// src/config/routes.registry.ts
export const ROUTES = {
  // ... existing routes
  products: {
    list: '/products',
    detail: (id: string) => `/products/${id}`,
    new: '/products/new',
    edit: (id: string) => `/products/${id}/edit`,
  },
} as const;
```

### Using Routes

```tsx
import { ROUTES } from '@/config';
import { Link, useNavigate } from 'react-router-dom';

function Navigation() {
  const navigate = useNavigate();

  return (
    <nav>
      <Link to={ROUTES.products.list}>Products</Link>
      <button onClick={() => navigate(ROUTES.products.detail('123'))}>
        View Product
      </button>
    </nav>
  );
}
```

---

## Fetching Data

### With TanStack Query

```tsx
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/config';

function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.dashboard.stats(),
    queryFn: fetchDashboardStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <DashboardContent data={data} />;
}
```

### With Mutations

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreateProductForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: productsService.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });

  const handleSubmit = (data: ProductFormData) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create Product'}
      </button>
    </form>
  );
}
```

---

## Managing State

### Client State with Zustand

```tsx
import { useGlobalStore } from '@/lib/state';

function Sidebar() {
  const isOpen = useGlobalStore((s) => s.ui.sidebarOpen);
  const toggle = useGlobalStore((s) => s.toggleSidebar);

  return (
    <aside className={isOpen ? 'w-64' : 'w-16'}>
      <button onClick={toggle}>Toggle</button>
      {/* Sidebar content */}
    </aside>
  );
}
```

### Feature-Level State

```tsx
// src/features/products/state/productsStore.ts
import { create } from 'zustand';

interface ProductsState {
  selectedIds: Set<string>;
  viewMode: 'grid' | 'list';
  selectProduct: (id: string) => void;
  clearSelection: () => void;
  setViewMode: (mode: 'grid' | 'list') => void;
}

export const useProductsStore = create<ProductsState>((set) => ({
  selectedIds: new Set(),
  viewMode: 'grid',

  selectProduct: (id) =>
    set((state) => ({
      selectedIds: new Set([...state.selectedIds, id]),
    })),

  clearSelection: () => set({ selectedIds: new Set() }),

  setViewMode: (viewMode) => set({ viewMode }),
}));
```

---

## Styling Components

### Using Design Tokens

```tsx
import { STATUS_BADGES, CARDS, LAYOUTS } from '@/config';

function ProductCard({ product }: { product: Product }) {
  return (
    <div className={CARDS.interactive}>
      <div className={LAYOUTS.flex.centerBetween}>
        <h3>{product.name}</h3>
        <span className={STATUS_BADGES[product.inStock ? 'success' : 'error']}>
          {product.inStock ? 'In Stock' : 'Out of Stock'}
        </span>
      </div>
    </div>
  );
}
```

### Tailwind CSS

```tsx
function Button({ variant, children }) {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </button>
  );
}
```

---

## Testing

### Unit Tests

```tsx
// src/features/products/components/__tests__/ProductList.test.tsx
import { render, screen } from '@testing-library/react';
import { ProductList } from '../ProductList';

const mockProducts = [
  { id: '1', name: 'Product 1', price: 99.99, inStock: true },
  { id: '2', name: 'Product 2', price: 149.99, inStock: false },
];

describe('ProductList', () => {
  it('renders products', () => {
    render(<ProductList products={mockProducts} isLoading={false} />);

    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ProductList products={[]} isLoading={true} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<ProductList products={[]} isLoading={false} />);

    expect(screen.getByText(/no products/i)).toBeInTheDocument();
  });
});
```

### Hook Tests

```tsx
// src/features/products/hooks/__tests__/useProducts.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProducts } from '../index';

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('useProducts', () => {
  it('fetches products', async () => {
    const { result } = renderHook(() => useProducts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

---

## Building for Production

### Build Command

```bash
npm run build
```

This runs:
1. TypeScript type checking
2. ESLint validation
3. Vite production build

### Output

```
dist/
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── vendor-[hash].js
├── index.html
└── ...
```

### Environment-Specific Builds

```bash
# Development
npm run build -- --mode development

# Staging
npm run build -- --mode staging

# Production
npm run build -- --mode production
```

### Preview Production Build

```bash
npm run preview
```

---

## Next Steps

Now that you have the basics, explore these topics:

1. **[Features Guide](./FEATURES.md)** - Advanced feature patterns
2. **[State Management](./STATE.md)** - Deep dive into state
3. **[Performance Guide](./PERFORMANCE.md)** - Optimization strategies
4. **[Testing Guide](./TESTING.md)** - Comprehensive testing
5. **[Security Guide](./SECURITY.md)** - Security best practices
6. **[API Documentation](./API.md)** - HTTP client patterns

### Common Tasks

| Task | Documentation |
|------|---------------|
| Add authentication | [Auth Guide](./SECURITY.md#authentication) |
| Create protected routes | [Routing Guide](./AUTO_ROUTES.md) |
| Add feature flags | [Feature Flags](./CONFIGURATION.md#feature-flags) |
| Monitor performance | [Performance](./PERFORMANCE.md) |
| Deploy application | [Deployment](#building-for-production) |

---

## Related Documentation

- [Quick Start](./QUICKSTART.md) - Fast 10-minute setup guide
- [Architecture Overview](./ARCHITECTURE.md) - System architecture and design
- [Configuration Guide](./CONFIGURATION.md) - Application configuration
- [Environment Setup](./ENVIRONMENT.md) - Environment variables and setup
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment

---

<p align="center">
  <strong>You're ready to build!</strong><br>
  Welcome to Harbor React Framework
</p>
