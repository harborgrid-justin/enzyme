/* eslint-env node */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function countLines(filePath) {
  const content = readFileSync(filePath, 'utf8');
  return content.split('\n').length;
}

function findFiles(dir, extensions) {
  let results = [];
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(findFiles(fullPath, extensions));
    } else if (extensions.some(ext => fullPath.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

const srcDir = 'src';
const extensions = ['.ts', '.js', '.tsx', '.jsx'];
const files = findFiles(srcDir, extensions);

const largeFiles = [];
for (const file of files) {
  const loc = countLines(file);
  if (loc > 150) {
    largeFiles.push({ file, loc });
  }
}

largeFiles.sort((a, b) => b.loc - a.loc); // sort by LOC descending

globalThis.console.log('Files with >150 LOC:');
largeFiles.forEach(({ file, loc }) => {
  globalThis.console.log(`${file}: ${loc}`);
});
