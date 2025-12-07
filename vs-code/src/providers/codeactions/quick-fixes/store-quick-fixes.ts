import * as vscode from 'vscode';

/**
 *
 */
export class StoreQuickFixes {
  /**
   *
   * @param document
   * @param range
   * @param context
   */
  public provideQuickFixes(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'enzyme') {
        continue;
      }

      switch (diagnostic.code) {
        case 'missing-persistence-config':
          actions.push(...this.createPersistenceFixes(document, diagnostic));
          break;
        case 'missing-devtools-name':
          actions.push(...this.createDevToolsFixes(document, diagnostic));
          break;
        case 'unmemoized-selector':
          actions.push(...this.createSelectorMemoizationFixes(document, diagnostic));
          break;
        case 'large-store':
          actions.push(...this.createSplitStoreFixes(document, diagnostic));
          break;
      }
    }

    return actions;
  }

  /**
   *
   * @param document
   * @param diagnostic
   */
  private createPersistenceFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const addPersistenceAction = new vscode.CodeAction(
      'Add persistence configuration',
      vscode.CodeActionKind.QuickFix
    );
    addPersistenceAction.diagnostics = [diagnostic];
    addPersistenceAction.edit = new vscode.WorkspaceEdit();

    // Find the store creation
    const text = document.getText(diagnostic.range);
    const storeMatch = /createStore\s*<([^>]+)>\s*\(/.exec(text);

    if (storeMatch) {
      // Find the closing parenthesis of createStore
      const insertPosition = new vscode.Position(diagnostic.range.end.line, 0);

      const persistenceConfig = `\n// Add persistence configuration
const persistedStore = persist(store, {
  name: 'app-store',
  storage: localStorage,
  partialize: (state) => ({
    // Select which parts of state to persist
    // ...state
  }),
});
`;

      addPersistenceAction.edit.insert(document.uri, insertPosition, persistenceConfig);
      addPersistenceAction.isPreferred = true;
      actions.push(addPersistenceAction);
    }

    // Add session storage option
    const sessionStorageAction = new vscode.CodeAction(
      'Add persistence with sessionStorage',
      vscode.CodeActionKind.QuickFix
    );
    sessionStorageAction.diagnostics = [diagnostic];
    sessionStorageAction.edit = new vscode.WorkspaceEdit();

    const insertPosition = new vscode.Position(diagnostic.range.end.line, 0);
    const sessionConfig = `\nconst persistedStore = persist(store, {
  name: 'app-store',
  storage: sessionStorage,
});
`;
    sessionStorageAction.edit.insert(document.uri, insertPosition, sessionConfig);
    actions.push(sessionStorageAction);

    return actions;
  }

  /**
   *
   * @param document
   * @param diagnostic
   */
  private createDevToolsFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const addDevelopmentToolsAction = new vscode.CodeAction(
      'Add DevTools name',
      vscode.CodeActionKind.QuickFix
    );
    addDevelopmentToolsAction.diagnostics = [diagnostic];
    addDevelopmentToolsAction.edit = new vscode.WorkspaceEdit();

    // Extract store name from variable or file
    const line = document.lineAt(diagnostic.range.start.line);
    const storeNameMatch = /(?:export\s+)?(?:const|let|var)\s+(\w+)/.exec(line.text);
    const storeName = storeNameMatch ? storeNameMatch[1] : 'Store';

    // Find createStore call options
    const text = document.getText(diagnostic.range);
    const optionsMatch = /createStore\s*<[^>]+>\s*\([^,]+,\s*({[^}]*})\s*\)/.exec(text);

    if (optionsMatch && optionsMatch[1]) {
      // Add to existing options
      const optionsText = optionsMatch[1];
      const updatedOptions = optionsText.replace('}', `,\n  name: '${storeName}',\n}`);

      const optionsRange = new vscode.Range(
        new vscode.Position(
          diagnostic.range.start.line,
          diagnostic.range.start.character + text.indexOf(optionsText)
        ),
        new vscode.Position(
          diagnostic.range.start.line,
          diagnostic.range.start.character + text.indexOf(optionsText) + optionsText.length
        )
      );

      addDevelopmentToolsAction.edit.replace(document.uri, optionsRange, updatedOptions);
    } else {
      // Add options object
      const callMatch = /createStore\s*<[^>]+>\s*\(([^)]+)\)/.exec(text);
      if (callMatch && callMatch[1]) {
        const args = callMatch[1];
        const updatedCall = `${args}, { name: '${storeName}' }`;

        const argsRange = new vscode.Range(
          new vscode.Position(
            diagnostic.range.start.line,
            diagnostic.range.start.character + text.indexOf(args)
          ),
          new vscode.Position(
            diagnostic.range.start.line,
            diagnostic.range.start.character + text.indexOf(args) + args.length
          )
        );

        addDevelopmentToolsAction.edit.replace(document.uri, argsRange, updatedCall);
      }
    }

    addDevelopmentToolsAction.isPreferred = true;
    actions.push(addDevelopmentToolsAction);

    return actions;
  }

  /**
   *
   * @param document
   * @param diagnostic
   */
  private createSelectorMemoizationFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const memoizeAction = new vscode.CodeAction(
      'Add selector memoization',
      vscode.CodeActionKind.QuickFix
    );
    memoizeAction.diagnostics = [diagnostic];
    memoizeAction.edit = new vscode.WorkspaceEdit();

    const text = document.getText(diagnostic.range);
    const selectorMatch = /const\s+(\w+)\s*=\s*\(state:\s*\w+\)\s*=>\s*(.+);/.exec(text);

    if (selectorMatch) {
      const selectorName = selectorMatch[1];
      const selectorBody = selectorMatch[2];

      const memoizedSelector = `const ${selectorName} = createSelector(
  (state) => state,
  (state) => ${selectorBody}
);`;

      memoizeAction.edit.replace(document.uri, diagnostic.range, memoizedSelector);
      memoizeAction.isPreferred = true;
      actions.push(memoizeAction);

      // Add import if needed
      const hasImport = document.getText().includes('createSelector');
      if (!hasImport) {
        memoizeAction.edit.insert(
          document.uri,
          new vscode.Position(0, 0),
          "import { createSelector } from '@enzyme/store';\n"
        );
      }
    }

    return actions;
  }

  /**
   *
   * @param document
   * @param diagnostic
   */
  private createSplitStoreFixes(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const splitAction = new vscode.CodeAction(
      'Split into multiple stores',
      vscode.CodeActionKind.QuickFix
    );
    splitAction.diagnostics = [diagnostic];
    splitAction.command = {
      title: 'Split Store',
      command: 'enzyme.splitStore',
      arguments: [document.uri, diagnostic.range],
    };
    actions.push(splitAction);

    const sliceAction = new vscode.CodeAction(
      'Extract to store slice',
      vscode.CodeActionKind.QuickFix
    );
    sliceAction.diagnostics = [diagnostic];
    sliceAction.command = {
      title: 'Extract Store Slice',
      command: 'enzyme.extractStoreSlice',
      arguments: [document.uri, diagnostic.range],
    };
    actions.push(sliceAction);

    return actions;
  }
}
