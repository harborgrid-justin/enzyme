/**
 * Route Documentation Generator
 * Generates comprehensive documentation for application routes
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import {
  heading,
  paragraph,
  codeBlock,
  table,
  TableColumn,
  TableRow,
  generateTOC,
  TOCItem,
  writeDocFile,
  findFiles,
  logger,
  formatExample,
  horizontalRule,
  inlineCode,
  list,
  frontmatter,
  readFile,
} from './utils';
import { DocsConfig } from './index';

interface RouteConfig {
  path: string;
  element?: string;
  loader?: string;
  action?: string;
  guards?: string[];
  roles?: string[];
  children?: RouteConfig[];
  meta?: Record<string, any>;
}

interface RouteDoc {
  path: string;
  fullPath: string;
  component: string;
  loader?: string;
  action?: string;
  guards: string[];
  roles: string[];
  auth: boolean;
  children: RouteDoc[];
  meta: Record<string, any>;
}

/**
 * Generate route documentation
 */
export async function generateRouteDocs(config: DocsConfig): Promise<void> {
  logger.info('Generating route documentation...');

  // Find route configuration files
  const routeFiles = await findFiles(
    path.join(config.projectRoot, config.srcDir),
    /route.*\.(ts|tsx)$/i,
    [/node_modules/, /\.test\./, /\.spec\./]
  );

  logger.info(`Found ${routeFiles.length} route files`);

  // Parse routes
  const routes = await parseRoutes(routeFiles, config);

  logger.info(`Parsed ${routes.length} routes`);

  // Generate documentation
  await generateRouteIndexPage(routes, config);
  await generateRouteTree(routes, config);
  await generateRouteReference(routes, config);
  await generateAuthGuardDocs(routes, config);

  logger.success('Route documentation generated successfully!');
}

/**
 * Parse route files to extract route configurations
 */
async function parseRoutes(
  routeFiles: string[],
  config: DocsConfig
): Promise<RouteDoc[]> {
  const routes: RouteDoc[] = [];

  for (const file of routeFiles) {
    const content = await readFile(file);

    // Simple regex-based extraction (in production, use proper AST parsing)
    const routeMatches = content.matchAll(
      /path:\s*['"]([^'"]+)['"]/g
    );

    for (const match of routeMatches) {
      const routePath = match[1];

      routes.push({
        path: routePath,
        fullPath: routePath,
        component: extractComponent(content, routePath),
        loader: extractLoader(content, routePath),
        action: extractAction(content, routePath),
        guards: extractGuards(content),
        roles: extractRoles(content),
        auth: requiresAuth(content),
        children: [],
        meta: extractMeta(content),
      });
    }
  }

  // Build route tree structure
  return buildRouteTree(routes);
}

/**
 * Extract component from route definition
 */
function extractComponent(content: string, routePath: string): string {
  const elementMatch = content.match(/element:\s*<([A-Z][a-zA-Z0-9]*)/);
  return elementMatch ? elementMatch[1] : 'Unknown';
}

/**
 * Extract loader function
 */
function extractLoader(content: string, routePath: string): string | undefined {
  const loaderMatch = content.match(/loader:\s*([a-zA-Z0-9_]+)/);
  return loaderMatch ? loaderMatch[1] : undefined;
}

/**
 * Extract action function
 */
function extractAction(content: string, routePath: string): string | undefined {
  const actionMatch = content.match(/action:\s*([a-zA-Z0-9_]+)/);
  return actionMatch ? actionMatch[1] : undefined;
}

/**
 * Extract guards
 */
function extractGuards(content: string): string[] {
  const guards: string[] = [];
  const guardMatches = content.matchAll(/guard:\s*([a-zA-Z0-9_]+)/g);

  for (const match of guardMatches) {
    guards.push(match[1]);
  }

  return guards;
}

/**
 * Extract required roles
 */
function extractRoles(content: string): string[] {
  const roles: string[] = [];
  const roleMatches = content.matchAll(/roles?:\s*\[([^\]]+)\]/g);

  for (const match of roleMatches) {
    const roleList = match[1]
      .split(',')
      .map((r) => r.trim().replace(/['"]/g, ''));
    roles.push(...roleList);
  }

  return roles;
}

/**
 * Check if route requires authentication
 */
function requiresAuth(content: string): boolean {
  return /requiresAuth:\s*true/i.test(content) || /protected:\s*true/i.test(content);
}

/**
 * Extract route metadata
 */
function extractMeta(content: string): Record<string, any> {
  const meta: Record<string, any> = {};

  // Extract title
  const titleMatch = content.match(/title:\s*['"]([^'"]+)['"]/);
  if (titleMatch) {
    meta.title = titleMatch[1];
  }

  // Extract description
  const descMatch = content.match(/description:\s*['"]([^'"]+)['"]/);
  if (descMatch) {
    meta.description = descMatch[1];
  }

  return meta;
}

/**
 * Build route tree from flat route list
 */
function buildRouteTree(routes: RouteDoc[]): RouteDoc[] {
  const tree: RouteDoc[] = [];
  const routeMap = new Map<string, RouteDoc>();

  // Create map of routes
  for (const route of routes) {
    routeMap.set(route.path, route);
  }

  // Build tree structure
  for (const route of routes) {
    const pathParts = route.path.split('/').filter(Boolean);

    if (pathParts.length === 1) {
      // Root level route
      tree.push(route);
    } else {
      // Find parent route
      const parentPath = '/' + pathParts.slice(0, -1).join('/');
      const parent = routeMap.get(parentPath);

      if (parent) {
        parent.children.push(route);
      } else {
        // No parent found, add to root
        tree.push(route);
      }
    }
  }

  return tree;
}

/**
 * Generate route index page
 */
async function generateRouteIndexPage(
  routes: RouteDoc[],
  config: DocsConfig
): Promise<void> {
  let content = '';

  // Frontmatter
  content += frontmatter({
    title: 'Route Documentation',
    description: 'Complete route documentation for enzyme application',
    generated: new Date().toISOString(),
  });

  // Title
  content += heading(1, 'Route Documentation');
  content += paragraph(
    'Complete documentation for all routes in the enzyme application.'
  );

  // Statistics
  const totalRoutes = countRoutes(routes);
  const protectedRoutes = countProtectedRoutes(routes);
  const publicRoutes = totalRoutes - protectedRoutes;

  content += heading(2, 'Statistics');
  content += paragraph(`**Total Routes**: ${totalRoutes}`);
  content += paragraph(`**Protected Routes**: ${protectedRoutes}`);
  content += paragraph(`**Public Routes**: ${publicRoutes}`);

  // Quick links
  content += heading(2, 'Quick Links');
  content += list([
    '[Route Tree](./route-tree.md) - Visual representation of route hierarchy',
    '[Route Reference](./route-reference.md) - Detailed reference for all routes',
    '[Auth Guards](./auth-guards.md) - Authentication and authorization documentation',
  ]);

  // Overview table
  content += heading(2, 'Route Overview');
  content += generateRoutesOverviewTable(flattenRoutes(routes));

  // Write index file
  await writeDocFile(path.join(config.outputDir, 'index.md'), content);
}

/**
 * Generate route tree visualization
 */
async function generateRouteTree(
  routes: RouteDoc[],
  config: DocsConfig
): Promise<void> {
  let content = '';

  // Frontmatter
  content += frontmatter({
    title: 'Route Tree',
    description: 'Visual route hierarchy',
    generated: new Date().toISOString(),
  });

  // Title
  content += heading(1, 'Route Tree');
  content += paragraph('Visual representation of the application route hierarchy.');

  // Generate tree
  content += codeBlock(renderRouteTree(routes, 0), 'text');

  // Legend
  content += heading(2, 'Legend');
  const legendItems = [
    '🔒 - Protected route (requires authentication)',
    '🔓 - Public route',
    '👥 - Role-based access control',
    '🛡️ - Custom guards applied',
  ];
  content += list(legendItems);

  // Write tree file
  await writeDocFile(path.join(config.outputDir, 'route-tree.md'), content);
}

/**
 * Render route tree as ASCII art
 */
function renderRouteTree(routes: RouteDoc[], level: number): string {
  let tree = '';

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const isLast = i === routes.length - 1;
    const prefix = '  '.repeat(level);
    const connector = isLast ? '└── ' : '├── ';

    // Route symbols
    const authSymbol = route.auth ? '🔒' : '🔓';
    const roleSymbol = route.roles.length > 0 ? '👥' : '';
    const guardSymbol = route.guards.length > 0 ? '🛡️' : '';

    tree += `${prefix}${connector}${authSymbol} ${route.path} ${roleSymbol}${guardSymbol}\n`;

    if (route.children.length > 0) {
      tree += renderRouteTree(route.children, level + 1);
    }
  }

  return tree;
}

/**
 * Generate detailed route reference
 */
async function generateRouteReference(
  routes: RouteDoc[],
  config: DocsConfig
): Promise<void> {
  let content = '';

  // Frontmatter
  content += frontmatter({
    title: 'Route Reference',
    description: 'Detailed reference for all routes',
    generated: new Date().toISOString(),
  });

  // Title
  content += heading(1, 'Route Reference');
  content += paragraph('Detailed documentation for each route in the application.');

  // Flatten routes for easier documentation
  const flatRoutes = flattenRoutes(routes);

  for (const route of flatRoutes) {
    content += generateSingleRouteDoc(route);
  }

  // Write reference file
  await writeDocFile(path.join(config.outputDir, 'route-reference.md'), content);
}

/**
 * Generate documentation for a single route
 */
function generateSingleRouteDoc(route: RouteDoc): string {
  let content = '';

  content += heading(2, route.fullPath);

  // Basic info
  content += paragraph(`**Component**: ${inlineCode(route.component)}`);

  if (route.meta.title) {
    content += paragraph(`**Title**: ${route.meta.title}`);
  }

  if (route.meta.description) {
    content += paragraph(route.meta.description);
  }

  // Authentication
  content += heading(3, 'Authentication');
  if (route.auth) {
    content += paragraph('✅ This route requires authentication.');
  } else {
    content += paragraph('❌ This route is publicly accessible.');
  }

  // Roles
  if (route.roles.length > 0) {
    content += heading(3, 'Required Roles');
    content += list(route.roles.map((r) => inlineCode(r)));
  }

  // Guards
  if (route.guards.length > 0) {
    content += heading(3, 'Guards');
    content += list(route.guards.map((g) => inlineCode(g)));
  }

  // Loader
  if (route.loader) {
    content += heading(3, 'Loader');
    content += paragraph(`This route uses the ${inlineCode(route.loader)} loader to fetch data.`);
  }

  // Action
  if (route.action) {
    content += heading(3, 'Action');
    content += paragraph(`This route handles form submissions with ${inlineCode(route.action)}.`);
  }

  // Usage example
  content += heading(3, 'Usage');
  content += formatExample(
    `import { Link } from 'react-router-dom';

function Navigation() {
  return (
    <Link to="${route.fullPath}">
      ${route.meta.title || 'Navigate to ' + route.fullPath}
    </Link>
  );
}`,
    'tsx'
  );

  content += horizontalRule();

  return content;
}

/**
 * Generate auth guard documentation
 */
async function generateAuthGuardDocs(
  routes: RouteDoc[],
  config: DocsConfig
): Promise<void> {
  let content = '';

  // Frontmatter
  content += frontmatter({
    title: 'Authentication Guards',
    description: 'Authentication and authorization documentation',
    generated: new Date().toISOString(),
  });

  // Title
  content += heading(1, 'Authentication Guards');
  content += paragraph(
    'Documentation for authentication and authorization guards used in the application.'
  );

  // Collect all guards
  const allGuards = new Set<string>();
  const allRoles = new Set<string>();

  for (const route of flattenRoutes(routes)) {
    route.guards.forEach((g) => allGuards.add(g));
    route.roles.forEach((r) => allRoles.add(r));
  }

  // Guards section
  content += heading(2, 'Guards');

  if (allGuards.size > 0) {
    for (const guard of allGuards) {
      content += heading(3, guard);
      content += paragraph(`The ${inlineCode(guard)} guard protects routes from unauthorized access.`);

      // Find routes using this guard
      const routesWithGuard = flattenRoutes(routes).filter((r) =>
        r.guards.includes(guard)
      );

      content += heading(4, 'Protected Routes');
      content += list(routesWithGuard.map((r) => inlineCode(r.fullPath)));
    }
  } else {
    content += paragraph('No custom guards are defined.');
  }

  // Roles section
  content += heading(2, 'Roles');

  if (allRoles.size > 0) {
    for (const role of allRoles) {
      content += heading(3, role);

      // Find routes requiring this role
      const routesWithRole = flattenRoutes(routes).filter((r) =>
        r.roles.includes(role)
      );

      content += heading(4, 'Routes');
      content += list(routesWithRole.map((r) => inlineCode(r.fullPath)));
    }
  } else {
    content += paragraph('No role-based access control is configured.');
  }

  // Write guards file
  await writeDocFile(path.join(config.outputDir, 'auth-guards.md'), content);
}

/**
 * Generate routes overview table
 */
function generateRoutesOverviewTable(routes: RouteDoc[]): string {
  const columns: TableColumn[] = [
    { header: 'Route', align: 'left' },
    { header: 'Component', align: 'left' },
    { header: 'Auth', align: 'center' },
    { header: 'Roles', align: 'left' },
    { header: 'Guards', align: 'left' },
  ];

  const rows: TableRow[] = routes.map((route) => ({
    Route: inlineCode(route.fullPath),
    Component: inlineCode(route.component),
    Auth: route.auth ? '✅' : '❌',
    Roles: route.roles.length > 0 ? route.roles.join(', ') : '-',
    Guards: route.guards.length > 0 ? route.guards.join(', ') : '-',
  }));

  return table(columns, rows);
}

/**
 * Flatten route tree to array
 */
function flattenRoutes(routes: RouteDoc[]): RouteDoc[] {
  const flat: RouteDoc[] = [];

  function flatten(routes: RouteDoc[], parentPath = '') {
    for (const route of routes) {
      const fullPath = parentPath + route.path;
      flat.push({ ...route, fullPath });

      if (route.children.length > 0) {
        flatten(route.children, fullPath);
      }
    }
  }

  flatten(routes);
  return flat;
}

/**
 * Count total routes recursively
 */
function countRoutes(routes: RouteDoc[]): number {
  let count = routes.length;

  for (const route of routes) {
    count += countRoutes(route.children);
  }

  return count;
}

/**
 * Count protected routes recursively
 */
function countProtectedRoutes(routes: RouteDoc[]): number {
  let count = 0;

  for (const route of routes) {
    if (route.auth) count++;
    count += countProtectedRoutes(route.children);
  }

  return count;
}
