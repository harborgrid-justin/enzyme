import * as vscode from 'vscode';

/**
 * EnzymeRenameProvider - Provides rename refactoring
 * Supports renaming routes, components, hooks, and store slices
 */
export class EnzymeRenameProvider implements vscode.RenameProvider {
  /**
   * Prepare rename - validate that rename is allowed
   * @param document
   * @param position
   * @param _token
   */
  public async prepareRename(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.Range | { range: vscode.Range; placeholder: string } | undefined> {
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
      throw new Error('No identifier at this position');
    }

    const word = document.getText(wordRange);
    const line = document.lineAt(position.line).text;

    // Check if it's a renameable entity
    if (this.isRouteReference(line) || this.isComponentReference(word, line) || this.isStoreReference(line)) {
      return {
        range: wordRange,
        placeholder: word,
      };
    }

    throw new Error('Cannot rename this symbol');
  }

  /**
   * Provide rename edits
   * @param document
   * @param position
   * @param newName
   * @param _token
   */
  public async provideRenameEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    newName: string,
    _token: vscode.CancellationToken
  ): Promise<vscode.WorkspaceEdit | undefined> {
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
      return undefined;
    }

    const word = document.getText(wordRange);
    const line = document.lineAt(position.line).text;

    // Route rename
    if (this.isRouteReference(line)) {
      return this.renameRoute(word, newName);
    }

    // Component rename
    if (this.isComponentReference(word, line)) {
      return this.renameComponent(word, newName);
    }

    // Store rename
    if (this.isStoreReference(line)) {
      return this.renameStore(word, newName);
    }

    return undefined;
  }

  /**
   * Rename a route across the workspace
   * @param oldName
   * @param newName
   */
  private async renameRoute(oldName: string, newName: string): Promise<vscode.WorkspaceEdit> {
    const edit = new vscode.WorkspaceEdit();

    try {
      // Find all files that might contain route references
      const files = await vscode.workspace.findFiles(
        '**/*.{ts,tsx,js,jsx}',
        '**/node_modules/**',
        1000
      );

      for (const file of files) {
        const document = await vscode.workspace.openTextDocument(file);
        const text = document.getText();

        // Find all occurrences
        const edits: vscode.TextEdit[] = [];

        // routes.oldName -> routes.newName
        const routesPattern = new RegExp(`routes\\.${oldName}\\b`, 'g');
        let match: RegExpExecArray | null;

        while ((match = routesPattern.exec(text)) !== null) {
          const start = document.positionAt(match.index + 'routes.'.length);
          const end = document.positionAt(match.index + match[0].length);
          edits.push(vscode.TextEdit.replace(new vscode.Range(start, end), newName));
        }

        // In route definitions: { oldName: ... } -> { newName: ... }
        const defPattern = new RegExp(`(['"]?)${oldName}\\1\\s*:\\s*{`, 'g');
        while ((match = defPattern.exec(text)) !== null) {
          const start = document.positionAt(match.index + (match[1] ? 1 : 0));
          const end = document.positionAt(match.index + oldName.length + (match[1] ? 2 : 0));
          const replacement = match[1] ? `${match[1]}${newName}${match[1]}` : newName;
          edits.push(vscode.TextEdit.replace(new vscode.Range(start, end), replacement));
        }

        if (edits.length > 0) {
          edit.set(file, edits);
        }
      }
    } catch (error) {
      console.error('Error renaming route:', error);
    }

    return edit;
  }

  /**
   * Rename a component across the workspace
   * @param oldName
   * @param newName
   */
  private async renameComponent(oldName: string, newName: string): Promise<vscode.WorkspaceEdit> {
    const edit = new vscode.WorkspaceEdit();

    try {
      const files = await vscode.workspace.findFiles(
        '**/*.{tsx,jsx,ts,js}',
        '**/node_modules/**',
        1000
      );

      for (const file of files) {
        const document = await vscode.workspace.openTextDocument(file);
        const text = document.getText();

        const edits: vscode.TextEdit[] = [];

        // JSX tags: <OldName -> <NewName
        const openTagPattern = new RegExp(`<${oldName}\\b`, 'g');
        let match: RegExpExecArray | null;

        while ((match = openTagPattern.exec(text)) !== null) {
          const start = document.positionAt(match.index + 1);
          const end = document.positionAt(match.index + 1 + oldName.length);
          edits.push(vscode.TextEdit.replace(new vscode.Range(start, end), newName));
        }

        // Closing tags: </OldName> -> </NewName>
        const closeTagPattern = new RegExp(`</${oldName}>`, 'g');
        while ((match = closeTagPattern.exec(text)) !== null) {
          const start = document.positionAt(match.index + 2);
          const end = document.positionAt(match.index + 2 + oldName.length);
          edits.push(vscode.TextEdit.replace(new vscode.Range(start, end), newName));
        }

        // Component declaration: const OldName = -> const NewName =
        const declPattern = new RegExp(`\\b${oldName}\\s*[:=]`, 'g');
        while ((match = declPattern.exec(text)) !== null) {
          const start = document.positionAt(match.index);
          const end = document.positionAt(match.index + oldName.length);
          edits.push(vscode.TextEdit.replace(new vscode.Range(start, end), newName));
        }

        // Imports: import { OldName } -> import { NewName }
        const importPattern = new RegExp(`import\\s+{[^}]*\\b${oldName}\\b[^}]*}`, 'g');
        while ((match = importPattern.exec(text)) !== null) {
          const importText = match[0];
          const nameIndex = importText.indexOf(oldName);
          if (nameIndex !== -1) {
            const start = document.positionAt(match.index + nameIndex);
            const end = document.positionAt(match.index + nameIndex + oldName.length);
            edits.push(vscode.TextEdit.replace(new vscode.Range(start, end), newName));
          }
        }

        if (edits.length > 0) {
          edit.set(file, edits);
        }
      }

      // Also rename the file if it matches component name
      const componentFile = files.find(f =>
        f.fsPath.endsWith(`/${oldName}.tsx`) ||
        f.fsPath.endsWith(`/${oldName}.jsx`) ||
        f.fsPath.endsWith(`/${oldName}.ts`) ||
        f.fsPath.endsWith(`/${oldName}.js`)
      );

      if (componentFile) {
        const extension = componentFile.fsPath.slice(Math.max(0, componentFile.fsPath.lastIndexOf('.')));
        const newPath = componentFile.fsPath.replace(
          new RegExp(`${oldName}${extension}$`),
          `${newName}${extension}`
        );
        edit.renameFile(componentFile, vscode.Uri.file(newPath));
      }
    } catch (error) {
      console.error('Error renaming component:', error);
    }

    return edit;
  }

  /**
   * Rename a store slice across the workspace
   * @param oldName
   * @param newName
   */
  private async renameStore(oldName: string, newName: string): Promise<vscode.WorkspaceEdit> {
    const edit = new vscode.WorkspaceEdit();

    try {
      const files = await vscode.workspace.findFiles(
        '**/*.{ts,tsx,js,jsx}',
        '**/node_modules/**',
        1000
      );

      for (const file of files) {
        const document = await vscode.workspace.openTextDocument(file);
        const text = document.getText();

        const edits: vscode.TextEdit[] = [];

        // state.oldName -> state.newName
        const statePattern = new RegExp(`state\\.${oldName}\\b`, 'g');
        let match: RegExpExecArray | null;

        while ((match = statePattern.exec(text)) !== null) {
          const start = document.positionAt(match.index + 'state.'.length);
          const end = document.positionAt(match.index + match[0].length);
          edits.push(vscode.TextEdit.replace(new vscode.Range(start, end), newName));
        }

        // Store name in createSlice
        const createSlicePattern = new RegExp(`name:\\s*['"]${oldName}['"]`, 'g');
        while ((match = createSlicePattern.exec(text)) !== null) {
          const quoteIndex = match[0].includes("'") ? match[0].indexOf("'") : match[0].indexOf('"');
          const start = document.positionAt(match.index + quoteIndex + 1);
          const end = document.positionAt(match.index + quoteIndex + 1 + oldName.length);
          edits.push(vscode.TextEdit.replace(new vscode.Range(start, end), newName));
        }

        if (edits.length > 0) {
          edit.set(file, edits);
        }
      }
    } catch (error) {
      console.error('Error renaming store:', error);
    }

    return edit;
  }

  /**
   * Check if line contains route reference
   * @param line
   */
  private isRouteReference(line: string): boolean {
    return line.includes('routes.');
  }

  /**
   * Check if word is a component reference
   * @param word
   * @param line
   */
  private isComponentReference(word: string, line: string): boolean {
    return /^[A-Z]/.test(word) && (line.includes('<') || line.includes('/>') || line.includes('</'));
  }

  /**
   * Check if line contains store reference
   * @param line
   */
  private isStoreReference(line: string): boolean {
    return line.includes('state.') || line.includes('createSlice');
  }
}
