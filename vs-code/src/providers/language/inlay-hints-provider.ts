import * as vscode from 'vscode';
import { getIndex } from './enzyme-index';

/**
 * EnzymeInlayHintsProvider - Provides inline type hints
 * Shows parameter types, return types, and configuration option types
 */
export class EnzymeInlayHintsProvider implements vscode.InlayHintsProvider {
  /**
   * Provide inlay hints
   */
  public async provideInlayHints(
    document: vscode.TextDocument,
    range: vscode.Range,
    _token: vscode.CancellationToken
  ): Promise<vscode.InlayHint[] | undefined> {
    const hints: vscode.InlayHint[] = [];

    try {
      // Get configuration
      const config = vscode.workspace.getConfiguration('enzyme');
      const enableInlayHints = config.get<boolean>('enableInlayHints', true);

      if (!enableInlayHints) {
        return undefined;
      }

      const text = document.getText(range);
      const startOffset = document.offsetAt(range.start);

      // Hook return type hints
      this.addHookReturnTypeHints(document, range, text, startOffset, hints);

      // Route parameter type hints
      this.addRouteParameterHints(document, range, text, startOffset, hints);

      // API response type hints
      this.addApiResponseHints(document, range, text, startOffset, hints);

      // Store selector type hints
      this.addStoreSelectorHints(document, range, text, startOffset, hints);

      // Component props type hints
      this.addComponentPropsHints(document, range, text, startOffset, hints);

    } catch (error) {
      console.error('Error providing inlay hints:', error);
    }

    return hints.length > 0 ? hints : undefined;
  }

  /**
   * Add hook return type hints
   */
  private addHookReturnTypeHints(
    document: vscode.TextDocument,
    _range: vscode.Range,
    text: string,
    startOffset: number,
    hints: vscode.InlayHint[]
  ): void {
    try {
      const index = getIndex();

      // Match: const result = useHook(...)
      const hookPattern = /const\s+(\w+)\s*=\s*(use[A-Z]\w*)\s*\(/g;
      let match: RegExpExecArray | null;

      while ((match = hookPattern.exec(text)) !== null) {
        const varName = match[1];
        const hookName = match[2];
        const hook = index.getHook(hookName);

        if (hook && hook.returnType && varName !== hookName) {
          const position = document.positionAt(startOffset + match.index + match[0].indexOf('='));

          const hint = new vscode.InlayHint(
            position,
            `: ${hook.returnType}`,
            vscode.InlayHintKind.Type
          );

          hint.tooltip = `Return type from ${hookName}`;
          hint.paddingLeft = true;
          hints.push(hint);
        }
      }

      // Match: const { data, loading } = useApiRequest(...)
      const destructurePattern = /const\s*{\s*([^}]+)\s*}\s*=\s*(use[A-Z]\w*)\s*\(/g;
      while ((match = destructurePattern.exec(text)) !== null) {
        const hookName = match[2];
        const hook = index.getHook(hookName);

        if (hook && hook.returnType) {
          const position = document.positionAt(startOffset + match.index + match[0].indexOf('='));

          const hint = new vscode.InlayHint(
            position,
            `: ${hook.returnType}`,
            vscode.InlayHintKind.Type
          );

          hint.tooltip = `Return type from ${hookName}`;
          hint.paddingLeft = true;
          hints.push(hint);
        }
      }
    } catch (error) {
      // Index not available
    }
  }

  /**
   * Add route parameter type hints
   */
  private addRouteParameterHints(
    document: vscode.TextDocument,
    range: vscode.Range,
    text: string,
    startOffset: number,
    hints: vscode.InlayHint[]
  ): void {
    try {
      const index = getIndex();

      // Match: buildPath(routes.user, { id: value })
      const buildPathPattern = /buildPath\s*\(\s*routes\.(\w+)\s*,\s*{\s*([^}]+)\s*}\s*\)/g;
      let match: RegExpExecArray | null;

      while ((match = buildPathPattern.exec(text)) !== null) {
        const routeName = match[1];
        const route = index.getRoute(routeName);

        if (route && route.params && route.params.length > 0) {
          const paramsText = match[2];
          const params = paramsText.split(',');

          params.forEach(param => {
            const paramMatch = param.match(/(\w+)\s*:/);
            if (paramMatch) {
              const paramName = paramMatch[1].trim();
              const paramIndex = text.indexOf(paramName, match.index);

              if (paramIndex !== -1) {
                const position = document.positionAt(startOffset + paramIndex + paramName.length);

                const hint = new vscode.InlayHint(
                  position,
                  ': string | number',
                  vscode.InlayHintKind.Type
                );

                hint.tooltip = `Route parameter type`;
                hint.paddingLeft = true;
                hints.push(hint);
              }
            }
          });
        }
      }
    } catch (error) {
      // Index not available
    }
  }

  /**
   * Add API response type hints
   */
  private addApiResponseHints(
    document: vscode.TextDocument,
    range: vscode.Range,
    text: string,
    startOffset: number,
    hints: vscode.InlayHint[]
  ): void {
    // Match: const response = await apiClient.get(...)
    const apiPattern = /const\s+(\w+)\s*=\s*(?:await\s+)?apiClient\.(get|post|put|patch|delete)\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = apiPattern.exec(text)) !== null) {
      const varName = match[1];
      const method = match[2];

      if (varName !== 'response' && varName !== 'result') {
        const position = document.positionAt(startOffset + match.index + match[0].indexOf('='));

        const hint = new vscode.InlayHint(
          position,
          ': Promise<Response>',
          vscode.InlayHintKind.Type
        );

        hint.tooltip = `API ${method.toUpperCase()} response type`;
        hint.paddingLeft = true;
        hints.push(hint);
      }
    }
  }

  /**
   * Add store selector type hints
   */
  private addStoreSelectorHints(
    document: vscode.TextDocument,
    range: vscode.Range,
    text: string,
    startOffset: number,
    hints: vscode.InlayHint[]
  ): void {
    try {
      const index = getIndex();

      // Match: const data = useStore(state => state.slice)
      const selectorPattern = /const\s+(\w+)\s*=\s*useStore\s*\(\s*state\s*=>\s*state\.(\w+)/g;
      let match: RegExpExecArray | null;

      while ((match = selectorPattern.exec(text)) !== null) {
        const varName = match[1];
        const sliceName = match[2];
        const store = index.getStore(sliceName);

        if (store && store.state) {
          // Infer type from store state
          const stateType = Object.entries(store.state)
            .map(([key, type]) => `${key}: ${type}`)
            .join('; ');

          const position = document.positionAt(startOffset + match.index + match[0].indexOf('='));

          const hint = new vscode.InlayHint(
            position,
            `: { ${stateType} }`,
            vscode.InlayHintKind.Type
          );

          hint.tooltip = `Store slice type: ${sliceName}`;
          hint.paddingLeft = true;
          hints.push(hint);
        }
      }
    } catch (error) {
      // Index not available
    }
  }

  /**
   * Add component props type hints
   */
  private addComponentPropsHints(
    document: vscode.TextDocument,
    range: vscode.Range,
    text: string,
    startOffset: number,
    hints: vscode.InlayHint[]
  ): void {
    try {
      const index = getIndex();

      // Match: <Component prop={value}
      const componentPattern = /<([A-Z]\w+)\s+([^>]+)>/g;
      let match: RegExpExecArray | null;

      while ((match = componentPattern.exec(text)) !== null) {
        const componentName = match[1];
        const component = index.getComponent(componentName);

        if (component && component.props) {
          const propsText = match[2];
          const propMatches = propsText.matchAll(/(\w+)=/g);

          for (const propMatch of propMatches) {
            const propName = propMatch[1];
            const propType = component.props[propName];

            if (propType) {
              const propIndex = text.indexOf(propName, match.index);
              if (propIndex !== -1) {
                const position = document.positionAt(startOffset + propIndex + propName.length);

                const hint = new vscode.InlayHint(
                  position,
                  `: ${propType}`,
                  vscode.InlayHintKind.Type
                );

                hint.tooltip = `Prop type for ${componentName}.${propName}`;
                hint.paddingLeft = true;
                hints.push(hint);
              }
            }
          }
        }
      }
    } catch (error) {
      // Index not available
    }
  }

  /**
   * Resolve inlay hint (optional, for lazy loading)
   */
  public async resolveInlayHint(
    hint: vscode.InlayHint,
    token: vscode.CancellationToken
  ): Promise<vscode.InlayHint> {
    return hint;
  }
}
