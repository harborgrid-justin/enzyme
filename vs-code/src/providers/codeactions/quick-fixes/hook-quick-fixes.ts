import * as vscode from 'vscode';

export class HookQuickFixes {
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
        case 'missing-effect-dependencies':
          actions.push(...this.createMissingDependenciesFixes(document, diagnostic));
          break;
        case 'should-use-callback':
          actions.push(...this.createUseCallbackFixes(document, diagnostic));
          break;
        case 'should-use-memo':
          actions.push(...this.createUseMemoFixes(document, diagnostic));
          break;
        case 'missing-error-handling':
          actions.push(...this.createErrorHandlingFixes(document, diagnostic));
          break;
        case 'extract-custom-hook':
          actions.push(...this.createExtractHookFixes(document, diagnostic));
          break;
      }
    }

    return actions;
  }

  private createMissingDependenciesFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // Extract missing dependencies from diagnostic message
    const missingDeps = this.extractMissingDependencies(diagnostic.message);

    if (missingDeps.length > 0) {
      const addDepsAction = new vscode.CodeAction(
        `Add missing dependencies: ${missingDeps.join(', ')}`,
        vscode.CodeActionKind.QuickFix
      );
      addDepsAction.diagnostics = [diagnostic];
      addDepsAction.edit = new vscode.WorkspaceEdit();

      // Find the dependency array
      const text = document.getText(diagnostic.range);
      const depsMatch = text.match(/\[([^\]]*)\]/);

      if (depsMatch) {
        const currentDeps = depsMatch[1]
          .split(',')
          .map((d) => d.trim())
          .filter((d) => d.length > 0);
        const allDeps = [...new Set([...currentDeps, ...missingDeps])];
        const newDepsArray = `[${allDeps.join(', ')}]`;

        const depsRange = new vscode.Range(
          new vscode.Position(
            diagnostic.range.start.line,
            diagnostic.range.start.character + text.indexOf('[')
          ),
          new vscode.Position(
            diagnostic.range.start.line,
            diagnostic.range.start.character + text.indexOf(']') + 1
          )
        );

        addDepsAction.edit.replace(document.uri, depsRange, newDepsArray);
        addDepsAction.isPreferred = true;
        actions.push(addDepsAction);
      }
    }

    // Add option to disable the rule
    const disableAction = new vscode.CodeAction(
      'Disable dependency check for this effect',
      vscode.CodeActionKind.QuickFix
    );
    disableAction.diagnostics = [diagnostic];
    disableAction.edit = new vscode.WorkspaceEdit();
    disableAction.edit.insert(
      document.uri,
      new vscode.Position(diagnostic.range.start.line, 0),
      '  // eslint-disable-next-line react-hooks/exhaustive-deps\n'
    );
    actions.push(disableAction);

    return actions;
  }

  private createUseCallbackFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const wrapAction = new vscode.CodeAction(
      'Wrap with useCallback',
      vscode.CodeActionKind.QuickFix
    );
    wrapAction.diagnostics = [diagnostic];
    wrapAction.edit = new vscode.WorkspaceEdit();

    const text = document.getText(diagnostic.range);
    const functionMatch = text.match(/const\s+(\w+)\s*=\s*(\([^)]*\)\s*=>\s*{[\s\S]*})/);

    if (functionMatch) {
      const funcName = functionMatch[1];
      const funcBody = functionMatch[2];
      const deps = this.inferDependencies(funcBody);

      const wrappedText = `const ${funcName} = useCallback(${funcBody}, [${deps.join(', ')}])`;
      wrapAction.edit.replace(document.uri, diagnostic.range, wrappedText);
      wrapAction.isPreferred = true;
      actions.push(wrapAction);
    }

    return actions;
  }

  private createUseMemoFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const wrapAction = new vscode.CodeAction(
      'Wrap with useMemo',
      vscode.CodeActionKind.QuickFix
    );
    wrapAction.diagnostics = [diagnostic];
    wrapAction.edit = new vscode.WorkspaceEdit();

    const text = document.getText(diagnostic.range);
    const varMatch = text.match(/const\s+(\w+)\s*=\s*(.+);/);

    if (varMatch) {
      const varName = varMatch[1];
      const computation = varMatch[2];
      const deps = this.inferDependencies(computation);

      const wrappedText = `const ${varName} = useMemo(() => ${computation}, [${deps.join(', ')}]);`;
      wrapAction.edit.replace(document.uri, diagnostic.range, wrappedText);
      wrapAction.isPreferred = true;
      actions.push(wrapAction);
    }

    return actions;
  }

  private createErrorHandlingFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const addTryCatchAction = new vscode.CodeAction(
      'Add try-catch error handling',
      vscode.CodeActionKind.QuickFix
    );
    addTryCatchAction.diagnostics = [diagnostic];
    addTryCatchAction.edit = new vscode.WorkspaceEdit();

    // Find the async function body
    const text = document.getText(diagnostic.range);
    const bodyMatch = text.match(/{\s*([\s\S]*)\s*}/);

    if (bodyMatch) {
      const body = bodyMatch[1];
      const wrappedBody = `{
    try {
${body.split('\n').map((line) => '  ' + line).join('\n')}
    } catch (error) {
      console.error('Error:', error);
      // Handle error appropriately
    }
  }`;

      const bodyRange = new vscode.Range(
        new vscode.Position(
          diagnostic.range.start.line,
          diagnostic.range.start.character + text.indexOf('{')
        ),
        new vscode.Position(
          diagnostic.range.end.line,
          diagnostic.range.end.character
        )
      );

      addTryCatchAction.edit.replace(document.uri, bodyRange, wrappedBody);
      addTryCatchAction.isPreferred = true;
      actions.push(addTryCatchAction);
    }

    // Add error state handling
    const addErrorStateAction = new vscode.CodeAction(
      'Add error state with useState',
      vscode.CodeActionKind.QuickFix
    );
    addErrorStateAction.diagnostics = [diagnostic];
    addErrorStateAction.edit = new vscode.WorkspaceEdit();
    addErrorStateAction.edit.insert(
      document.uri,
      new vscode.Position(diagnostic.range.start.line, 0),
      '  const [error, setError] = useState<Error | null>(null);\n'
    );
    actions.push(addErrorStateAction);

    return actions;
  }

  private createExtractHookFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const extractAction = new vscode.CodeAction(
      'Extract to custom hook',
      vscode.CodeActionKind.QuickFix
    );
    extractAction.diagnostics = [diagnostic];
    extractAction.command = {
      title: 'Extract Custom Hook',
      command: 'enzyme.extractHook',
      arguments: [document.uri, diagnostic.range],
    };
    actions.push(extractAction);

    return actions;
  }

  private extractMissingDependencies(message: string): string[] {
    const match = message.match(/missing dependencies?:\s*(.+)/i);
    if (match) {
      return match[1]
        .split(',')
        .map((dep) => dep.trim().replace(/['"`]/g, ''));
    }
    return [];
  }

  private inferDependencies(code: string): string[] {
    const deps: string[] = [];
    // Simple regex to find potential dependencies (variables referenced)
    const varRegex = /\b([a-z_$][\w$]*)\b/gi;
    const matches = code.matchAll(varRegex);

    const seen = new Set<string>();
    for (const match of matches) {
      const varName = match[1];
      // Skip common keywords and built-ins
      if (
        !seen.has(varName) &&
        !['const', 'let', 'var', 'function', 'return', 'if', 'else', 'true', 'false', 'null', 'undefined'].includes(varName)
      ) {
        seen.add(varName);
        deps.push(varName);
      }
    }

    return deps;
  }
}
