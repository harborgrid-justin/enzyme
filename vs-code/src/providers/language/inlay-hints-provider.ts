import * as vscode from 'vscode';
import { getIndex } from './enzyme-index';

/**
 * EnzymeInlayHintsProvider - Provides inline type hints
 * Shows parameter types, return types, and configuration option types
 */
export class EnzymeInlayHintsProvider implements vscode.InlayHintsProvider {
  /**
   * Provide inlay hints
   * @param document
   * @param range
   * @param _token
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
   * @param document
   * @param _range
   * @param text
   * @param startOffset
   * @param hints
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
        const variableName = match[1];
        const hookName = match[2];
        if (!hookName) continue;

        const hook = index.getHook(hookName);

        if (hook?.returnType && variableName !== hookName) {
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
        if (!hookName) continue;

        const hook = index.getHook(hookName);

        if (hook?.returnType) {
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
    } catch {
      // Index not available
    }
  }

  /**
   * Add route parameter type hints
   * @param document
   * @param range
   * @param text
   * @param startOffset
   * @param hints
   */
  private addRouteParameterHints(
    document: vscode.TextDocument,
    _range: vscode.Range,
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
        if (!routeName) continue;

        const route = index.getRoute(routeName);

        if (route?.params && route.params.length > 0) {
          const paramsText = match[2];
          if (!paramsText) continue;

          const params = paramsText.split(',');

          params.forEach(param => {
            const paramMatch = /(\w+)\s*:/.exec(param);
            if (paramMatch && paramMatch[1] && match) {
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
    } catch {
      // Index not available
    }
  }

  /**
   * Add API response type hints
   * @param document
   * @param range
   * @param text
   * @param startOffset
   * @param hints
   */
  private addApiResponseHints(
    document: vscode.TextDocument,
    _range: vscode.Range,
    text: string,
    startOffset: number,
    hints: vscode.InlayHint[]
  ): void {
    // Match: const response = await apiClient.get(...)
    const apiPattern = /const\s+(\w+)\s*=\s*(?:await\s+)?apiClient\.(get|post|put|patch|delete)\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = apiPattern.exec(text)) !== null) {
      const variableName = match[1];
      const method = match[2];
      if (!method) continue;

      if (variableName !== 'response' && variableName !== 'result') {
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
   * @param document
   * @param range
   * @param text
   * @param startOffset
   * @param hints
   */
  private addStoreSelectorHints(
    document: vscode.TextDocument,
    _range: vscode.Range,
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
        const sliceName = match[2];
        if (!sliceName) continue;

        const store = index.getStore(sliceName);

        if (store?.state) {
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
    } catch {
      // Index not available
    }
  }

  /**
   * Add component props type hints
   * @param document
   * @param range
   * @param text
   * @param startOffset
   * @param hints
   */
  private addComponentPropsHints(
    document: vscode.TextDocument,
    _range: vscode.Range,
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
        if (!componentName) continue;

        const component = index.getComponent(componentName);

        if (component?.props) {
          const propsText = match[2];
          if (!propsText) continue;

          const propertyMatches = propsText.matchAll(/(\w+)=/g);

          for (const propertyMatch of propertyMatches) {
            const propertyName = propertyMatch[1];
            if (!propertyName) continue;

            const propertyType = component.props[propertyName];

            if (propertyType) {
              const propertyIndex = text.indexOf(propertyName, match.index);
              if (propertyIndex !== -1) {
                const position = document.positionAt(startOffset + propertyIndex + propertyName.length);

                const hint = new vscode.InlayHint(
                  position,
                  `: ${propertyType}`,
                  vscode.InlayHintKind.Type
                );

                hint.tooltip = `Prop type for ${componentName}.${propertyName}`;
                hint.paddingLeft = true;
                hints.push(hint);
              }
            }
          }
        }
      }
    } catch {
      // Index not available
    }
  }

  /**
   * Resolve inlay hint (optional, for lazy loading)
   * @param hint
   * @param token
   */
  public async resolveInlayHint(
    hint: vscode.InlayHint,
    _token: vscode.CancellationToken
  ): Promise<vscode.InlayHint> {
    return hint;
  }
}
