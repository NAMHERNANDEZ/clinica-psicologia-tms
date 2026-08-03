const ElevenLabs = require('elevenlabs-node');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'assets', 'audio');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// API Key de ElevenLabs (necesitas crear cuenta gratis en elevenlabs.io)
const API_KEY = process.env.ELEVENLABS_API_KEY || '';

const voiceScript = `
¿La depresión o la ansiedad controlan tu vida?

Millones de personas sufren depresión. Días sin energía, sin ganas de vivir, sin esperanza. Medicamentos que no funcionan, efectos secundarios que empeoran tu calidad de vida.

Y la ansiedad que no te deja dormir, que te paraliza, que te hace sentir que algo terrible va a pasar. Ataques de pánico, preocupación constante, miedo sin razón.

Pero existe una alternativa. La Terapia Magnética Transcraneal. Un tratamiento no invasivo que utiliza campos magnéticos para estimular áreas específicas del cerebro. Sin cirugía, sin anestesia, sin dolor.

Cómo funciona. Una bobina se coloca sobre tu cabeza y genera pulsos magnéticos que activan neuronas en áreas cerebrales responsables de la depresión y la ansiedad. Cada sesión dura treinta a cuarenta y cinco minutos, y puedes retomar tu actividad normal después.

Para la depresión. Mejora el ánimo. Reduce la tristeza. Recupera la energía. Resultados comprobados en pocas sesiones.

Para la ansiedad. Reduce el estrés. Controla los ataques de pánico. Mejora el sueño. Recupera tu calma y tu vida.

Aprobado por las principales autoridades sanitarias del mundo. La FDA en Estados Unidos. COFEPRIS en México. La CE en Unión Europea. Miles de pacientes ya cambiaron su vida con TMS.

¿Depresión o ansiedad? TMS puede ayudarte. Agenda tu consulta hoy. WhatsApp cinco dos, dos tres uno, uno cuarenta y cuatro, veintinueve, cuarenta y uno. Terapia magnética transcraneal.
`.trim();

async function generateNaturalVoice() {
  console.log('🎤 Generando voz natural con ElevenLabs...\n');
  
  if (!API_KEY) {
    console.log('⚠️ No hay API key de ElevenLabs');
    console.log('📋 Necesitas crear una cuenta gratis en: https://elevenlabs.io');
    console.log('📋 Luego ejecuta: $env:ELEVENLABS_API_KEY="tu-key"');
    console.log('📋 Y vuelve a ejecutar este script\n');
    console.log('🔄 Usando Edge TTS como alternativa...\n');
    return generateWithEdgeTTS();
  }

  try {
    const voice = new ElevenLabs({
      apiKey: API_KEY,
      voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel - voz natural femenina
    });

    const outputPath = path.join(outputDir, 'narration-elevenlabs.mp3');
    
    await voice.textToSpeech({
      text: voiceScript,
      voiceId: '21m00Tcm4TlvDq8ikWAM',
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
      outputPath: outputPath
    });

    console.log('✅ Voz natural generada con ElevenLabs');
    console.log(`📁 Archivo: ${outputPath}`);
    return outputPath;
    
  } catch (error) {
    console.log('⚠️ Error con ElevenLabs, usando Edge TTS...');
    return generateWithEdgeTTS();
  }
}

async function generateWithEdgeTTS() {
  const EdgeTTS = require('edge-tts');
  
  const segments = [
    { name: '01-hook', text: '¿La depresión o la ansiedad controlan tu vida?' },
    { name: '02-depresion', text: 'Millones de personas sufren depresión. Días sin energía, sin ganas de vivir, sin esperanza. Medicamentos que no funcionan, efectos secundarios que empeoran tu calidad de vida.' },
    { name: '03-ansiedad', text: 'Y la ansiedad que no te deja dormir, que te paraliza, que te hace sentir que algo terrible va a pasar. Ataques de pánico, preocupación constante, miedo sin razón.' },
    { name: '04-que-es-tms', text: 'Pero existe una alternativa. La Terapia Magnética Transcraneal. Un tratamiento no invasivo que utiliza campos magnéticos para estimular áreas específicas del cerebro. Sin cirugía, sin anestesia, sin dolor.' },
    { name: '05-como-funciona', text: 'Cómo funciona. Una bobina se coloca sobre tu cabeza y genera pulsos magnéticos que activan neuronas en áreas cerebrales responsables de la depresión y la ansiedad. Cada sesión dura treinta a cuarenta y cinco minutos, y puedes retomar tu actividad normal después.' },
    { name: '06-beneficios-dep', text: 'Para la depresión. Mejora el ánimo. Reduce la tristeza. Recupera la energía. Resultados comprobados en pocas sesiones.' },
    { name: '07-beneficios-ans', text: 'Para la ansiedad. Reduce el estrés. Controla los ataques de pánico. Mejora el sueño. Recupera tu calma y tu vida.' },
    { name: '08-credibilidad', text: 'Aprobado por las principales autoridades sanitarias del mundo. La FDA en Estados Unidos. COFEPRIS en México. La CE en Unión Europea. Miles de pacientes ya cambiaron su vida con TMS.' },
    { name: '09-cta', text: '¿Depresión o ansiedad? TMS puede ayudarte. Agenda tu consulta hoy. WhatsApp cinco dos, dos tres uno, uno cuarenta y cuatro, veintinueve, cuarenta y uno. Terapia magnética transcraneal.' }
  ];

  console.log('📦 Generando segmentos de voz con Edge TTS...\n');
  
  for (const segment of segments) {
    const segmentPath = path.join(outputDir, `${segment.name}.mp3`);
    const tts = new EdgeTTS();
    await tts.synthesize(segment.text, 'es-MX-DaliaNeural', { rate: '-5%', pitch: '+0Hz' });
    await tts.toFile(segmentPath);
    console.log(`  ✅ ${segment.name}`);
  }

  // Concatenar todos los segmentos
  const concatFile = path.join(outputDir, 'concat.txt');
  let concatContent = '';
  segments.forEach(s => {
    concatContent += `file '${s.name}.mp3'\n`;
  });
  fs.writeFileSync(concatFile, concatContent);

  const FFMPEG = path.join('C:\\Users\\LENOVO\\Desktop\\clinica-psicologia-tms', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
  const { execSync } = require('child_process');
  
  execSync(`"${FFMPEG}" -y -f concat -safe 0 -i "${concatFile}" -c copy "${path.join(outputDir, 'narration.mp3')}"`, { stdio: 'pipe' });
  
  console.log('\n✅ Voz completa generada');
  return path.join(outputDir, 'narration.mp3');
}

generateNaturalVoice()
  .then(output => console.log(`\n🎉 Voz lista: ${output}`))
  .catch(err => console.error('❌ Error:', err));