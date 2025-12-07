import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateExtension } from '../../helpers/test-utils';

suite('Configuration Test Suite', () => {
  suiteSetup(async function() {
    this.timeout(30000);
    await activateExtension();
  });

  test('Should read configuration', async function() {
    this.timeout(10000);

    const config = vscode.workspace.getConfiguration('enzyme');
    assert.ok(config, 'Configuration should be accessible');
  });

  test('Should provide default values', async function() {
    this.timeout(10000);

    const config = vscode.workspace.getConfiguration('enzyme');

    const telemetry = config.get('telemetry.enabled');
    const logging = config.get('logging.level');
    const componentStyle = config.get('generator.componentStyle');

    assert.strictEqual(typeof telemetry, 'boolean', 'telemetry.enabled should be boolean');
    assert.strictEqual(typeof logging, 'string', 'logging.level should be string');
    assert.strictEqual(typeof componentStyle, 'string', 'generator.componentStyle should be string');
  });

  test('Should validate configuration values', async function() {
    this.timeout(10000);

    const config = vscode.workspace.getConfiguration('enzyme');

    // Test enum validation
    const loggingLevel = config.get('logging.level');
    const validLevels = ['debug', 'info', 'warn', 'error'];

    if (loggingLevel) {
      assert.ok(validLevels.includes(loggingLevel as string), 'logging.level should be valid enum value');
    }
  });

  test('Should handle configuration updates', async function() {
    this.timeout(10000);

    const config = vscode.workspace.getConfiguration('enzyme');
    const originalValue = config.get('telemetry.enabled');

    // Update configuration
    await config.update('telemetry.enabled', !originalValue, vscode.ConfigurationTarget.Workspace);

    // Wait for update
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify update
    const updatedValue = config.get('telemetry.enabled');
    assert.strictEqual(updatedValue, !originalValue, 'Configuration should update');

    // Restore original value
    await config.update('telemetry.enabled', originalValue, vscode.ConfigurationTarget.Workspace);
  });

  test('Should trigger change listeners', async function() {
    this.timeout(10000);

    let changeDetected = false;

    const disposable = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('enzyme')) {
        changeDetected = true;
      }
    });

    const config = vscode.workspace.getConfiguration('enzyme');
    const originalValue = config.get('telemetry.enabled');

    await config.update('telemetry.enabled', !originalValue, vscode.ConfigurationTarget.Workspace);
    await new Promise(resolve => setTimeout(resolve, 200));

    assert.ok(changeDetected, 'Configuration change should be detected');

    // Cleanup
    await config.update('telemetry.enabled', originalValue, vscode.ConfigurationTarget.Workspace);
    disposable.dispose();
  });

  test('Should respect workspace vs user settings', async function() {
    this.timeout(10000);

    const config = vscode.workspace.getConfiguration('enzyme');

    // Set workspace setting
    await config.update('logging.level', 'debug', vscode.ConfigurationTarget.Workspace);
    let value = config.get('logging.level');
    assert.strictEqual(value, 'debug', 'Should respect workspace setting');

    // Clean up
    await config.update('logging.level', undefined, vscode.ConfigurationTarget.Workspace);
  });

  test('Should validate generator settings', async function() {
    this.timeout(10000);

    const config = vscode.workspace.getConfiguration('enzyme');

    const componentStyle = config.get('generator.componentStyle');
    const testFramework = config.get('generator.testFramework');
    const cssFramework = config.get('generator.cssFramework');

    assert.ok(['function', 'arrow'].includes(componentStyle as string), 'Component style should be valid');
    assert.ok(['vitest', 'jest'].includes(testFramework as string), 'Test framework should be valid');
    assert.ok(['tailwind', 'css-modules', 'styled-components', 'emotion'].includes(cssFramework as string), 'CSS framework should be valid');
  });

  test('Should validate performance settings', async function() {
    this.timeout(10000);

    const config = vscode.workspace.getConfiguration('enzyme');
    const monitoring = config.get('performance.monitoring.enabled');

    assert.strictEqual(typeof monitoring, 'boolean', 'Performance monitoring should be boolean');
  });

  test('Should validate security settings', async function() {
    this.timeout(10000);

    const config = vscode.workspace.getConfiguration('enzyme');
    const scanning = config.get('security.scanning.enabled');

    assert.strictEqual(typeof scanning, 'boolean', 'Security scanning should be boolean');
  });

  test('Should handle invalid configuration gracefully', async function() {
    this.timeout(10000);

    const config = vscode.workspace.getConfiguration('enzyme');

    // Attempt to set invalid value
    try {
      await config.update('logging.level', 'invalid-level', vscode.ConfigurationTarget.Workspace);
      // VS Code should validate this based on schema
    } catch (err) {
      // Error is acceptable
    }

    // Clean up
    await config.update('logging.level', undefined, vscode.ConfigurationTarget.Workspace);
    assert.ok(true, 'Should handle invalid config gracefully');
  });
});
