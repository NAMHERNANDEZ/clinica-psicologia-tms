const EdgeTTS = require('edge-tts');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'assets', 'audio');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Script completo del video - 2 minutos
const script = `
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

async function generateVoice() {
  console.log('🎤 Generando voz en español con Edge TTS...\n');
  
  const voice = new EdgeTTS({
    voice: 'es-MX-DaliaNeural', // Voz mexicana femenina
    rate: '-5%', // Velocidad ligeramente más lenta para claridad
    pitch: '+0Hz'
  });

  const outputPath = path.join(outputDir, 'narration.mp3');
  
  await voice.toFile(outputPath, script);
  
  console.log('✅ Voz generada exitosamente');
  console.log(`📁 Archivo: ${outputPath}`);
  
  // Generar segmentos individuales para cada escena
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

  console.log('\n📦 Generando segmentos individuales...');
  
  for (const segment of segments) {
    const segmentPath = path.join(outputDir, `${segment.name}.mp3`);
    const segmentTTS = new EdgeTTS({
      voice: 'es-MX-DaliaNeural',
      rate: '-5%',
      pitch: '+0Hz'
    });
    await segmentTTS.toFile(segmentPath, segment.text);
    console.log(`  ✅ ${segment.name}`);
  }

  console.log('\n✅ Todos los segmentos generados');
}

generateVoice()
  .then(() => console.log('\n🎉 Voz lista para el video'))
  .catch(err => console.error('❌ Error:', err.message));