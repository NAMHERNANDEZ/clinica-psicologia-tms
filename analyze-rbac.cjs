const fs = require('fs');

// Check admin permissions
const rbac = fs.readFileSync('C:/Users/LENOVO/Desktop/clinica-psicologia-tms/worker/src/lib/rbac.ts', 'utf8');
console.log('=== Admin Permissions ===');
const adminMatch = rbac.match(/admin:\s*\[([\s\S]*?)\]/);
if (adminMatch) {
  console.log(adminMatch[1].trim());
}

console.log('\n=== Therapist Permissions ===');
const therapistMatch = rbac.match(/therapist:\s*\[([\s\S]*?)\]/);
if (therapistMatch) {
  console.log(therapistMatch[1].trim());
}

// Check tms-engine route file for what permissions it requires
const tmsRoutes = fs.readFileSync('C:/Users/LENOVO/Desktop/clinica-psicologia-tms/worker/src/domains/tms-engine/routes.ts', 'utf8');
const tmsLines = tmsRoutes.split('\n');
console.log('\n=== tms-engine routes permissions check ===');
tmsLines.forEach((line, i) => {
  if (line.match(/requirePermission|requireRole|handleGetDashboard|getDashboard/i)) {
    console.log((i+1) + ': ' + line.trim().substring(0, 200));
  }
});