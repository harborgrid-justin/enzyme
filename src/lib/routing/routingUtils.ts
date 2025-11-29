import { useCallback, useMemo } from 'react';
import { 
  useSearchParams, 
  useParams, 
  useLocation, 
  useNavigate,
  type NavigateOptions 
} from 'react-router-dom';
import { type RoutePath, type RouteParams, type RouteQuery } from './routes';

/**
 * Utilities: useTabParam, useRouteInfo, useRouteNavigate, query helpers.
 */

/**
 * Hook for managing tab state via URL query parameter
 */
export function useTabParam(
  paramName: string = 'tab',
  defaultTab: string = ''
): [string, (tab: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = searchParams.get(paramName) ?? defaultTab;

  const setTab = useCallback(
    (tab: string) => {
      const newParams = new URLSearchParams(searchParams);
      if (tab === defaultTab) {
        newParams.delete(paramName);
      } else {
        newParams.set(paramName, tab);
      }
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams, paramName, defaultTab]
  );

  return [currentTab, setTab];
}

/**
 * Hook for getting current route information
 */
export function useRouteInfo(): {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
  params: Record<string, string | undefined>;
  query: Record<string, string>;
  isExactMatch: (path: RoutePath) => boolean;
  isActiveRoute: (path: string) => boolean;
} {
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();

  return useMemo(
    () => ({
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state as unknown,
      params,
      query: Object.fromEntries(searchParams.entries()),
      isExactMatch: (path: RoutePath) => location.pathname === path,
      isActiveRoute: (path: string) => location.pathname.startsWith(path),
    }),
    [location, params, searchParams]
  );
}

/**
 * Hook for type-safe navigation
 */
export function useRouteNavigate(): {
  navigateTo: (path: RoutePath | string, options?: NavigateOptions) => void;
  navigateWithParams: <T extends keyof RouteParams>(
    path: T,
    params: RouteParams[T],
    options?: NavigateOptions
  ) => void;
  navigateWithQuery: <T extends keyof RouteQuery>(
    path: T,
    query?: Partial<RouteQuery[T]>,
    options?: NavigateOptions
  ) => void;
  goBack: () => void;
  goForward: () => void;
} {
  const navigate = useNavigate();

  const navigateTo = useCallback(
    (path: RoutePath | string, options?: NavigateOptions) => {
      void navigate(path, options);
    },
    [navigate]
  );

  const navigateWithParams = useCallback(
    <T extends keyof RouteParams>(
      path: T,
      params: RouteParams[T],
      options?: NavigateOptions
    ) => {
      let resolvedPath: string = path;
      for (const [key, value] of Object.entries(params)) {
        resolvedPath = resolvedPath.replace(`:${key}`, encodeURIComponent(String(value)));
      }
      void navigate(resolvedPath, options);
    },
    [navigate]
  );

  const navigateWithQuery = useCallback(
    <T extends keyof RouteQuery>(
      path: T,
      query?: Partial<RouteQuery[T]>,
      options?: NavigateOptions
    ) => {
      let resolvedPath: string = path;
      if (query && Object.keys(query).length > 0) {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(query)) {
          if (value !== undefined && value !== null) {
            let stringValue: string;
            if (typeof value === 'object') {
              stringValue = JSON.stringify(value);
            } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              stringValue = String(value);
            } else {
              stringValue = JSON.stringify(value);
            }
            searchParams.set(key, stringValue);
          }
        }
        resolvedPath = `${path}?${searchParams.toString()}`;
      }
      void navigate(resolvedPath, options);
    },
    [navigate]
  );

  const goBack = useCallback(() => {
    void navigate(-1);
  }, [navigate]);

  const goForward = useCallback(() => {
    void navigate(1);
  }, [navigate]);

  return {
    navigateTo,
    navigateWithParams,
    navigateWithQuery,
    goBack,
    goForward,
  };
}

/**
 * Parse and manage query parameters
 */
export function useQueryParams<T extends Record<string, string | undefined>>(): [
  Partial<T>,
  (params: Partial<T>, replace?: boolean) => void
] {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo(() => {
    const result: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      result[key] = value;
    });
    return result as Partial<T>;
  }, [searchParams]);

  const setQuery = useCallback(
    (params: Partial<T>, replace: boolean = false) => {
      const newParams = replace 
        ? new URLSearchParams() 
        : new URLSearchParams(searchParams);
      
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') {
          newParams.delete(key);
        } else {
          newParams.set(key, String(value));
        }
      }
      
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  return [query, setQuery];
}

/**
 * Get a single query parameter with type safety
 */
export function useQueryParam<T extends string = string>(
  paramName: string,
  defaultValue?: T
): [T | undefined, (value: T | undefined) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = (searchParams.get(paramName) as T) ?? defaultValue;

  const setValue = useCallback(
    (newValue: T | undefined) => {
      const newParams = new URLSearchParams(searchParams);
      if (newValue === undefined || newValue === null) {
        newParams.delete(paramName);
      } else {
        newParams.set(paramName, newValue);
      }
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams, paramName]
  );

  return [value, setValue];
}
