import * as path from 'node:path';
import * as vscode from 'vscode';

/**
 *
 */
export class ExtractHookRefactoring {
  /**
   *
   * @param document
   * @param range
   * @param context
   */
  public provideRefactorings(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    _context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // Only offer this refactoring when selecting hook-related code
    if (!this.isValidSelectionForHook(document, range)) {
      return actions;
    }

    const extractAction = new vscode.CodeAction(
      'Extract to Custom Hook',
      vscode.CodeActionKind.Refactor
    );

    extractAction.command = {
      title: 'Extract Custom Hook',
      command: 'enzyme.extractHook',
      arguments: [
        {
          uri: document.uri,
          range,
          hookName: this.suggestHookName(document, range),
        },
      ],
    };

    actions.push(extractAction);

    return actions;
  }

  /**
   *
   * @param document
   * @param range
   */
  private isValidSelectionForHook(document: vscode.TextDocument, range: vscode.Range): boolean {
    const text = document.getText(range);

    // Check if selection contains React hooks
    const hasHooks =
      /\b(?:useState|useEffect|useCallback|useMemo|useRef|useContext)\b/.test(text);

    // Check if it's a significant amount of code
    const lineCount = text.split('\n').length;

    return hasHooks && lineCount >= 3;
  }

  /**
   *
   * @param document
   * @param range
   */
  private suggestHookName(document: vscode.TextDocument, range: vscode.Range): string {
    const text = document.getText(range);

    // Try to extract from state variable names
    const stateMatch = /const\s+\[(\w+),\s*set\w+]\s*=\s*useState/.exec(text);
    if (stateMatch && stateMatch[1]) {
      return `use${this.toPascalCase(stateMatch[1])}`;
    }

    // Try to extract from function context
    const functionMatch = /(?:const|function)\s+(\w+)/.exec(text);
    if (functionMatch && functionMatch[1]) {
      return `use${this.toPascalCase(functionMatch[1])}`;
    }

    return 'useCustom';
  }

  /**
   *
   * @param string_
   */
  private toPascalCase(string_: string): string {
    return string_.charAt(0).toUpperCase() + string_.slice(1);
  }
}

/**
 *
 * @param args
 * @param args.uri
 * @param args.range
 * @param args.hookName
 */
export async function executeExtractHook(args: {
  uri: vscode.Uri;
  range: vscode.Range;
  hookName: string;
}): Promise<void> {
  const { uri, range, hookName } = args;

  // Ask user for hook name
  const inputHookName = await vscode.window.showInputBox({
    prompt: 'Enter custom hook name',
    value: hookName,
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Hook name is required';
      }
      if (!/^use[A-Z][\dA-Za-z]*$/.test(value)) {
        return 'Hook name must start with "use" and be camelCase';
      }
      return null;
    },
  });

  if (!inputHookName) {
    return;
  }

  const document = await vscode.workspace.openTextDocument(uri);
  const selectedText = document.getText(range);

  // Analyze the selection to extract dependencies and return values
  const analysis = analyzeHookCode(selectedText);

  // Generate hook code
  const hookCode = generateHookCode(inputHookName, selectedText, analysis);

  // Determine where to save the hook
  const saveLocation = await vscode.window.showQuickPick(
    [
      { label: 'Same file', value: 'same' },
      { label: 'New file in hooks directory', value: 'new' },
      { label: 'Choose location...', value: 'choose' },
    ],
    { placeHolder: 'Where should the hook be saved?' }
  );

  if (!saveLocation) {
    return;
  }

  const edit = new vscode.WorkspaceEdit();

  if (saveLocation.value === 'same') {
    // Add hook to the same file
    const insertPosition = findBestInsertPosition(document);
    edit.insert(uri, insertPosition, `\n${hookCode}\n`);

    // Replace selection with hook usage
    const hookUsage = generateHookUsage(inputHookName, analysis);
    edit.replace(uri, range, hookUsage);
  } else if (saveLocation.value === 'new') {
    // Create new file in hooks directory
    const hooksDir = path.join(path.dirname(uri.fsPath), 'hooks');
    const hookFileName = inputHookName.replace(/^use/, '').toLowerCase();
    const hookFilePath = path.join(hooksDir, `${hookFileName}.ts`);
    const hookFileUri = vscode.Uri.file(hookFilePath);

    const hookFileContent = generateHookFile(inputHookName, hookCode, analysis);

    edit.createFile(hookFileUri, { ignoreIfExists: false });
    edit.insert(hookFileUri, new vscode.Position(0, 0), hookFileContent);

    // Add import and replace usage
    const importStatement = `import { ${inputHookName} } from './hooks/${hookFileName}';\n`;
    edit.insert(uri, new vscode.Position(0, 0), importStatement);

    const hookUsage = generateHookUsage(inputHookName, analysis);
    edit.replace(uri, range, hookUsage);
  }

  await vscode.workspace.applyEdit(edit);

  vscode.window.showInformationMessage(`Custom hook '${inputHookName}' created successfully!`);
}

/**
 *
 */
interface HookAnalysis {
  dependencies: string[];
  returnValues: string[];
  imports: string[];
}

/**
 *
 * @param code
 */
function analyzeHookCode(code: string): HookAnalysis {
  const dependencies = new Set<string>();
  const returnValues: string[] = [];
  const imports = new Set<string>();

  // Extract useState declarations
  const stateMatches = code.matchAll(/const\s+\[(\w+),\s*(\w+)]\s*=\s*useState/g);
  for (const match of stateMatches) {
    if (match[1] && match[2]) {
      returnValues.push(`{ ${match[1]}, ${match[2]} }`);
      imports.add('useState');
    }
  }

  // Extract useEffect
  if (code.includes('useEffect')) {
    imports.add('useEffect');
  }

  // Extract useCallback
  const callbackMatches = code.matchAll(/const\s+(\w+)\s*=\s*useCallback/g);
  for (const match of callbackMatches) {
    if (match[1]) {
      returnValues.push(match[1]);
      imports.add('useCallback');
    }
  }

  // Extract dependencies from function parameters
  const paramMatches = /^\s*(?:const|function)\s+\w+\s*\(([^)]*)\)/m.exec(code);
  if (paramMatches && paramMatches[1]) {
    const params = paramMatches[1].split(',').map((p) => p.trim().split(':')[0]?.trim() ?? '');
    params.forEach((p) => {
      if (p) {
        dependencies.add(p);
      }
    });
  }

  return {
    dependencies: [...dependencies],
    returnValues,
    imports: [...imports],
  };
}

/**
 *
 * @param hookName
 * @param code
 * @param analysis
 */
function generateHookCode(hookName: string, code: string, analysis: HookAnalysis): string {
  const params =
    analysis.dependencies.length > 0 ? analysis.dependencies.join(', ') : '';
  const returnStatement =
    analysis.returnValues.length > 0
      ? `\n  return ${analysis.returnValues.length === 1 ? analysis.returnValues[0] : `{ ${analysis.returnValues.join(', ')} }`};`
      : '';

  return `function ${hookName}(${params}) {
${code.split('\n').map((line) => `  ${  line}`).join('\n')}${returnStatement}
}`;
}

/**
 *
 * @param hookName
 * @param hookCode
 * @param analysis
 */
function generateHookFile(_hookName: string, hookCode: string, analysis: HookAnalysis): string {
  const imports = analysis.imports.length > 0 ? `import { ${analysis.imports.join(', ')} } from 'react';\n\n` : '';

  return `${imports}export ${hookCode}
`;
}

/**
 *
 * @param hookName
 * @param analysis
 */
function generateHookUsage(hookName: string, analysis: HookAnalysis): string {
  const args =
    analysis.dependencies.length > 0 ? analysis.dependencies.join(', ') : '';

  if (analysis.returnValues.length === 0) {
    return `${hookName}(${args});`;
  }

  if (analysis.returnValues.length === 1) {
    return `const ${analysis.returnValues[0]} = ${hookName}(${args});`;
  }

  return `const { ${analysis.returnValues.join(', ')} } = ${hookName}(${args});`;
}

/**
 *
 * @param document
 */
function findBestInsertPosition(document: vscode.TextDocument): vscode.Position {
  // Find the last import statement
  let lastImportLine = -1;

  for (let i = 0; i < Math.min(50, document.lineCount); i++) {
    const line = document.lineAt(i);
    if (/^import\s+/.exec(line.text)) {
      lastImportLine = i;
    }
  }

  if (lastImportLine === -1) {
    return new vscode.Position(0, 0);
  }

  return new vscode.Position(lastImportLine + 2, 0);
}
