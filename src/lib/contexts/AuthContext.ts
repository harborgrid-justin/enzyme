/**
 * @file Auth Context
 * @description Context for authentication (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * User role type
 */
export type UserRole = 'admin' | 'nurse' | 'counselor' | 'staff' | 'guest';

/**
 * User data
 */
export interface User {
  id: string;
  email: string;
  name: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  permissions: string[];
}

/**
 * Auth context value
 */
export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole) => boolean;
}

/**
 * Auth context - extracted for Fast Refresh compliance
 */
export const AuthContext = createContext<AuthContextValue | null>(null);

AuthContext.displayName = 'AuthContext';
