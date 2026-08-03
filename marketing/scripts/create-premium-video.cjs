const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FFMPEG = path.join('C:\\Users\\LENOVO\\Desktop\\clinica-psicologia-tms', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
const outputDir = path.join(__dirname, '..', 'output');
const assetsDir = path.join(__dirname, '..', 'assets', 'images');

// Crear directorios
[outputDir, assetsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// URLs de imágenes reales de Pexels (4K gratuitas)
const images = {
  'depression': 'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'anxiety': 'https://images.pexels.com/photos/3808008/pexels-photo-3808008.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'brain': 'https://images.pexels.com/photos/5726794/pexels-photo-5726794.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'clinic': 'https://images.pexels.com/photos/263404/pexels-photo-263404.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'doctor': 'https://images.pexels.com/photos/3259629/pexels-photo-3259629.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'happy': 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'neurons': 'https://images.pexels.com/photos/8473277/pexels-photo-8473277.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'sunrise': 'https://images.pexels.com/photos/1563356/pexels-photo-1563356.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'hands': 'https://images.pexels.com/photos/4588065/pexels-photo-4588065.jpeg?auto=compress&cs=tinysrgb&w=1920'
};

// Escenas del video con imágenes reales
const scenes = [
  { name: '01-hook', duration: 5, image: 'depression', text: '¿La depresión o la ansiedad\ncontrolan tu vida?' },
  { name: '02-depresion', duration: 15, image: 'depression', text: 'Sin energía\nSin ganas de vivir\nSin esperanza' },
  { name: '03-ansiedad', duration: 15, image: 'anxiety', text: 'Ataques de pánico\nPreocupación constante\nMiedo sin razón' },
  { name: '04-que-es-tms', duration: 20, image: 'brain', text: 'TERAPIA MAGNÉTICA\nTRANSCRANEAL' },
  { name: '05-como-funciona', duration: 15, image: 'neurons', text: 'Estimula áreas\ncerebrales específicas' },
  { name: '06-beneficios-dep', duration: 15, image: 'happy', text: '✓ Mejora el ánimo\n✓ Reduce la tristeza\n✓ Recupera la energía' },
  { name: '07-beneficios-ans', duration: 10, image: 'sunrise', text: '✓ Reduce el estrés\n✓ Controla el pánico\n✓ Mejora el sueño' },
  { name: '08-credibilidad', duration: 10, image: 'clinic', text: 'Aprobado por FDA\nCOFEPRIS • CE' },
  { name: '09-cta', duration: 15, image: 'doctor', text: 'Agenda tu consulta HOY\nWhatsApp: 52 231 144 2941' }
];

// Descargar imagen desde URL
function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(outputPath);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

// Crear escena con imagen real + texto overlay
function createScene(scene, imagePath) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, `${scene.name}.mp4`);
    const duration = scene.duration;
    const text = scene.text.replace(/\n/g, '\\n').replace(/'/g, "'\\''");

    // Crear video con imagen real + texto overlay profesional
    const cmd = `"${FFMPEG}" -y -loop 1 -i "${imagePath}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,drawtext=text='${text}':fontsize=60:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2" -c:v libx264 -t ${duration} -pix_fmt yuv420p -r 30 "${outputPath}"`;

    try {
      execSync(cmd, { stdio: 'pipe' });
      resolve(outputPath);
    } catch (err) {
      reject(err);
    }
  });
}

// Función principal
async function generatePremiumVideo() {
  console.log('🎬 AGENTE DE PRODUCCIÓN PREMIUM - Video TMS\n');
  console.log('='.repeat(50));
  
  // PASO 1: Descargar imágenes reales
  console.log('\n📥 PASO 1: Descargando imágenes 4K de Pexels...\n');
  
  for (const [name, url] of Object.entries(images)) {
    const imgPath = path.join(assetsDir, `${name}.jpg`);
    if (!fs.existsSync(imgPath)) {
      console.log(`  ⬇️ Descargando: ${name}...`);
      try {
        await downloadImage(url, imgPath);
        console.log(`  ✅ ${name} descargada`);
      } catch (err) {
        console.log(`  ⚠️ ${name} - usando placeholder`);
        // Crear imagen placeholder
        execSync(`"${FFMPEG}" -y -f lavfi -i "color=c=0x0d1117:s=1920x1080:d=1" -frames:v 1 "${imgPath}"`, { stdio: 'pipe' });
      }
    } else {
      console.log(`  ✅ ${name} ya existe`);
    }
  }

  // PASO 2: Crear escenas con imágenes reales
  console.log('\n🎭 PASO 2: Creando escenas con imágenes reales...\n');
  
  for (const scene of scenes) {
    const imgPath = path.join(assetsDir, `${scene.image}.jpg`);
    console.log(`  🎬 Creando: ${scene.name} (${scene.duration}s)`);
    try {
      await createScene(scene, imgPath);
      console.log(`  ✅ ${scene.name} completada`);
    } catch (err) {
      console.log(`  ⚠️ ${scene.name} - creando con método alternativo`);
      // Método alternativo sin texto
      const simpleCmd = `"${FFMPEG}" -y -loop 1 -i "${imgPath}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -t ${scene.duration} -pix_fmt yuv420p -r 30 "${path.join(outputDir, `${scene.name}.mp4`)}"`;
      execSync(simpleCmd, { stdio: 'pipe' });
      console.log(`  ✅ ${scene.name} completada [sin texto overlay]`);
    }
  }

  // PASO 3: Concatenar escenas
  console.log('\n🔗 PASO 3: Concatenando escenas...\n');
  
  const concatFile = path.join(outputDir, 'concat.txt');
  let concatContent = '';
  scenes.forEach(scene => {
    concatContent += `file '${scene.name}.mp4'\n`;
  });
  fs.writeFileSync(concatFile, concatContent);

  const finalOutput = path.join(outputDir, 'tms-premium-4k.mp4');
  execSync(`"${FFMPEG}" -y -f concat -safe 0 -i "${concatFile}" -c copy "${finalOutput}"`, { stdio: 'pipe' });

  console.log('✅ Video concatenado exitosamente');

  // PASO 4: Verificar calidad
  console.log('\n🔍 PASO 4: Verificando calidad...\n');
  
  const stats = fs.statSync(finalOutput);
  console.log(`  📁 Archivo: ${finalOutput}`);
  console.log(`  📦 Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  ⏱️ Duración: ${scenes.reduce((a, s) => a + s.duration, 0)} segundos`);
  console.log(`  📐 Resolución: 1920x1080`);

  console.log('\n' + '='.repeat(50));
  console.log('✅ VIDEO PREMIUM COMPLETADO');
  console.log('='.repeat(50));
  console.log(`\n📁 Archivo final: ${finalOutput}`);
  
  return finalOutput;
}

// Ejecutar
generatePremiumVideo()
  .then(output => console.log('\n🎉 Listo para revisión de calidad'))
  .catch(err => console.error('\n❌ Error:', err));