const fs = require('fs');
const path = require('path');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      walk(full);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.match(/requireRole|isTherapist|isReception|roles.*includes|therapist_id.*required|403|Sin permisos/i) && line.trim().length > 10) {
          console.log(full + ':' + (i+1) + ' | ' + line.trim().substring(0, 180));
        }
      });
    }
  }
}

walk('C:/Users/LENOVO/Desktop/clinica-psicologia-tms/worker/src');