import * as vscode from 'vscode';

/**
 * EnzymeFoldingProvider - Provides code folding ranges
 * Supports folding route definitions, feature registrations, store slices, and components
 */
export class EnzymeFoldingProvider implements vscode.FoldingRangeProvider {
  /**
   * Provide folding ranges
   * @param document
   * @param _context
   * @param _token
   */
  public async provideFoldingRanges(
    document: vscode.TextDocument,
    _context: vscode.FoldingContext,
    _token: vscode.CancellationToken
  ): Promise<vscode.FoldingRange[] | undefined> {
    const foldingRanges: vscode.FoldingRange[] = [];

    // Add default folding for common structures
    const text = document.getText();

    // Fold route configurations
    this.addRouteFolding(document, text, foldingRanges);

    // Fold component definitions
    this.addComponentFolding(document, text, foldingRanges);

    // Fold store definitions
    this.addStoreFolding(document, text, foldingRanges);

    // Fold feature registrations
    this.addFeatureFolding(document, text, foldingRanges);

    // Fold object literals
    this.addObjectLiteralFolding(document, text, foldingRanges);

    // Fold array literals
    this.addArrayLiteralFolding(document, text, foldingRanges);

    return foldingRanges.length > 0 ? foldingRanges : undefined;
  }

  /**
   * Add folding ranges for route configurations
   * @param document
   * @param text
   * @param foldingRanges
   */
  private addRouteFolding(
    document: vscode.TextDocument,
    text: string,
    foldingRanges: vscode.FoldingRange[]
  ): void {
    // Match route configuration blocks
    const routePattern = /routes:\s*{/g;
    let match: RegExpExecArray | null;

    while ((match = routePattern.exec(text)) !== null) {
      const startPos = document.positionAt(match.index);
      const endPos = this.findMatchingBrace(text, match.index + match[0].length - 1);

      if (endPos !== -1) {
        const endPosObject = document.positionAt(endPos);
        if (endPosObject.line > startPos.line) {
          foldingRanges.push(new vscode.FoldingRange(
            startPos.line,
            endPosObject.line,
            vscode.FoldingRangeKind.Region
          ));
        }
      }
    }

    // Individual route definitions
    const routeDefPattern = /(["']?\w+["']?):\s*{\s*(?:path|component|guards)/g;
    while ((match = routeDefPattern.exec(text)) !== null) {
      const startPos = document.positionAt(match.index);
      const braceIndex = text.indexOf('{', match.index);
      const endPos = this.findMatchingBrace(text, braceIndex);

      if (endPos !== -1) {
        const endPosObject = document.positionAt(endPos);
        if (endPosObject.line > startPos.line) {
          foldingRanges.push(new vscode.FoldingRange(
            startPos.line,
            endPosObject.line,
            vscode.FoldingRangeKind.Region
          ));
        }
      }
    }
  }

  /**
   * Add folding ranges for component definitions
   * @param document
   * @param text
   * @param foldingRanges
   */
  private addComponentFolding(
    document: vscode.TextDocument,
    text: string,
    foldingRanges: vscode.FoldingRange[]
  ): void {
    // React function components
    const componentPattern = /(?:export\s+)?(?:const|function)\s+([A-Z]\w+)\s*(?:=\s*\(.*?\)\s*=>|:\s*React\.FC.*?=|\(.*?\))?\s*{/g;
    let match: RegExpExecArray | null;

    while ((match = componentPattern.exec(text)) !== null) {
      const startPos = document.positionAt(match.index);
      const braceIndex = text.indexOf('{', match.index);
      const endPos = this.findMatchingBrace(text, braceIndex);

      if (endPos !== -1) {
        const endPosObject = document.positionAt(endPos);
        if (endPosObject.line > startPos.line) {
          foldingRanges.push(new vscode.FoldingRange(
            startPos.line,
            endPosObject.line,
            vscode.FoldingRangeKind.Region
          ));
        }
      }
    }
  }

  /**
   * Add folding ranges for store definitions
   * @param document
   * @param text
   * @param foldingRanges
   */
  private addStoreFolding(
    document: vscode.TextDocument,
    text: string,
    foldingRanges: vscode.FoldingRange[]
  ): void {
    // createSlice calls
    const slicePattern = /createSlice\s*\(\s*{/g;
    let match: RegExpExecArray | null;

    while ((match = slicePattern.exec(text)) !== null) {
      const startPos = document.positionAt(match.index);
      const braceIndex = text.indexOf('{', match.index);
      const endPos = this.findMatchingBrace(text, braceIndex);

      if (endPos !== -1) {
        const endPosObject = document.positionAt(endPos);
        if (endPosObject.line > startPos.line) {
          foldingRanges.push(new vscode.FoldingRange(
            startPos.line,
            endPosObject.line,
            vscode.FoldingRangeKind.Region
          ));
        }
      }
    }

    // Reducers and actions
    const reducersPattern = /reducers:\s*{/g;
    while ((match = reducersPattern.exec(text)) !== null) {
      const startPos = document.positionAt(match.index);
      const braceIndex = text.indexOf('{', match.index);
      const endPos = this.findMatchingBrace(text, braceIndex);

      if (endPos !== -1) {
        const endPosObject = document.positionAt(endPos);
        if (endPosObject.line > startPos.line) {
          foldingRanges.push(new vscode.FoldingRange(
            startPos.line,
            endPosObject.line,
            vscode.FoldingRangeKind.Region
          ));
        }
      }
    }
  }

  /**
   * Add folding ranges for feature registrations
   * @param document
   * @param text
   * @param foldingRanges
   */
  private addFeatureFolding(
    document: vscode.TextDocument,
    text: string,
    foldingRanges: vscode.FoldingRange[]
  ): void {
    const featurePattern = /registerFeature\s*\(\s*{/g;
    let match: RegExpExecArray | null;

    while ((match = featurePattern.exec(text)) !== null) {
      const startPos = document.positionAt(match.index);
      const braceIndex = text.indexOf('{', match.index);
      const endPos = this.findMatchingBrace(text, braceIndex);

      if (endPos !== -1) {
        const endPosObject = document.positionAt(endPos);
        if (endPosObject.line > startPos.line) {
          foldingRanges.push(new vscode.FoldingRange(
            startPos.line,
            endPosObject.line,
            vscode.FoldingRangeKind.Region
          ));
        }
      }
    }
  }

  /**
   * Add folding ranges for object literals
   * @param document
   * @param text
   * @param foldingRanges
   */
  private addObjectLiteralFolding(
    document: vscode.TextDocument,
    text: string,
    foldingRanges: vscode.FoldingRange[]
  ): void {
    // Find multi-line object literals
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) {
        continue;
      }

      const braceIndex = line.indexOf('{');

      if (braceIndex !== -1) {
        // Check if this starts an object literal (not a function or class)
        const beforeBrace = line.slice(0, Math.max(0, braceIndex));

        // Skip function/class/control flow braces
        if (/(?:function|class|if|else|for|while|switch|catch|try)\s*$/.test(beforeBrace)) {
          continue;
        }

        const absoluteIndex = document.offsetAt(new vscode.Position(i, braceIndex));
        const endPos = this.findMatchingBrace(text, absoluteIndex);

        if (endPos !== -1) {
          const endPosObject = document.positionAt(endPos);
          if (endPosObject.line > i + 1) { // At least 2 lines
            // Avoid duplicates by checking if we already have a range at this position
            const isDuplicate = foldingRanges.some(
              r => r.start === i && r.end === endPosObject.line
            );

            if (!isDuplicate) {
              foldingRanges.push(new vscode.FoldingRange(
                i,
                endPosObject.line,
                vscode.FoldingRangeKind.Region
              ));
            }
          }
        }
      }
    }
  }

  /**
   * Add folding ranges for array literals
   * @param document
   * @param text
   * @param foldingRanges
   */
  private addArrayLiteralFolding(
    document: vscode.TextDocument,
    text: string,
    foldingRanges: vscode.FoldingRange[]
  ): void {
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) {
        continue;
      }

      const bracketIndex = line.indexOf('[');

      if (bracketIndex !== -1) {
        const absoluteIndex = document.offsetAt(new vscode.Position(i, bracketIndex));
        const endPos = this.findMatchingBracket(text, absoluteIndex);

        if (endPos !== -1) {
          const endPosObject = document.positionAt(endPos);
          if (endPosObject.line > i + 1) { // At least 2 lines
            foldingRanges.push(new vscode.FoldingRange(
              i,
              endPosObject.line,
              vscode.FoldingRangeKind.Region
            ));
          }
        }
      }
    }
  }

  /**
   * Find matching closing brace for an opening brace
   * @param text
   * @param startIndex
   */
  private findMatchingBrace(text: string, startIndex: number): number {
    let count = 1;
    let inString = false;
    let stringChar = '';
    let inComment = false;

    for (let i = startIndex + 1; i < text.length; i++) {
      const char = text[i];
      const previousChar = i > 0 ? text[i - 1] : '';
      const nextChar = i < text.length - 1 ? text[i + 1] : '';

      // Handle comments
      if (!inString) {
        if (char === '/' && nextChar === '/') {
          inComment = true;
        }
        if (inComment && char === '\n') {
          inComment = false;
          continue;
        }
        if (char === '/' && nextChar === '*') {
          inComment = true;
        }
        if (inComment && char === '*' && nextChar === '/') {
          inComment = false;
          i++; // Skip the '/'
          continue;
        }
        if (inComment) {
          continue;
        }
      }

      // Handle strings
      if ((char === '"' || char === "'" || char === '`') && previousChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        continue;
      }

      if (inString) {
        continue;
      }

      // Count braces
      if (char === '{') {
        count++;
      } else if (char === '}') {
        count--;
        if (count === 0) {
          return i;
        }
      }
    }

    return -1;
  }

  /**
   * Find matching closing bracket for an opening bracket
   * @param text
   * @param startIndex
   */
  private findMatchingBracket(text: string, startIndex: number): number {
    let count = 1;
    let inString = false;
    let stringChar = '';

    for (let i = startIndex + 1; i < text.length; i++) {
      const char = text[i];
      const previousChar = i > 0 ? text[i - 1] : '';

      // Handle strings
      if ((char === '"' || char === "'" || char === '`') && previousChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        continue;
      }

      if (inString) {
        continue;
      }

      // Count brackets
      if (char === '[') {
        count++;
      } else if (char === ']') {
        count--;
        if (count === 0) {
          return i;
        }
      }
    }

    return -1;
  }
}
