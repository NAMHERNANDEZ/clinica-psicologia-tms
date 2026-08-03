const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;

  // Fix pattern: variable.data || []
  // This handles res.data || [], apptsRes.value.data || [], etc.
  newContent = newContent.replace(
    /(\w+(?:\.\w+)*)\.data\s*\|\|\s*\[\]/g,
    'safeArray($1.data)'
  );

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Fixed:', filePath);
    return true;
  }
  return false;
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      walkDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      processFile(fullPath);
    }
  }
}

const srcDir = process.argv[2] || 'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src';
console.log('Processing:', srcDir);
walkDir(srcDir);
console.log('Done.');
