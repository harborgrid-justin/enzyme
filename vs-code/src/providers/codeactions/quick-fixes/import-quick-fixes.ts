import * as vscode from 'vscode';

/**
 *
 */
export class ImportQuickFixes {
  /**
   *
   * @param document
   * @param range
   * @param context
   */
  public provideQuickFixes(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // Check for missing imports
    const text = document.getText(range);
    const missingImports = this.detectMissingImports(text, document);

    for (const importInfo of missingImports) {
      actions.push(...this.createAutoImportActions(document, importInfo));
    }

    // Check for barrel imports (can be optimized)
    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'enzyme' && diagnostic.code !== 'barrel-import') {
        continue;
      }

      actions.push(...this.createBarrelImportFixes(document, diagnostic));
    }

    return actions;
  }

  /**
   *
   * @param text
   * @param document
   */
  private detectMissingImports(text: string, document: vscode.TextDocument): Array<{
    symbol: string;
    module: string;
  }> {
    const imports: Array<{ symbol: string; module: string }> = [];

    // Map of common Enzyme symbols to their modules
    const enzymeModules: Record<string, string> = {
      createStore: '@enzyme/store',
      useStore: '@enzyme/store',
      persist: '@enzyme/store',
      createRoute: '@enzyme/routing',
      useRouter: '@enzyme/routing',
      useNavigate: '@enzyme/routing',
      createFeature: '@enzyme/features',
      useFeature: '@enzyme/features',
      ErrorBoundary: '@enzyme/error-handling',
      ErrorFallback: '@enzyme/error-handling',
    };

    // Check if symbols are used but not imported
    const existingImports = this.getExistingImports(document);

    for (const [symbol, module] of Object.entries(enzymeModules)) {
      const symbolRegex = new RegExp(`\\b${symbol}\\b`);
      if (symbolRegex.test(text) && !existingImports.has(symbol)) {
        imports.push({ symbol, module });
      }
    }

    return imports;
  }

  /**
   *
   * @param document
   */
  private getExistingImports(document: vscode.TextDocument): Set<string> {
    const imports = new Set<string>();
    const text = document.getText();

    // Match all import statements
    const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+["']([^"']+)["']/g;
    let match;

    while ((match = importRegex.exec(text)) !== null) {
      if (match[1]) {
        // Named imports
        const namedImports = match[1].split(',').map((s) => s.trim());
        namedImports.forEach((imp) => imports.add(imp));
      } else if (match[2]) {
        // Default import
        imports.add(match[2]);
      }
    }

    return imports;
  }

  /**
   *
   * @param document
   * @param importInfo
   * @param importInfo.symbol
   * @param importInfo.module
   */
  private createAutoImportActions(
    document: vscode.TextDocument,
    importInfo: { symbol: string; module: string }
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const autoImportAction = new vscode.CodeAction(
      `Auto import '${importInfo.symbol}' from '${importInfo.module}'`,
      vscode.CodeActionKind.QuickFix
    );
    autoImportAction.edit = new vscode.WorkspaceEdit();

    // Find the best place to add the import
    const importPosition = this.findImportInsertPosition(document, importInfo.module);

    // Check if there's already an import from this module
    const existingImportLine = this.findExistingImportLine(document, importInfo.module);

    if (existingImportLine !== -1) {
      // Add to existing import
      const line = document.lineAt(existingImportLine);
      const importMatch = /import\s+{([^}]+)}\s+from/.exec(line.text);

      if (importMatch) {
        const existingImports = importMatch[1];
        const newImports = `${existingImports}, ${importInfo.symbol}`;
        const replaceRange = new vscode.Range(
          new vscode.Position(existingImportLine, importMatch.index),
          new vscode.Position(existingImportLine, importMatch.index + importMatch[0].length)
        );

        autoImportAction.edit.replace(
          document.uri,
          replaceRange,
          `import { ${newImports} } from`
        );
      }
    } else {
      // Add new import line
      const importStatement = `import { ${importInfo.symbol} } from '${importInfo.module}';\n`;
      autoImportAction.edit.insert(document.uri, importPosition, importStatement);
    }

    autoImportAction.isPreferred = true;
    actions.push(autoImportAction);

    return actions;
  }

  /**
   *
   * @param document
   * @param diagnostic
   */
  private createBarrelImportFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const convertAction = new vscode.CodeAction(
      'Convert to submodule imports (tree-shaking)',
      vscode.CodeActionKind.QuickFix
    );
    convertAction.diagnostics = [diagnostic];
    convertAction.edit = new vscode.WorkspaceEdit();

    const line = document.lineAt(diagnostic.range.start.line);
    const importMatch = /import\s+{([^}]+)}\s+from\s+["']([^"']+)["']/.exec(line.text);

    if (importMatch?.[1] && importMatch[2]) {
      const imports = importMatch[1].split(',').map((s) => s.trim());
      const _module = importMatch[2];

      // Convert to individual submodule imports
      const submoduleImports = imports
        .map((imp) => {
          const cleanImport = imp.replace(/\s+as\s+\w+/, '');
          return `import { ${imp} } from '${_module}/${cleanImport.toLowerCase()}';`;
        })
        .join('\n');

      convertAction.edit.replace(
        document.uri,
        new vscode.Range(
          new vscode.Position(diagnostic.range.start.line, 0),
          new vscode.Position(diagnostic.range.start.line, line.text.length)
        ),
        submoduleImports
      );

      convertAction.isPreferred = true;
      actions.push(convertAction);
    }

    // Remove unused imports
    const removeUnusedAction = new vscode.CodeAction(
      'Remove unused imports',
      vscode.CodeActionKind.QuickFix
    );
    removeUnusedAction.diagnostics = [diagnostic];
    removeUnusedAction.command = {
      title: 'Remove Unused Imports',
      command: 'enzyme.removeUnusedImports',
      arguments: [document.uri],
    };
    actions.push(removeUnusedAction);

    // Organize imports
    const organizeAction = new vscode.CodeAction(
      'Organize imports',
      vscode.CodeActionKind.Source
    );
    organizeAction.command = {
      title: 'Organize Imports',
      command: 'enzyme.organizeImports',
      arguments: [document.uri],
    };
    actions.push(organizeAction);

    return actions;
  }

  /**
   *
   * @param document
   * @param module
   * @param _module
   */
  private findImportInsertPosition(document: vscode.TextDocument, _module: string): vscode.Position {
    // Find the last import statement
    let lastImportLine = -1;

    for (let i = 0; i < Math.min(50, document.lineCount); i++) {
      const line = document.lineAt(i);
      if (/^import\s+/.exec(line.text)) {
        lastImportLine = i;
      }
    }

    if (lastImportLine === -1) {
      // No imports found, insert at the top
      return new vscode.Position(0, 0);
    }

    // Insert after the last import
    return new vscode.Position(lastImportLine + 1, 0);
  }

  /**
   *
   * @param document
   * @param module
   */
  private findExistingImportLine(document: vscode.TextDocument, module: string): number {
    for (let i = 0; i < Math.min(50, document.lineCount); i++) {
      const line = document.lineAt(i);
      if (line.text.includes(`from '${module}'`) || line.text.includes(`from "${module}"`)) {
        return i;
      }
    }
    return -1;
  }
}
