# Harbor React Framework Documentation

> **Scope**: This is the main documentation index for the Harbor React Framework.
> It provides navigation to all documentation resources for the enterprise-grade React application template.
> For the library's internal documentation, see [Library Documentation](../src/lib/docs/INDEX.md).

---

## Quick Navigation

| I want to... | Go to... |
|--------------|----------|
| Get started quickly | [Quick Start](./QUICKSTART.md) |
| Understand the architecture | [Architecture Overview](./ARCHITECTURE.md) |
| Learn about features | [Features Guide](./FEATURES.md) |
| Configure the application | [Configuration Guide](./CONFIGURATION.md) |
| Optimize performance | [Performance Guide](./PERFORMANCE.md) |
| Implement security | [Security Guide](./SECURITY.md) |
| Write tests | [Testing Guide](./TESTING.md) |
| Migrate from another framework | [Migration Guide](./MIGRATION.md) |

---

## Documentation Structure

### Visual Navigation Tree

```
Harbor React Documentation
│
├── 🚀 Getting Started
│   ├── Quick Start Guide (5 minutes)
│   ├── Getting Started (comprehensive)
│   ├── Installation & Setup
│   └── Migration Guide
│
├── 🏗️ Architecture & Concepts
│   ├── Architecture Overview
│   ├── Feature-Based Architecture
│   ├── Dynamic HTML Streaming
│   ├── Auto-Prioritized Hydration
│   ├── Adaptive Layouts
│   └── Virtual Modular DOM (VDOM)
│
├── ⚙️ Configuration & Setup
│   ├── Configuration Guide
│   ├── Config Reference (complete)
│   ├── Environment Setup
│   ├── Auto-Route System
│   └── Design System
│
├── 💻 Development Guides
│   ├── State Management (Zustand + React Query)
│   ├── API Layer (HTTP + Data Fetching)
│   ├── Authentication & Authorization
│   ├── Routing & Navigation
│   ├── Feature Flags
│   └── Real-time Updates
│
├── 📚 API Reference
│   ├── Hooks Reference (all custom hooks)
│   ├── Components Reference (UI library)
│   └── Config Reference (options)
│
├── 🎯 Optimization & Best Practices
│   ├── Performance Guide
│   ├── Security Guide
│   ├── Testing Guide
│   └── Best Practices
│
├── 🚢 Deployment & Operations
│   ├── Deployment Guide
│   └── Environment Configuration
│
├── 📖 Examples & Recipes
│   ├── Auth Examples (25+)
│   ├── Routing Examples (25+)
│   ├── RBAC Examples (20+)
│   ├── State Examples (30+)
│   └── Performance Examples (20+)
│
├── 🆘 Help & Support
│   ├── FAQ (frequently asked questions)
│   ├── Troubleshooting Guide
│   └── Common Issues
│
└── 🔌 Integration Guides
    ├── Auth, Security & State
    ├── Routing, State & Guards
    ├── Realtime, Queries & Services
    ├── Feature Flags & Error Boundaries
    ├── Performance, Monitoring & Hydration
    └── UI, Theme, Hooks & Accessibility
```

---

### Getting Started

| Document | Description |
|----------|-------------|
| [Quick Start](./QUICKSTART.md) | Get productive in under 10 minutes |
| [Getting Started](./GETTING_STARTED.md) | Comprehensive setup and first steps |
| [Features Overview](./FEATURES.md) | Feature-based architecture guide |

### Architecture

| Document | Description |
|----------|-------------|
| [Architecture Overview](./ARCHITECTURE.md) | System architecture and design decisions |
| [Dynamic HTML Streaming](./STREAMING.md) | Progressive streaming engine guide |
| [Auto-Prioritized Hydration](./HYDRATION.md) | Selective hydration system |
| [Adaptive Layouts](./LAYOUTS.md) | Context-aware layout system |
| [Virtual Modular DOM](./VDOM.md) | Virtual DOM partitioning system |

### Configuration & Setup

| Document | Description |
|----------|-------------|
| [Configuration Guide](./CONFIGURATION.md) | Configuration system overview |
| [Config Reference](./CONFIG_REFERENCE.md) | Complete configuration reference |
| [Environment Setup](./ENVIRONMENT.md) | Environment variables and setup |
| [Auto-Route System](./AUTO_ROUTES.md) | File-system based routing |
| [Design System](./DESIGN_SYSTEM.md) | Design tokens and styling |

### Development Guides

| Document | Description |
|----------|-------------|
| [State Management](./STATE.md) | Zustand + TanStack Query patterns |
| [API Layer](./API.md) | HTTP client and data fetching |
| [Testing Guide](./TESTING.md) | Unit, integration, and E2E testing |
| [Performance Guide](./PERFORMANCE.md) | Optimization strategies |
| [Security Guide](./SECURITY.md) | Security best practices |

### API Reference

| Document | Description |
|----------|-------------|
| [Hooks Reference](./HOOKS_REFERENCE.md) | All custom hooks documentation |
| [Components Reference](./COMPONENTS_REFERENCE.md) | UI component library reference |
| [Config Reference](./CONFIG_REFERENCE.md) | Configuration options reference |

### Deployment & Operations

| Document | Description |
|----------|-------------|
| [Deployment Guide](./DEPLOYMENT.md) | Production deployment and hosting |
| [Environment Setup](./ENVIRONMENT.md) | Environment configuration |

### Migration & Upgrades

| Document | Description |
|----------|-------------|
| [Migration Guide](./MIGRATION.md) | Migrate from Next.js, CRA, etc. |

---

## Core Concepts

### 1. Feature-Based Architecture

Harbor React uses vertical slice architecture where each feature is self-contained:

```
src/features/
└── [feature]/
    ├── components/    # UI components
    ├── hooks/         # Data fetching hooks
    ├── wiring/        # API clients and view models
    ├── config.ts      # Feature configuration
    ├── model.ts       # TypeScript types
    └── index.ts       # Public API
```

See: [Features Guide](./FEATURES.md)

### 2. Enterprise Configuration Hub

Single source of truth for all configuration:

```typescript
import {
  env, ROUTES, API_CONFIG, STORAGE_KEYS,
  COLORS, TIMING, initializeConfig
} from '@/config';
```

See: [Configuration Guide](./CONFIGURATION.md)

### 3. Advanced Rendering Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    RENDERING PIPELINE                            │
├─────────────────────────────────────────────────────────────────┤
│  Streaming Engine  │  Hydration Scheduler  │  Layout System     │
│        ↓           │          ↓            │        ↓           │
│  Progressive HTML  │  Priority-based       │  Context-aware     │
│  Chunked transfer  │  Visibility-driven    │  Adaptive morphing │
└─────────────────────────────────────────────────────────────────┘
```

See: [Streaming](./STREAMING.md) | [Hydration](./HYDRATION.md) | [Layouts](./LAYOUTS.md)

### 4. Performance Observatory

Built-in Core Web Vitals monitoring:

```typescript
import { PerformanceObservatory, initPerformanceMonitoring } from '@/lib/performance';

// Real-time metrics dashboard
<PerformanceObservatory position="bottom-right" />
```

See: [Performance Guide](./PERFORMANCE.md)

---

## Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Core** | React 18.3 | UI library with concurrent features |
| **Build** | Vite 5.4 | Lightning-fast development and builds |
| **Language** | TypeScript 5.6 | Type safety and developer experience |
| **Routing** | React Router 6.26 | Client-side routing |
| **State** | Zustand 4.5 | Lightweight client state |
| **Data** | TanStack Query 5.59 | Server state and caching |
| **Styling** | Tailwind CSS 3.4 | Utility-first CSS |
| **Testing** | Vitest + Playwright | Unit, integration, E2E |

---

## Directory Structure

```
harbor-react/
├── src/
│   ├── app/                    # Application shell
│   │   ├── RootProviders.tsx   # Provider composition
│   │   ├── AppShell.tsx        # Layout wrapper
│   │   └── AppErrorBoundary.tsx
│   │
│   ├── config/                 # Configuration hub
│   │   ├── env.ts              # Environment variables
│   │   ├── routes.registry.ts  # Route definitions
│   │   ├── api.config.ts       # API configuration
│   │   ├── design-tokens.ts    # Design system tokens
│   │   └── index.ts            # Unified exports
│   │
│   ├── features/               # Feature modules
│   │   └── [feature]/          # Self-contained features
│   │
│   ├── lib/                    # Shared library
│   │   ├── auth/               # Authentication
│   │   ├── hooks/              # Custom hooks
│   │   ├── performance/        # Performance monitoring
│   │   ├── routing/            # Router utilities
│   │   ├── services/           # API clients
│   │   ├── state/              # Zustand store
│   │   ├── streaming/          # HTML streaming
│   │   ├── vdom/               # Virtual DOM system
│   │   └── ui/                 # UI components
│   │
│   ├── routes/                 # Route components
│   └── test/                   # Test utilities
│
├── docs/                       # Documentation
├── public/                     # Static assets
└── scripts/                    # Build scripts
```

---

## Version Information

| Component | Version | Notes |
|-----------|---------|-------|
| Harbor React | 2.0.0 | Current release |
| React | 18.3.x | Concurrent features enabled |
| TypeScript | 5.6.x | Strict mode |
| Vite | 5.4.x | Build tool |

---

## Contributing

When contributing documentation:

1. Follow the existing structure and formatting
2. Include code examples with TypeScript types
3. Add performance and security considerations where relevant
4. Update this index when adding new documents
5. Test all code examples

---

## Support

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Contributing Guide**: See [Contributing Guide](../src/lib/CONTRIBUTING.md)

---

<p align="center">
  <strong>Harbor React Framework</strong><br>
  Enterprise-grade React for the modern web
</p>
