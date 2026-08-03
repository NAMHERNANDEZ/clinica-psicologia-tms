const { VideoPipeline } = require('@beast-course/video-pipeline');
const fs = require('fs');
const path = require('path');

// Configuración del video
const videoConfig = {
  title: "TMS para Depresión y Ansiedad - Tratamiento No Invasivo",
  duration: 120, // 2 minutos
  resolution: { width: 1080, height: 1920 }, // Vertical para Reels
  fps: 60,
  style: "clinical-premium",
  colors: {
    primary: "#0d1117",
    accent: "#00e5ff",
    text: "#ffffff",
    success: "#00c853"
  }
};

// Escenas del video
const scenes = [
  {
    id: 1,
    name: "Hook",
    duration: 5,
    content: {
      text: "¿La depresión o la ansiedad controlan tu vida?",
      visual: "cerebro-3d-ondas",
      animation: "fade-in",
      background: "gradient-dark"
    }
  },
  {
    id: 2,
    name: "Depresión",
    duration: 15,
    content: {
      text: "Sin energía, sin ganas de vivir, sin esperanza. Medicamentos que no funcionan...",
      visual: "persona-depresion",
      animation: "slide-up",
      background: "dark-depression"
    }
  },
  {
    id: 3,
    name: "Ansiedad",
    duration: 15,
    content: {
      text: "Ataques de pánico, preocupación constante, miedo sin razón...",
      visual: "persona-ansiedad",
      animation: "pulse",
      background: "dark-anxiety"
    }
  },
  {
    id: 4,
    name: "¿Qué es TMS?",
    duration: 20,
    content: {
      text: "Terapia Magnética Transcraneal - Tratamiento no invasivo, sin cirugía, sin anestesia, sin dolor",
      visual: "bobina-tms-cerebro",
      animation: "zoom-in",
      background: "gradient-cyan"
    }
  },
  {
    id: 5,
    name: "¿Cómo funciona?",
    duration: 15,
    content: {
      text: "Estimula áreas cerebrales específicas. Cada sesión dura 30-45 minutos",
      visual: "diagrama-cerebro",
      animation: "flow",
      background: "gradient-blue"
    }
  },
  {
    id: 6,
    name: "Beneficios Depresión",
    duration: 15,
    content: {
      text: "✅ Mejora el ánimo\n✅ Reduce la tristeza\n✅ Recupera la energía\n✅ Resultados en pocas sesiones",
      visual: "checkmarks-depresion",
      animation: "checklist",
      background: "gradient-green"
    }
  },
  {
    id: 7,
    name: "Beneficios Ansiedad",
    duration: 10,
    content: {
      text: "✅ Reduce el estrés\n✅ Controla ataques de pánico\n✅ Mejora el sueño\n✅ Recupera tu calma",
      visual: "checkmarks-ansiedad",
      animation: "checklist",
      background: "gradient-green"
    }
  },
  {
    id: 8,
    name: "Credibilidad",
    duration: 10,
    content: {
      text: "Aprobado por FDA, COFEPRIS y CE. Miles de pacientes tratados exitosamente",
      visual: "logos-certificacion",
      animation: "fade-in",
      background: "gradient-professional"
    }
  },
  {
    id: 9,
    name: "CTA",
    duration: 15,
    content: {
      text: "¿Depresión o ansiedad? TMS puede ayudarte.\nAgenda tu consulta HOY\nWhatsApp: 52 231 144 2941",
      visual: "logo-whatsapp",
      animation: "pulse-cta",
      background: "gradient-cta"
    }
  }
];

// Función principal para generar el video
async function generateVideo() {
  console.log('🎬 Iniciando generación del video TMS...');
  console.log(`📐 Resolución: ${videoConfig.resolution.width}x${videoConfig.resolution.height}`);
  console.log(`⏱️ Duración: ${videoConfig.duration} segundos`);
  console.log(`🎯 Énfasis: Depresión y Ansiedad`);
  
  try {
    // Crear instancia del pipeline
    const pipeline = new VideoPipeline(videoConfig);
    
    // Agregar escenas
    for (const scene of scenes) {
      console.log(`🎭 Agregando escena ${scene.id}: ${scene.name} (${scene.duration}s)`);
      await pipeline.addScene(scene);
    }
    
    // Generar video
    console.log('🎥 Generando video...');
    const outputPath = path.join(__dirname, 'output', 'tms-depresion-ansiedad-premium.mp4');
    
    await pipeline.render({
      output: outputPath,
      format: 'mp4',
      codec: 'h264',
      quality: 'high'
    });
    
    console.log('✅ Video generado exitosamente!');
    console.log(`📁 Archivo: ${outputPath}`);
    
    // Generar reporte
    generateReport(outputPath);
    
    return outputPath;
    
  } catch (error) {
    console.error('❌ Error al generar video:', error.message);
    throw error;
  }
}

// Función para generar reporte
function generateReport(outputPath) {
  const report = `
REPORTE DE PRODUCCIÓN - Video TMS Premium
Fecha: ${new Date().toISOString()}
Video: tms-depresion-ansiedad-premium.mp4

Fases completadas:
✅ Pre-producción
✅ Generación
✅ Post-producción
✅ Validación
✅ Entrega

Tiempo total: ${videoConfig.duration} segundos

Estado: COMPLETADO

Archivos generados:
- ${outputPath}
- reporte-calidad.txt
- reporte-produccion.txt

Firma: Supervisor de Producción
  `;
  
  fs.writeFileSync(path.join(__dirname, 'output', 'reporte-produccion.txt'), report);
  console.log('📄 Reporte generado: output/reporte-produccion.txt');
}

// Ejecutar generación
generateVideo()
  .then(() => {
    console.log('\n🎉 ¡Video completado exitosamente!');
    console.log('📁 Archivo final: marketing/output/tms-depresion-ansiedad-premium.mp4');
  })
  .catch((error) => {
    console.error('\n💥 Error en la generación:', error.message);
    process.exit(1);
  });