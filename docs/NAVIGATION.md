# Documentation Navigation Reference

> **Purpose**: This document provides a comprehensive navigation structure for the @missionfabric-js/enzyme documentation. Use this as a sidebar reference, breadcrumb navigation, or sequential reading guide.

---

## Navigation Quick Links

| Type | Purpose |
|------|---------|
| [Breadcrumb Navigation](#breadcrumb-navigation) | Hierarchical page location |
| [Sidebar Navigation](#sidebar-navigation-tree) | Full documentation tree |
| [Sequential Reading](#sequential-reading-path) | Previous/Next page links |
| [Primary Navigation](#primary-navigation) | Main navigation categories |

---

## Breadcrumb Navigation

Use these breadcrumb paths to show users their current location in the documentation hierarchy:

### Getting Started Pages

```
Home > Getting Started > Quick Start
Home > Getting Started > Installation
Home > Getting Started > First Application
Home > Getting Started > Tutorial
```

### Core Concepts Pages

```
Home > Core Concepts > Architecture
Home > Core Concepts > Features
Home > Core Concepts > Philosophy
Home > Core Concepts > Design Patterns
```

### API Reference Pages

```
Home > API Reference > Complete API
Home > API Reference > Module APIs
Home > API Reference > Hooks
Home > API Reference > Components
Home > API Reference > Configuration
```

### Development Guides Pages

```
Home > Guides > Configuration
Home > Guides > State Management
Home > Guides > Routing
Home > Guides > API & Data Fetching
Home > Guides > Authentication
Home > Guides > Performance
Home > Guides > Testing
```

### Advanced Topics Pages

```
Home > Advanced > Streaming
Home > Advanced > Hydration
Home > Advanced > VDOM
Home > Advanced > Layouts
Home > Advanced > Real-time
```

### Support Pages

```
Home > Support > FAQ
Home > Support > Troubleshooting
Home > Support > Migration
```

---

## Sequential Reading Path

Follow this order for learning the framework comprehensively:

### Learning Path 1: Getting Started (Beginner)

| Order | Document | Previous | Next |
|-------|----------|----------|------|
| 1 | [README.md](./README.md) | - | [QUICKSTART.md](./QUICKSTART.md) |
| 2 | [QUICKSTART.md](./QUICKSTART.md) | [README.md](./README.md) | [GETTING_STARTED.md](./GETTING_STARTED.md) |
| 3 | [GETTING_STARTED.md](./GETTING_STARTED.md) | [QUICKSTART.md](./QUICKSTART.md) | [CONFIGURATION.md](./CONFIGURATION.md) |
| 4 | [CONFIGURATION.md](./CONFIGURATION.md) | [GETTING_STARTED.md](./GETTING_STARTED.md) | [ARCHITECTURE.md](./ARCHITECTURE.md) |

### Learning Path 2: Core Concepts (Intermediate)

| Order | Document | Previous | Next |
|-------|----------|----------|------|
| 1 | [ARCHITECTURE.md](./ARCHITECTURE.md) | [CONFIGURATION.md](./CONFIGURATION.md) | [FEATURES.md](./FEATURES.md) |
| 2 | [FEATURES.md](./FEATURES.md) | [ARCHITECTURE.md](./ARCHITECTURE.md) | [STATE.md](./STATE.md) |
| 3 | [STATE.md](./STATE.md) | [FEATURES.md](./FEATURES.md) | [AUTO_ROUTES.md](./AUTO_ROUTES.md) |
| 4 | [AUTO_ROUTES.md](./AUTO_ROUTES.md) | [STATE.md](./STATE.md) | [API.md](./API.md) |
| 5 | [API.md](./API.md) | [AUTO_ROUTES.md](./AUTO_ROUTES.md) | [SECURITY.md](./SECURITY.md) |

### Learning Path 3: Security & Performance (Intermediate)

| Order | Document | Previous | Next |
|-------|----------|----------|------|
| 1 | [SECURITY.md](./SECURITY.md) | [API.md](./API.md) | [PERFORMANCE.md](./PERFORMANCE.md) |
| 2 | [PERFORMANCE.md](./PERFORMANCE.md) | [SECURITY.md](./SECURITY.md) | [TESTING.md](./TESTING.md) |
| 3 | [TESTING.md](./TESTING.md) | [PERFORMANCE.md](./PERFORMANCE.md) | [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) |
| 4 | [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | [TESTING.md](./TESTING.md) | [STREAMING.md](./STREAMING.md) |

### Learning Path 4: Advanced Features (Advanced)

| Order | Document | Previous | Next |
|-------|----------|----------|------|
| 1 | [STREAMING.md](./STREAMING.md) | [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | [HYDRATION.md](./HYDRATION.md) |
| 2 | [HYDRATION.md](./HYDRATION.md) | [STREAMING.md](./STREAMING.md) | [VDOM.md](./VDOM.md) |
| 3 | [VDOM.md](./VDOM.md) | [HYDRATION.md](./HYDRATION.md) | [LAYOUTS.md](./LAYOUTS.md) |
| 4 | [LAYOUTS.md](./LAYOUTS.md) | [VDOM.md](./VDOM.md) | [MODULE_DOCUMENTATION.md](./MODULE_DOCUMENTATION.md) |

### Reference Path: API Documentation

| Order | Document | Previous | Next |
|-------|----------|----------|------|
| 1 | [ENZYME_API_DOCUMENTATION.md](./ENZYME_API_DOCUMENTATION.md) | - | [MODULE_API_DOCUMENTATION.md](./MODULE_API_DOCUMENTATION.md) |
| 2 | [MODULE_API_DOCUMENTATION.md](./MODULE_API_DOCUMENTATION.md) | [ENZYME_API_DOCUMENTATION.md](./ENZYME_API_DOCUMENTATION.md) | [SYSTEM_AND_TYPES_API_DOCUMENTATION.md](./SYSTEM_AND_TYPES_API_DOCUMENTATION.md) |
| 3 | [SYSTEM_AND_TYPES_API_DOCUMENTATION.md](./SYSTEM_AND_TYPES_API_DOCUMENTATION.md) | [MODULE_API_DOCUMENTATION.md](./MODULE_API_DOCUMENTATION.md) | [HOOKS_REFERENCE.md](./HOOKS_REFERENCE.md) |
| 4 | [HOOKS_REFERENCE.md](./HOOKS_REFERENCE.md) | [SYSTEM_AND_TYPES_API_DOCUMENTATION.md](./SYSTEM_AND_TYPES_API_DOCUMENTATION.md) | [COMPONENTS_REFERENCE.md](./COMPONENTS_REFERENCE.md) |
| 5 | [COMPONENTS_REFERENCE.md](./COMPONENTS_REFERENCE.md) | [HOOKS_REFERENCE.md](./HOOKS_REFERENCE.md) | [CONFIG_REFERENCE.md](./CONFIG_REFERENCE.md) |
| 6 | [CONFIG_REFERENCE.md](./CONFIG_REFERENCE.md) | [COMPONENTS_REFERENCE.md](./COMPONENTS_REFERENCE.md) | - |

---

## Sidebar Navigation Tree

Complete hierarchical navigation tree for documentation sites:

```
📘 @missionfabric-js/enzyme Documentation
│
├── 🏠 Home
│   └── README.md
│
├── 🚀 Getting Started
│   ├── Quick Start (10 min) → QUICKSTART.md
│   ├── Full Tutorial → GETTING_STARTED.md
│   ├── Installation
│   └── Configuration → CONFIGURATION.md
│
├── 📖 Core Concepts
│   ├── Architecture → ARCHITECTURE.md
│   ├── Features → FEATURES.md
│   ├── Philosophy & Patterns
│   └── Module System → MODULE_DOCUMENTATION.md
│
├── 📚 API Reference
│   ├── Complete API → ENZYME_API_DOCUMENTATION.md
│   ├── Module APIs → MODULE_API_DOCUMENTATION.md
│   ├── System & Types → SYSTEM_AND_TYPES_API_DOCUMENTATION.md
│   ├── Hooks → HOOKS_REFERENCE.md
│   ├── Components → COMPONENTS_REFERENCE.md
│   └── Configuration → CONFIG_REFERENCE.md
│
├── 📝 Development Guides
│   ├── Configuration
│   │   ├── Overview → CONFIGURATION.md
│   │   ├── Reference → CONFIG_REFERENCE.md
│   │   └── Environment → ENVIRONMENT.md
│   │
│   ├── State Management
│   │   ├── Guide → STATE.md
│   │   ├── Zustand Patterns
│   │   ├── React Query
│   │   └── Multi-tab Sync
│   │
│   ├── Routing & Navigation
│   │   ├── Auto-Routes → AUTO_ROUTES.md
│   │   ├── File-system Routing
│   │   ├── Route Guards
│   │   └── Navigation Hooks
│   │
│   ├── API & Data
│   │   ├── API Guide → API.md
│   │   ├── HTTP Client
│   │   ├── Data Fetching
│   │   ├── Mutations
│   │   └── Caching
│   │
│   ├── Security
│   │   ├── Guide → SECURITY.md
│   │   ├── Authentication
│   │   ├── Authorization (RBAC)
│   │   ├── Route Protection
│   │   └── Active Directory
│   │
│   ├── Performance
│   │   ├── Guide → PERFORMANCE.md
│   │   ├── Optimization
│   │   ├── Monitoring
│   │   ├── Web Vitals
│   │   └── Budgets
│   │
│   ├── Testing
│   │   ├── Guide → TESTING.md
│   │   ├── Unit Tests
│   │   ├── Integration Tests
│   │   └── E2E Tests
│   │
│   └── Design System
│       ├── Guide → DESIGN_SYSTEM.md
│       ├── Theming
│       ├── Components
│       └── Tokens
│
├── 🔬 Advanced Topics
│   ├── Streaming
│   │   ├── Guide → STREAMING.md
│   │   ├── Progressive HTML
│   │   ├── Chunked Transfer
│   │   └── Real-time Updates
│   │
│   ├── Hydration
│   │   ├── Guide → HYDRATION.md
│   │   ├── Auto-prioritized
│   │   ├── Selective
│   │   └── Strategies
│   │
│   ├── Virtual Modular DOM
│   │   ├── Guide → VDOM.md
│   │   ├── Module Isolation
│   │   ├── Lazy Loading
│   │   └── Security Sandbox
│   │
│   └── Layouts
│       ├── Guide → LAYOUTS.md
│       ├── Adaptive Layouts
│       ├── Context-aware
│       └── Responsive System
│
├── 🆘 Support
│   ├── FAQ → FAQ.md
│   ├── Troubleshooting → TROUBLESHOOTING.md
│   ├── Migration → MIGRATION.md
│   ├── Deployment → DEPLOYMENT.md
│   └── Glossary → GLOSSARY.md
│
└── 🔧 Reference
    ├── Master Index → INDEX.md
    ├── Navigation → NAVIGATION.md (this file)
    ├── Module Template → MODULE_README_TEMPLATE.md
    └── Examples → integration/
```

---

## Primary Navigation

### 1. Getting Started

```
Getting Started
├── Overview
│   ├── README.md (Documentation Hub)
│   ├── What is Enzyme?
│   ├── Why Choose Enzyme?
│   └── System Requirements
│
├── Installation
│   ├── Package Installation
│   ├── Peer Dependencies
│   └── Verification
│
├── Quick Start
│   ├── QUICKSTART.md (10-minute guide)
│   ├── First Application
│   └── Basic Examples
│
└── Getting Started Guide
    ├── GETTING_STARTED.md (Comprehensive)
    ├── Development Setup
    ├── Project Structure
    └── First Feature
```

**Files:**
- [Documentation Hub](./README.md)
- [Quick Start Guide](./QUICKSTART.md)
- [Getting Started](./GETTING_STARTED.md)

---

### 2. Core Concepts

```
Core Concepts
├── Architecture
│   ├── ARCHITECTURE.md
│   ├── System Design
│   ├── Module Architecture
│   └── Design Patterns
│
├── Philosophy
│   ├── Modular Design
│   ├── Developer Experience
│   ├── Enterprise-Grade Features
│   └── Plug-and-Play Approach
│
├── Feature-Based Architecture
│   ├── FEATURES.md
│   ├── Vertical Slices
│   ├── Feature Registry
│   └── Feature Lifecycle
│
└── Key Concepts
    ├── Provider Composition
    ├── State Management Model
    ├── Routing Strategy
    └── Performance Philosophy
```

**Files:**
- [Architecture Overview](./ARCHITECTURE.md)
- [Features Guide](./FEATURES.md)
- [Module Documentation](./MODULE_DOCUMENTATION.md)

---

### 3. API Reference

```
API Reference
├── Complete API
│   ├── ENZYME_API_DOCUMENTATION.md
│   ├── Main Package Exports
│   └── Type Definitions
│
├── Module APIs
│   ├── MODULE_API_DOCUMENTATION.md
│   ├── Individual Module Exports
│   └── Module-Specific Types
│
├── System & Types
│   ├── SYSTEM_AND_TYPES_API_DOCUMENTATION.md
│   ├── System Utilities
│   └── Global Types
│
├── Hooks
│   ├── HOOKS_REFERENCE.md
│   ├── Built-in Hooks
│   ├── Custom Hooks
│   └── Hook Patterns
│
└── Components
    ├── COMPONENTS_REFERENCE.md
    ├── UI Components
    ├── Layout Components
    └── Utility Components
```

**Files:**
- [Complete API Documentation](./ENZYME_API_DOCUMENTATION.md)
- [Module APIs](./MODULE_API_DOCUMENTATION.md)
- [System & Types](./SYSTEM_AND_TYPES_API_DOCUMENTATION.md)
- [Hooks Reference](./HOOKS_REFERENCE.md)
- [Components Reference](./COMPONENTS_REFERENCE.md)

---

### 4. Module Guides

```
Module Guides
├── Core Modules
│   ├── Core (Application)
│   ├── System (System Utilities)
│   ├── Shared (Common Utilities)
│   └── Utils (Helper Functions)
│
├── State & Data
│   ├── State (STATE.md)
│   ├── Data (Data Management)
│   ├── Queries (React Query)
│   ├── API (API_DOCUMENTATION.md)
│   └── Contexts (React Contexts)
│
├── Routing & Navigation
│   ├── Routing (AUTO_ROUTES.md)
│   └── Layouts (LAYOUTS.md)
│
├── Auth & Security
│   ├── Auth (SECURITY.md)
│   └── Security (Security Utils)
│
├── Performance
│   ├── Performance (PERFORMANCE.md)
│   ├── Hydration (HYDRATION.md)
│   ├── Streaming (STREAMING.md)
│   └── VDOM (VDOM.md)
│
├── Real-time
│   ├── Realtime (WebSocket/SSE)
│   └── Coordination (Multi-tab Sync)
│
├── UI & UX
│   ├── UI (Component Library)
│   ├── UX (UX Enhancements)
│   └── Theme (Theming System)
│
├── Features
│   ├── Feature (Feature Factory)
│   └── Flags (Feature Flags)
│
├── Config & Monitoring
│   ├── Config (CONFIGURATION.md)
│   ├── Monitoring (Error Tracking)
│   └── Services (Service Layer)
│
└── Hooks
    └── Hooks (Custom React Hooks)
```

**Module Documentation:**
- [State Management](./STATE.md)
- [API & Data Fetching](./API_DOCUMENTATION.md)
- [Routing & Auto-Routes](./AUTO_ROUTES.md)
- [Layouts System](./LAYOUTS.md)
- [Security & Authentication](./SECURITY.md)
- [Performance Optimization](./PERFORMANCE.md)
- [Hydration System](./HYDRATION.md)
- [Streaming Engine](./STREAMING.md)
- [Virtual Modular DOM](./VDOM.md)
- [Configuration Hub](./CONFIGURATION.md)

---

### 5. Development Guides

```
Development Guides
├── Configuration
│   ├── CONFIGURATION.md
│   ├── CONFIG_REFERENCE.md
│   ├── Environment Setup (ENVIRONMENT.md)
│   └── Design System (DESIGN_SYSTEM.md)
│
├── State Management
│   ├── STATE.md
│   ├── Zustand Integration
│   ├── React Query Patterns
│   ├── Store Creation
│   └── Multi-tab Sync
│
├── Routing
│   ├── AUTO_ROUTES.md
│   ├── File-system Routing
│   ├── Route Guards
│   ├── Navigation
│   └── Dynamic Routes
│
├── API & Data
│   ├── API.md / API_DOCUMENTATION.md
│   ├── HTTP Client
│   ├── Query Patterns
│   ├── Mutations
│   └── Caching Strategies
│
├── Authentication
│   ├── SECURITY.md (Auth Section)
│   ├── Authentication Flow
│   ├── Authorization (RBAC)
│   ├── Route Guards
│   └── SSO Integration
│
├── Performance
│   ├── PERFORMANCE.md
│   ├── Optimization Techniques
│   ├── Code Splitting
│   ├── Lazy Loading
│   ├── Prefetching
│   └── Web Vitals Monitoring
│
├── Security
│   ├── SECURITY.md
│   ├── Security Best Practices
│   ├── XSS Prevention
│   ├── CSRF Protection
│   └── Content Security Policy
│
└── Testing
    ├── TESTING.md
    ├── Unit Testing
    ├── Integration Testing
    ├── E2E Testing
    └── Testing Patterns
```

**Files:**
- [Configuration Guide](./CONFIGURATION.md)
- [Config Reference](./CONFIG_REFERENCE.md)
- [Environment Setup](./ENVIRONMENT.md)
- [State Management](./STATE.md)
- [Routing Guide](./AUTO_ROUTES.md)
- [API Guide](./API_DOCUMENTATION.md)
- [Security Guide](./SECURITY.md)
- [Performance Guide](./PERFORMANCE.md)
- [Testing Guide](./TESTING.md)
- [Design System](./DESIGN_SYSTEM.md)

---

### 6. Advanced Topics

```
Advanced Topics
├── Streaming & SSR
│   ├── STREAMING.md
│   ├── Progressive HTML Streaming
│   ├── Chunk Management
│   └── Server-Side Rendering
│
├── Hydration
│   ├── HYDRATION.md
│   ├── Auto-Prioritized Hydration
│   ├── Selective Hydration
│   ├── Viewport-based Strategy
│   └── Interaction-based Strategy
│
├── Virtual Modular DOM
│   ├── VDOM.md
│   ├── Module Isolation
│   ├── Lazy Loading Modules
│   ├── Module Registry
│   └── Security Sandbox
│
├── Adaptive Layouts
│   ├── LAYOUTS.md
│   ├── Context-aware Layouts
│   ├── Layout Morphing
│   ├── Responsive System
│   └── Layout Optimization
│
├── Real-time Features
│   ├── WebSocket Integration
│   ├── Server-Sent Events (SSE)
│   ├── Real-time State Sync
│   └── Presence Management
│
├── Multi-tab Coordination
│   ├── BroadcastChannel API
│   ├── Leader Election
│   ├── State Synchronization
│   └── Tab Communication
│
└── Feature Flags
    ├── Flag Management
    ├── Remote Flags
    ├── A/B Testing
    └── Progressive Rollouts
```

**Files:**
- [Streaming Guide](./STREAMING.md)
- [Hydration Guide](./HYDRATION.md)
- [VDOM Guide](./VDOM.md)
- [Layouts Guide](./LAYOUTS.md)

---

### 7. How-To Guides

```
How-To Guides
├── Authentication
│   ├── Set Up Authentication
│   ├── Implement Login/Logout
│   ├── Protect Routes
│   ├── Role-Based Access
│   └── SSO Integration
│
├── Routing
│   ├── Configure Routes
│   ├── Create Dynamic Routes
│   ├── Add Route Guards
│   ├── Implement Navigation
│   └── Handle 404 Errors
│
├── Data Fetching
│   ├── Set Up React Query
│   ├── Fetch Data
│   ├── Handle Mutations
│   ├── Implement Caching
│   └── Optimistic Updates
│
├── State Management
│   ├── Create Global Store
│   ├── Create Feature Store
│   ├── Persist State
│   ├── Sync Across Tabs
│   └── Debug State
│
├── Performance
│   ├── Enable Monitoring
│   ├── Optimize Bundle Size
│   ├── Implement Code Splitting
│   ├── Add Prefetching
│   └── Lazy Load Components
│
├── UI Development
│   ├── Use Design System
│   ├── Build Forms
│   ├── Create Modals
│   ├── Implement Dark Mode
│   └── Handle Responsive Design
│
└── Deployment
    ├── Build for Production
    ├── Environment Configuration
    ├── Deploy to Netlify
    ├── Deploy to Vercel
    └── Docker Deployment
```

**Reference:** [README.md - How-To Guides Section](./README.md#how-to-guides)

---

### 8. Migration & Troubleshooting

```
Migration & Troubleshooting
├── Migration Guides
│   ├── MIGRATION.md
│   ├── From Next.js
│   ├── From Create React App
│   ├── From Vite
│   ├── From Gatsby
│   └── Version Upgrades
│
├── Troubleshooting
│   ├── TROUBLESHOOTING.md
│   ├── Common Issues
│   ├── Authentication Problems
│   ├── Routing Issues
│   ├── Performance Problems
│   └── Build Errors
│
└── FAQ
    ├── FAQ.md
    ├── General Questions
    ├── Technical Questions
    ├── Best Practices
    └── Common Patterns
```

**Files:**
- [Migration Guide](./MIGRATION.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [FAQ](./FAQ.md)

---

### 9. Reference

```
Reference
├── Glossary
│   ├── GLOSSARY.md
│   ├── Common Terms
│   ├── Technical Terms
│   └── Acronyms
│
├── Configuration Reference
│   ├── CONFIG_REFERENCE.md
│   ├── All Config Options
│   └── Environment Variables
│
├── Module Templates
│   ├── MODULE_README_TEMPLATE.md
│   └── Feature Template
│
└── Version Information
    ├── Changelog
    ├── Breaking Changes
    └── Deprecations
```

**Files:**
- [Glossary](./GLOSSARY.md)
- [Config Reference](./CONFIG_REFERENCE.md)
- [Module Template](./MODULE_README_TEMPLATE.md)

---

### 10. Additional Resources

```
Additional Resources
├── Examples
│   ├── Integration Examples
│   ├── Code Recipes
│   └── Sample Projects
│
├── Deployment
│   ├── DEPLOYMENT.md
│   ├── Static Hosting
│   ├── Docker
│   └── CI/CD
│
├── Contributing
│   ├── Contribution Guidelines
│   ├── Development Setup
│   ├── Code Style
│   └── Pull Request Process
│
└── Support
    ├── GitHub Issues
    ├── Discussions
    └── Community
```

**Files:**
- [Deployment Guide](./DEPLOYMENT.md)
- [Integration Examples](./integration/)

---

## Documentation Index by File

### Core Documentation

| File | Description | Category |
|------|-------------|----------|
| [README.md](./README.md) | Master documentation hub | Overview |
| [NAVIGATION.md](./NAVIGATION.md) | This file - navigation reference | Reference |
| [GLOSSARY.md](./GLOSSARY.md) | Terms and definitions | Reference |
| [INDEX.md](./INDEX.md) | Original documentation index | Overview |

### Getting Started

| File | Description | Category |
|------|-------------|----------|
| [QUICKSTART.md](./QUICKSTART.md) | 10-minute quick start | Tutorial |
| [GETTING_STARTED.md](./GETTING_STARTED.md) | Comprehensive setup guide | Tutorial |

### Architecture & Design

| File | Description | Category |
|------|-------------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture | Concepts |
| [FEATURES.md](./FEATURES.md) | Feature-based architecture | Concepts |
| [MODULE_DOCUMENTATION.md](./MODULE_DOCUMENTATION.md) | Module system docs | Reference |

### API Documentation

| File | Description | Category |
|------|-------------|----------|
| [ENZYME_API_DOCUMENTATION.md](./ENZYME_API_DOCUMENTATION.md) | Complete API reference | API Reference |
| [MODULE_API_DOCUMENTATION.md](./MODULE_API_DOCUMENTATION.md) | Module-specific APIs | API Reference |
| [MODULES_API_DOCUMENTATION.md](./MODULES_API_DOCUMENTATION.md) | Alternative module APIs | API Reference |
| [SYSTEM_AND_TYPES_API_DOCUMENTATION.md](./SYSTEM_AND_TYPES_API_DOCUMENTATION.md) | System & types reference | API Reference |
| [API.md](./API.md) | API guide (short) | Guide |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | API guide (detailed) | Guide |

### Development Guides

| File | Description | Category |
|------|-------------|----------|
| [CONFIGURATION.md](./CONFIGURATION.md) | Configuration guide | Guide |
| [CONFIG_REFERENCE.md](./CONFIG_REFERENCE.md) | Config options reference | Reference |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Environment setup | Guide |
| [STATE.md](./STATE.md) | State management | Guide |
| [AUTO_ROUTES.md](./AUTO_ROUTES.md) | Routing system | Guide |
| [SECURITY.md](./SECURITY.md) | Security & auth | Guide |
| [PERFORMANCE.md](./PERFORMANCE.md) | Performance optimization | Guide |
| [TESTING.md](./TESTING.md) | Testing guide | Guide |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Design system | Guide |

### Advanced Topics

| File | Description | Category |
|------|-------------|----------|
| [STREAMING.md](./STREAMING.md) | HTML streaming | Advanced |
| [HYDRATION.md](./HYDRATION.md) | Hydration system | Advanced |
| [VDOM.md](./VDOM.md) | Virtual modular DOM | Advanced |
| [LAYOUTS.md](./LAYOUTS.md) | Adaptive layouts | Advanced |

### Reference Docs

| File | Description | Category |
|------|-------------|----------|
| [HOOKS_REFERENCE.md](./HOOKS_REFERENCE.md) | Hooks reference | Reference |
| [COMPONENTS_REFERENCE.md](./COMPONENTS_REFERENCE.md) | Components reference | Reference |
| [MODULE_README_TEMPLATE.md](./MODULE_README_TEMPLATE.md) | Module template | Reference |

### Support

| File | Description | Category |
|------|-------------|----------|
| [FAQ.md](./FAQ.md) | Frequently asked questions | Support |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Troubleshooting guide | Support |
| [MIGRATION.md](./MIGRATION.md) | Migration guide | Support |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment guide | Support |

---

## Navigation Patterns

### By User Journey

**New Users**
1. README.md → Overview
2. QUICKSTART.md → Quick setup
3. GETTING_STARTED.md → Detailed tutorial
4. ARCHITECTURE.md → Understanding the system

**Developers Building Features**
1. FEATURES.md → Feature architecture
2. STATE.md → State management
3. API_DOCUMENTATION.md → Data fetching
4. HOOKS_REFERENCE.md → Available hooks

**Performance Optimization**
1. PERFORMANCE.md → Optimization guide
2. HYDRATION.md → Hydration strategies
3. STREAMING.md → Streaming setup
4. VDOM.md → Module optimization

**Security Implementation**
1. SECURITY.md → Security overview
2. AUTO_ROUTES.md → Route guards
3. CONFIGURATION.md → Secure config

**Troubleshooting**
1. FAQ.md → Common questions
2. TROUBLESHOOTING.md → Problem solving
3. MIGRATION.md → Migration issues

### By Module

Each module has documentation in multiple locations:

**Example: Authentication**
- README.md → Quick reference
- SECURITY.md → Complete guide
- ENZYME_API_DOCUMENTATION.md → API reference
- HOOKS_REFERENCE.md → Auth hooks
- TROUBLESHOOTING.md → Auth issues

**Example: Routing**
- README.md → Quick reference
- AUTO_ROUTES.md → Complete guide
- MODULE_API_DOCUMENTATION.md → Routing API
- SECURITY.md → Route guards
- TROUBLESHOOTING.md → Routing issues

---

## Search & Discovery

### By Topic

**Authentication & Authorization**
- SECURITY.md
- AUTO_ROUTES.md (guards)
- CONFIGURATION.md (auth config)

**Data Management**
- STATE.md (global state)
- API_DOCUMENTATION.md (API calls)
- MODULE_API_DOCUMENTATION.md (queries module)

**Performance**
- PERFORMANCE.md (optimization)
- HYDRATION.md (hydration)
- STREAMING.md (streaming)
- VDOM.md (virtual DOM)

**User Interface**
- COMPONENTS_REFERENCE.md (components)
- DESIGN_SYSTEM.md (design system)
- LAYOUTS.md (layouts)

**Configuration**
- CONFIGURATION.md (overview)
- CONFIG_REFERENCE.md (complete reference)
- ENVIRONMENT.md (environment vars)

---

## Quick Links

### Most Common Pages

1. [Documentation Hub](./README.md) - Start here
2. [Quick Start](./QUICKSTART.md) - Get running fast
3. [API Reference](./ENZYME_API_DOCUMENTATION.md) - Look up APIs
4. [Troubleshooting](./TROUBLESHOOTING.md) - Fix issues
5. [FAQ](./FAQ.md) - Common questions

### Most Common Tasks

1. [Set up authentication](./SECURITY.md#authentication)
2. [Configure routing](./AUTO_ROUTES.md)
3. [Fetch data](./API_DOCUMENTATION.md)
4. [Manage state](./STATE.md)
5. [Optimize performance](./PERFORMANCE.md)

---

## Maintenance Notes

### For Documentation Maintainers

**When adding new documentation:**
1. Update this NAVIGATION.md file
2. Update README.md quick links
3. Update INDEX.md if it exists
4. Add cross-references from related docs
5. Update GLOSSARY.md with new terms

**File naming conventions:**
- Use SCREAMING_SNAKE_CASE.md for main docs
- Use lowercase-with-dashes.md for supporting docs
- Keep filenames descriptive and concise

**Link conventions:**
- Use relative links: `./FILENAME.md`
- Use anchors for sections: `./FILENAME.md#section`
- Always use absolute paths in code examples

---

<div align="center">

**Navigation Reference for @missionfabric-js/enzyme**

[Documentation Hub](./README.md) • [Glossary](./GLOSSARY.md)

</div>
