# Harbor React Examples

> **Comprehensive code examples** for the Harbor React Library. Each example demonstrates real-world usage patterns with complete, runnable code.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Examples Overview](#examples-overview)
- [How to Use Examples](#how-to-use-examples)
- [Example Categories](#example-categories)
- [Contributing Examples](#contributing-examples)

---

## Getting Started

These examples demonstrate practical implementations of Harbor React features. Each example is:

- **Complete** - Fully functional code you can copy and run
- **Documented** - Detailed explanations of what and why
- **Best Practice** - Following recommended patterns
- **Real-World** - Solving actual use cases

### Prerequisites

Before using these examples, ensure you have:

- Basic understanding of React and TypeScript
- Harbor React template installed ([Quick Start](../../../docs/QUICKSTART.md))
- Familiarity with the [Architecture](../../docs/ARCHITECTURE.md) (recommended)

---

## Examples Overview

| Example File | Topics Covered | Complexity | Examples Count |
|--------------|----------------|------------|----------------|
| [auth-examples.md](./auth-examples.md) | Authentication, SSO, MFA, Session Management | Beginner to Advanced | 25+ |
| [routing-examples.md](./routing-examples.md) | Type-safe routing, Guards, Prefetching, Dynamic routes | Beginner to Intermediate | 25+ |
| [rbac-examples.md](./rbac-examples.md) | Role-based access, Permissions, Hierarchies | Intermediate | 20+ |
| [state-examples.md](./state-examples.md) | Zustand, React Query, Multi-tab sync, Persistence | Beginner to Advanced | 30+ |
| [performance-examples.md](./performance-examples.md) | Optimization, Caching, Lazy loading, Monitoring | Intermediate to Advanced | 20+ |

**Total Examples: 120+**

---

## How to Use Examples

### 1. Browse by Category

Navigate to the example file that matches your needs:

```bash
# Authentication examples
./auth-examples.md

# Routing examples
./routing-examples.md

# RBAC examples
./rbac-examples.md

# State management examples
./state-examples.md

# Performance examples
./performance-examples.md
```

### 2. Find Your Use Case

Each file is organized by use case. Use the table of contents to jump to your specific need:

```markdown
## Table of Contents
1. [Basic Login Form](#basic-login-form)
2. [SSO Integration](#sso-integration)
3. [MFA with TOTP](#mfa-with-totp)
...
```

### 3. Copy and Adapt

All examples are complete and runnable. Copy the code and adapt it to your needs:

```typescript
// Example: Basic Login
// 1. Copy the example code
// 2. Update imports to match your project structure
// 3. Customize styling and validation
// 4. Test in your application
```

### 4. Learn the Pattern

Each example includes:

- **What**: Description of what the example does
- **Why**: When to use this pattern
- **How**: Implementation details
- **Best Practices**: Tips and gotchas

---

## Example Categories

### Authentication Examples ([auth-examples.md](./auth-examples.md))

**25+ Examples covering:**

- **Basic Authentication**
  - Simple login/logout
  - Registration flows
  - Password reset
  - Email verification

- **Advanced Auth**
  - SSO with SAML/OIDC
  - Multi-factor authentication (TOTP, WebAuthn)
  - Active Directory integration
  - Session management

- **Security**
  - Token refresh strategies
  - Secure token storage
  - CSRF protection
  - Rate limiting

**Complexity**: Beginner to Advanced
**Use Cases**: Login pages, SSO integration, enterprise auth

---

### Routing Examples ([routing-examples.md](./routing-examples.md))

**25+ Examples covering:**

- **Basic Routing**
  - Type-safe route definitions
  - Dynamic parameters
  - Query parameters
  - Nested routes

- **Route Guards**
  - Authentication guards
  - Role-based guards
  - Custom guards
  - Redirect strategies

- **Advanced Routing**
  - Predictive prefetching
  - Code splitting
  - Route-based data loading
  - 404 handling

**Complexity**: Beginner to Intermediate
**Use Cases**: Navigation, protected routes, performance optimization

---

### RBAC Examples ([rbac-examples.md](./rbac-examples.md))

**20+ Examples covering:**

- **Basic RBAC**
  - Role definitions
  - Permission checks
  - Component guards
  - Hook-based checks

- **Advanced RBAC**
  - Role hierarchies
  - Dynamic permissions
  - Context-aware permissions
  - Permission caching

- **UI Patterns**
  - Conditional rendering
  - Disabled states
  - Hidden actions
  - Fallback content

**Complexity**: Intermediate
**Use Cases**: Multi-tenant apps, admin panels, permission systems

---

### State Management Examples ([state-examples.md](./state-examples.md))

**30+ Examples covering:**

- **Client State (Zustand)**
  - Store setup
  - Selectors
  - Actions
  - Persistence

- **Server State (React Query)**
  - Data fetching
  - Mutations
  - Cache management
  - Optimistic updates

- **Advanced Patterns**
  - Multi-tab synchronization
  - State persistence
  - Derived state
  - State machines

**Complexity**: Beginner to Advanced
**Use Cases**: App state, API data, cross-tab sync, offline support

---

### Performance Examples ([performance-examples.md](./performance-examples.md))

**20+ Examples covering:**

- **Optimization Techniques**
  - React.memo and useMemo
  - Code splitting
  - Lazy loading
  - Bundle optimization

- **Caching Strategies**
  - HTTP caching
  - React Query cache
  - Service workers
  - Cache invalidation

- **Monitoring**
  - Core Web Vitals
  - Performance Observatory
  - Custom metrics
  - Error tracking

**Complexity**: Intermediate to Advanced
**Use Cases**: Large apps, performance optimization, monitoring

---

## Quick Reference

### By Difficulty Level

**Beginner**
- Basic login/logout ([auth-examples.md](./auth-examples.md))
- Simple routing ([routing-examples.md](./routing-examples.md))
- Basic state management ([state-examples.md](./state-examples.md))

**Intermediate**
- Route guards ([routing-examples.md](./routing-examples.md))
- RBAC implementation ([rbac-examples.md](./rbac-examples.md))
- React Query patterns ([state-examples.md](./state-examples.md))

**Advanced**
- SSO integration ([auth-examples.md](./auth-examples.md))
- Multi-tab sync ([state-examples.md](./state-examples.md))
- Performance optimization ([performance-examples.md](./performance-examples.md))

### By Use Case

**Building a Login Page**
→ [auth-examples.md](./auth-examples.md) - Basic Login, SSO

**Protecting Routes**
→ [routing-examples.md](./routing-examples.md) - Route Guards
→ [rbac-examples.md](./rbac-examples.md) - Permission Guards

**Managing App State**
→ [state-examples.md](./state-examples.md) - Zustand Store, Persistence

**Fetching API Data**
→ [state-examples.md](./state-examples.md) - React Query Patterns

**Improving Performance**
→ [performance-examples.md](./performance-examples.md) - Optimization Techniques

**Role-Based Features**
→ [rbac-examples.md](./rbac-examples.md) - Roles and Permissions

---

## Contributing Examples

We welcome contributions! To add a new example:

### Example Template

```markdown
## Example Title

**What**: Brief description of what this example demonstrates

**When to Use**: When you need to...

**Complexity**: Beginner | Intermediate | Advanced

### Implementation

\`\`\`typescript
// Complete, runnable code
import { useAuth } from '@/lib/auth';

export function MyExample() {
  // Implementation
}
\`\`\`

### Explanation

1. **Step 1**: Explanation
2. **Step 2**: Explanation
3. **Step 3**: Explanation

### Best Practices

- ✅ Do this
- ❌ Don't do this

### Common Pitfalls

- **Pitfall 1**: How to avoid
- **Pitfall 2**: How to avoid

### Related Examples

- [Another Example](#another-example)
- [Related Pattern](#related-pattern)
```

### Contribution Guidelines

1. **One concept per example** - Keep examples focused
2. **Complete code** - Must be copy-paste ready
3. **Real-world use cases** - Solve actual problems
4. **Follow patterns** - Use established Harbor React patterns
5. **Add context** - Explain when and why to use

### Review Checklist

- [ ] Code compiles and runs
- [ ] TypeScript types are correct
- [ ] Follows existing example format
- [ ] Includes explanation and best practices
- [ ] Cross-references related examples
- [ ] Added to this README's table of contents

---

## Related Documentation

### Core Guides
- [Documentation Index](../INDEX.md) - All library documentation
- [Architecture Overview](../../docs/ARCHITECTURE.md) - System design patterns
- [Getting Started](../../docs/GETTING_STARTED.md) - Initial setup guide

### Reference Docs
- [Authentication Guide](../AUTHENTICATION.md) - Auth system reference
- [Routing Guide](../ROUTING.md) - Routing system reference
- [RBAC Guide](../RBAC.md) - Role-based access control
- [Performance Guide](../PERFORMANCE.md) - Performance patterns

### Integration Guides
- [Auth, Security & State](../../docs/integration/AUTH_SECURITY_STATE.md)
- [Routing, State & Guards](../../docs/integration/ROUTING_STATE_GUARDS.md)
- [Realtime, Queries & Services](../../docs/integration/REALTIME_QUERIES_SERVICES.md)

---

## Getting Help

- **Not finding what you need?** Open an issue requesting a new example
- **Have a great example?** Submit a PR to share it
- **Found an error?** Let us know so we can fix it

---

<p align="center">
  <strong>Harbor React Examples</strong><br>
  Learn by doing with 120+ practical examples
</p>
