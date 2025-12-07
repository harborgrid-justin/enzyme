import * as vscode from 'vscode';

export class RouteQuickFixes {
  public provideQuickFixes(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'enzyme') {
        continue;
      }

      switch (diagnostic.code) {
        case 'route-conflict':
          actions.push(...this.createRouteConflictFixes(document, diagnostic));
          break;
        case 'missing-route-guard':
          actions.push(...this.createMissingGuardFixes(document, diagnostic));
          break;
        case 'route-without-error-boundary':
          actions.push(...this.createErrorBoundaryFixes(document, diagnostic));
          break;
        case 'missing-route-params-types':
          actions.push(...this.createParamTypesFixes(document, diagnostic));
          break;
      }
    }

    return actions;
  }

  private createRouteConflictFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // Fix 1: Rename route path
    const renameAction = new vscode.CodeAction(
      'Rename route path',
      vscode.CodeActionKind.QuickFix
    );
    renameAction.diagnostics = [diagnostic];
    renameAction.edit = new vscode.WorkspaceEdit();

    const line = document.lineAt(diagnostic.range.start.line);
    const pathMatch = line.text.match(/path:\s*['"]([^'"]+)['"]/);
    if (pathMatch) {
      const currentPath = pathMatch[1];
      const newPath = this.generateUniquePath(currentPath);
      renameAction.edit.replace(
        document.uri,
        new vscode.Range(
          new vscode.Position(diagnostic.range.start.line, pathMatch.index! + pathMatch[0].indexOf(currentPath)),
          new vscode.Position(diagnostic.range.start.line, pathMatch.index! + pathMatch[0].indexOf(currentPath) + currentPath.length)
        ),
        newPath
      );
      actions.push(renameAction);
    }

    // Fix 2: Merge routes
    const mergeAction = new vscode.CodeAction(
      'Merge conflicting routes',
      vscode.CodeActionKind.QuickFix
    );
    mergeAction.diagnostics = [diagnostic];
    mergeAction.isPreferred = false;
    actions.push(mergeAction);

    // Fix 3: Convert to nested route
    const nestedAction = new vscode.CodeAction(
      'Convert to nested route',
      vscode.CodeActionKind.QuickFix
    );
    nestedAction.diagnostics = [diagnostic];
    actions.push(nestedAction);

    return actions;
  }

  private createMissingGuardFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // Fix 1: Add authentication guard
    const authGuardAction = new vscode.CodeAction(
      'Add authentication guard',
      vscode.CodeActionKind.QuickFix
    );
    authGuardAction.diagnostics = [diagnostic];
    authGuardAction.edit = new vscode.WorkspaceEdit();

    const line = document.lineAt(diagnostic.range.start.line);
    const routeMatch = line.text.match(/(\s*)(\w+):\s*{/);
    if (routeMatch) {
      const indent = routeMatch[1];
      const insertPosition = new vscode.Position(diagnostic.range.start.line + 1, 0);
      authGuardAction.edit.insert(
        document.uri,
        insertPosition,
        `${indent}  guards: [requireAuth],\n`
      );
      authGuardAction.isPreferred = true;
      actions.push(authGuardAction);
    }

    // Fix 2: Add role guard
    const roleGuardAction = new vscode.CodeAction(
      'Add role-based guard',
      vscode.CodeActionKind.QuickFix
    );
    roleGuardAction.diagnostics = [diagnostic];
    actions.push(roleGuardAction);

    // Fix 3: Add custom guard
    const customGuardAction = new vscode.CodeAction(
      'Add custom guard...',
      vscode.CodeActionKind.QuickFix
    );
    customGuardAction.diagnostics = [diagnostic];
    actions.push(customGuardAction);

    return actions;
  }

  private createErrorBoundaryFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const addBoundaryAction = new vscode.CodeAction(
      'Wrap route with ErrorBoundary',
      vscode.CodeActionKind.QuickFix
    );
    addBoundaryAction.diagnostics = [diagnostic];
    addBoundaryAction.edit = new vscode.WorkspaceEdit();

    const line = document.lineAt(diagnostic.range.start.line);
    const componentMatch = line.text.match(/component:\s*(\w+)/);
    if (componentMatch) {
      const component = componentMatch[1];
      const replaceRange = new vscode.Range(
        new vscode.Position(diagnostic.range.start.line, componentMatch.index!),
        new vscode.Position(
          diagnostic.range.start.line,
          componentMatch.index! + componentMatch[0].length
        )
      );
      addBoundaryAction.edit.replace(
        document.uri,
        replaceRange,
        `component: () => (<ErrorBoundary><${component} /></ErrorBoundary>)`
      );
      addBoundaryAction.isPreferred = true;
      actions.push(addBoundaryAction);
    }

    return actions;
  }

  private createParamTypesFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const addTypesAction = new vscode.CodeAction(
      'Add route parameter types',
      vscode.CodeActionKind.QuickFix
    );
    addTypesAction.diagnostics = [diagnostic];
    addTypesAction.edit = new vscode.WorkspaceEdit();

    // Extract route params from path
    const line = document.lineAt(diagnostic.range.start.line);
    const pathMatch = line.text.match(/path:\s*['"]([^'"]+)['"]/);
    if (pathMatch) {
      const path = pathMatch[1];
      const params = this.extractRouteParams(path);
      if (params.length > 0) {
        const typeDefinition = this.generateParamTypes(params);
        const insertPosition = new vscode.Position(diagnostic.range.start.line, 0);
        addTypesAction.edit.insert(
          document.uri,
          insertPosition,
          `type RouteParams = ${typeDefinition};\n`
        );
        addTypesAction.isPreferred = true;
        actions.push(addTypesAction);
      }
    }

    return actions;
  }

  private generateUniquePath(currentPath: string): string {
    const match = currentPath.match(/^(.+?)(\d+)?$/);
    if (match) {
      const base = match[1];
      const num = match[2] ? parseInt(match[2], 10) + 1 : 2;
      return `${base}${num}`;
    }
    return `${currentPath}2`;
  }

  private extractRouteParams(path: string): string[] {
    const params: string[] = [];
    const paramRegex = /:(\w+)/g;
    let match;
    while ((match = paramRegex.exec(path)) !== null) {
      params.push(match[1]);
    }
    return params;
  }

  private generateParamTypes(params: string[]): string {
    const fields = params.map((param) => `${param}: string`).join('; ');
    return `{ ${fields} }`;
  }
}
