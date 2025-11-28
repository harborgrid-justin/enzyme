/**
 * @file Module Slot Component
 * @module vdom/ModuleSlot
 * @description Dynamic module insertion points with fallback rendering,
 * lazy loading integration, and content projection capabilities.
 * Enables flexible module composition patterns.
 *
 * @author Agent 5 - PhD Virtual DOM Expert
 * @version 1.0.0
 */

import {
  Suspense,
  lazy,
  useMemo,
  useEffect,
  useState,
  type ReactNode,
  type FC,
  type ComponentType,
  type ElementType,
} from 'react';
import { createPortal } from 'react-dom';
import { createModuleId } from './types';
import { useModuleContext, useOptionalModuleContext } from './ModuleBoundary';
import { useModuleSystem } from './ModuleProvider';
import { devWarn } from '@/lib/core/config/env-helper';

// ============================================================================
// Types
// ============================================================================

/**
 * Module slot props.
 */
export interface ModuleSlotProps {
  /** Slot name */
  name: string;
  /** Default content if slot is empty */
  children?: ReactNode;
  /** Fallback during lazy loading */
  fallback?: ReactNode;
  /** Whether slot is required */
  required?: boolean;
  /** Placeholder when slot is empty and not required */
  placeholder?: ReactNode;
  /** Wrapper element */
  as?: ElementType;
  /** Additional class name */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
  /** Data attributes */
  data?: Record<string, string>;
}

/**
 * Dynamic module slot props for loading external modules.
 */
export interface DynamicModuleSlotProps {
  /** Module ID to load */
  moduleId: string;
  /** Props to pass to loaded module */
  moduleProps?: Record<string, unknown>;
  /** Fallback during loading */
  fallback?: ReactNode;
  /** Error fallback */
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
  /** Callback when module loads */
  onLoad?: () => void;
  /** Callback on load error */
  onError?: (error: Error) => void;
  /** Wrapper element */
  as?: ElementType;
  /** Additional class name */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
}

/**
 * Module outlet props for named outlets.
 */
export interface ModuleOutletProps {
  /** Outlet name */
  name: string;
  /** Default content */
  children?: ReactNode;
  /** Wrapper element */
  as?: ElementType;
  /** Additional class name */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
}

// ============================================================================
// ModuleSlot Component
// ============================================================================

/**
 * Named slot within a module boundary for content projection.
 * Allows parent modules to inject content into child modules.
 *
 * @example
 * ```tsx
 * // In child module
 * <ModuleBoundary id="card" name="Card Module">
 *   <div className="card">
 *     <ModuleSlot name="header" as="header">
 *       Default Header
 *     </ModuleSlot>
 *     <ModuleSlot name="content" required>
 *       {children}
 *     </ModuleSlot>
 *     <ModuleSlot name="footer" as="footer" placeholder={<EmptyFooter />} />
 *   </div>
 * </ModuleBoundary>
 *
 * // In parent module
 * const context = useModuleContext();
 * context.setSlot('header', <CustomHeader />);
 * ```
 */
export const ModuleSlot: FC<ModuleSlotProps> = ({
  name,
  children,
  fallback,
  required = false,
  placeholder,
  as: Wrapper = 'div',
  className,
  style,
  data,
}) => {
  const context = useOptionalModuleContext();
  const slotContent = context?.getSlot(name);

  // Determine what to render
  let content: ReactNode;

  if (slotContent !== null && slotContent !== undefined) {
    // Slot has been filled
    content = slotContent;
  } else if (children) {
    // Use default children
    content = children;
  } else if (required) {
    // Required slot without content
    devWarn(`Required slot "${name}" is empty`);
    content = null;
  } else if (placeholder) {
    // Show placeholder
    content = placeholder;
  } else {
    // Empty slot
    content = null;
  }

  // Build data attributes
  const dataAttributes: Record<string, string> = {
    'data-module-slot': name,
    ...(data
      ? Object.fromEntries(
          Object.entries(data).map(([key, value]) => [`data-${key}`, value])
        )
      : {}),
  };

  // Don't render wrapper if no content
  if (content === null && !className && !style) {
    return null;
  }

  return (
    <Wrapper className={className} style={style} {...dataAttributes}>
      {fallback ? <Suspense fallback={fallback}>{content}</Suspense> : content}
    </Wrapper>
  );
};

ModuleSlot.displayName = 'ModuleSlot';

// ============================================================================
// DynamicModuleSlot Component
// ============================================================================

/**
 * Dynamically loads and renders a module by ID.
 * Integrates with the module loader for code splitting.
 *
 * @example
 * ```tsx
 * <DynamicModuleSlot
 *   moduleId="dashboard-widget"
 *   moduleProps={{ userId: currentUser.id }}
 *   fallback={<WidgetSkeleton />}
 *   errorFallback={(error) => <WidgetError error={error} />}
 *   onLoad={() => analytics.track('widget_loaded')}
 * />
 * ```
 */
export const DynamicModuleSlot: FC<DynamicModuleSlotProps> = ({
  moduleId: rawModuleId,
  moduleProps = {},
  fallback = null,
  errorFallback,
  onLoad,
  onError,
  as: Wrapper = 'div',
  className,
  style,
}) => {
  const system = useModuleSystem();
  const moduleId = useMemo(() => createModuleId(rawModuleId), [rawModuleId]);

  const [state, setState] = useState<{
    status: 'loading' | 'loaded' | 'error';
    Component: ComponentType<Record<string, unknown>> | null;
    error: Error | null;
  }>({
    status: 'loading',
    Component: null,
    error: null,
  });

  // Load module
  useEffect(() => {
    let isMounted = true;

    const loadModule = async () => {
      try {
        const component = await system.loader.load(moduleId);

        if (isMounted) {
          setState({
            status: 'loaded',
            Component: component as ComponentType<Record<string, unknown>>,
            error: null,
          });
          onLoad?.();
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (isMounted) {
          setState({
            status: 'error',
            Component: null,
            error: err,
          });
          onError?.(err);
        }
      }
    };

    loadModule();

    return () => {
      isMounted = false;
    };
  }, [moduleId, system.loader, onLoad, onError]);

  // Render based on state
  if (state.status === 'loading') {
    return <Wrapper className={className} style={style}>{fallback}</Wrapper>;
  }

  if (state.status === 'error' && state.error) {
    const errorContent =
      typeof errorFallback === 'function'
        ? errorFallback(state.error)
        : errorFallback ?? (
            <div role="alert">Failed to load module: {state.error.message}</div>
          );

    return <Wrapper className={className} style={style}>{errorContent}</Wrapper>;
  }

  if (state.Component) {
    const { Component } = state;
    return (
      <Wrapper className={className} style={style} data-module-id={moduleId}>
        <Component {...moduleProps} />
      </Wrapper>
    );
  }

  return null;
};

DynamicModuleSlot.displayName = 'DynamicModuleSlot';

// ============================================================================
// LazyModuleSlot Component
// ============================================================================

/**
 * Props for LazyModuleSlot.
 */
export interface LazyModuleSlotProps {
  /** Lazy import function */
  loader: () => Promise<{ default: ComponentType<unknown> }>;
  /** Props to pass to loaded component */
  componentProps?: Record<string, unknown>;
  /** Fallback during loading */
  fallback?: ReactNode;
  /** Wrapper element */
  as?: ElementType;
  /** Additional class name */
  className?: string;
  /** Additional styles */
  style?: React.CSSProperties;
}

/**
 * Slot that lazily loads a component using React.lazy().
 *
 * @example
 * ```tsx
 * <LazyModuleSlot
 *   loader={() => import('./HeavyComponent')}
 *   fallback={<ComponentSkeleton />}
 *   componentProps={{ theme: 'dark' }}
 * />
 * ```
 */
export const LazyModuleSlot: FC<LazyModuleSlotProps> = ({
  loader,
  componentProps = {},
  fallback = null,
  as: Wrapper = 'div',
  className,
  style,
}) => {
  // Create lazy component
  const LazyComponent = useMemo(() => lazy(loader), [loader]);

  return (
    <Wrapper className={className} style={style}>
      <Suspense fallback={fallback}>
        <LazyComponent {...componentProps} />
      </Suspense>
    </Wrapper>
  );
};

LazyModuleSlot.displayName = 'LazyModuleSlot';

// ============================================================================
// ModuleOutlet Component
// ============================================================================

/**
 * Named outlet for rendering module content.
 * Similar to router outlets but for module composition.
 *
 * @example
 * ```tsx
 * // In layout
 * <div className="layout">
 *   <ModuleOutlet name="sidebar" />
 *   <main>
 *     <ModuleOutlet name="content">
 *       <DefaultContent />
 *     </ModuleOutlet>
 *   </main>
 * </div>
 * ```
 */
export const ModuleOutlet: FC<ModuleOutletProps> = ({
  name,
  children,
  as: Wrapper = 'div',
  className,
  style,
}) => {
  const context = useOptionalModuleContext();
  const outletContent = context?.getSlot(`outlet:${name}`);

  return (
    <Wrapper
      className={className}
      style={style}
      data-module-outlet={name}
    >
      {outletContent ?? children}
    </Wrapper>
  );
};

ModuleOutlet.displayName = 'ModuleOutlet';

// ============================================================================
// ConditionalModuleSlot Component
// ============================================================================

/**
 * Props for ConditionalModuleSlot.
 */
export interface ConditionalModuleSlotProps {
  /** Condition to check */
  when: boolean;
  /** Module ID to load when condition is true */
  moduleId: string;
  /** Props to pass to module */
  moduleProps?: Record<string, unknown>;
  /** Content to show when condition is false */
  otherwise?: ReactNode;
  /** Fallback during loading */
  fallback?: ReactNode;
}

/**
 * Conditionally loads and renders a module.
 *
 * @example
 * ```tsx
 * <ConditionalModuleSlot
 *   when={user.isPremium}
 *   moduleId="premium-features"
 *   moduleProps={{ user }}
 *   otherwise={<UpgradePrompt />}
 * />
 * ```
 */
export const ConditionalModuleSlot: FC<ConditionalModuleSlotProps> = ({
  when,
  moduleId,
  moduleProps,
  otherwise,
  fallback,
}) => {
  if (!when) {
    return <>{otherwise}</>;
  }

  return (
    <DynamicModuleSlot
      moduleId={moduleId}
      moduleProps={moduleProps}
      fallback={fallback}
    />
  );
};

ConditionalModuleSlot.displayName = 'ConditionalModuleSlot';

// ============================================================================
// ModulePortalSlot Component
// ============================================================================

/**
 * Props for ModulePortalSlot.
 */
export interface ModulePortalSlotProps {
  /** Portal target element ID */
  target: string;
  /** Content to render in portal */
  children: ReactNode;
}

/**
 * Renders content into a portal target outside the module boundary.
 *
 * @example
 * ```tsx
 * // In module
 * <ModulePortalSlot target="modal-root">
 *   <Modal>
 *     <ModalContent />
 *   </Modal>
 * </ModulePortalSlot>
 *
 * // In document
 * <div id="modal-root"></div>
 * ```
 */
export const ModulePortalSlot: FC<ModulePortalSlotProps> = ({
  target,
  children,
}) => {
  const [targetElement, setTargetElement] = useState<Element | null>(null);

  useEffect(() => {
    const element = document.getElementById(target);
    if (element) {
      setTargetElement(element);
    } else {
      devWarn(`Portal target "${target}" not found`);
    }
  }, [target]);

  if (!targetElement) {
    return null;
  }

  // Use React.createPortal
  return createPortal(children, targetElement);
};

ModulePortalSlot.displayName = 'ModulePortalSlot';

// ============================================================================
// Re-export hooks from separate files
// ============================================================================

export { useFillSlot, useSlotContent, useIsSlotFilled } from './hooks/useSlot';
