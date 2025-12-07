import * as path from 'node:path';
import { runTests } from '@vscode/test-electron';

/**
 *
 */
async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // The path to the extension test script
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // Download VS Code, unzip it and run the integration test
    await runTests({
      version: 'stable',
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        '--disable-extensions',
        '--disable-workspace-trust',
        path.resolve(__dirname, '../../test/fixtures/sample-project')
      ]
    });

    // Test with insiders as well
    console.log('\nRunning tests with VS Code Insiders...');
    await runTests({
      version: 'insiders',
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        '--disable-extensions',
        '--disable-workspace-trust',
        path.resolve(__dirname, '../../test/fixtures/sample-project')
      ]
    });

  } catch (error) {
    console.error('Failed to run tests:', error);
    process.exit(1);
  }
}

main();
