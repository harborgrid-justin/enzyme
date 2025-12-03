/**
 * @file Users Query Factories
 * @description Query factories for user-related API calls using standardized apiClient
 */

import {
  useQuery,
  useSuspenseQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseSuspenseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { queryKeys } from './queryClient';
import { TIMING } from '@/config';
import { apiClient, type ApiError } from '@/lib/api';

/**
 * User role type
 */
export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';

/**
 * User status type
 */
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

/**
 * User entity type
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

/**
 * User list filters
 */
export interface UserFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  pageSize?: number;
  sortBy?: keyof User;
  sortOrder?: 'asc' | 'desc';
  [key: string]: unknown;
}

/**
 * Paginated users response
 */
export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Create user payload
 */
export interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password?: string;
  sendInvite?: boolean;
}

/**
 * Update user payload
 */
export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
  avatar?: string;
}

/**
 * Fetch users list using apiClient
 * @throws {ApiError} When the request fails
 */
async function fetchUsers(filters?: UserFilters): Promise<UsersResponse> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params[key] = value as string | number | boolean;
      }
    });
  }

  const response = await apiClient.get<UsersResponse>('/api/users', { params });
  return response.data;
}

/**
 * Fetch single user by ID using apiClient
 * @throws {ApiError} When the request fails
 */
async function fetchUserById(id: string): Promise<User> {
  const response = await apiClient.get<User>(`/api/users/${id}`);
  return response.data;
}

/**
 * Fetch current user profile using apiClient
 * @throws {ApiError} When the request fails
 */
async function fetchUserProfile(): Promise<User> {
  const response = await apiClient.get<User>('/api/users/profile');
  return response.data;
}

/**
 * Create a new user using apiClient
 * @throws {ApiError} When the request fails
 */
async function createUser(payload: CreateUserPayload): Promise<User> {
  const response = await apiClient.post<User>('/api/users', payload);
  return response.data;
}

/**
 * Update an existing user using apiClient
 * @throws {ApiError} When the request fails
 */
async function updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
  const response = await apiClient.patch<User>(`/api/users/${id}`, payload);
  return response.data;
}

/**
 * Delete a user using apiClient
 * @throws {ApiError} When the request fails
 */
async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/api/users/${id}`);
}

/**
 * Query options for users list
 */
export function usersListQueryOptions(filters?: UserFilters): UseQueryOptions<UsersResponse> {
  return {
    queryKey: queryKeys.users.list(filters),
    queryFn: async () => fetchUsers(filters),
    staleTime: TIMING.QUERY.STALE.SHORT, // ~1 minute (close to 2 min)
    meta: {
      errorMessage: 'Failed to load users',
    },
  };
}

/**
 * Query options for single user
 */
export function userDetailQueryOptions(id: string): UseQueryOptions<User> {
  return {
    queryKey: queryKeys.users.detail(id),
    queryFn: async () => fetchUserById(id),
    staleTime: TIMING.QUERY.STALE.MEDIUM, // 5 minutes
    enabled: !!id,
    meta: {
      errorMessage: 'Failed to load user details',
    },
  };
}
/**
 * Query options for user profile
 */
export function userProfileQueryOptions(): UseQueryOptions<User> {
  return {
    queryKey: queryKeys.users.profile(),
    queryFn: fetchUserProfile,
    staleTime: TIMING.QUERY.STALE.LONG, // 10 minutes
    meta: {
      errorMessage: 'Failed to load user profile',
    },
  };
}

/**
 * Suspense query options for users list
 */
export function usersListSuspenseQueryOptions(
  filters?: UserFilters
): UseSuspenseQueryOptions<UsersResponse> {
  return {
    queryKey: queryKeys.users.list(filters),
    queryFn: async () => fetchUsers(filters),
    staleTime: TIMING.QUERY.STALE.SHORT, // ~1 minute
  };
}

/**
 * Suspense query options for single user
 */
export function userDetailSuspenseQueryOptions(id: string): UseSuspenseQueryOptions<User> {
  return {
    queryKey: queryKeys.users.detail(id),
    queryFn: async () => fetchUserById(id),
    staleTime: TIMING.QUERY.STALE.MEDIUM, // 5 minutes
  };
}

/**
 * Suspense query options for user profile
 */
export function userProfileSuspenseQueryOptions(): UseSuspenseQueryOptions<User> {
  return {
    queryKey: queryKeys.users.profile(),
    queryFn: fetchUserProfile,
    staleTime: TIMING.QUERY.STALE.LONG, // 10 minutes
  };
}

/**
 * Hook to fetch users list with Suspense
 */
export function useUsersSuspense(
  filters?: UserFilters
): ReturnType<typeof useSuspenseQuery<UsersResponse>> {
  return useSuspenseQuery(usersListSuspenseQueryOptions(filters));
}

/**
 * Hook to fetch users list
 */
export function useUsers(filters?: UserFilters): ReturnType<typeof useQuery<UsersResponse>> {
  return useQuery(usersListQueryOptions(filters));
}

/**
 * Hook to fetch current user profile with Suspense
 */
export function useUserProfileSuspense(): ReturnType<typeof useSuspenseQuery<User>> {
  return useSuspenseQuery(userProfileSuspenseQueryOptions());
}

/**
 * Hook to fetch single user with Suspense
 */
export function useUserSuspense(id: string): ReturnType<typeof useSuspenseQuery<User>> {
  return useSuspenseQuery(userDetailSuspenseQueryOptions(id));
}

/**
 * Hook to fetch single user
 */
export function useUser(id: string): ReturnType<typeof useQuery<User>> {
  return useQuery(userDetailQueryOptions(id));
}

/**
 * Hook to fetch current user profile
 */
export function useUserProfile(): ReturnType<typeof useQuery<User>> {
  return useQuery(userProfileQueryOptions());
}

/**
 * Hook to create a user
 * @throws {ApiError} When the request fails
 */
export function useCreateUser(
  options?: UseMutationOptions<User, ApiError, CreateUserPayload>
): ReturnType<typeof useMutation<User, ApiError, CreateUserPayload>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    ...options,
  });
}

/**
 * Hook to update a user
 * @throws {ApiError} When the request fails
 */
export function useUpdateUser(
  options?: UseMutationOptions<User, ApiError, { id: string; payload: UpdateUserPayload }>
): ReturnType<typeof useMutation<User, ApiError, { id: string; payload: UpdateUserPayload }>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }) => updateUser(id, payload),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(queryKeys.users.detail(updatedUser.id), updatedUser);
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
    },
    ...options,
  });
}

/**
 * Hook to delete a user
 * @throws {ApiError} When the request fails
 */
export function useDeleteUser(
  options?: UseMutationOptions<void, ApiError, string>
): ReturnType<typeof useMutation<void, ApiError, string>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUser,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.users.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.list() });
    },
    ...options,
  });
}
