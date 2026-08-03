const fs = require('fs');
const content = fs.readFileSync('C:/Users/LENOVO/Desktop/clinica-psicologia-tms/worker/src/index.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.match(/requireRole|requirePermission|isAuthenticated|getTherapistView|handleGetTherapistView|getReceptionView/i)) {
    console.log((i+1) + ': ' + line.trim().substring(0, 200));
  }
});