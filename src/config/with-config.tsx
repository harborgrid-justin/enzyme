/**
 * @file withConfig HOC
 * @description Higher-order component for injecting configuration props.
 *
 * @module config/with-config
 */

import React, { type ComponentType } from 'react';
import type { ConfigNamespace, ConfigRecord } from './types';
import { useConfigContext } from './use-config-context';

/**
 * Higher-order component for injecting configuration props
 *
 * @param WrappedComponent - Component to wrap
 * @param namespace - Configuration namespace
 * @returns Wrapped component with config props
 *
 * @example
 * ```tsx
 * interface MyComponentProps {
 *   config: StreamingConfig;
 * }
 *
 * function MyComponent({ config }: MyComponentProps) {
 *   return <div>Buffer: {config.buffer.initialSize}</div>;
 * }
 *
 * export default withConfig(MyComponent, CONFIG_NAMESPACES.STREAMING);
 * ```
 */
export function withConfig<P extends { config: ConfigRecord }, T extends ConfigRecord>(
  WrappedComponent: ComponentType<P>,
  namespace: ConfigNamespace
): ComponentType<Omit<P, 'config'>> {
  function WithConfigComponent(props: Omit<P, 'config'>): React.ReactElement {
    const { getNamespace } = useConfigContext();
    const config = getNamespace<T>(namespace);

    return <WrappedComponent {...(props as P)} config={config} />;
  }

  WithConfigComponent.displayName = `withConfig(${
    (WrappedComponent.displayName ?? WrappedComponent.name) || 'Component'
  })`;

  return WithConfigComponent;
}
