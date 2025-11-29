#!/usr/bin/env node
/* eslint-env node */
/**
 * @file Fast Refresh Compliance Scanner
 * @description Scans codebase for Fast Refresh violations and generates report
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Scan directory for TypeScript/TSX files
 */
function scanDirectory(dir, results = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        scanDirectory(filePath, results);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(filePath);
    }
  }
  
  return results;
}

/**
 * Analyze file for violations
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const violations = [];
  
  // Check for context with component
  if (content.includes('createContext') && /export (function|const) [A-Z]/.test(content)) {
    const hasProvider = /Provider/.test(content);
    if (hasProvider) {
      violations.push({
        type: 'CONTEXT_WITH_COMPONENT',
        severity: 'HIGH',
        description: 'Context and Provider in same file',
        line: findLineNumber(content, 'createContext'),
      });
    }
  }
  
  // Check for lowercase component exports
  const lowercaseMatches = content.matchAll(/export (default )?function ([a-z][a-zA-Z]*)/g);
  for (const match of lowercaseMatches) {
    const functionName = match[2];
    // Exclude obvious utilities (use, get, set, is, has, etc.)
    if (!/^(use|get|set|is|has|create|make|build|parse|format|validate)/.test(functionName)) {
      violations.push({
        type: 'LOWERCASE_COMPONENT',
        severity: 'MEDIUM',
        description: `Function '${functionName}' might be a component but is lowercase`,
        line: findLineNumber(content, match[0]),
      });
    }
  }
  
  return violations.length > 0 ? { filePath, violations } : null;
}

/**
 * Find line number of pattern in content
 */
function findLineNumber(content, pattern) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(pattern)) {
      return i + 1;
    }
  }
  return -1;
}

/**
 * Generate report
 */
function generateReport(results) {
  const high = results.filter(r => r.violations.some(v => v.severity === 'HIGH'));
  const medium = results.filter(r => r.violations.some(v => v.severity === 'MEDIUM'));

  globalThis.console.log('\n' + '='.repeat(80));
  globalThis.console.log('FAST REFRESH COMPLIANCE REPORT');
  globalThis.console.log('='.repeat(80) + '\n');

  globalThis.console.log(`Total files scanned: ${results.length}`);
  globalThis.console.log(`High priority issues: ${high.length}`);
  globalThis.console.log(`Medium priority issues: ${medium.length}`);
  globalThis.console.log();

  if (high.length > 0) {
    globalThis.console.log('HIGH PRIORITY VIOLATIONS:');
    globalThis.console.log('-'.repeat(80));
    high.forEach(result => {
      globalThis.console.log(`\n📁 ${result.filePath}`);
      result.violations.forEach(v => {
        globalThis.console.log(`   ⚠️  Line ${v.line}: ${v.description}`);
      });
    });
    globalThis.console.log();
  }

  if (medium.length > 0) {
    globalThis.console.log('MEDIUM PRIORITY VIOLATIONS:');
    globalThis.console.log('-'.repeat(80));
    medium.forEach(result => {
      globalThis.console.log(`\n📁 ${result.filePath}`);
      result.violations.forEach(v => {
        globalThis.console.log(`   ⚡ Line ${v.line}: ${v.description}`);
      });
    });
  }

  globalThis.console.log('\n' + '='.repeat(80));
  globalThis.console.log('RECOMMENDATIONS:');
  globalThis.console.log('='.repeat(80));
  globalThis.console.log(`
1. Extract all createContext() calls to separate context files
2. Move context files to reuse/templates/react/src/lib/contexts/
3. Update imports in provider files
4. Ensure all component names are PascalCase
5. Move module-level side effects into useEffect hooks

See FAST_REFRESH_REFACTORING.md for detailed instructions.
  `);
}

// Main execution
const targetDir = path.join(__dirname, '../src/lib');
globalThis.console.log(`Scanning directory: ${targetDir}\n`);

const files = scanDirectory(targetDir);
const results = files
  .map(analyzeFile)
  .filter(Boolean);

generateReport(results);

// Export results for further processing
const outputPath = path.join(__dirname, '../fast-refresh-report.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
globalThis.console.log(`\nDetailed report saved to: ${outputPath}\n`);
