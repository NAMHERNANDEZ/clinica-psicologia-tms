const fs = require('fs');
const path = require('path');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') walk(full);
    else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      const c = fs.readFileSync(full, 'utf8');
      if (c.includes('data || []')) console.log('REMAINING:', full);
    }
  }
}

walk('C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src');
console.log('Scan complete.');