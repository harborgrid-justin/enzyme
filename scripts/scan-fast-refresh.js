#!/usr/bin/env node
/**
 * @file Fast Refresh Compliance Scanner
 * @description Scans codebase for Fast Refresh violations and generates report
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patterns that violate Fast Refresh
const VIOLATIONS = {
  CONTEXT_WITH_COMPONENT: {
    pattern: /createContext.*\n[\s\S]*?export (function|const) [A-Z]/,
    severity: 'HIGH',
    description: 'Context created in same file as component',
  },
  LOWERCASE_COMPONENT: {
    pattern: /export (default )?function [a-z]/,
    severity: 'MEDIUM',
    description: 'Component name is not PascalCase',
  },
  MODULE_SIDE_EFFECTS: {
    pattern: /(window\.|document\.).*addEventListener.*\n(?!.*useEffect)/,
    severity: 'HIGH',
    description: 'Module-level side effects detected',
  },
};

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
  
  console.log('\n' + '='.repeat(80));
  console.log('FAST REFRESH COMPLIANCE REPORT');
  console.log('='.repeat(80) + '\n');
  
  console.log(`Total files scanned: ${results.length}`);
  console.log(`High priority issues: ${high.length}`);
  console.log(`Medium priority issues: ${medium.length}`);
  console.log();
  
  if (high.length > 0) {
    console.log('HIGH PRIORITY VIOLATIONS:');
    console.log('-'.repeat(80));
    high.forEach(result => {
      console.log(`\n📁 ${result.filePath}`);
      result.violations.forEach(v => {
        console.log(`   ⚠️  Line ${v.line}: ${v.description}`);
      });
    });
    console.log();
  }
  
  if (medium.length > 0) {
    console.log('MEDIUM PRIORITY VIOLATIONS:');
    console.log('-'.repeat(80));
    medium.forEach(result => {
      console.log(`\n📁 ${result.filePath}`);
      result.violations.forEach(v => {
        console.log(`   ⚡ Line ${v.line}: ${v.description}`);
      });
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('RECOMMENDATIONS:');
  console.log('='.repeat(80));
  console.log(`
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
console.log(`Scanning directory: ${targetDir}\n`);

const files = scanDirectory(targetDir);
const results = files
  .map(analyzeFile)
  .filter(Boolean);

generateReport(results);

// Export results for further processing
const outputPath = path.join(__dirname, '../fast-refresh-report.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`\nDetailed report saved to: ${outputPath}\n`);
