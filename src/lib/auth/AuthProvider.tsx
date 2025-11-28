import {
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
  type JSX
} from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { authService } from './authService';
import { hasPermission as checkPermission } from '@/config/authConfig';
import type { 
  User, 
  Role, 
  Permission, 
  LoginCredentials, 
  RegisterCredentials,
  AuthContextValue 
} from './types';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provides auth state, token refresh, session sync.
 */
export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = user !== null;

  /**
   * Initialize auth state on mount.
   *
   * SECURITY: First initializes the AuthService to load encrypted tokens
   * from SecureStorage into memory cache, then checks authentication status.
   */
  useEffect(() => {
    const initAuth = async (): Promise<void> => {
      try {
        // Initialize secure token storage first
        await authService.initialize();

        if (authService.isAuthenticated()) {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void initAuth();
  }, []);

  /**
   * Set up automatic token refresh interval.
   *
   * SECURITY: Automatically refreshes tokens every 4 minutes while authenticated
   * to maintain session validity without user interaction.
   *
   * Dependencies:
   * - `isAuthenticated`: Effect should re-run when auth status changes
   * - `authService` and `setUser` are stable references (singleton/useState setter)
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshInterval = setInterval(() => {
      void (async (): Promise<void> => {
        try {
          await authService.refreshTokens();
        } catch {
          // If refresh fails, log out the user
          setUser(null);
        }
      })();
    }, 4 * 60 * 1000); // Refresh every 4 minutes

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const { user: loggedInUser } = await authService.login(credentials);
      setUser(loggedInUser);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await authService.logout();
    } finally {
      setUser(null);
      setError(null);
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const { user: newUser } = await authService.register(credentials);
      setUser(newUser);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      await authService.refreshTokens();
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      setUser(null);
      throw err;
    }
  }, []);

  const hasRole = useCallback(
    (role: Role): boolean => {
      if (!user) return false;
      return user.roles.includes(role);
    },
    [user]
  );

  const hasAnyRole = useCallback(
    (roles: Role[]): boolean => {
      if (!user) return false;
      return roles.some((role) => user.roles.includes(role));
    },
    [user]
  );

  const hasPermissionFn = useCallback(
    (permission: Permission): boolean => {
      if (!user) return false;
      // Check direct permissions
      if (user.permissions.includes(permission)) return true;
      // Check role-based permissions
      return user.roles.some((role) => checkPermission(role, permission));
    },
    [user]
  );

  const hasAnyPermission = useCallback(
    (permissions: Permission[]): boolean => {
      return permissions.some((p) => hasPermissionFn(p));
    },
    [hasPermissionFn]
  );

  // Alias for context compatibility
  const refreshToken = refreshSession;

  const value: AuthContextValue = useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
    refreshToken,
    refreshSession,
    hasRole,
    hasAnyRole,
    hasPermission: hasPermissionFn,
    hasAnyPermission,
  }), [
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
    refreshToken,
    refreshSession,
    hasRole,
    hasAnyRole,
    hasPermissionFn,
    hasAnyPermission,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context.
 */
// @refresh reset
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
