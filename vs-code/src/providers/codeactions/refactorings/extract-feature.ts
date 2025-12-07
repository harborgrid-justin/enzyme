import * as path from 'node:path';
import * as vscode from 'vscode';

/**
 *
 */
export class ExtractFeatureRefactoring {
  /**
   *
   * @param document
   * @param range
   * @param context
   * @param _context
   */
  public provideRefactorings(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    _context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // Only offer this refactoring when selecting multiple components or a large section
    if (!this.isValidSelectionForFeature(document, range)) {
      return actions;
    }

    const extractAction = new vscode.CodeAction(
      'Extract to Enzyme Feature Module',
      vscode.CodeActionKind.Refactor
    );

    extractAction.command = {
      title: 'Extract Feature',
      command: 'enzyme.extractFeature',
      arguments: [
        {
          uri: document.uri,
          range,
          featureName: this.suggestFeatureName(document, range),
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
  private isValidSelectionForFeature(
    document: vscode.TextDocument,
    range: vscode.Range
  ): boolean {
    const text = document.getText(range);

    // Check if selection contains components
    const componentCount = (text.match(/(?:export\s+)?(?:const|function)\s+\w+\s*[:=]/g) || [])
      .length;

    // Valid if we have 2+ components or a large selection (likely a feature)
    return componentCount >= 2 || text.split('\n').length > 50;
  }

  /**
   *
   * @param document
   * @param range
   * @param _range
   */
  private suggestFeatureName(document: vscode.TextDocument, _range: vscode.Range): string {
    // Try to extract from file name
    const fileName = path.basename(document.fileName, path.extname(document.fileName));

    if (fileName && fileName !== 'index') {
      return this.toPascalCase(fileName);
    }

    // Try to extract from directory name
    const dirName = path.basename(path.dirname(document.fileName));
    return this.toPascalCase(dirName);
  }

  /**
   *
   * @param string_
   */
  private toPascalCase(string_: string): string {
    return string_
      .replace(/[\s_-]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (c) => c.toUpperCase());
  }
}

/**
 *
 * @param args
 * @param args.uri
 * @param args.range
 * @param args.featureName
 */
export async function executeExtractFeature(args: {
  uri: vscode.Uri;
  range: vscode.Range;
  featureName: string;
}): Promise<void> {
  const { uri, range, featureName } = args;

  // Ask user for feature name
  const inputFeatureName = await vscode.window.showInputBox({
    prompt: 'Enter feature name',
    value: featureName,
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Feature name is required';
      }
      if (!/^[A-Z][\dA-Za-z]*$/.test(value)) {
        return 'Feature name must be PascalCase';
      }
      return null;
    },
  });

  if (!inputFeatureName) {
    return;
  }

  const document = await vscode.workspace.openTextDocument(uri);
  const selectedText = document.getText(range);

  // Determine feature structure
  const featureDir = path.join(
    path.dirname(uri.fsPath),
    'features',
    inputFeatureName.toLowerCase()
  );

  // Create feature structure
  const edit = new vscode.WorkspaceEdit();

  // Create index.ts
  const indexUri = vscode.Uri.file(path.join(featureDir, 'index.ts'));
  const indexContent = generateFeatureIndex(inputFeatureName, selectedText);
  edit.createFile(indexUri, { ignoreIfExists: true });
  edit.insert(indexUri, new vscode.Position(0, 0), indexContent);

  // Create components directory
  const componentsIndexUri = vscode.Uri.file(path.join(featureDir, 'components', 'index.ts'));
  edit.createFile(componentsIndexUri, { ignoreIfExists: true });
  edit.insert(
    componentsIndexUri,
    new vscode.Position(0, 0),
    extractComponents(selectedText, inputFeatureName)
  );

  // Create routes.ts
  const routesUri = vscode.Uri.file(path.join(featureDir, 'routes.ts'));
  edit.createFile(routesUri, { ignoreIfExists: true });
  edit.insert(routesUri, new vscode.Position(0, 0), generateFeatureRoutes(inputFeatureName));

  // Create feature.ts
  const featureUri = vscode.Uri.file(path.join(featureDir, 'feature.ts'));
  edit.createFile(featureUri, { ignoreIfExists: true });
  edit.insert(featureUri, new vscode.Position(0, 0), generateFeatureDefinition(inputFeatureName));

  // Replace selected text with import
  edit.replace(
    uri,
    range,
    `// Extracted to features/${inputFeatureName.toLowerCase()}\nimport { ${inputFeatureName} } from './features/${inputFeatureName.toLowerCase()}';\n`
  );

  await vscode.workspace.applyEdit(edit);

  vscode.window.showInformationMessage(
    `Feature '${inputFeatureName}' extracted successfully!`
  );
}

/**
 *
 * @param featureName
 * @param content
 * @param _content
 */
function generateFeatureIndex(featureName: string, _content: string): string {
  return `/**
 * ${featureName} Feature Module
 * Generated by Enzyme VS Code Extension
 */

export { ${featureName}Feature } from './feature';
export * from './components';
export * from './routes';
`;
}

/**
 *
 * @param content
 * @param featureName
 * @param _featureName
 */
function extractComponents(content: string, _featureName: string): string {
  // Extract component definitions
  const componentMatches = content.matchAll(
    /(?:export\s+)?(?:const|function)\s+(\w+)\s*[(:=]/g
  );

  const components: string[] = [];
  for (const match of componentMatches) {
    if (match[1]) {
      components.push(match[1]);
    }
  }

  return `${content}

// Re-export components
export { ${components.join(', ')} };
`;
}

/**
 *
 * @param featureName
 */
function generateFeatureRoutes(featureName: string): string {
  const routePath = featureName.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase();

  return `import { createRoute } from '@enzyme/routing';
import { ${featureName}Page } from './components';

export const ${featureName.toLowerCase()}Routes = [
  createRoute({
    path: '/${routePath}',
    component: ${featureName}Page,
    name: '${featureName}',
  }),
];
`;
}

/**
 *
 * @param featureName
 */
function generateFeatureDefinition(featureName: string): string {
  return `import { createFeature } from '@enzyme/features';
import { ${featureName.toLowerCase()}Routes } from './routes';

export const ${featureName}Feature = createFeature({
  name: '${featureName}',
  routes: ${featureName.toLowerCase()}Routes,
  enabled: true,
});
`;
}
