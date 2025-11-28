import fs from 'fs/promises';
import path from 'path';

const filePath = 'F:/temp/white-cross/reuse/templates/react/src/lib/performance/index.ts';

async function fixDuplicateExports() {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const seenExports = new Set();
  const seenTypeExports = new Set();
  const newLines = [];
  let inExportBlock = false;
  let currentBlock = [];
  let skipLine = false;
  
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
              console.log(`Skipping duplicate type export: ${exportName} at line ${i + 1}`);
            }
          } else if (normalMatch) {
            const exportName = normalMatch[1];
            if (!seenExports.has(exportName)) {
              seenExports.add(exportName);
              processedBlock.push(blockLine);
            } else {
              console.log(`Skipping duplicate export: ${exportName} at line ${i + 1}`);
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
  
  const newContent = newLines.join('\n');
  await fs.writeFile(filePath, newContent, 'utf-8');
  console.log('✅ Fixed duplicate exports');
  console.log(`Total unique exports: ${seenExports.size}`);
  console.log(`Total unique type exports: ${seenTypeExports.size}`);
}

fixDuplicateExports().catch(console.error);
