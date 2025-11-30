# Deployment Guide

> **Scope**: This document covers deployment strategies and configuration for the Harbor React Template.
> It includes production builds, environment configuration, and hosting platform guides.

---

## Table of Contents

- [Overview](#overview)
- [Build Configuration](#build-configuration)
- [Environment Variables](#environment-variables)
- [Deployment Platforms](#deployment-platforms)
- [Docker Deployment](#docker-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Production Checklist](#production-checklist)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Harbor React Template is a client-side React application built with Vite. The production build generates static files that can be deployed to any static hosting service or served behind a reverse proxy.

### Build Output

```
dist/
├── assets/
│   ├── index-[hash].js      # Main application bundle
│   ├── index-[hash].css     # Compiled styles
│   └── vendor-[hash].js     # Third-party dependencies
├── index.html               # Entry HTML file
└── [static assets]          # Images, fonts, etc.
```

---

## Build Configuration

### Production Build

```bash
# Standard production build
npm run build

# Build with bundle analysis
npm run build -- --mode analyze

# Build with source maps (for debugging)
npm run build -- --sourcemap
```

### Build Optimization

The Vite configuration includes several production optimizations:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
```

### Bundle Size Targets

| Chunk | Target Size | Purpose |
|-------|-------------|---------|
| Main | < 100KB gzipped | Core application code |
| Vendor | < 50KB gzipped | React and core dependencies |
| Query | < 20KB gzipped | Data fetching library |

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API endpoint | `https://api.example.com` |
| `VITE_APP_ENV` | Environment identifier | `production` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_TIMEOUT` | API request timeout (ms) | `30000` |
| `VITE_ENABLE_ANALYTICS` | Enable analytics | `true` |
| `VITE_SENTRY_DSN` | Error tracking endpoint | - |
| `VITE_LOG_LEVEL` | Logging verbosity | `error` |

### Environment File Setup

```bash
# .env.production
VITE_API_BASE_URL=https://api.production.example.com
VITE_APP_ENV=production
VITE_ENABLE_ANALYTICS=true

# .env.staging
VITE_API_BASE_URL=https://api.staging.example.com
VITE_APP_ENV=staging
VITE_ENABLE_ANALYTICS=false
```

See: [Environment Setup Guide](./ENVIRONMENT.md) for detailed configuration.

---

## Deployment Platforms

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**vercel.json**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

**netlify.toml**:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### AWS S3 + CloudFront

```bash
# Build the application
npm run build

# Sync to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/harbor-react/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

---

## Docker Deployment

### Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "80:80"
    environment:
      - VITE_API_BASE_URL=${API_URL}
    restart: unless-stopped
```

### Build and Run

```bash
# Build image
docker build -t harbor-react .

# Run container
docker run -p 80:80 harbor-react

# Or with docker-compose
docker-compose up -d
```

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build
        env:
          VITE_API_BASE_URL: ${{ secrets.API_BASE_URL }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm test

build:
  stage: build
  image: node:20
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/

deploy:
  stage: deploy
  image: alpine
  script:
    - apk add --no-cache aws-cli
    - aws s3 sync dist/ s3://$S3_BUCKET --delete
  only:
    - main
```

---

## Production Checklist

### Pre-Deployment

- [ ] All tests pass (`npm test`)
- [ ] Build succeeds without warnings (`npm run build`)
- [ ] TypeScript has no errors (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Bundle size is within targets
- [ ] Environment variables are configured
- [ ] API endpoints are correct for target environment

### Security

- [ ] No sensitive data in client bundle
- [ ] API keys stored in environment variables
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] CSP policy defined
- [ ] CORS configured on backend

### Performance

- [ ] Assets are compressed (gzip/brotli)
- [ ] Static assets have cache headers
- [ ] Images are optimized
- [ ] Code splitting is working
- [ ] Lazy loading configured for routes

### Monitoring

- [ ] Error tracking configured (Sentry, etc.)
- [ ] Analytics enabled
- [ ] Performance monitoring active
- [ ] Health check endpoint available

---

## Monitoring

### Error Tracking (Sentry)

```typescript
// src/lib/monitoring/sentry.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_APP_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
});
```

### Performance Monitoring

The template includes a built-in Performance Observatory:

```typescript
import { PerformanceObservatory } from '@/lib/performance';

// Enable in production (hidden by default)
<PerformanceObservatory
  position="bottom-right"
  showInProduction={false}
/>
```

### Health Checks

```typescript
// API health check
const checkHealth = async () => {
  const response = await fetch('/api/health');
  return response.ok;
};
```

---

## Troubleshooting

### Common Issues

#### Blank Page After Deployment

**Cause**: Incorrect base path or routing configuration.

**Solution**:
```typescript
// vite.config.ts
export default defineConfig({
  base: '/your-base-path/', // Set if not deploying to root
});
```

#### 404 Errors on Refresh

**Cause**: Server not configured for SPA routing.

**Solution**: Configure your server to serve `index.html` for all routes (see Nginx example above).

#### Environment Variables Not Working

**Cause**: Variables not prefixed with `VITE_`.

**Solution**: Ensure all client-side env vars start with `VITE_`:
```bash
# Correct
VITE_API_URL=https://api.example.com

# Wrong - won't be exposed to client
API_URL=https://api.example.com
```

#### Build Failing in CI

**Cause**: Missing dependencies or environment variables.

**Solution**:
```bash
# Ensure clean install
rm -rf node_modules package-lock.json
npm install

# Verify all env vars are set
env | grep VITE_
```

---

## Related Documentation

### Core Guides
- [Environment Setup](./ENVIRONMENT.md) - Detailed environment configuration
- [Configuration Guide](./CONFIGURATION.md) - Application configuration
- [Performance Guide](./PERFORMANCE.md) - Performance optimization
- [Security Guide](./SECURITY.md) - Security best practices
- [Architecture Overview](./ARCHITECTURE.md) - System architecture

### Module Documentation
- [API Module](./api/README.md) - API endpoint configuration
- [Auth Module](./auth/README.md) - Authentication deployment
- [State Module](./state/README.md) - State persistence
- [Routing Module](./routing/README.md) - Route configuration
- [Config Module](./config/README.md) - Environment configuration
- [Security Module](./security/README.md) - Production security
- [Performance Module](./performance/README.md) - Production optimization
- [Theme Module](./theme/README.md) - Theme deployment
- [Hooks Module](./hooks/README.md) - Hooks in production

---

<p align="center">
  <strong>Harbor React Template</strong><br>
  Production-ready deployment
</p>
