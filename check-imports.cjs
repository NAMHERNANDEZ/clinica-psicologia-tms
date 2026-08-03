const fs = require('fs');

const files = [
  'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/components/Reminders.tsx',
  'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/components/TopBar.tsx',
  'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/cos/engine/AlertEngine.ts',
  'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/cos/engine/ClinicalFlowEngine.ts',
  'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/cos/engine/SessionOrchestrator.ts',
  'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/cos/engine/TaskEngine.ts',
  'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/cos/engine/TodayEngine.ts',
  'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/pages/app/AgendaPage.tsx',
  'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/pages/app/BrainViewerPage.tsx',
  'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/pages/app/ClinicalAssessmentsPage.tsx',
  'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/pages/app/DigitalTwinPage.tsx',
  'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/pages/app/ReportsPage.tsx',
  'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/pages/app/SettingsPage.tsx',
  'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/pages/app/SimulatorPage.tsx',
  'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/pages/app/TreatmentsPage.tsx',
  'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/pages/Appointments.tsx',
  'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/pages/CalendarPage.tsx',
  'C:/Users/LENOVO/Desktop/clinica-psicologia-tms/src/visual-engine/modules/twin/DigitalTwinChart.tsx',
];

files.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  const hasImport = c.includes('safeArray');
  console.log(hasImport ? 'OK' : 'NEEDS IMPORT', f);
});