import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export async function run(): Promise<void> {
  // Create the mocha test runner
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 10000,
    reporter: 'spec',
    slow: 1000
  });

  const testsRoot = path.resolve(__dirname, '..');

  // Use the promise-based glob API
  const files = await glob('**/**.test.js', { cwd: testsRoot });

  // Add files to the test suite
  files.forEach((f: string) => mocha.addFile(path.resolve(testsRoot, f)));

  return new Promise<void>((resolve, reject) => {
    try {
      // Run the mocha test
      mocha.run((failures: number) => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        } else {
          resolve();
        }
      });
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
}
