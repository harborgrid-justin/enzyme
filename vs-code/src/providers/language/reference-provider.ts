import * as vscode from 'vscode';
import { getIndex } from './enzyme-index';
import { getParser } from './parser';

/**
 * EnzymeReferenceProvider - Provides find-all-references functionality
 * Finds all usages of routes, components, hooks, stores, and APIs
 */
export class EnzymeReferenceProvider implements vscode.ReferenceProvider {
  /**
   * Provide reference locations
   */
  public async provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.ReferenceContext,
    token: vscode.CancellationToken
  ): Promise<vscode.Location[] | undefined> {
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
      return undefined;
    }

    const word = document.getText(wordRange);
    const line = document.lineAt(position.line).text;

    // Find route references
    if (line.includes('routes.') || this.isRouteContext(document, position)) {
      return this.findRouteReferences(word);
    }

    // Find component references
    if (/^[A-Z]/.test(word)) {
      return this.findComponentReferences(word);
    }

    // Find hook references
    if (word.startsWith('use') && /^use[A-Z]/.test(word)) {
      return this.findHookReferences(word);
    }

    // Find store references
    if (this.isInStoreContext(line)) {
      return this.findStoreReferences(word);
    }

    return undefined;
  }

  /**
   * Find all route references
   */
  private async findRouteReferences(routeName: string): Promise<vscode.Location[]> {
    const locations: vscode.Location[] = [];

    try {
      // Search for route usages across workspace
      const files = await vscode.workspace.findFiles(
        '**/*.{ts,tsx,js,jsx}',
        '**/node_modules/**',
        1000
      );

      for (const file of files) {
        const document = await vscode.workspace.openTextDocument(file);
        const text = document.getText();

        // Find all occurrences of routes.routeName
        const pattern = new RegExp(`routes\\.${routeName}\\b`, 'g');
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(text)) !== null) {
          const position = document.positionAt(match.index + match[0].indexOf(routeName));
          const wordRange = document.getWordRangeAtPosition(position);

          if (wordRange) {
            locations.push(new vscode.Location(file, wordRange));
          }
        }

        // Also find buildPath calls
        const buildPathPattern = new RegExp(`buildPath\\s*\\(\\s*routes\\.${routeName}`, 'g');
        while ((match = buildPathPattern.exec(text)) !== null) {
          const position = document.positionAt(match.index + match[0].indexOf(routeName));
          const wordRange = document.getWordRangeAtPosition(position);

          if (wordRange) {
            locations.push(new vscode.Location(file, wordRange));
          }
        }
      }
    } catch (error) {
      console.error('Error finding route references:', error);
    }

    return locations;
  }

  /**
   * Find all component references
   */
  private async findComponentReferences(componentName: string): Promise<vscode.Location[]> {
    const locations: vscode.Location[] = [];

    try {
      const files = await vscode.workspace.findFiles(
        '**/*.{tsx,jsx}',
        '**/node_modules/**',
        1000
      );

      for (const file of files) {
        const document = await vscode.workspace.openTextDocument(file);
        const text = document.getText();

        // Find JSX usage: <ComponentName
        const jsxPattern = new RegExp(`<${componentName}\\b`, 'g');
        let match: RegExpExecArray | null;

        while ((match = jsxPattern.exec(text)) !== null) {
          const position = document.positionAt(match.index + 1); // Skip '<'
          const wordRange = document.getWordRangeAtPosition(position);

          if (wordRange) {
            locations.push(new vscode.Location(file, wordRange));
          }
        }

        // Find closing tags: </ComponentName>
        const closingPattern = new RegExp(`</${componentName}>`, 'g');
        while ((match = closingPattern.exec(text)) !== null) {
          const position = document.positionAt(match.index + 2); // Skip '</'
          const wordRange = document.getWordRangeAtPosition(position);

          if (wordRange) {
            locations.push(new vscode.Location(file, wordRange));
          }
        }

        // Find imports: import { ComponentName } or import ComponentName
        const importPattern = new RegExp(`import\\s+(?:{[^}]*\\b${componentName}\\b[^}]*}|${componentName})`, 'g');
        while ((match = importPattern.exec(text)) !== null) {
          const position = document.positionAt(match.index + match[0].indexOf(componentName));
          const wordRange = document.getWordRangeAtPosition(position);

          if (wordRange) {
            locations.push(new vscode.Location(file, wordRange));
          }
        }
      }
    } catch (error) {
      console.error('Error finding component references:', error);
    }

    return locations;
  }

  /**
   * Find all hook references
   */
  private async findHookReferences(hookName: string): Promise<vscode.Location[]> {
    const locations: vscode.Location[] = [];

    try {
      const files = await vscode.workspace.findFiles(
        '**/*.{ts,tsx,js,jsx}',
        '**/node_modules/**',
        1000
      );

      for (const file of files) {
        const document = await vscode.workspace.openTextDocument(file);
        const text = document.getText();

        // Find hook calls
        const pattern = new RegExp(`\\b${hookName}\\s*\\(`, 'g');
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(text)) !== null) {
          const position = document.positionAt(match.index);
          const wordRange = document.getWordRangeAtPosition(position);

          if (wordRange) {
            locations.push(new vscode.Location(file, wordRange));
          }
        }

        // Find imports
        const importPattern = new RegExp(`import\\s+(?:{[^}]*\\b${hookName}\\b[^}]*}|${hookName})`, 'g');
        while ((match = importPattern.exec(text)) !== null) {
          const position = document.positionAt(match.index + match[0].indexOf(hookName));
          const wordRange = document.getWordRangeAtPosition(position);

          if (wordRange) {
            locations.push(new vscode.Location(file, wordRange));
          }
        }
      }
    } catch (error) {
      console.error('Error finding hook references:', error);
    }

    return locations;
  }

  /**
   * Find all store references
   */
  private async findStoreReferences(storeName: string): Promise<vscode.Location[]> {
    const locations: vscode.Location[] = [];

    try {
      const files = await vscode.workspace.findFiles(
        '**/*.{ts,tsx,js,jsx}',
        '**/node_modules/**',
        1000
      );

      for (const file of files) {
        const document = await vscode.workspace.openTextDocument(file);
        const text = document.getText();

        // Find state access: state.storeName
        const statePattern = new RegExp(`state\\.${storeName}\\b`, 'g');
        let match: RegExpExecArray | null;

        while ((match = statePattern.exec(text)) !== null) {
          const position = document.positionAt(match.index + match[0].indexOf(storeName));
          const wordRange = document.getWordRangeAtPosition(position);

          if (wordRange) {
            locations.push(new vscode.Location(file, wordRange));
          }
        }

        // Find dispatch calls with store actions
        const dispatchPattern = new RegExp(`dispatch\\s*\\(\\s*${storeName}`, 'g');
        while ((match = dispatchPattern.exec(text)) !== null) {
          const position = document.positionAt(match.index + match[0].indexOf(storeName));
          const wordRange = document.getWordRangeAtPosition(position);

          if (wordRange) {
            locations.push(new vscode.Location(file, wordRange));
          }
        }
      }
    } catch (error) {
      console.error('Error finding store references:', error);
    }

    return locations;
  }

  /**
   * Check if position is in route context
   */
  private isRouteContext(document: vscode.TextDocument, position: vscode.Position): boolean {
    const line = document.lineAt(position.line).text;
    return line.includes('routes.') || line.includes('buildPath(');
  }

  /**
   * Check if in store context
   */
  private isInStoreContext(line: string): boolean {
    return line.includes('useStore') || line.includes('state.') || line.includes('dispatch(');
  }
}
