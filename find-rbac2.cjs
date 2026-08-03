const fs = require('fs');
const path = require('path');

// Find all files containing "therapist_id requerido" or "Sin permisos"
function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      walk(full);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      try {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('therapist_id es requerido') || content.includes('Sin permisos')) {
          console.log('=== ' + full + ' ===');
          const lines = content.split('\n');
          lines.forEach((line, i) => {
            if (line.includes('therapist_id es requerido') || line.includes('Sin permisos')) {
              console.log('  ' + (i+1) + ': ' + line.trim().substring(0, 200));
            }
          });
          console.log('');
        }
      } catch(e) {}
    }
  }
}

walk('C:/Users/LENOVO/Desktop/clinica-psicologia-tms/worker/src');