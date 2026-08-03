const fs = require('fs');

// Read the patient-journey routes file
const content = fs.readFileSync('C:/Users/LENOVO/Desktop/clinica-psicologia-tms/worker/src/domains/patient-journey/routes.ts', 'utf8');
const lines = content.split('\n');

// Find handleGetTherapistView and show context around therapist_id check
let inFunction = false;
let braceDepth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('handleGetTherapistView') || line.includes('handleGetTherapist')) {
    inFunction = true;
  }
  if (inFunction) {
    console.log((i+1) + ': ' + line.trim().substring(0, 200));
    if (line.includes('{')) braceDepth++;
    if (line.includes('}')) braceDepth--;
    if (braceDepth === 0 && i > 0 && inFunction && line.trim().startsWith('}')) {
      break;
    }
  }
}