/**
 * @file AD Context
 * @description Context for Active Directory integration (Fast Refresh compliant).
 */

import { createContext } from 'react';

/**
 * AD user
 */
export interface ADUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  groups: string[];
  department?: string;
  title?: string;
}

/**
 * AD context value
 */
export interface ADContextValue {
  user: ADUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getGroups: () => string[];
  isMemberOf: (group: string) => boolean;
}

/**
 * AD context - extracted for Fast Refresh compliance
 */
export const ADContext = createContext<ADContextValue | null>(null);

ADContext.displayName = 'ADContext';
