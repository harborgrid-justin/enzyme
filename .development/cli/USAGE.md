# Enzyme CLI Usage Guide

Complete guide to using the Enzyme CLI for project scaffolding.

## Table of Contents

- [Quick Start](#quick-start)
- [Commands](#commands)
- [Templates](#templates)
- [Features](#features)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Installation

```bash
# Global installation
npm install -g @missionfabric-js/enzyme-cli

# Or use with npx (no installation required)
npx @missionfabric-js/enzyme-cli new my-app
```

### Create Your First Project

```bash
# Create a standard project
enzyme new my-app

# Navigate to project
cd my-app

# Start development server
npm run dev
```

Your app will be running at `http://localhost:3000`

## Commands

### enzyme new

Create a new Enzyme project with customizable options.

**Syntax:**
```bash
enzyme new <project-name> [options]
```

**Aliases:**
- `enzyme create`

**Arguments:**
- `<project-name>` - Name of your project (required)
  - Must be a valid npm package name
  - Lowercase, no spaces
  - Can contain hyphens

**Options:**

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--template <name>` | `-t` | Template type | `standard` |
| `--package-manager <manager>` | `-pm` | Package manager | Auto-detect |
| `--git` | - | Initialize git repo | `true` |
| `--no-git` | - | Skip git init | - |
| `--install` | - | Install dependencies | `true` |
| `--no-install` | - | Skip installation | - |
| `--features <list>` | `-f` | Feature list | Template defaults |
| `--output <dir>` | `-o` | Output directory | Current directory |

### enzyme generate

Generate components and other files (Coming Soon).

**Syntax:**
```bash
enzyme generate <type> <name> [options]
```

**Aliases:**
- `enzyme g`

## Templates

### Minimal

**Description:** Lightweight starter for small projects and prototypes.

**Included Features:**
- ✅ Theme system with dark mode
- ✅ Tailwind CSS
- ✅ TypeScript
- ✅ Basic project structure

**Best For:**
- Learning Enzyme
- Small projects
- Quick prototypes
- Landing pages

**Create:**
```bash
enzyme new my-app --template minimal
```

**Generated Structure:**
```
my-app/
├── src/
│   ├── App.tsx         # Simple app component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
└── ...config files
```

---

### Standard (Default)

**Description:** Production-ready setup with essential features.

**Included Features:**
- ✅ File-system routing
- ✅ State management (Zustand)
- ✅ Server state (React Query)
- ✅ Theme system
- ✅ Error handling

**Best For:**
- Most web applications
- SPA projects
- Production apps
- Team projects

**Create:**
```bash
enzyme new my-app
# or explicitly:
enzyme new my-app --template standard
```

**Generated Structure:**
```
my-app/
├── src/
│   ├── routes/
│   │   ├── Home.tsx
│   │   └── About.tsx
│   ├── config/
│   │   └── index.ts    # App config + router
│   ├── providers/
│   │   └── index.tsx
│   ├── App.tsx
│   └── main.tsx
└── ...config files
```

---

### Enterprise

**Description:** Advanced setup for large-scale applications.

**Included Features:**
- ✅ All Standard features
- ✅ Authentication (RBAC)
- ✅ Feature flags
- ✅ Performance monitoring
- ✅ Real-time data (WebSocket)
- ✅ Full error boundaries
- ✅ API client

**Best For:**
- Enterprise applications
- Complex systems
- Multi-user platforms
- Mission-critical apps

**Create:**
```bash
enzyme new my-app --template enterprise
```

**Generated Structure:**
```
my-app/
├── src/
│   ├── routes/
│   │   ├── Home.tsx
│   │   ├── About.tsx
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   └── Monitoring.tsx
│   ├── lib/
│   │   ├── auth/
│   │   ├── monitoring/
│   │   └── realtime/
│   ├── config/
│   ├── providers/
│   ├── App.tsx
│   └── main.tsx
└── ...config files
```

---

### Full

**Description:** Complete showcase with all Enzyme features and demos.

**Included Features:**
- ✅ Everything in Enterprise
- ✅ Demo pages for all features
- ✅ Comprehensive documentation
- ✅ Best practices examples
- ✅ Feature showcase

**Best For:**
- Learning all features
- Documentation reference
- Team onboarding
- Proof of concepts

**Create:**
```bash
enzyme new my-app --template full
```

**Generated Structure:**
```
my-app/
├── src/
│   ├── routes/
│   │   ├── Home.tsx
│   │   ├── About.tsx
│   │   ├── Features.tsx    # Feature showcase
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   └── Monitoring.tsx
│   ├── lib/
│   └── ...
└── ...config files
```

## Features

### Available Features

Use `--features` to add specific features to any template:

```bash
enzyme new my-app --features auth,state,routing
```

| Feature | Description | Adds |
|---------|-------------|------|
| `auth` | Authentication & Authorization | RBAC, protected routes, auth service |
| `state` | State Management | Zustand + React Query |
| `routing` | File-System Routing | React Router with code-splitting |
| `realtime` | Real-time Data | WebSocket client, SSE support |
| `monitoring` | Performance Monitoring | Web Vitals, error tracking |
| `theme` | Theme System | Dark mode, design tokens |

### Feature Dependencies

Some features work best together:

- `auth` → Often paired with `routing` (protected routes)
- `state` → Includes both Zustand and React Query
- `routing` → Required for multi-page apps
- `monitoring` → Works with all templates

## Examples

### Example 1: Simple Blog

```bash
enzyme new my-blog \
  --template standard \
  --features routing,state \
  --package-manager pnpm
```

**What you get:**
- File-system routing for pages
- State management for posts
- Clean, production-ready setup

---

### Example 2: E-commerce Platform

```bash
enzyme new my-store \
  --template enterprise \
  --package-manager yarn \
  --features auth,state,routing,monitoring
```

**What you get:**
- User authentication
- Shopping cart state
- Product routes
- Performance tracking

---

### Example 3: Real-time Dashboard

```bash
enzyme new my-dashboard \
  --template enterprise \
  --features realtime,monitoring,auth \
  --package-manager bun
```

**What you get:**
- Live data updates
- Performance metrics
- Authenticated access
- Modern build tools

---

### Example 4: Quick Prototype

```bash
enzyme new prototype \
  --template minimal \
  --no-git \
  --package-manager npm
```

**What you get:**
- Minimal setup
- Fast start
- No git overhead
- Ready to experiment

---

### Example 5: Learning Project

```bash
enzyme new learn-enzyme \
  --template full \
  --package-manager npm
```

**What you get:**
- All features enabled
- Example implementations
- Documentation
- Best practices

## Best Practices

### Project Naming

✅ **Good Names:**
- `my-app`
- `acme-dashboard`
- `my-react-app`
- `@myorg/project-name`

❌ **Bad Names:**
- `My App` (spaces)
- `MyApp` (uppercase)
- `my_app` (underscores in main name)
- `node_modules` (reserved)

### Choosing a Template

**Use Minimal when:**
- Learning Enzyme basics
- Building a landing page
- Creating a prototype
- You want to add features gradually

**Use Standard when:**
- Building a production app
- Need routing and state
- Want best practices out of the box
- Starting a team project

**Use Enterprise when:**
- Building complex applications
- Need authentication
- Require monitoring
- Want all features integrated

**Use Full when:**
- Learning all Enzyme features
- Need a reference implementation
- Onboarding team members
- Demonstrating capabilities

### Package Manager Selection

- **npm**: Universal, well-supported, default
- **yarn**: Fast, reliable, good for monorepos
- **pnpm**: Disk-efficient, fast, modern
- **bun**: Extremely fast, cutting-edge

The CLI will auto-detect from lock files, or you can specify:

```bash
enzyme new my-app --package-manager pnpm
```

### Development Workflow

1. **Create project:**
   ```bash
   enzyme new my-app --template standard
   ```

2. **Install dependencies** (if skipped):
   ```bash
   cd my-app
   npm install
   ```

3. **Start development:**
   ```bash
   npm run dev
   ```

4. **Make changes and test**

5. **Type check:**
   ```bash
   npm run typecheck
   ```

6. **Lint code:**
   ```bash
   npm run lint
   ```

7. **Build for production:**
   ```bash
   npm run build
   ```

8. **Preview build:**
   ```bash
   npm run preview
   ```

## Troubleshooting

### Project name already exists

**Error:**
```
Directory "my-app" already exists
```

**Solution:**
- Choose a different name
- Remove existing directory
- Use `--output` to specify different location

### Invalid project name

**Error:**
```
Project name must be a valid npm package name
```

**Solution:**
- Use lowercase letters
- Replace spaces with hyphens
- Avoid special characters

### Package manager not found

**Error:**
```
Command not found: pnpm
```

**Solution:**
- Install the package manager globally
- Use a different package manager
- Let the CLI auto-detect

### Dependencies fail to install

**Error:**
```
npm install failed
```

**Solution:**
- Check your internet connection
- Clear npm cache: `npm cache clean --force`
- Try with `--no-install` and install manually
- Use a different package manager

### TypeScript errors after generation

**Solution:**
- Run `npm install` (dependencies may not be installed)
- Check Node.js version (requires >= 20.0.0)
- Delete `node_modules` and reinstall

### Port already in use

**Error:**
```
Port 3000 is already in use
```

**Solution:**
- Edit `vite.config.ts` to change port
- Kill process using port 3000
- Use different port: `npm run dev -- --port 3001`

## Advanced Usage

### Custom Output Directory

```bash
enzyme new my-app --output ./projects
```

Creates project at `./projects/my-app`

### Skip Installation for CI/CD

```bash
enzyme new my-app --no-install
cd my-app
npm ci  # Clean install in CI
```

### Combine Multiple Features

```bash
enzyme new my-app \
  --template minimal \
  --features auth,routing,state,monitoring
```

Creates a minimal base with advanced features.

### Using with npx

No installation required:

```bash
npx @missionfabric-js/enzyme-cli new my-app
```

## Next Steps

After creating your project:

1. **Read the generated README.md** - Project-specific documentation
2. **Explore the code** - Understand the structure
3. **Check the examples** - See how features work
4. **Read Enzyme docs** - Learn about the framework
5. **Start building** - Make it your own!

## Support

- **Documentation:** [Enzyme Docs](https://github.com/harborgrid-justin/enzyme)
- **Issues:** [GitHub Issues](https://github.com/harborgrid-justin/enzyme/issues)
- **Discussions:** [GitHub Discussions](https://github.com/harborgrid-justin/enzyme/discussions)

---

Happy coding with Enzyme! 🚀
