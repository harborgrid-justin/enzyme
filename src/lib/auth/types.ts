/**
 * Auth-related TypeScript types.
 */

export type Role = 'admin' | 'manager' | 'user' | 'guest';

export type Permission = string;

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl?: string;
  roles: Role[];
  permissions: Permission[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  refreshToken: () => Promise<void>;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
}

export interface RouteAuthConfig {
  /** Whether authentication is required */
  requireAuth: boolean;
  /** Minimum role required to access */
  minRole?: Role;
  /** Specific roles allowed */
  allowedRoles?: Role[];
  /** Specific permissions required */
  requiredPermissions?: Permission[];
  /** Redirect path if unauthorized */
  redirectTo?: string;
}
