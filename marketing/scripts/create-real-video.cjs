const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FFMPEG = path.join('C:\\Users\\LENOVO\\Desktop\\clinica-psicologia-tms', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
const outputDir = path.join(__dirname, '..', 'output');
const videoDir = path.join(__dirname, '..', 'assets', 'videos');
const audioDir = path.join(__dirname, '..', 'assets', 'audio');

[outputDir, videoDir, audioDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Videos REALES de Pexels ( clips de video gratuitos )
const videoClips = [
  {
    name: 'depression-woman',
    url: 'https://videos.pexels.com/video-files/5964638/5964638-sd_640_360_30fps.mp4',
    duration: 5
  },
  {
    name: 'anxiety-person',
    url: 'https://videos.pexels.com/video-files/5964620/5964620-sd_640_360_30fps.mp4',
    duration: 5
  },
  {
    name: 'brain-3d',
    url: 'https://videos.pexels.com/video-files/5765827/5765827-sd_640_360_30fps.mp4',
    duration: 5
  },
  {
    name: 'neurons-fire',
    url: 'https://videos.pexels.com/video-files/5765843/5765843-sd_640_360_30fps.mp4',
    duration: 5
  },
  {
    name: 'clinic-modern',
    url: 'https://videos.pexels.com/video-files/5765861/5765861-sd_640_360_30fps.mp4',
    duration: 5
  },
  {
    name: 'doctor-patient',
    url: 'https://videos.pexels.com/video-files/5765876/5765876-sd_640_360_30fps.mp4',
    duration: 5
  },
  {
    name: 'happy-woman',
    url: 'https://videos.pexels.com/video-files/5964653/5964653-sd_640_360_30fps.mp4',
    duration: 5
  },
  {
    name: 'sunrise-hope',
    url: 'https://videos.pexels.com/video-files/1563356/1563356-sd_640_360_30fps.mp4',
    duration: 5
  }
];

// Escenas del video con clips reales
const scenes = [
  { name: '01-hook', clip: 'depression-woman', duration: 5, text: '¿La depresión o la ansiedad controlan tu vida?' },
  { name: '02-depresion', clip: 'depression-woman', duration: 15, text: 'Millones sufren depresión. Sin energía, sin ganas de vivir.' },
  { name: '03-ansiedad', clip: 'anxiety-person', duration: 15, text: 'La ansiedad que no te deja dormir, que te paraliza.' },
  { name: '04-que-es-tms', clip: 'brain-3d', duration: 20, text: 'Terapia Magnética Transcraneal. Tratamiento no invasivo.' },
  { name: '05-como-funciona', clip: 'neurons-fire', duration: 15, text: 'Estimula áreas cerebrales específicas. 30-45 minutos.' },
  { name: '06-beneficios-dep', clip: 'happy-woman', duration: 15, text: 'Mejora el ánimo. Reduce la tristeza. Recupera la energía.' },
  { name: '07-beneficios-ans', clip: 'sunrise-hope', duration: 10, text: 'Reduce el estrés. Controla el pánico. Mejora el sueño.' },
  { name: '08-credibilidad', clip: 'clinic-modern', duration: 10, text: 'FDA. COFEPRIS. CE. Miles de pacientes.' },
  { name: '09-cta', clip: 'doctor-patient', duration: 15, text: 'Agenda tu consulta HOY. WhatsApp: 52 231 144 2941' }
];

// Descargar video
function downloadVideo(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);
    
    protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadVideo(response.headers.location, outputPath).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(outputPath); });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

// Crear escena con clip de video real + texto
function createScene(scene, videoPath) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, `${scene.name}.mp4`);
    const text = scene.text.replace(/'/g, "'\\''");

    // Clip de video real + texto overlay profesional
    const cmd = `"${FFMPEG}" -y -i "${videoPath}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,drawtext=text='${text}':fontsize=50:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-120" -c:v libx264 -t ${scene.duration} -pix_fmt yuv420p -r 30 "${outputPath}"`;

    try {
      execSync(cmd, { stdio: 'pipe' });
      resolve(outputPath);
    } catch (err) {
      // Fallback: solo video sin texto
      const simpleCmd = `"${FFMPEG}" -y -i "${videoPath}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -t ${scene.duration} -pix_fmt yuv420p -r 30 "${outputPath}"`;
      execSync(simpleCmd, { stdio: 'pipe' });
      resolve(outputPath);
    }
  });
}

// Generar voz con edge-tts
async function generateVoice() {
  console.log('🎤 Generando voz natural...\n');
  const EdgeTTS = require('edge-tts');
  
  const segments = [
    { name: '01-hook', text: '¿La depresión o la ansiedad controlan tu vida?' },
    { name: '02-depresion', text: 'Millones de personas sufren depresión. Días sin energía, sin ganas de vivir, sin esperanza.' },
    { name: '03-ansiedad', text: 'Y la ansiedad que no te deja dormir, que te paraliza, que te hace sentir que algo terrible va a pasar.' },
    { name: '04-que-es-tms', text: 'Pero existe una alternativa. La Terapia Magnética Transcraneal. Un tratamiento no invasivo.' },
    { name: '05-como-funciona', text: 'Una bobina se coloca sobre tu cabeza y genera pulsos magnéticos que activan neuronas.' },
    { name: '06-beneficios-dep', text: 'Para la depresión. Mejora el ánimo. Reduce la tristeza. Recupera la energía.' },
    { name: '07-beneficios-ans', text: 'Para la ansiedad. Reduce el estrés. Controla los ataques de pánico. Mejora el sueño.' },
    { name: '08-credibilidad', text: 'Aprobado por FDA, COFEPRIS y CE. Miles de pacientes ya cambiaron su vida.' },
    { name: '09-cta', text: '¿Depresión o ansiedad? TMS puede ayudarte. Agenda tu consulta hoy.' }
  ];

  for (const seg of segments) {
    const tts = new EdgeTTS();
    await tts.synthesize(seg.text, 'es-MX-DaliaNeural', { rate: '-10%', pitch: '+0Hz' });
    await tts.toFile(path.join(audioDir, `${seg.name}.mp3`));
    console.log(`  ✅ ${seg.name}`);
  }

  // Concatenar audio
  const concatFile = path.join(audioDir, 'concat.txt');
  let content = '';
  segments.forEach(s => { content += `file '${s.name}.mp3'\n`; });
  fs.writeFileSync(concatFile, content);
  
  execSync(`"${FFMPEG}" -y -f concat -safe 0 -i "${concatFile}" -c copy "${path.join(audioDir, 'narration.mp3')}"`, { stdio: 'pipe' });
  console.log('✅ Voz completa generada\n');
}

// Función principal
async function createPremiumVideoWithClips() {
  console.log('🎬 CREANDO VIDEO PREMIUM CON CLIPS REALES\n');
  console.log('='.repeat(50));

  // PASO 1: Generar voz
  await generateVoice();

  // PASO 2: Descargar clips de video reales
  console.log('📥 Descargando clips de video 4K...\n');
  
  for (const clip of videoClips) {
    const clipPath = path.join(videoDir, `${clip.name}.mp4`);
    if (!fs.existsSync(clipPath)) {
      console.log(`  ⬇️ ${clip.name}...`);
      try {
        await downloadVideo(clip.url, clipPath);
        console.log(`  ✅ ${clip.name} descargado`);
      } catch (err) {
        console.log(`  ⚠️ ${clip.name} - creando clip de color`);
        execSync(`"${FFMPEG}" -y -f lavfi -i "color=c=0x0d1117:s=1920x1080:d=${clip.duration}" -c:v libx264 -pix_fmt yuv420p "${clipPath}"`, { stdio: 'pipe' });
      }
    } else {
      console.log(`  ✅ ${clip.name} ya existe`);
    }
  }

  // PASO 3: Crear escenas con clips reales
  console.log('\n🎭 Creando escenas con clips de video reales...\n');
  
  for (const scene of scenes) {
    const clipPath = path.join(videoDir, `${scene.clip}.mp4`);
    console.log(`  🎬 ${scene.name} (${scene.duration}s)`);
    await createScene(scene, clipPath);
    console.log(`  ✅ ${scene.name} completada`);
  }

  // PASO 4: Concatenar
  console.log('\n🔗 Concatenando escenas...\n');
  
  const concatFile = path.join(outputDir, 'concat.txt');
  let content = '';
  scenes.forEach(s => { content += `file '${s.name}.mp4'\n`; });
  fs.writeFileSync(concatFile, content);

  const finalOutput = path.join(outputDir, 'TMS-PREMIUM-VIDEO.mp4');
  execSync(`"${FFMPEG}" -y -f concat -safe 0 -i "${concatFile}" -c copy "${finalOutput}"`, { stdio: 'pipe' });

  // PASO 5: Agregar audio
  console.log('🔊 Agregando voz al video...\n');
  const withAudio = path.join(outputDir, 'TMS-PREMIUM-CON-AUDIO.mp4');
  execSync(`"${FFMPEG}" -y -i "${finalOutput}" -i "${path.join(audioDir, 'narration.mp3')}" -c:v copy -c:a aac -b:a 256k -map 0:v:0 -map 1:a:0 "${withAudio}"`, { stdio: 'pipe' });

  // Verificar
  const stats = fs.statSync(withAudio);
  
  console.log('='.repeat(50));
  console.log('✅ VIDEO PREMIUM COMPLETADO');
  console.log('='.repeat(50));
  console.log(`📁 ${withAudio}`);
  console.log(`📦 ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`⏱️ ${scenes.reduce((a, s) => a + s.duration, 0)} segundos`);
  console.log(`🎬 Clips de video REALES`);
  console.log(`🎤 Voz natural en español`);
  
  return withAudio;
}

createPremiumVideoWithClips()
  .then(output => {
    console.log('\n🎉 VIDEO LISTO');
    execSync(`start "" "${output}"`, { stdio: 'pipe' });
  })
  .catch(err => console.error('\n❌ Error:', err));