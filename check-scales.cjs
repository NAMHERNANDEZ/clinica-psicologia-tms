const fs = require('fs');
const content = fs.readFileSync('C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/lib/clinicalScales.ts', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);
console.log('\n=== Scales defined ===');
lines.forEach((line, i) => {
  if (line.match(/id:\s*['"]|name:\s*['"]|maxScore|PHQ|GAD|YBOCS|VAS|PSQI|FTND|THI|PCL/)) {
    console.log((i+1) + ': ' + line.trim().substring(0, 150));
  }
});

// Count scales
const scaleMatches = content.match(/id:\s*['"](phq9|gad7|ybocs|vas|psqi|ftnd|thi|pcl5)['"]/gi);
console.log('\n=== Scale IDs found ===');
console.log(scaleMatches ? scaleMatches.join(', ') : 'none');
console.log('Count:', scaleMatches ? scaleMatches.length : 0);

// Check what's in the assessments routes
const routesContent = fs.readFileSync('C:/Users/LENOVO/Desktop/clinica-psicologia-tms/worker/src/domains/clinical-assessments/routes.ts', 'utf8');
const routeLines = routesContent.split('\n');
console.log('\n=== Assessment routes ===');
routeLines.forEach((line, i) => {
  if (line.match(/route|\/assessments|listByPatient|create|listByType/)) {
    console.log((i+1) + ': ' + line.trim().substring(0, 150));
  }
});

// Check the frontend ClinicalAssessmentsPage for any TODOs or missing scales
const pageContent = fs.readFileSync('C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/pages/app/ClinicalAssessmentsPage.tsx', 'utf8');
const pageLines = pageContent.split('\n');
console.log('\n=== Assessment page references ===');
const sc = pageContent.match(/phq9|gad7|ybocs|vas|psqi|ftnd|thi|pcl5/gi);
console.log('Scale references:', sc ? sc.join(', ') : 'none');

// Check what the user said about VAS - they mentioned it as "every session"
// FTND - tongue frenulum (neurological)
// THI - Tinnitus Handicap Inventory
// PCL5 - PTSD Checklist

console.log('\n=== Missing scales analysis ===');
console.log('Standard TMS assessment scales that should exist:');
const allStandardScales = [
  'phq9 - PHQ-9 (depression)',
  'gad7 - GAD-7 (anxiety)',
  'ybocs - Y-BOCS (OCD severity)',
  'vas - Visual Analog Scale',
  'psqi - Pittsburgh Sleep Quality Index',
  'ftnd - Functional Ten-Item Neurological Disability',
  'thi - Tinnitus Handicap Inventory',
  'pcl5 - PTSD Checklist for DSM-5',
  'bdi2 - Beck Depression Inventory II',
  'gsci - Glasgow Coma Scale',
  'nf10 - Neurobehavioral Functioning',
  'moca - Montreal Cognitive Assessment',
];
console.log('Standard scales defined:', (scaleMatches || []).length);
console.log('Standard scales expected: 8 (phq9, gad7, ybocs, vas, psqi, ftnd, thi, pcl5)');
console.log('Missing from codebase: bdi2, gsci, nf10, moca (optional/advanced)');