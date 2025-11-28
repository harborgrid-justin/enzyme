/**
 * @file Dashboard Query Factories
 * @description Query factories for dashboard data fetching using standardized apiClient
 */

import { useQuery, useSuspenseQuery, type UseQueryOptions, type UseSuspenseQueryOptions } from '@tanstack/react-query';
import { queryKeys } from './queryClient';
import { TIMING } from '@/config';
import { apiClient, type ApiError } from '@/lib/api';

/**
 * Dashboard stats response type
 */
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalReports: number;
  pendingTasks: number;
  recentActivity: number;
  growthRate: number;
}

/**
 * Dashboard chart data point
 */
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

/**
 * Dashboard charts response type
 */
export interface DashboardCharts {
  userGrowth: ChartDataPoint[];
  reportTrends: ChartDataPoint[];
  activityByDay: ChartDataPoint[];
}

/**
 * Activity item type
 */
export interface ActivityItem {
  id: string;
  type: 'create' | 'update' | 'delete' | 'view';
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  timestamp: string;
  description: string;
}

/**
 * Paginated activity response
 */
export interface ActivityResponse {
  items: ActivityItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Fetch dashboard statistics using apiClient
 * @throws {ApiError} When the request fails
 */
async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get<DashboardStats>('/api/dashboard/stats');
  return response.data;
}

/**
 * Fetch dashboard charts data using apiClient
 * @throws {ApiError} When the request fails
 */
async function fetchDashboardCharts(range: string): Promise<DashboardCharts> {
  const response = await apiClient.get<DashboardCharts>('/api/dashboard/charts', {
    params: { range },
  });
  return response.data;
}

/**
 * Fetch activity feed with pagination using apiClient
 * @throws {ApiError} When the request fails
 */
async function fetchActivity(page: number): Promise<ActivityResponse> {
  const response = await apiClient.get<ActivityResponse>('/api/dashboard/activity', {
    params: { page },
  });
  return response.data;
}

/**
 * Query options factory for dashboard stats
 */
export function dashboardStatsQueryOptions(): UseQueryOptions<DashboardStats> {
  return {
    queryKey: queryKeys.dashboard.stats(),
    queryFn: fetchDashboardStats,
    staleTime: TIMING.QUERY.STALE.SHORT, // 1 minute
    meta: {
      errorMessage: 'Failed to load dashboard statistics',
    },
  };
}

/**
 * Query options factory for dashboard charts
 */
export function dashboardChartsQueryOptions(
  range: string = '7d'
): UseQueryOptions<DashboardCharts> {
  return {
    queryKey: queryKeys.dashboard.charts(range),
    queryFn: async () => fetchDashboardCharts(range),
    staleTime: TIMING.QUERY.STALE.MEDIUM, // 5 minutes
    meta: {
      errorMessage: 'Failed to load dashboard charts',
    },
  };
}

/**
 * Suspense query options factory for dashboard charts
 */
export function dashboardChartsSuspenseQueryOptions(
  range: string = '7d'
): UseSuspenseQueryOptions<DashboardCharts> {
  return {
    queryKey: queryKeys.dashboard.charts(range),
    queryFn: async () => fetchDashboardCharts(range),
    staleTime: TIMING.QUERY.STALE.MEDIUM, // 5 minutes
    meta: {
      errorMessage: 'Failed to load dashboard charts',
    },
  };
}

/**
 * Query options factory for activity feed
 */
export function activityQueryOptions(page: number = 1): UseQueryOptions<ActivityResponse> {
  return {
    queryKey: queryKeys.dashboard.activity(page),
    queryFn: async () => fetchActivity(page),
    staleTime: TIMING.QUERY.STALE.REALTIME, // 30 seconds
    meta: {
      errorMessage: 'Failed to load activity feed',
    },
  };
}

/**
 * Suspense query options factory for dashboard stats
 */
export function dashboardStatsSuspenseQueryOptions(): UseSuspenseQueryOptions<DashboardStats> {
  return {
    queryKey: queryKeys.dashboard.stats(),
    queryFn: fetchDashboardStats,
    staleTime: TIMING.QUERY.STALE.SHORT, // 1 minute
    meta: {
      errorMessage: 'Failed to load dashboard statistics',
    },
  };
}

/**
 * Suspense query options factory for activity feed
 */
export function activitySuspenseQueryOptions(page: number = 1): UseSuspenseQueryOptions<ActivityResponse> {
  return {
    queryKey: queryKeys.dashboard.activity(page),
    queryFn: async () => fetchActivity(page),
    staleTime: TIMING.QUERY.STALE.REALTIME, // 30 seconds
    meta: {
      errorMessage: 'Failed to load activity feed',
    },
  };
}

/**
 * Hook to fetch dashboard stats
 */
export function useDashboardStats() {
  return useQuery(dashboardStatsQueryOptions());
}

/**
 * Hook to fetch dashboard stats with Suspense
 */
export function useDashboardStatsSuspense() {
  return useSuspenseQuery(dashboardStatsSuspenseQueryOptions());
}

/**
 * Hook to fetch dashboard charts
 */
export function useDashboardCharts(range: string = '7d') {
  return useQuery(dashboardChartsQueryOptions(range));
}

/**
 * Hook to fetch dashboard charts with Suspense
 */
export function useDashboardChartsSuspense(range: string = '7d') {
  return useSuspenseQuery(dashboardChartsSuspenseQueryOptions(range));
}

/**
 * Hook to fetch activity feed
 */
export function useActivity(page: number = 1) {
  return useQuery(activityQueryOptions(page));
}

/**
 * Hook to fetch activity feed with Suspense
 */
export function useActivitySuspense(page: number = 1) {
  return useSuspenseQuery(activitySuspenseQueryOptions(page));
}
