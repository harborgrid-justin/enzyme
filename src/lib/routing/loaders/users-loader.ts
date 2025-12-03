import type { LoaderFunctionArgs } from 'react-router-dom';
import { queryClient } from '@/lib/queries/queryClient';
import { usersListQueryOptions, userDetailQueryOptions } from '@/lib/queries/users';

/**
 * Data router loader that prefetches users data before rendering.
 */
export async function usersLoader({ request, params }: LoaderFunctionArgs): Promise<null> {
  const url = new URL(request.url);
  const userId = params.id;

  // If viewing a specific user, prefetch it
  if (userId !== null && userId !== undefined && userId !== '') {
    await queryClient.prefetchQuery(userDetailQueryOptions(userId));
  } else {
    // Otherwise, prefetch the users list
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(url.searchParams.get('limit') ?? '10', 10);
    const search = url.searchParams.get('search') ?? undefined;
    const role = url.searchParams.get('role') as
      | 'admin'
      | 'manager'
      | 'user'
      | 'viewer'
      | undefined;

    await queryClient.prefetchQuery(usersListQueryOptions({ page, pageSize, search, role }));
  }

  return null;
}
