const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FFMPEG = path.join('C:\\Users\\LENOVO\\Desktop\\clinica-psicologia-tms', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
const config = {
  width: 1080,
  height: 1920,
  outputDir: path.join(__dirname, '..', 'output'),
  outputFilename: 'tms-depresion-ansiedad-premium.mp4'
};

const scenes = [
  { name: '01-hook', duration: 5, text: '¿La depresión o la ansiedad controlan tu vida?', bg: '0d1117', fg: 'white' },
  { name: '02-depresion', duration: 15, text: 'SIN ENERGÍA - SIN GANAS DE VIVIR - SIN ESPERANZA - Medicamentos que no funcionan...', bg: '1a1a2e', fg: 'white' },
  { name: '03-ansiedad', duration: 15, text: 'ATAQUES DE PÁNICO - PREOCUPACIÓN CONSTANTE - MIEDO SIN RAZÓN - Que no te deja dormir...', bg: '16213e', fg: 'white' },
  { name: '04-que-es-tms', duration: 20, text: 'TERAPIA MAGNÉTICA TRANSCRANEAL - Tratamiento no invasivo - Sin cirugía - Sin anestesia - Sin dolor', bg: '0d1117', fg: 'cyan' },
  { name: '05-como-funciona', duration: 15, text: 'Estimula áreas cerebrales específicas - Cada sesión dura 30-45 minutos', bg: '0d1117', fg: 'white' },
  { name: '06-beneficios-dep', duration: 15, text: 'PARA LA DEPRESIÓN: ✓ Mejora el ánimo ✓ Reduce la tristeza ✓ Recupera la energía ✓ Resultados en pocas sesiones', bg: '0d1117', fg: 'green' },
  { name: '07-beneficios-ans', duration: 10, text: 'PARA LA ANSIEDAD: ✓ Reduce el estrés ✓ Controla pánico ✓ Mejora el sueño ✓ Recupera tu calma', bg: '0d1117', fg: 'green' },
  { name: '08-credibilidad', duration: 10, text: 'APROBADO POR: FDA - COFEPRIS - CE - Miles de pacientes tratados exitosamente', bg: '0d1117', fg: 'white' },
  { name: '09-cta', duration: 15, text: '¿Depresión o ansiedad? TMS puede ayudarte - AGENDA TU CONSULTA HOY - WhatsApp: 52 231 144 2941 - neurocienciaclinica.mx', bg: '0d1117', fg: 'cyan' }
];

console.log('🎬 Generando video TMS Premium...\n');
console.log(`🔧 FFmpeg: ${FFMPEG}\n`);

if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

scenes.forEach((scene) => {
  const outFile = path.join(config.outputDir, `${scene.name}.mp4`);
  const text = scene.text.replace(/'/g, "'\\''");
  
  const cmd = `"${FFMPEG}" -y -f lavfi -i "color=c=0x${scene.bg}:s=${config.width}x${config.height}:d=${scene.duration}" -vf "drawtext=text='${text}':fontsize=40:fontcolor=${scene.fg}:x=(w-text_w)/2:y=(h-text_h)/2" -c:v libx264 -pix_fmt yuv420p -t ${scene.duration} "${outFile}"`;
  
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`  ✅ ${scene.name} (${scene.duration}s)`);
  } catch (e) {
    console.log(`  ⚠️ ${scene.name} - creando sin texto`);
    const simpleCmd = `"${FFMPEG}" -y -f lavfi -i "color=c=0x${scene.bg}:s=${config.width}x${config.height}:d=${scene.duration}" -c:v libx264 -pix_fmt yuv420p -t ${scene.duration} "${outFile}"`;
    execSync(simpleCmd, { stdio: 'pipe' });
    console.log(`  ✅ ${scene.name} (${scene.duration}s) [sin texto]`);
  }
});

const concatFile = path.join(config.outputDir, 'concat.txt');
let concatContent = '';
scenes.forEach(scene => {
  concatContent += `file '${scene.name}.mp4'\n`;
});
fs.writeFileSync(concatFile, concatContent);

console.log('\n🔗 Concatenando escenas...');
const finalOutput = path.join(config.outputDir, config.outputFilename);
execSync(`"${FFMPEG}" -y -f concat -safe 0 -i "${concatFile}" -c copy "${finalOutput}"`, { stdio: 'pipe' });

console.log('\n✅ ¡VIDEO COMPLETADO!');
console.log(`📁 ${finalOutput}`);
console.log(`⏱️ Duración: ${scenes.reduce((a, s) => a + s.duration, 0)} segundos`);
console.log(`📐 Resolución: ${config.width}x${config.height}`);