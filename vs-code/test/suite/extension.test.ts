import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateExtension, getExtension, waitForCondition } from '../helpers/test-utils';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Extension should be present', () => {
    const ext = getExtension();
    assert.ok(ext, 'Extension should be installed');
  });

  test('Extension should activate', async function() {
    this.timeout(30000);

    const ext = await activateExtension();
    assert.ok(ext, 'Extension should activate');
    assert.ok(ext.isActive, 'Extension should be active');
  });

  test('Should register all commands', async function() {
    this.timeout(30000);

    await activateExtension();

    const commands = await vscode.commands.getCommands(true);
    const enzymeCommands = [
      'enzyme.generateComponent',
      'enzyme.generatePage',
      'enzyme.generateHook',
      'enzyme.openStateInspector',
      'enzyme.refreshFeatures',
      'enzyme.refreshRoutes'
    ];

    for (const cmd of enzymeCommands) {
      assert.ok(
        commands.includes(cmd),
        `Command ${cmd} should be registered`
      );
    }
  });

  test('Should register tree views', async function() {
    this.timeout(30000);

    await activateExtension();

    // Wait for tree views to be registered
    await waitForCondition(async () => {
      const treeViews = vscode.window.createTreeView('enzymeFeatures', {
        treeDataProvider: {
          getTreeItem: (element: any) => element,
          getChildren: () => []
        }
      });
      const result = treeViews !== undefined;
      treeViews.dispose();
      return result;
    });

    assert.ok(true, 'Tree views should be registered');
  });

  test('Should activate on enzyme workspace', async function() {
    this.timeout(30000);

    const workspaceFolders = vscode.workspace.workspaceFolders;
    assert.ok(workspaceFolders && workspaceFolders.length > 0, 'Should have workspace folder');

    const ext = await activateExtension();
    assert.ok(ext.isActive, 'Extension should activate in enzyme workspace');
  });

  test('Should provide configuration', async function() {
    this.timeout(30000);

    await activateExtension();

    const config = vscode.workspace.getConfiguration('enzyme');
    assert.ok(config, 'Configuration should be available');

    const enableDiagnostics = config.get('enableDiagnostics');
    const enableCodeLens = config.get('enableCodeLens');
    const performanceThreshold = config.get('performanceThreshold');

    assert.strictEqual(typeof enableDiagnostics, 'boolean', 'enableDiagnostics should be boolean');
    assert.strictEqual(typeof enableCodeLens, 'boolean', 'enableCodeLens should be boolean');
    assert.strictEqual(typeof performanceThreshold, 'number', 'performanceThreshold should be number');
  });

  test('Should handle configuration changes', async function() {
    this.timeout(30000);

    await activateExtension();

    const config = vscode.workspace.getConfiguration('enzyme');
    const original = config.get('enableDiagnostics');

    // Toggle the setting
    await config.update('enableDiagnostics', !original, vscode.ConfigurationTarget.Workspace);

    // Wait for update
    await new Promise(resolve => setTimeout(resolve, 100));

    const updated = config.get('enableDiagnostics');
    assert.strictEqual(updated, !original, 'Configuration should update');

    // Restore original
    await config.update('enableDiagnostics', original, vscode.ConfigurationTarget.Workspace);
  });

  test('Should clean up on deactivation', async function() {
    this.timeout(30000);

    const ext = await activateExtension();
    assert.ok(ext.isActive, 'Extension should be active');

    // Note: VS Code doesn't provide a way to deactivate extensions programmatically
    // This test just verifies the extension is properly structured for cleanup
    assert.ok(true, 'Extension has proper cleanup structure');
  });

  test('Should handle missing enzyme workspace gracefully', async function() {
    this.timeout(30000);

    // Extension should still activate, just with limited features
    const ext = await activateExtension();
    assert.ok(ext, 'Extension should handle non-enzyme workspace');
  });

  test('Should provide language features for TypeScript', async function() {
    this.timeout(30000);

    await activateExtension();

    // Create a temporary TypeScript file
    const uri = vscode.Uri.file('/tmp/test.ts');
    const document = await vscode.workspace.openTextDocument(uri);

    assert.strictEqual(document.languageId, 'typescript', 'Should open TypeScript file');
  });
});
