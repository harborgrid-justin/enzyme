/**
 * @file Queries Module Index
 * @description Central export point for all query-related functionality
 */

// Query client and keys
export { queryClient, createQueryClient, queryKeys, type QueryKeys } from './queryClient';

// Dashboard queries
export {
  useDashboardStats,
  useDashboardStatsSuspense,
  useDashboardCharts,
  useDashboardChartsSuspense,
  useActivity,
  useActivitySuspense,
  dashboardStatsQueryOptions,
  dashboardChartsQueryOptions,
  activityQueryOptions,
  type DashboardStats,
  type DashboardCharts,
  type ChartDataPoint,
  type ActivityItem,
  type ActivityResponse,
} from './dashboard';

// Users queries
export {
  useUsers,
  useUsersSuspense,
  useUser,
  useUserSuspense,
  useUserProfile,
  useUserProfileSuspense,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  usersListQueryOptions,
  userDetailQueryOptions,
  userProfileQueryOptions,
  type User,
  type UserRole,
  type UserStatus,
  type UserFilters,
  type UsersResponse,
  type CreateUserPayload,
  type UpdateUserPayload,
} from './users';

// Common query helpers
export {
  usePrefetch,
  useInvalidateQueries,
  useQueryState,
  useOptimisticUpdate,
  useBatchQueryUpdates,
  mergePaginatedData,
  mergeInfinitePages,
  calculateRetryDelay,
  isQueryStale,
  createQueryKeyFactory,
  type PrefetchOptions,
} from './common';
