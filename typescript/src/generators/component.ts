/**
 * React Component Code Generator
 *
 * Generates React component code with TypeScript support, including
 * functional components, class components, and component variations.
 *
 * @example
 * ```typescript
 * const generator = new ComponentGenerator();
 * const code = generator.generateFunctional({
 *   name: 'Button',
 *   props: [{ name: 'onClick', type: '() => void' }]
 * });
 * ```
 *
 * @module generators/component
 */

import { renderTemplate, commonFilters } from './template';

/**
 * Component prop definition
 */
export interface ComponentProp {
  /**
   * Prop name
   */
  name: string;

  /**
   * TypeScript type
   */
  type: string;

  /**
   * Is optional
   */
  optional?: boolean;

  /**
   * Default value
   */
  defaultValue?: string;

  /**
   * JSDoc description
   */
  description?: string;
}

/**
 * Component state definition
 */
export interface ComponentState {
  /**
   * State variable name
   */
  name: string;

  /**
   * TypeScript type
   */
  type: string;

  /**
   * Initial value
   */
  initialValue: string;

  /**
   * JSDoc description
   */
  description?: string;
}

/**
 * Component hook usage
 */
export interface ComponentHook {
  /**
   * Hook name (e.g., 'useEffect', 'useMemo')
   */
  name: string;

  /**
   * Hook arguments
   */
  args?: string[];

  /**
   * Hook body
   */
  body?: string;
}

/**
 * Component generation options
 */
export interface ComponentOptions {
  /**
   * Component name
   */
  name: string;

  /**
   * Component props
   */
  props?: ComponentProp[];

  /**
   * State variables (for functional components with hooks)
   */
  state?: ComponentState[];

  /**
   * React hooks to use
   */
  hooks?: ComponentHook[];

  /**
   * Component description for JSDoc
   */
  description?: string;

  /**
   * Export type (default: 'named')
   */
  exportType?: 'named' | 'default' | 'none';

  /**
   * Include prop types validation
   */
  propTypes?: boolean;

  /**
   * Include display name
   */
  displayName?: boolean;

  /**
   * Memo the component
   */
  memo?: boolean;

  /**
   * Forward ref
   */
  forwardRef?: boolean;

  /**
   * Component body/children render
   */
  body?: string;

  /**
   * Additional imports
   */
  imports?: Array<{
    named?: string[];
    default?: string;
    module: string;
  }>;

  /**
   * Styled components
   */
  styled?: boolean;

  /**
   * Include children prop
   */
  children?: boolean;
}

/**
 * Class component options
 */
export interface ClassComponentOptions extends ComponentOptions {
  /**
   * Component state (for class components)
   */
  classState?: Array<{
    name: string;
    type: string;
    initialValue: string;
  }>;

  /**
   * Lifecycle methods
   */
  lifecycle?: Array<{
    name: string;
    body: string;
  }>;

  /**
   * Component methods
   */
  methods?: Array<{
    name: string;
    params?: string[];
    returnType?: string;
    body: string;
  }>;

  /**
   * Extends class (default: 'React.Component')
   */
  extends?: string;
}

/**
 * React component code generator
 *
 * @example
 * ```typescript
 * const generator = new ComponentGenerator();
 *
 * // Generate functional component
 * const funcCode = generator.generateFunctional({
 *   name: 'Button',
 *   props: [
 *     { name: 'label', type: 'string' },
 *     { name: 'onClick', type: '() => void', optional: true }
 *   ],
 *   state: [
 *     { name: 'count', type: 'number', initialValue: '0' }
 *   ]
 * });
 *
 * // Generate class component
 * const classCode = generator.generateClass({
 *   name: 'Counter',
 *   classState: [
 *     { name: 'count', type: 'number', initialValue: '0' }
 *   ],
 *   methods: [
 *     {
 *       name: 'increment',
 *       body: 'this.setState({ count: this.state.count + 1 });'
 *     }
 *   ]
 * });
 * ```
 */
export class ComponentGenerator {
  /**
   * Generate a functional React component
   *
   * @param options - Component options
   * @returns Generated component code
   *
   * @example
   * ```typescript
   * const code = generator.generateFunctional({
   *   name: 'UserProfile',
   *   props: [
   *     { name: 'user', type: 'User' },
   *     { name: 'onEdit', type: '() => void', optional: true }
   *   ],
   *   state: [
   *     { name: 'isEditing', type: 'boolean', initialValue: 'false' }
   *   ]
   * });
   * ```
   */
  generateFunctional(options: ComponentOptions): string {
    const {
      name,
      props = [],
      state = [],
      hooks = [],
      description,
      exportType = 'named',
      memo = false,
      forwardRef = false,
      body,
      imports = [],
      children = false,
    } = options;

    // Build imports
    const reactImports = ['React'];
    if (state.length > 0) reactImports.push('useState');
    if (hooks.some(h => h.name === 'useEffect')) reactImports.push('useEffect');
    if (hooks.some(h => h.name === 'useMemo')) reactImports.push('useMemo');
    if (hooks.some(h => h.name === 'useCallback')) reactImports.push('useCallback');
    if (memo) reactImports.push('memo');
    if (forwardRef) reactImports.push('forwardRef');

    const importStatements = [
      `import ${reactImports.join(', ')} from 'react';`,
      ...imports.map(imp => {
        const parts = [];
        if (imp.default) parts.push(imp.default);
        if (imp.named && imp.named.length > 0) {
          parts.push(`{ ${imp.named.join(', ')} }`);
        }
        return `import ${parts.join(', ')} from '${imp.module}';`;
      }),
    ].join('\n');

    // Build props interface
    let propsInterface = '';
    if (props.length > 0 || children) {
      const allProps = [...props];
      if (children) {
        allProps.push({
          name: 'children',
          type: 'React.ReactNode',
          optional: true,
        });
      }

      const propLines = allProps.map(prop => {
        const optional = prop.optional ? '?' : '';
        const desc = prop.description ? `\n  /** ${prop.description} */` : '';
        return `${desc}\n  ${prop.name}${optional}: ${prop.type};`;
      });

      propsInterface = `
${description ? `/** ${description} */` : ''}
interface ${name}Props {${propLines.join('')}
}
`;
    }

    // Build component signature
    const propsParam = props.length > 0 || children ? `props: ${name}Props` : '';
    const refParam = forwardRef ? ', ref: React.Ref<HTMLElement>' : '';

    // Build state hooks
    const stateHooks = state.map(s => {
      const setterName = `set${s.name.charAt(0).toUpperCase()}${s.name.slice(1)}`;
      return `  const [${s.name}, ${setterName}] = useState<${s.type}>(${s.initialValue});`;
    }).join('\n');

    // Build custom hooks
    const customHooks = hooks.map(h => {
      if (h.body) {
        return `  ${h.name}(${h.args?.join(', ') || ''}) {\n    ${h.body}\n  }`;
      }
      return `  ${h.name}(${h.args?.join(', ') || ''});`;
    }).join('\n');

    // Build component body
    const componentBody = body || `
  return (
    <div>
      <h1>${name}</h1>
    </div>
  );`;

    // Build function declaration
    let functionDecl = `function ${name}(${propsParam}${refParam}) {`;
    if (stateHooks) functionDecl += `\n${stateHooks}`;
    if (customHooks) functionDecl += `\n${customHooks}`;
    functionDecl += `\n${componentBody}\n}`;

    // Wrap with memo or forwardRef if needed
    if (memo && forwardRef) {
      functionDecl = `const ${name} = memo(forwardRef<HTMLElement, ${name}Props>((${propsParam}, ref) => {\n${stateHooks}\n${customHooks}\n${componentBody}\n}));`;
    } else if (memo) {
      functionDecl = `const ${name} = memo(function ${name}(${propsParam}) {\n${stateHooks}\n${customHooks}\n${componentBody}\n});`;
    } else if (forwardRef) {
      functionDecl = `const ${name} = forwardRef<HTMLElement, ${name}Props>((${propsParam}, ref) => {\n${stateHooks}\n${customHooks}\n${componentBody}\n});`;
    }

    // Build export
    let exportStatement = '';
    if (exportType === 'named') {
      exportStatement = `\nexport { ${name} };`;
    } else if (exportType === 'default') {
      exportStatement = `\nexport default ${name};`;
    }

    return `${importStatements}\n${propsInterface}\n${functionDecl}${exportStatement}`;
  }

  /**
   * Generate a class React component
   *
   * @param options - Class component options
   * @returns Generated component code
   *
   * @example
   * ```typescript
   * const code = generator.generateClass({
   *   name: 'Timer',
   *   classState: [
   *     { name: 'seconds', type: 'number', initialValue: '0' }
   *   ],
   *   lifecycle: [
   *     {
   *       name: 'componentDidMount',
   *       body: 'this.interval = setInterval(() => this.tick(), 1000);'
   *     }
   *   ]
   * });
   * ```
   */
  generateClass(options: ClassComponentOptions): string {
    const {
      name,
      props = [],
      classState = [],
      lifecycle = [],
      methods = [],
      description,
      exportType = 'named',
      extends: extendsClass = 'React.Component',
    } = options;

    // Build imports
    const importStatements = `import React from 'react';`;

    // Build props interface
    let propsInterface = '';
    if (props.length > 0) {
      const propLines = props.map(prop => {
        const optional = prop.optional ? '?' : '';
        const desc = prop.description ? `\n  /** ${prop.description} */` : '';
        return `${desc}\n  ${prop.name}${optional}: ${prop.type};`;
      });

      propsInterface = `
interface ${name}Props {${propLines.join('')}
}
`;
    }

    // Build state interface
    let stateInterface = '';
    if (classState.length > 0) {
      const stateLines = classState.map(s => `\n  ${s.name}: ${s.type};`);
      stateInterface = `
interface ${name}State {${stateLines.join('')}
}
`;
    }

    // Build state initialization
    const stateInit = classState.length > 0
      ? `\n  state: ${name}State = {\n${classState.map(s => `    ${s.name}: ${s.initialValue},`).join('\n')}\n  };`
      : '';

    // Build methods
    const methodsCode = methods.map(m => {
      const params = m.params ? m.params.join(', ') : '';
      const returnType = m.returnType ? `: ${m.returnType}` : '';
      return `
  ${m.name}(${params})${returnType} {
    ${m.body}
  }`;
    }).join('\n');

    // Build lifecycle methods
    const lifecycleCode = lifecycle.map(l => `
  ${l.name}() {
    ${l.body}
  }`).join('\n');

    // Build class
    const propsGeneric = props.length > 0 ? `<${name}Props` : '<{}';
    const stateGeneric = classState.length > 0 ? `, ${name}State>` : '>';

    const classDecl = `
${description ? `/** ${description} */` : ''}
class ${name} extends ${extendsClass}${propsGeneric}${stateGeneric} {${stateInit}${methodsCode}${lifecycleCode}

  render() {
    return (
      <div>
        <h1>${name}</h1>
      </div>
    );
  }
}
`;

    // Build export
    let exportStatement = '';
    if (exportType === 'named') {
      exportStatement = `\nexport { ${name} };`;
    } else if (exportType === 'default') {
      exportStatement = `\nexport default ${name};`;
    }

    return `${importStatements}\n${propsInterface}${stateInterface}${classDecl}${exportStatement}`;
  }

  /**
   * Generate a styled component
   *
   * @param options - Component options
   * @returns Generated styled component code
   *
   * @example
   * ```typescript
   * const code = generator.generateStyled({
   *   name: 'StyledButton',
   *   baseElement: 'button',
   *   styles: `
   *     background: blue;
   *     color: white;
   *     padding: 10px 20px;
   *   `
   * });
   * ```
   */
  generateStyled(options: {
    name: string;
    baseElement?: string;
    styles: string;
    props?: ComponentProp[];
    description?: string;
  }): string {
    const { name, baseElement = 'div', styles, props = [], description } = options;

    const propsInterface = props.length > 0
      ? `\ninterface ${name}Props {\n${props.map(p => `  ${p.name}${p.optional ? '?' : ''}: ${p.type};`).join('\n')}\n}\n`
      : '';

    const propsGeneric = props.length > 0 ? `<${name}Props>` : '';

    return `import styled from 'styled-components';
${propsInterface}
${description ? `/** ${description} */` : ''}
export const ${name} = styled.${baseElement}${propsGeneric}\`
  ${styles.trim()}
\`;
`;
  }

  /**
   * Generate a component with Hooks
   *
   * @param options - Component options with hooks
   * @returns Generated component code
   */
  generateWithHooks(options: ComponentOptions & {
    customHooks?: Array<{
      import: string;
      usage: string;
    }>;
  }): string {
    const { customHooks = [], ...componentOptions } = options;

    // Add custom hook imports
    const hookImports = customHooks.map(h => h.import);

    return this.generateFunctional({
      ...componentOptions,
      imports: [
        ...(componentOptions.imports || []),
        ...hookImports.map(imp => {
          const match = imp.match(/import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/);
          if (match) {
            return {
              named: match[1].split(',').map(s => s.trim()),
              module: match[2],
            };
          }
          return { module: imp, named: [] };
        }),
      ],
    });
  }
}

/**
 * Generate a simple functional component quickly
 *
 * @param name - Component name
 * @param props - Component props
 * @returns Generated component code
 *
 * @example
 * ```typescript
 * const code = generateComponent('Button', [
 *   { name: 'label', type: 'string' },
 *   { name: 'onClick', type: '() => void' }
 * ]);
 * ```
 */
export function generateComponent(
  name: string,
  props?: ComponentProp[]
): string {
  const generator = new ComponentGenerator();
  return generator.generateFunctional({ name, props });
}

/**
 * Generate a component file with export
 *
 * @param options - Component options
 * @returns Object with filename and content
 *
 * @example
 * ```typescript
 * const { filename, content } = generateComponentFile({
 *   name: 'UserCard',
 *   props: [{ name: 'user', type: 'User' }]
 * });
 * // filename: 'UserCard.tsx'
 * // content: full component code
 * ```
 */
export function generateComponentFile(options: ComponentOptions): {
  filename: string;
  content: string;
} {
  const generator = new ComponentGenerator();
  const content = generator.generateFunctional(options);
  const filename = `${options.name}.tsx`;

  return { filename, content };
}

/**
 * Common component templates
 */
export const componentTemplates = {
  /**
   * Basic button component
   */
  button: (): string => {
    const generator = new ComponentGenerator();
    return generator.generateFunctional({
      name: 'Button',
      props: [
        { name: 'children', type: 'React.ReactNode' },
        { name: 'onClick', type: '() => void', optional: true },
        { name: 'variant', type: "'primary' | 'secondary'", defaultValue: "'primary'", optional: true },
        { name: 'disabled', type: 'boolean', optional: true },
      ],
      body: `
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={\`btn btn-\${variant}\`}
    >
      {children}
    </button>
  );`,
    });
  },

  /**
   * Form input component
   */
  input: (): string => {
    const generator = new ComponentGenerator();
    return generator.generateFunctional({
      name: 'Input',
      props: [
        { name: 'value', type: 'string' },
        { name: 'onChange', type: '(value: string) => void' },
        { name: 'placeholder', type: 'string', optional: true },
        { name: 'type', type: 'string', defaultValue: "'text'", optional: true },
      ],
      body: `
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );`,
    });
  },

  /**
   * Modal component
   */
  modal: (): string => {
    const generator = new ComponentGenerator();
    return generator.generateFunctional({
      name: 'Modal',
      props: [
        { name: 'isOpen', type: 'boolean' },
        { name: 'onClose', type: '() => void' },
        { name: 'children', type: 'React.ReactNode' },
        { name: 'title', type: 'string', optional: true },
      ],
      hooks: [
        {
          name: 'useEffect',
          args: ['() => { const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", handleEscape); return () => document.removeEventListener("keydown", handleEscape); }', '[onClose]'],
        },
      ],
      body: `
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  );`,
    });
  },
};
