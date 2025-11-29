import type { LoaderFunctionArgs } from 'react-router-dom';
import { queryClient, queryKeys } from '@/lib/queries/queryClient';
import { apiClient } from '@/lib/api';

/**
 * Fetch single report by ID using the centralized API client
 */
async function fetchReport(id: string): Promise<unknown> {
  const response = await apiClient.get(`/api/reports/${id}`);
  return response.data;
}

/**
 * Fetch reports list using the centralized API client
 */
async function fetchReports(params: Record<string, unknown>): Promise<unknown> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        queryParams[key] = value;
      } else {
        // Convert other types to string
        queryParams[key] = String(value);
      }
    }
  });
  const response = await apiClient.get('/api/reports', { params: queryParams });
  return response.data;
}

/**
 * Data router loader that prefetches reports data before rendering.
 */
export async function reportsLoader({ request, params }: LoaderFunctionArgs): Promise<null> {
  const url = new URL(request.url);
  const reportId = params.id;

  // If viewing a specific report, prefetch it
  if (reportId != null && reportId !== '') {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.reports.detail(reportId),
      queryFn: async () => fetchReport(reportId),
    });
  } else {
    // Otherwise, prefetch the reports list
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);
    const search = url.searchParams.get('search') ?? undefined;
    const status = url.searchParams.get('status') ?? undefined;

    await queryClient.prefetchQuery({
      queryKey: queryKeys.reports.list({ page, limit, search, status }),
      queryFn: async () => fetchReports({ page, limit, search, status }),
    });
  }

  return null;
}
