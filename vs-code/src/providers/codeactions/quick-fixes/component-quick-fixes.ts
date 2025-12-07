import * as vscode from 'vscode';

export class ComponentQuickFixes {
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
        case 'missing-error-boundary':
          actions.push(...this.createErrorBoundaryFixes(document, diagnostic));
          break;
        case 'missing-memo':
          actions.push(...this.createMemoFixes(document, diagnostic));
          break;
        case 'missing-display-name':
          actions.push(...this.createDisplayNameFixes(document, diagnostic));
          break;
        case 'large-component':
          actions.push(...this.createSplitComponentFixes(document, diagnostic));
          break;
        case 'missing-key-prop':
          actions.push(...this.createKeyPropFixes(document, diagnostic));
          break;
      }
    }

    return actions;
  }

  private createErrorBoundaryFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const wrapAction = new vscode.CodeAction(
      'Wrap with ErrorBoundary',
      vscode.CodeActionKind.QuickFix
    );
    wrapAction.diagnostics = [diagnostic];
    wrapAction.edit = new vscode.WorkspaceEdit();

    // Find the component JSX
    const text = document.getText(diagnostic.range);
    const wrappedText = `<ErrorBoundary fallback={<ErrorFallback />}>\n  ${text}\n</ErrorBoundary>`;

    wrapAction.edit.replace(document.uri, diagnostic.range, wrappedText);
    wrapAction.isPreferred = true;
    actions.push(wrapAction);

    // Add import for ErrorBoundary
    const importAction = new vscode.CodeAction(
      'Wrap with ErrorBoundary and add import',
      vscode.CodeActionKind.QuickFix
    );
    importAction.diagnostics = [diagnostic];
    importAction.edit = new vscode.WorkspaceEdit();
    importAction.edit.replace(document.uri, diagnostic.range, wrappedText);
    importAction.edit.insert(
      document.uri,
      new vscode.Position(0, 0),
      "import { ErrorBoundary, ErrorFallback } from '@enzyme/error-handling';\n"
    );
    actions.push(importAction);

    return actions;
  }

  private createMemoFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const memoAction = new vscode.CodeAction(
      'Wrap with React.memo()',
      vscode.CodeActionKind.QuickFix
    );
    memoAction.diagnostics = [diagnostic];
    memoAction.edit = new vscode.WorkspaceEdit();

    // Find component declaration
    const line = document.lineAt(diagnostic.range.start.line);
    const componentMatch = line.text.match(/(?:export\s+)?(?:const|function)\s+(\w+)/);

    if (componentMatch) {
      const componentName = componentMatch[1];

      // Check if it's a const arrow function or function declaration
      if (line.text.includes('const')) {
        // For const components, wrap the entire declaration
        const fullText = document.getText(diagnostic.range);
        const memoized = `const ${componentName} = React.memo(${fullText.replace(/^const\s+\w+\s*=\s*/, '')});`;
        memoAction.edit.replace(document.uri, diagnostic.range, memoized);
      } else {
        // For function declarations, need to export after
        const insertPosition = new vscode.Position(diagnostic.range.end.line + 1, 0);
        memoAction.edit.insert(
          document.uri,
          insertPosition,
          `\nexport default React.memo(${componentName});\n`
        );
      }

      memoAction.isPreferred = true;
      actions.push(memoAction);
    }

    // Add memo with custom comparison
    const memoWithCompareAction = new vscode.CodeAction(
      'Wrap with React.memo() with custom comparison',
      vscode.CodeActionKind.QuickFix
    );
    memoWithCompareAction.diagnostics = [diagnostic];
    actions.push(memoWithCompareAction);

    return actions;
  }

  private createDisplayNameFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const line = document.lineAt(diagnostic.range.start.line);
    const componentMatch = line.text.match(/(?:export\s+)?(?:const|function)\s+(\w+)/);

    if (componentMatch) {
      const componentName = componentMatch[1];

      const addDisplayNameAction = new vscode.CodeAction(
        'Add displayName',
        vscode.CodeActionKind.QuickFix
      );
      addDisplayNameAction.diagnostics = [diagnostic];
      addDisplayNameAction.edit = new vscode.WorkspaceEdit();

      const insertPosition = new vscode.Position(diagnostic.range.end.line + 1, 0);
      addDisplayNameAction.edit.insert(
        document.uri,
        insertPosition,
        `${componentName}.displayName = '${componentName}';\n`
      );
      addDisplayNameAction.isPreferred = true;
      actions.push(addDisplayNameAction);
    }

    return actions;
  }

  private createSplitComponentFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const extractAction = new vscode.CodeAction(
      'Extract to separate file',
      vscode.CodeActionKind.QuickFix
    );
    extractAction.diagnostics = [diagnostic];
    extractAction.command = {
      title: 'Extract Component',
      command: 'enzyme.extractComponent',
      arguments: [document.uri, diagnostic.range],
    };
    actions.push(extractAction);

    const splitAction = new vscode.CodeAction(
      'Split into smaller components',
      vscode.CodeActionKind.QuickFix
    );
    splitAction.diagnostics = [diagnostic];
    splitAction.command = {
      title: 'Split Component',
      command: 'enzyme.splitComponent',
      arguments: [document.uri, diagnostic.range],
    };
    actions.push(splitAction);

    return actions;
  }

  private createKeyPropFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const addKeyAction = new vscode.CodeAction(
      'Add key prop with index',
      vscode.CodeActionKind.QuickFix
    );
    addKeyAction.diagnostics = [diagnostic];
    addKeyAction.edit = new vscode.WorkspaceEdit();

    // Find the opening tag
    const line = document.lineAt(diagnostic.range.start.line);
    const tagMatch = line.text.match(/<(\w+)(\s|>)/);

    if (tagMatch) {
      const insertPos = new vscode.Position(
        diagnostic.range.start.line,
        tagMatch.index! + tagMatch[0].length - 1
      );

      // Try to infer the loop variable
      const mapMatch = document.getText().match(/\.map\(\((\w+),\s*(\w+)\)/);
      const indexVar = mapMatch ? mapMatch[2] : 'index';

      addKeyAction.edit.insert(document.uri, insertPos, ` key={${indexVar}}`);
      addKeyAction.isPreferred = true;
      actions.push(addKeyAction);
    }

    // Add key with id
    const addKeyIdAction = new vscode.CodeAction(
      'Add key prop with item.id',
      vscode.CodeActionKind.QuickFix
    );
    addKeyIdAction.diagnostics = [diagnostic];
    addKeyIdAction.edit = new vscode.WorkspaceEdit();

    if (tagMatch) {
      const insertPos = new vscode.Position(
        diagnostic.range.start.line,
        tagMatch.index! + tagMatch[0].length - 1
      );

      const mapMatch = document.getText().match(/\.map\(\((\w+)\)/);
      const itemVar = mapMatch ? mapMatch[1] : 'item';

      addKeyIdAction.edit.insert(document.uri, insertPos, ` key={${itemVar}.id}`);
      actions.push(addKeyIdAction);
    }

    return actions;
  }
}
