import { useState } from 'react';
import { createRouter } from '@missionfabric-js/enzyme/routing';
import { RouterProvider } from 'react-router-dom';
import type { RouteConfig } from '@missionfabric-js/enzyme/routing';

// Create router configuration
const routeConfigs: RouteConfig[] = [
  { path: '/', importFn: () => import('./HomePage') },
  { path: '/example-01', importFn: () => import('../examples/01-basic-routing') },
  { path: '/example-02', importFn: () => import('../examples/02-state-management') },
  { path: '/example-03', importFn: () => import('../examples/03-auth-rbac') },
  { path: '/example-04', importFn: () => import('../examples/04-feature-flags') },
  { path: '/example-05', importFn: () => import('../examples/05-error-boundaries') },
  { path: '/example-06', importFn: () => import('../examples/06-react-query') },
  { path: '/example-07', importFn: () => import('../examples/07-performance-monitoring') },
  { path: '/example-08', importFn: () => import('../examples/08-theme-system') },
  { path: '/example-09', importFn: () => import('../examples/09-layout-system') },
  { path: '/example-10', importFn: () => import('../examples/10-security-validation') },
  { path: '/example-11', importFn: () => import('../examples/11-streaming-data') },
  { path: '/example-12', importFn: () => import('../examples/12-realtime-sync') },
  { path: '/example-13', importFn: () => import('../examples/13-hydration-ssr') },
  { path: '/example-14', importFn: () => import('../examples/14-vdom-modules') },
  { path: '/example-15', importFn: () => import('../examples/15-full-integration') },
];

// Create router using Enzyme's createRouter
const router = createRouter(routeConfigs, {
  prefetchOnHover: true,
  prefetchDelay: 100,
});

export default function App() {
  return <RouterProvider router={router} />;
}
