import * as vscode from 'vscode';
import { createDiagnostic } from '../enzyme-diagnostics';

/**
 *
 */
export class RouteRules {
  /**
   *
   * @param document
   */
  public async analyze(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();

    // Check for conflicting routes
    diagnostics.push(...this.checkConflictingRoutes(document, text));

    // Check for missing route guards
    diagnostics.push(...this.checkMissingRouteGuards(document, text));

    // Check for unused routes
    diagnostics.push(...this.checkUnusedRoutes(document, text));

    // Check for routes without error boundaries
    diagnostics.push(...this.checkRoutesWithoutErrorBoundary(document, text));

    return diagnostics;
  }

  /**
   *
   * @param document
   * @param text
   */
  private checkConflictingRoutes(
    document: vscode.TextDocument,
    text: string
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    const routes = new Map<string, vscode.Position[]>();

    // Find all route definitions
    const routePattern = /path:\s*["']([^"']+)["']/g;
    let match;

    while ((match = routePattern.exec(text)) !== null) {
      const path = match[1];
      if (!path) {continue;}

      const position = document.positionAt(match.index);

      if (!routes.has(path)) {
        routes.set(path, []);
      }
      routes.get(path)!.push(position);
    }

    // Check for duplicates
    for (const [path, positions] of routes.entries()) {
      if (positions.length > 1) {
        for (const position of positions) {
          const range = new vscode.Range(position, position.translate(0, path.length + 10));
          const relatedInfo: vscode.DiagnosticRelatedInformation[] = positions
            .filter((p) => p !== position)
            .map(
              (p) =>
                new vscode.DiagnosticRelatedInformation(
                  new vscode.Location(document.uri, p),
                  'Other route with same path'
                )
            );

          diagnostics.push(
            createDiagnostic(
              range,
              `Conflicting route path '${path}'. This path is defined ${positions.length} times.`,
              vscode.DiagnosticSeverity.Error,
              'route-conflict',
              relatedInfo
            )
          );
        }
      }
    }

    return diagnostics;
  }

  /**
   *
   * @param document
   * @param text
   */
  private checkMissingRouteGuards(
    document: vscode.TextDocument,
    text: string
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    // Find routes that should have guards (protected paths)
    const protectedPatterns = [
      /path:\s*["']\/admin[^"']*["']/g,
      /path:\s*["']\/dashboard[^"']*["']/g,
      /path:\s*["']\/profile[^"']*["']/g,
      /path:\s*["']\/settings[^"']*["']/g,
    ];

    for (const pattern of protectedPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const position = document.positionAt(match.index);

        // Check if this route has guards
        const routeContext = this.getRouteContext(document, position);
        if (!routeContext.hasGuards) {
          const range = new vscode.Range(position, position.translate(0, match[0].length));
          diagnostics.push(
            createDiagnostic(
              range,
              'Protected route should have authentication guards',
              vscode.DiagnosticSeverity.Warning,
              'missing-route-guard'
            )
          );
        }
      }
    }

    return diagnostics;
  }

  /**
   *
   * @param document
   * @param text
   */
  private checkUnusedRoutes(document: vscode.TextDocument, text: string): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    // This is a simplified check - in production, would check actual route usage
    const routePattern = /(?:export\s+)?const\s+(\w+Route)\s*=/g;
    let match;

    while ((match = routePattern.exec(text)) !== null) {
      const routeName = match[1];
      if (!routeName) {continue;}

      const position = document.positionAt(match.index);

      // Check if route is referenced elsewhere (simplified)
      const references = text.split(routeName).length - 1;

      if (references === 1) {
        // Only one occurrence (the definition itself)
        const range = new vscode.Range(position, position.translate(0, routeName.length));
        diagnostics.push(
          createDiagnostic(
            range,
            `Route '${routeName}' is defined but never used`,
            vscode.DiagnosticSeverity.Information,
            'unused-route'
          )
        );
      }
    }

    return diagnostics;
  }

  /**
   *
   * @param document
   * @param text
   */
  private checkRoutesWithoutErrorBoundary(
    document: vscode.TextDocument,
    text: string
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    // Find route definitions
    const routePattern = /component:\s*(\w+)/g;
    let match;

    while ((match = routePattern.exec(text)) !== null) {
      const position = document.positionAt(match.index);

      // Check if route has error boundary
      const routeContext = this.getRouteContext(document, position);

      if (!routeContext.hasErrorBoundary) {
        const range = new vscode.Range(position, position.translate(0, match[0].length));
        diagnostics.push(
          createDiagnostic(
            range,
            'Route should be wrapped with an ErrorBoundary for better error handling',
            vscode.DiagnosticSeverity.Hint,
            'route-without-error-boundary'
          )
        );
      }
    }

    return diagnostics;
  }

  /**
   *
   * @param document
   * @param position
   */
  private getRouteContext(
    document: vscode.TextDocument,
    position: vscode.Position
  ): {
    hasGuards: boolean;
    hasErrorBoundary: boolean;
  } {
    // Find the complete route definition
    let currentLine = position.line;
    let braceCount = 0;
    let routeText = '';
    let startedRoute = false;

    // Scan backwards to find route start
    while (currentLine >= Math.max(0, position.line - 20)) {
      const line = document.lineAt(currentLine);
      if (line.text.includes('createRoute') || (/\w+:\s*{/.exec(line.text))) {
        break;
      }
      currentLine--;
    }

    // Scan forward to get complete route
    while (currentLine < document.lineCount && currentLine < position.line + 50) {
      const line = document.lineAt(currentLine);
      routeText += `${line.text  }\n`;

      for (const char of line.text) {
        if (char === '{') {
          braceCount++;
          startedRoute = true;
        }
        if (char === '}') {braceCount--;}
      }

      if (startedRoute && braceCount === 0) {
        break;
      }

      currentLine++;
    }

    return {
      hasGuards: routeText.includes('guards:') || routeText.includes('guard:'),
      hasErrorBoundary:
        routeText.includes('ErrorBoundary') || routeText.includes('errorBoundary'),
    };
  }
}
