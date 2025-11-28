/**
 * @file Auth Context
 * @description Context for authentication (Fast Refresh compliant).
 */

import { createContext } from 'react';
import type { AuthContextValue, User, Role } from '../auth/types';

/**
 * User role type
 */
export type UserRole = Role;

export type { User, AuthContextValue };

/**
 * Auth context - extracted for Fast Refresh compliance
 */
export const AuthContext = createContext<AuthContextValue | null>(null);

AuthContext.displayName = 'AuthContext';
