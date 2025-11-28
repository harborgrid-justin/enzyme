import { routes, type RouteQuery } from './routes';
import { buildRoutePath } from './route-builder';

/**
 * Pre-typed route helper functions
 *
 * Uses canonical `buildRoutePath` from route-builder for all path construction.
 */
export const appRoutes = {
  home: (): string => routes.home,
  login: (): string => routes.login,
  logout: (): string => routes.logout,
  dashboard: (): string => routes.dashboard,
  dashboardOverview: (): string => routes.dashboardOverview,
  dashboardAnalytics: (query?: RouteQuery['/dashboard/analytics']): string =>
    buildRoutePath('/dashboard/analytics', undefined, query as Record<string, string | undefined>),
  reports: (): string => routes.reports,
  reportsList: (query?: RouteQuery['/reports/list']): string =>
    buildRoutePath('/reports/list', undefined, query as Record<string, string | undefined>),
  reportDetail: (id: string): string => buildRoutePath('/reports/:id', { id }),
  reportEdit: (id: string): string => buildRoutePath('/reports/:id/edit', { id }),
  users: (): string => routes.users,
  usersList: (query?: RouteQuery['/users/list']): string =>
    buildRoutePath('/users/list', undefined, query as Record<string, string | undefined>),
  userDetail: (id: string): string => buildRoutePath('/users/:id', { id }),
  userEdit: (id: string): string => buildRoutePath('/users/:id/edit', { id }),
  settings: (): string => routes.settings,
  admin: (): string => routes.admin,
};
