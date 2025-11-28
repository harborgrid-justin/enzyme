import type { LoaderFunctionArgs } from 'react-router-dom';
import { queryClient } from '@/lib/queries/queryClient';
import { dashboardStatsQueryOptions, dashboardChartsQueryOptions } from '@/lib/queries/dashboard';

/**
 * Data router loader that prefetches dashboard data before rendering.
 */
export async function dashboardLoader({ request }: LoaderFunctionArgs): Promise<null> {
  const url = new URL(request.url);

  // Prefetch dashboard overview data
  await queryClient.prefetchQuery(dashboardStatsQueryOptions());

  // Prefetch metrics if on analytics page
  if (url.pathname.includes('analytics')) {
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const range = from != null && to != null ? `${from}_${to}` : '7d';
    await queryClient.prefetchQuery(dashboardChartsQueryOptions(range));
  }

  // Return null as data is cached in React Query
  return null;
}
