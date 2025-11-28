import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

async function fixDuplicatesInFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const seenExports = new Set();
  const seenTypeExports = new Set();
  const newLines = [];
  let inExportBlock = false;
  let currentBlock = [];
  let duplicatesFound = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if we're starting an export block
    if (line.match(/^export \{/)) {
      inExportBlock = true;
      currentBlock = [line];
      continue;
    }
    
    // Check if we're in an export block
    if (inExportBlock) {
      currentBlock.push(line);
      
      // Check if export block ends
      if (line.includes('} from')) {
        // Process the block
        const processedBlock = [];
        for (const blockLine of currentBlock) {
          // Extract export identifier
          const typeMatch = blockLine.match(/^\s+type\s+(\w+)/);
          const normalMatch = blockLine.match(/^\s+(\w+)(?:,|\s+as)/);
          
          if (typeMatch) {
            const exportName = `type ${typeMatch[1]}`;
            if (!seenTypeExports.has(exportName)) {
              seenTypeExports.add(exportName);
              processedBlock.push(blockLine);
            } else {
              duplicatesFound++;
            }
          } else if (normalMatch) {
            const exportName = normalMatch[1];
            if (!seenExports.has(exportName)) {
              seenExports.add(exportName);
              processedBlock.push(blockLine);
            } else {
              duplicatesFound++;
            }
          } else {
            // Keep non-export lines (export {, } from, comments)
            processedBlock.push(blockLine);
          }
        }
        
        newLines.push(...processedBlock);
        inExportBlock = false;
        currentBlock = [];
        continue;
      }
      continue;
    }
    
    newLines.push(line);
  }
  
  if (duplicatesFound > 0) {
    const newContent = newLines.join('\n');
    await fs.writeFile(filePath, newContent, 'utf-8');
    console.log(`✅ Fixed ${duplicatesFound} duplicates in ${path.basename(filePath)}`);
    return duplicatesFound;
  }
  
  return 0;
}

async function main() {
  const files = await glob('F:/temp/white-cross/reuse/templates/react/src/**/index.ts', {
    windowsPathsNoEscape: true,
  });
  
  let totalFixed = 0;
  for (const file of files) {
    const fixed = await fixDuplicatesInFile(file);
    totalFixed += fixed;
  }
  
  console.log(`\n✅ Total duplicates fixed: ${totalFixed}`);
}

main().catch(console.error);
