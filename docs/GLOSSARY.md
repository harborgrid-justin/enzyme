# Enzyme Glossary

> **Purpose**: Comprehensive glossary of terms, concepts, and acronyms used throughout the @missionfabric-js/enzyme documentation and codebase.

---

## Table of Contents

- [General Terms](#general-terms)
- [Architecture & Patterns](#architecture--patterns)
- [Modules & Components](#modules--components)
- [State Management](#state-management)
- [Routing & Navigation](#routing--navigation)
- [Performance](#performance)
- [Security & Authentication](#security--authentication)
- [Data & APIs](#data--apis)
- [UI & UX](#ui--ux)
- [Development & Build](#development--build)
- [Acronyms](#acronyms)

---

## General Terms

### Enzyme
The @missionfabric-js/enzyme package itself - an enterprise React framework providing advanced routing, state management, performance optimizations, and plug-and-play architecture.

### Module
A self-contained unit of functionality within Enzyme that can be independently imported. Examples: `auth`, `routing`, `state`, `performance`.

### Package Export
A specific import path provided by Enzyme, such as `@missionfabric-js/enzyme/auth` or `@missionfabric-js/enzyme/routing`.

### Plug-and-Play
Design philosophy where modules can be used independently without requiring the entire framework. Use what you need, ignore the rest.

### Tree-Shaking
Build optimization that removes unused code from the final bundle. Enzyme's modular architecture enables effective tree-shaking.

### Enterprise-Grade
Features and patterns designed for large-scale production applications with requirements for security, performance, scalability, and maintainability.

---

## Architecture & Patterns

### Feature-Based Architecture
Organizational pattern where code is structured by features/domains rather than technical layers. Each feature is a self-contained vertical slice.

```
features/
└── reports/
    ├── components/
    ├── hooks/
    ├── services/
    └── types/
```

### Vertical Slice
A feature implementation that includes all layers (UI, logic, data) within a single directory, promoting cohesion and independence.

### Provider Composition
Pattern of wrapping the application with multiple React context providers to supply global services (auth, routing, theme, etc.).

```typescript
<AuthProvider>
  <ThemeProvider>
    <RouterProvider>
      <App />
    </RouterProvider>
  </ThemeProvider>
</AuthProvider>
```

### Configuration Hub
Centralized configuration system providing a single source of truth for all application settings, routes, API endpoints, and constants.

### Module Registry
System for registering and managing feature modules dynamically, allowing features to be loaded on-demand.

### Service Layer
Abstraction layer between components and external services (APIs, databases, etc.), providing a consistent interface for data operations.

### Dependency Injection
Pattern where dependencies are provided to components/modules rather than created within them, improving testability and flexibility.

---

## Modules & Components

### Core Module
The `@missionfabric-js/enzyme/core` module providing application initialization and lifecycle management.

### System Module
The `@missionfabric-js/enzyme/system` module containing system-level utilities and configuration.

### Feature Module
A registered feature with metadata, configuration, components, and routes that can be dynamically loaded.

### Layout Component
Reusable component that provides structure and chrome (header, sidebar, footer) for pages.

### Route Component
Component mapped to a specific URL path that renders when the route is active.

### Guard Component
Component that wraps other components to provide access control based on authentication, roles, or permissions.

### Provider Component
React component that uses Context API to provide values to child components.

### HOC (Higher-Order Component)
Function that takes a component and returns a new component with additional props or behavior. Example: `withAuth(Component)`.

### Compound Component
Pattern where multiple components work together to provide a cohesive API. Example: `<Tabs>` and `<Tab>`.

---

## State Management

### Global State
Application-wide state managed by Zustand that's accessible from any component.

### Local State
Component-specific state managed with `useState` or `useReducer`.

### Server State
Data that originates from the server, managed with React Query (TanStack Query).

### Zustand
Lightweight state management library used by Enzyme for client-side global state.

### Store
Central object containing application state and methods to update it (Zustand store).

### Slice
Section of the global store focused on a specific domain (e.g., user slice, UI slice).

### Selector
Function that derives or extracts specific data from the store state.

```typescript
const user = useStore((state) => state.user);
```

### Immer
Library for immutable state updates using mutable syntax. Integrated with Zustand.

### Persist Middleware
Zustand middleware that saves store state to localStorage/sessionStorage.

### Devtools
Integration with Redux DevTools for debugging Zustand stores.

### Multi-Tab Sync
Feature that synchronizes state across browser tabs/windows using BroadcastChannel API.

### Leader Election
Process of selecting one tab as the "leader" to coordinate actions across tabs.

---

## Routing & Navigation

### File-System Routing
Routing approach where file structure determines route paths automatically.

```
routes/
├── root/
│   ├── dashboard/
│   │   └── index.tsx  → /dashboard
```

### Route Guard
Function or component that controls access to routes based on conditions (authentication, roles, permissions).

### Dynamic Route
Route with variable segments, such as `/users/:id` where `:id` is a parameter.

```typescript
routes/users/[id].tsx → /users/:id
```

### Catch-All Route
Route that matches any path not matched by other routes, typically for 404 pages.

```typescript
routes/[...catchAll].tsx → /*
```

### Optional Parameter
Route parameter that may or may not be present.

```typescript
routes/[[slug]].tsx → /:slug?
```

### Route Registry
Central registry of all application routes with metadata and configuration.

### Navigation Hook
React hook for programmatic navigation (`useNavigate`, `useRouter`).

### Link Component
Component for declarative navigation between routes without full page reload.

### Route Transition
Animation or effect when navigating between routes.

### Prefetching
Loading route code/data before the user navigates to improve perceived performance.

### Route Conflict
Situation where multiple route patterns could match the same URL, detected at build time.

---

## Performance

### Core Web Vitals
Key metrics for measuring user experience: LCP, FID/INP, CLS, FCP, TTFB.

### LCP (Largest Contentful Paint)
Time until the largest content element is visible (target: < 2.5s).

### FID (First Input Delay)
Time from first user interaction to browser response (target: < 100ms).

### INP (Interaction to Next Paint)
Replacement for FID measuring responsiveness throughout page lifetime (target: < 200ms).

### CLS (Cumulative Layout Shift)
Visual stability score measuring unexpected layout shifts (target: < 0.1).

### FCP (First Contentful Paint)
Time until first content appears (target: < 1.8s).

### TTFB (Time to First Byte)
Time until the browser receives the first byte from the server (target: < 600ms).

### Code Splitting
Breaking application into smaller chunks that load on-demand.

### Lazy Loading
Deferring loading of components or resources until they're needed.

### Prefetching
Loading resources before they're needed based on predicted user actions.

### Bundle Size
Total size of JavaScript/CSS files sent to the browser.

### Tree-Shaking
Removing unused code during build process.

### Performance Observatory
Built-in Enzyme component for monitoring and displaying performance metrics.

### Predictive Prefetching
AI-driven route prefetching using Markov chains to learn navigation patterns.

### Hydration
Process of attaching React event handlers to server-rendered HTML.

### Auto-Prioritized Hydration
Enzyme's system for intelligently hydrating components based on viewport visibility and interaction.

### Selective Hydration
Hydrating only specific components rather than the entire page.

### Streaming
Sending HTML to the client in chunks as they become ready, rather than waiting for the complete page.

### Progressive Enhancement
Starting with basic functionality and enhancing with advanced features as resources allow.

---

## Security & Authentication

### Authentication
Process of verifying user identity (login).

### Authorization
Process of determining what authenticated users can access (permissions).

### RBAC (Role-Based Access Control)
Authorization model based on user roles (admin, user, guest).

### ABAC (Attribute-Based Access Control)
Authorization model based on user/resource attributes.

### Permission
Specific capability granted to a user (e.g., "reports:create").

### Role
Named set of permissions assigned to users (e.g., "admin", "manager").

### Route Guard
Protection mechanism preventing unauthorized access to routes.

### Token
Credential used to authenticate API requests (JWT, OAuth token).

### JWT (JSON Web Token)
Compact token format for securely transmitting information between parties.

### SSO (Single Sign-On)
Authentication scheme allowing users to log in once for multiple applications.

### OAuth
Authorization framework for third-party access to user resources.

### CSRF (Cross-Site Request Forgery)
Attack forcing users to execute unwanted actions. Protected by CSRF tokens.

### XSS (Cross-Site Scripting)
Attack injecting malicious scripts into web pages. Prevented by sanitization and CSP.

### CSP (Content Security Policy)
Security standard preventing XSS by controlling resource loading.

### Sanitization
Process of cleaning user input to remove malicious content.

### Session
Period of user interaction with the application, typically tied to authentication.

---

## Data & APIs

### API Client
Service for making HTTP requests to backend APIs.

### Query
Read operation fetching data from the server (GET request).

### Mutation
Write operation modifying server data (POST, PUT, DELETE).

### TanStack Query (React Query)
Library for managing server state, caching, and data synchronization.

### Query Key
Unique identifier for a query, used for caching and invalidation.

```typescript
queryKey: ['users', userId]
```

### Cache
Temporary storage of data to avoid refetching from the server.

### Stale Time
Duration before cached data is considered outdated.

### Cache Invalidation
Marking cached data as stale to trigger refetch.

### Optimistic Update
Updating UI immediately before server confirms, rolling back on error.

### Polling
Repeatedly fetching data at intervals to detect changes.

### WebSocket
Bidirectional communication channel for real-time data.

### SSE (Server-Sent Events)
Server-to-client streaming protocol for real-time updates.

### REST API
API design style using HTTP methods and resource-based URLs.

### GraphQL
Query language for APIs allowing clients to request specific data.

### Endpoint
Specific URL path for API operations.

### Rate Limiting
Restricting the number of API requests in a time period.

---

## UI & UX

### Design System
Collection of reusable components, patterns, and guidelines.

### Design Token
Named entity storing design decisions (colors, spacing, typography).

### Component Library
Collection of reusable UI components (Button, Card, Modal, etc.).

### Theme
Set of design tokens defining the visual appearance (colors, fonts, spacing).

### Dark Mode
Alternative color scheme with dark backgrounds and light text.

### Light Mode
Standard color scheme with light backgrounds and dark text.

### Responsive Design
Approach ensuring UI adapts to different screen sizes.

### Breakpoint
Screen width threshold where layout changes (mobile, tablet, desktop).

### Skeleton Screen
Placeholder UI showing content structure while loading.

### Loading State
Visual indicator that content is being fetched.

### Error Boundary
React component catching JavaScript errors in child components.

### Suspense Boundary
React component managing loading states for lazy-loaded components.

### Modal
Overlay dialog requiring user interaction before returning to main content.

### Toast
Temporary notification message appearing briefly.

### Accordion
Collapsible content sections expanding/collapsing on click.

### Tabs
Navigation pattern switching between different views in the same context.

### Accessibility (a11y)
Practice of making applications usable by people with disabilities.

### ARIA (Accessible Rich Internet Applications)
Specification for making web content accessible.

### Semantic HTML
Using HTML elements according to their meaning (header, nav, main, etc.).

---

## Development & Build

### TypeScript
Statically-typed superset of JavaScript used by Enzyme.

### Vite
Build tool and development server providing fast HMR and optimized builds.

### HMR (Hot Module Replacement)
Updating modules in the browser without full page reload.

### ESLint
Linting tool for identifying code quality and style issues.

### Prettier
Code formatter ensuring consistent code style.

### Vitest
Testing framework for unit and integration tests.

### Playwright
End-to-end testing framework for browser automation.

### CI/CD (Continuous Integration/Continuous Deployment)
Automated pipeline for testing and deploying code.

### Build Time
When application is compiled/bundled (as opposed to runtime).

### Runtime
When application is executing in the browser.

### Development Mode
Build configuration for local development with debugging tools.

### Production Mode
Optimized build configuration for deployment.

### Source Map
File mapping compiled code to original source for debugging.

### Module Bundler
Tool combining multiple files into optimized bundles (Vite uses Rollup).

### Monorepo
Single repository containing multiple related packages/projects.

### Peer Dependency
Dependency that must be installed by the consuming application.

---

## Acronyms

### A-C

| Acronym | Full Term | Context |
|---------|-----------|---------|
| **ABAC** | Attribute-Based Access Control | Security |
| **API** | Application Programming Interface | Data |
| **ARIA** | Accessible Rich Internet Applications | Accessibility |
| **CDN** | Content Delivery Network | Deployment |
| **CI/CD** | Continuous Integration/Continuous Deployment | Development |
| **CLS** | Cumulative Layout Shift | Performance |
| **CRA** | Create React App | Tools |
| **CSRF** | Cross-Site Request Forgery | Security |
| **CSP** | Content Security Policy | Security |
| **CSR** | Client-Side Rendering | Rendering |

### D-H

| Acronym | Full Term | Context |
|---------|-----------|---------|
| **DOM** | Document Object Model | Web |
| **DX** | Developer Experience | General |
| **E2E** | End-to-End | Testing |
| **ESM** | ECMAScript Modules | JavaScript |
| **FCP** | First Contentful Paint | Performance |
| **FID** | First Input Delay | Performance |
| **HOC** | Higher-Order Component | React |
| **HMR** | Hot Module Replacement | Development |
| **HTML** | HyperText Markup Language | Web |
| **HTTP** | HyperText Transfer Protocol | Networking |

### I-P

| Acronym | Full Term | Context |
|---------|-----------|---------|
| **INP** | Interaction to Next Paint | Performance |
| **JWT** | JSON Web Token | Security |
| **LCP** | Largest Contentful Paint | Performance |
| **MFA** | Multi-Factor Authentication | Security |
| **NPM** | Node Package Manager | Tools |
| **OAuth** | Open Authorization | Security |
| **PWA** | Progressive Web App | Web |

### R-S

| Acronym | Full Term | Context |
|---------|-----------|---------|
| **RBAC** | Role-Based Access Control | Security |
| **REST** | Representational State Transfer | API |
| **SPA** | Single-Page Application | Architecture |
| **SSE** | Server-Sent Events | Real-time |
| **SSG** | Static Site Generation | Rendering |
| **SSO** | Single Sign-On | Security |
| **SSR** | Server-Side Rendering | Rendering |

### T-Z

| Acronym | Full Term | Context |
|---------|-----------|---------|
| **TTFB** | Time to First Byte | Performance |
| **TTI** | Time to Interactive | Performance |
| **UI** | User Interface | General |
| **UX** | User Experience | General |
| **VDOM** | Virtual DOM / Virtual Modular DOM | React / Enzyme |
| **XSS** | Cross-Site Scripting | Security |

---

## Context-Specific Terms

### Enzyme-Specific

**Virtual Modular DOM (VDOM)**
Enzyme's system for partitioning the virtual DOM into isolated modules with lazy loading and security sandboxing.

**Feature Registry**
Enzyme's system for registering and managing feature modules dynamically.

**Performance Observatory**
Built-in monitoring component displaying Core Web Vitals in real-time.

**Configuration Hub**
Centralized configuration system in `@missionfabric-js/enzyme/config`.

**Route Guard Resolver**
System for executing multiple guards in sequence with short-circuit evaluation.

**Auto-Prioritized Hydration**
Enzyme's intelligent hydration system based on viewport visibility and user interaction.

**Predictive Prefetching**
AI-driven route prefetching using Markov chains.

**Module Isolation**
VDOM feature ensuring modules don't interfere with each other.

**Adaptive Layouts**
Layout system that adjusts based on content and user behavior.

**Streaming Engine**
Progressive HTML streaming system for improved perceived performance.

### React-Specific

**Hook**
Function starting with "use" that lets you use React features in function components.

**Effect**
Side-effect in React managed with `useEffect` hook.

**Ref**
Reference to a DOM element or value that persists across renders.

**Portal**
Rendering children into a DOM node outside the parent hierarchy.

**Fiber**
React's internal reconciliation algorithm.

**Reconciliation**
Process of determining what changed in the virtual DOM and updating the real DOM.

**Concurrent Mode**
React feature enabling interruptible rendering for better responsiveness.

**Suspense**
React component for handling loading states declaratively.

---

## Common Patterns

### Factory Pattern
Creating objects/functions through a factory function.

```typescript
const useAppStore = createAppStore((set) => ({ /* state */ }));
const router = createRouter({ routes });
```

### Provider Pattern
Using React Context to provide values to component tree.

```typescript
<Provider value={data}>
  <Children />
</Provider>
```

### Hook Pattern
Extracting reusable logic into custom hooks.

```typescript
function useAuth() { /* ... */ }
function useTheme() { /* ... */ }
```

### Render Props Pattern
Component accepting a function as a child to customize rendering.

```typescript
<DataProvider>
  {data => <Display data={data} />}
</DataProvider>
```

### Compound Component Pattern
Multiple components working together with shared state.

```typescript
<Tabs>
  <Tab>First</Tab>
  <Tab>Second</Tab>
</Tabs>
```

---

## Related Concepts

### Dependency Graph
Visual representation of module dependencies.

### Bundle Analysis
Examining composition and size of build output.

### Lazy Loading Strategy
Approach for determining what to load lazily vs. upfront.

### Error Recovery
Handling and recovering from errors gracefully.

### Graceful Degradation
Providing basic functionality when advanced features fail.

### Progressive Enhancement**
Building basic functionality first, then adding enhancements.

### Idempotency**
Property where operation produces same result regardless of repetition.

### Memoization**
Caching function results based on inputs.

### Debouncing**
Delaying function execution until after a pause in events.

### Throttling**
Limiting function execution to once per time period.

---

## Usage Examples

### In Documentation

When writing documentation, use consistent terminology:

- ✅ "Import the `auth` module"
- ❌ "Import the auth package"

- ✅ "Use the `useAuth` hook"
- ❌ "Call the useAuth function"

- ✅ "Add a route guard"
- ❌ "Add route protection"

### In Code

```typescript
// Module import
import { useAuth } from '@missionfabric-js/enzyme/auth';

// Using hooks
const auth = useAuth();

// Route guard
<RequireAuth>
  <ProtectedPage />
</RequireAuth>

// Feature module
const feature = {
  id: 'reports',
  component: lazy(() => import('./ReportsPage')),
};
```

---

## See Also

- [Documentation Hub](./README.md) - Main documentation
- [Navigation Reference](./NAVIGATION.md) - Documentation structure
- [Architecture Overview](./ARCHITECTURE.md) - System architecture
- [FAQ](./FAQ.md) - Frequently asked questions

---

<div align="center">

**Glossary for @missionfabric-js/enzyme**

[Documentation Hub](./README.md) • [Navigation](./NAVIGATION.md)

</div>
