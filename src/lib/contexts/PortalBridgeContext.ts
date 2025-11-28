/**
 * @file Portal Bridge Context
 * @description Context for portal management (Fast Refresh compliant).
 */

import { createContext, type ReactNode } from 'react';

/**
 * Portal context value
 */
export interface PortalContext {
  registerPortal: (id: string, container: HTMLElement) => void;
  unregisterPortal: (id: string) => void;
  getPortalContainer: (id: string) => HTMLElement | null;
  renderInPortal: (id: string, content: ReactNode) => void;
}

/**
 * Portal bridge context - extracted for Fast Refresh compliance
 */
export const PortalBridgeContext = createContext<PortalContext | null>(null);

PortalBridgeContext.displayName = 'PortalBridgeContext';
