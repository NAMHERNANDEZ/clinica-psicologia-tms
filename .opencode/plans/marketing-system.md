# Plan: Sistema de Marketing Automatizado para Clínica de TMS

## Resumen Ejecutivo

Crear un sistema completo de marketing automatizado que incluya:
1. **Contenido premium** - Videos e imágenes de alta calidad
2. **Publicación automática** - En Instagram, Facebook, TikTok
3. **Respuestas automáticas** - A mensajes de pacientes vía WhatsApp
4. **Gestión de pacientes** - Seguimiento y agendamiento

## Objetivos

| Objetivo | Métrica | Plazo |
|----------|---------|-------|
| Crear video premium | Video de 30s con voz, animaciones, música | 1 semana |
| Crear imagen con IA | Imagen de portada profesional | 1 día |
| Publicar en redes | Automatización en Instagram + Facebook | 1 semana |
| Responder mensajes | Sistema de respuestas automáticas | 1 semana |

## Arquitectura del Sistema

```
marketing/
├── agents/
│   ├── clinica-marketing.md      ← Orquestador principal
│   ├── clinica-content.md        ← Crea contenido premium
│   ├── clinica-publish.md        ← Publica en redes sociales
│   └── clinica-patient.md        ← Responde pacientes
├── scripts/
│   ├── generate-video.sh         ← Genera video premium
│   ├── generate-image.sh         ← Genera imagen con IA
│   ├── publish-all.sh            ← Publica en FB/IG
│   └── auto-respond.sh           ← Responde mensajes
├── assets/
│   ├── audio/                    ← Voces generadas
│   ├── images/                   ← Imágenes IA
│   └── music/                    ← Música profesional
├── output/
│   ├── tms-premium-reels.mp4    ← Video final
│   └── tms-cover-image.jpg      ← Imagen final
└── config/
    ├── upload-post.json          ← Config de publicación
    └── ai-secretary.json         ← Config de respuestas
```

## Herramientas a Usar (100% Gratuitas)

| Herramienta | Para qué | Costo |
|-------------|----------|-------|
| **Gemini AI Studio** | Generar imágenes premium | Gratis |
| **ElevenLabs** | Voz natural en español | Gratis (10K chars/mes) |
| **Remotion** | Animaciones 3D | Gratis (open source) |
| **DaVinci Resolve** | Ensamblaje de video | Gratis |
| **upload-post** | Publicar en redes sociales | Gratis (sin tarjeta) |
| **YouTube Audio Library** | Música profesional | Gratis |

## Flujo de Trabajo

### Fase 1: Crear Contenido
```
1. Script del video → Estructura Hook-Problema-Solución-CTA
2. Generar voz → ElevenLabs crea narración en español
3. Generar imágenes → Gemini crea cerebro, consulta, resultado
4. Crear animaciones → Remotion renderiza 3D con tu modelo
5. Ensamblar video → DaVinea Resolve combina todo
6. Exportar → MP4 optimizado para Instagram/Facebook
```

### Fase 2: Publicar Automáticamente
```
1. Configurar upload-post → Conectar Instagram + Facebook
2. Subir video + imagen → Automáticamente
3. Agregar caption → Texto + hashtags optimizados
4. Programar publicación → Horario pico (12pm-2pm o 7pm-9pm)
5. Monitorear engagement → Respuestas a comentarios
```

### Fase 3: Responder Mensajes
```
1. Configurar AI Secretary → Respuestas predefinidas
2. Detectar preguntas → "¿Cuánto cuesta?", "¿Duele?", etc.
3. Responder automáticamente → Información relevante
4. Agendar consultas → Proceso automatizado
5. Escalar a humano → Cuando es necesario
```

## Contenido del Video Premium (30 segundos)

### Estructura
```
[0-3s]   HOOK: "¿La ansiedad controla tu vida?"
[3-8s]   PROBLEMA: "Medicamentos que no funcionan..."
[8-18s]  SOLUCIÓN: "TMS - Estimulación Magnética Transcraneal"
[18-25s] BENEFICIOS: "No invasivo, sin efectos secundarios"
[25-30s] CTA: "Agenda tu consulta HOY"
```

### Elementos Visuales
- Cerebro 3D con ondas magnéticas cyan
- Animaciones de bobina TMS
- Texto animado premium
- Logo de la clínica
- Colores: Azul marino (#0d1117) + Cyan (#00e5ff) + Blanco

### Audio
- Voz natural en español (ElevenLabs)
- Música de fondo suave (YouTube Audio Library)
- Efectos de sonido sutiles

## Caption para Redes Sociales

```
🧠 ¿Sabías que la Estimulación Magnética Transcraneal (TMS) 
puede ayudarte con la ansiedad y depresión?

✅ No invasivo
✅ Sin efectos secundarios  
✅ Resultados comprobados
✅ Sin medicamentos

📱 Agenda tu consulta HOY
💬 WhatsApp: 52 231 144 2941
🌐 neurocienciaclinica.mx

#TMS #EstimulacionMagnetica #Ansiedad #Depresion 
#SaludMental #Neuromodulacion #ClinicaDePsicologia
```

## Respuestas Automáticas para Pacientes

### Preguntas Frecuentes
| Pregunta | Respuesta |
|----------|-----------|
| "¿Qué es TMS?" | "La Estimulación Magnética Transcraneal es un tratamiento no invasivo que utiliza campos magnéticos para estimular áreas específicas del cerebro." |
| "¿Cuánto cuesta?" | "Los costos varían según el protocolo. Consulta inicial: $500 MXN. Sesión: $800-1,200 MXN. Tratamiento completo: $16,000-36,000 MXN." |
| "¿Duele?" | "No, es completamente indoloro. Los pacientes pueden leer, ver televisión o incluso dormir durante la sesión." |
| "¿Cuánto dura?" | "Cada sesión dura 30-45 minutos. El tratamiento completo es de 20-30 sesiones (4-6 semanas)." |
| "¿Es seguro?" | "Sí, la TMS es segura y aprobada por FDA, COFEPRIS y CE. Efectos secundarios leves y temporales." |

## API Keys Necesarias (GRATIS)

| Servicio | Para qué | Dónde obtener |
|----------|----------|---------------|
| **Gemini** | Generar imágenes | aistudio.google.com |
| **ElevenLabs** | Voz natural | elevenlabs.io |
| **Upload-Post** | Publicar en redes | upload-post.com |
| **Runway** | Video IA (opcional) | runwayml.com |

## Pasos de Implementación

### Semana 1: Crear Contenido
- [ ] Crear script del video premium
- [ ] Generar voz con ElevenLabs
- [ ] Generar imágenes con Gemini
- [ ] Crear animaciones con Remotion
- [ ] Ensamblar video con DaVinci Resolve

### Semana 2: Publicar y Automatizar
- [ ] Configurar upload-post
- [ ] Conectar Instagram + Facebook
- [ ] Publicar primer video
- [ ] Configurar respuestas automáticas
- [ ] Probar sistema completo

## Métricas de Éxito

| Métrica | Objetivo |
|---------|----------|
| Alcance por post | >1000 personas |
| Tasa de engagement | >5% |
| Consultas por semana | >10 |
| Tiempo de respuesta | <1 minuto |

## Condiciones que Promocionamos

- Depresión resistente al tratamiento
- Ansiedad generalizada
- TOC (Trastorno Obsesivo-Compulsivo)
- TEPT (Trastorno de Estrés Postraumático)
- Dolor crónico
- Migraña
- Tabaquismo
- Tinnitus

## Plataformas Objetivo

| Plataforma | Formato | Mejor Horario | Frecuencia |
|------------|---------|---------------|------------|
| Instagram Reels | 15-30 segundos | 12pm-2pm, 7pm-9pm | 3-5 por semana |
| Facebook | 1-3 minutos | 1pm-3pm, 7pm-9pm | 2-3 por semana |
| TikTok | 15-60 segundos | 7pm-10pm | 5-7 por semana |
| WhatsApp | Respuestas automáticas | 24/7 | Automático |

## Próximos Pasos

1. **Aprobar plan** - Confirmar que el usuario aprueba el plan
2. **Crear estructura** - Crear directorios y archivos
3. **Generar contenido** - Crear video, imagen, caption
4. **Configurar automatización** - Conectar redes sociales
5. **Probar sistema** - Verificar que todo funciona
6. **Lanzar** - Empezar a publicar y responder

## Preguntas para el Usuario

1. ¿Apruebas este plan?
2. ¿Tienes ya cuentas de Instagram y Facebook para la clínica?
3. ¿Qué condiciones quieres promocionar primero?
4. ¿Qué presupuesto tienes para herramientas premium (si quieres upgrade)?

---

**Nota:** Este plan está diseñado para ser 100% gratuito con herramientas de alta calidad. Si el usuario quiere resultados aún más premium, se pueden usar herramientas de pago que cuestan entre $17-246/mes.