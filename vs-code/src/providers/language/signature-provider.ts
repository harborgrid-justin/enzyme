import * as vscode from 'vscode';
import { getIndex } from './enzyme-index';

/**
 * EnzymeSignatureProvider - Provides signature help for function calls
 * Shows parameter information for hooks, API methods, and route builders
 */
export class EnzymeSignatureProvider implements vscode.SignatureHelpProvider {
  /**
   * Provide signature help
   */
  public async provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.SignatureHelpContext
  ): Promise<vscode.SignatureHelp | undefined> {
    const line = document.lineAt(position.line).text;
    const textBeforeCursor = line.substring(0, position.character);

    // Hook signature help
    if (this.isHookCall(textBeforeCursor)) {
      return this.getHookSignature(textBeforeCursor, position);
    }

    // API client signature help
    if (this.isApiCall(textBeforeCursor)) {
      return this.getApiSignature(textBeforeCursor);
    }

    // buildPath signature help
    if (textBeforeCursor.includes('buildPath(')) {
      return this.getBuildPathSignature();
    }

    // Component props signature (in JSX)
    if (this.isComponentProps(textBeforeCursor)) {
      return this.getComponentPropsSignature(textBeforeCursor);
    }

    return undefined;
  }

  /**
   * Check if current position is a hook call
   */
  private isHookCall(text: string): boolean {
    return /use[A-Z]\w*\s*\($/.test(text);
  }

  /**
   * Get hook signature help
   */
  private getHookSignature(text: string, position: vscode.Position): vscode.SignatureHelp | undefined {
    try {
      // Extract hook name
      const match = text.match(/use[A-Z]\w*(?=\s*\($)/);
      if (!match) {
        return undefined;
      }

      const hookName = match[0];
      const index = getIndex();
      const hook = index.getHook(hookName);

      if (!hook || !hook.parameters) {
        return undefined;
      }

      const signatureHelp = new vscode.SignatureHelp();

      const signature = new vscode.SignatureInformation(hook.signature);

      if (hook.description) {
        signature.documentation = new vscode.MarkdownString(hook.description);
      }

      // Add parameters
      hook.parameters.forEach(param => {
        const paramInfo = new vscode.ParameterInformation(
          param.name,
          param.description || param.type
        );
        signature.parameters.push(paramInfo);
      });

      signatureHelp.signatures.push(signature);
      signatureHelp.activeSignature = 0;

      // Determine active parameter based on comma count
      const commaCount = (text.match(/,/g) || []).length;
      signatureHelp.activeParameter = Math.min(commaCount, hook.parameters.length - 1);

      return signatureHelp;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Check if current position is an API call
   */
  private isApiCall(text: string): boolean {
    return /\.(get|post|put|patch|delete|head|options)\s*\($/.test(text);
  }

  /**
   * Get API signature help
   */
  private getApiSignature(text: string): vscode.SignatureHelp | undefined {
    const match = text.match(/\.(get|post|put|patch|delete|head|options)\s*\($/);
    if (!match) {
      return undefined;
    }

    const method = match[1];
    const signatureHelp = new vscode.SignatureHelp();

    // Different signatures based on method
    if (method === 'get' || method === 'delete' || method === 'head') {
      const signature = new vscode.SignatureInformation(
        `${method}(url: string, config?: RequestConfig): Promise<Response>`
      );

      signature.documentation = new vscode.MarkdownString(
        `Make a ${method.toUpperCase()} request to the specified URL`
      );

      signature.parameters.push(
        new vscode.ParameterInformation('url', 'The request URL'),
        new vscode.ParameterInformation('config', 'Optional request configuration')
      );

      signatureHelp.signatures.push(signature);
    } else {
      // POST, PUT, PATCH
      const signature = new vscode.SignatureInformation(
        `${method}(url: string, data?: any, config?: RequestConfig): Promise<Response>`
      );

      signature.documentation = new vscode.MarkdownString(
        `Make a ${method.toUpperCase()} request to the specified URL with data`
      );

      signature.parameters.push(
        new vscode.ParameterInformation('url', 'The request URL'),
        new vscode.ParameterInformation('data', 'The request body data'),
        new vscode.ParameterInformation('config', 'Optional request configuration')
      );

      signatureHelp.signatures.push(signature);
    }

    signatureHelp.activeSignature = 0;

    // Determine active parameter
    const commaCount = (text.match(/,/g) || []).length;
    signatureHelp.activeParameter = Math.min(commaCount, signatureHelp.signatures[0].parameters.length - 1);

    return signatureHelp;
  }

  /**
   * Get buildPath signature help
   */
  private getBuildPathSignature(): vscode.SignatureHelp {
    const signatureHelp = new vscode.SignatureHelp();

    const signature = new vscode.SignatureInformation(
      'buildPath(route: Route, params?: Record<string, string | number>): string'
    );

    signature.documentation = new vscode.MarkdownString(
      'Build a route path with parameters\n\n**Example:**\n```typescript\nbuildPath(routes.user, { id: "123" })\n```'
    );

    signature.parameters.push(
      new vscode.ParameterInformation('route', 'The route object from routes config'),
      new vscode.ParameterInformation('params', 'Route parameters as key-value pairs')
    );

    signatureHelp.signatures.push(signature);
    signatureHelp.activeSignature = 0;
    signatureHelp.activeParameter = 0;

    return signatureHelp;
  }

  /**
   * Check if current position is component props
   */
  private isComponentProps(text: string): boolean {
    return /<[A-Z]\w+\s+\w+=$/.test(text);
  }

  /**
   * Get component props signature help
   */
  private getComponentPropsSignature(text: string): vscode.SignatureHelp | undefined {
    try {
      // Extract component name
      const match = text.match(/<([A-Z]\w+)/);
      if (!match) {
        return undefined;
      }

      const componentName = match[1];
      const index = getIndex();
      const component = index.getComponent(componentName);

      if (!component || !component.props) {
        return undefined;
      }

      const signatureHelp = new vscode.SignatureHelp();

      // Build props signature
      const propsStr = Object.entries(component.props)
        .map(([name, type]) => `${name}: ${type}`)
        .join(', ');

      const signature = new vscode.SignatureInformation(
        `${componentName}({ ${propsStr} })`
      );

      signature.documentation = new vscode.MarkdownString(
        `Component: **${componentName}**`
      );

      // Add each prop as a parameter
      Object.entries(component.props).forEach(([name, type]) => {
        signature.parameters.push(
          new vscode.ParameterInformation(name, `${name}: ${type}`)
        );
      });

      signatureHelp.signatures.push(signature);
      signatureHelp.activeSignature = 0;
      signatureHelp.activeParameter = 0;

      return signatureHelp;
    } catch (error) {
      return undefined;
    }
  }
}

/**
 * Get trigger characters for signature help
 */
export function getSignatureTriggerCharacters(): string[] {
  return ['(', ','];
}
