export interface ScaleItem {
  id: string;
  text: string;
  options: { value: number; label: string }[];
}

export interface ScaleDefinition {
  id: string;
  name: string;
  fullName: string;
  description: string;
  condition: string;
  maxScore: number;
  items: ScaleItem[];
  interpretation: { max: number; label: string; color: string }[];
  timeToComplete: string;
  source: string;
}

export const CLINICAL_SCALES: Record<string, ScaleDefinition> = {
  phq9: {
    id: 'phq9',
    name: 'PHQ-9',
    fullName: 'Patient Health Questionnaire-9',
    description: 'Screening de depresión. 9 ítems, cada uno 0-3.',
    condition: 'Depresión, Ansiedad, TEPT',
    maxScore: 27,
    timeToComplete: '~2 min',
    source: 'Kroenke et al., 2001',
    items: [
      { id: 'phq9_1', text: 'Poco interés o placer en hacer cosas', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Varios días' }, { value: 2, label: 'Más de la mitad' }, { value: 3, label: 'Casi todos' }] },
      { id: 'phq9_2', text: 'Sentirse deprimido, decaído o sin esperanza', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Varios días' }, { value: 2, label: 'Más de la mitad' }, { value: 3, label: 'Casi todos' }] },
      { id: 'phq9_3', text: 'Dificultad para dormir o dormir demasiado', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Varios días' }, { value: 2, label: 'Más de la mitad' }, { value: 3, label: 'Casi todos' }] },
      { id: 'phq9_4', text: 'Sentirse cansado o con poca energía', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Varios días' }, { value: 2, label: 'Más de la mitad' }, { value: 3, label: 'Casi todos' }] },
      { id: 'phq9_5', text: 'Poco apetito o comer en exceso', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Varios días' }, { value: 2, label: 'Más de la mitad' }, { value: 3, label: 'Casi todos' }] },
      { id: 'phq9_6', text: 'Sentirse mal consigo mismo o que es un fracaso', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Varios días' }, { value: 2, label: 'Más de la mitad' }, { value: 3, label: 'Casi todos' }] },
      { id: 'phq9_7', text: 'Dificultad para concentrarse (leer, ver TV)', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Varios días' }, { value: 2, label: 'Más de la mitad' }, { value: 3, label: 'Casi todos' }] },
      { id: 'phq9_8', text: 'Moverse o hablar lentamente, o estar inquieto', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Varios días' }, { value: 2, label: 'Más de la mitad' }, { value: 3, label: 'Casi todos' }] },
      { id: 'phq9_9', text: 'Pensar en hacerse daño o que sería mejor estar muerto', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Varios días' }, { value: 2, label: 'Más de la mitad' }, { value: 3, label: 'Casi todos' }] },
    ],
    interpretation: [
      { max: 4, label: 'Mínima', color: '#22C55E' },
      { max: 9, label: 'Leve', color: '#84CC16' },
      { max: 14, label: 'Moderada', color: '#F59E0B' },
      { max: 19, label: 'Moderadamente severa', color: '#F97316' },
      { max: 27, label: 'Severa', color: '#EF4444' },
    ],
  },

  gad7: {
    id: 'gad7',
    name: 'GAD-7',
    fullName: 'Generalized Anxiety Disorder-7',
    description: 'Screening de ansiedad generalizada. 7 ítems, cada uno 0-3.',
    condition: 'Ansiedad Generalizada',
    maxScore: 21,
    timeToComplete: '~1.5 min',
    source: 'Spitzer et al., 2006',
    items: [
      { id: 'gad7_1', text: 'Sentirse nervioso, ansioso o al límite', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Varios días' }, { value: 2, label: 'Más de la mitad' }, { value: 3, label: 'Casi todos' }] },
      { id: 'gad7_2', text: 'No poder dejar de preocuparse o controlar la preocupación', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Varios días' }, { value: 2, label: 'Más de la mitad' }, { value: 3, label: 'Casi todos' }] },
      { id: 'gad7_3', text: 'Preocuparse demasiado por diversas cosas', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Varios días' }, { value: 2, label: 'Más de la mitad' }, { value: 3, label: 'Casi todos' }] },
      { id: 'gad7_4', text: 'Dificultad para relajarse', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Varios días' }, { value: 2, label: 'Más de la mitad' }, { value: 3, label: 'Casi todos' }] },
      { id: 'gad7_5', text: 'Estar tan inquieto que es difícil quedarse quieto', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Varios días' }, { value: 2, label: 'Más de la mitad' }, { value: 3, label: 'Casi todos' }] },
      { id: 'gad7_6', text: 'Sentirse irritable o de mal humor', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Varios días' }, { value: 2, label: 'Más de la mitad' }, { value: 3, label: 'Casi todos' }] },
      { id: 'gad7_7', text: 'Sentir miedo como si pudiera pasar algo terrible', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Varios días' }, { value: 2, label: 'Más de la mitad' }, { value: 3, label: 'Casi todos' }] },
    ],
    interpretation: [
      { max: 4, label: 'Mínima', color: '#22C55E' },
      { max: 9, label: 'Leve', color: '#84CC16' },
      { max: 14, label: 'Moderada', color: '#F59E0B' },
      { max: 21, label: 'Severa', color: '#EF4444' },
    ],
  },

  ybocs: {
    id: 'ybocs',
    name: 'Y-BOCS',
    fullName: 'Yale-Brown Obsessive Compulsive Scale',
    description: 'Evaluación de TOC. 10 ítems, cada uno 0-4.',
    condition: 'TOC',
    maxScore: 40,
    timeToComplete: '~5 min',
    source: 'Goodman et al., 1989',
    items: [
      { id: 'ybocs_1', text: 'Tiempo total dedicado a obsesiones/compulsiones', options: [{ value: 0, label: 'Ninguno' }, { value: 1, label: '<1h/día' }, { value: 2, label: '1-3h/día' }, { value: 3, label: '3-8h/día' }, { value: 4, label: '>8h/día' }] },
      { id: 'ybocs_2', text: 'Interferencia en la vida diaria por obsesiones/compulsiones', options: [{ value: 0, label: 'Ninguna' }, { value: 1, label: 'Leve' }, { value: 2, label: 'Moderada' }, { value: 3, label: 'Severa' }, { value: 4, label: 'Extrema' }] },
      { id: 'ybocs_3', text: 'Malestar causado por obsesiones/compulsiones', options: [{ value: 0, label: 'Ninguno' }, { value: 1, label: 'Leve' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Severo' }, { value: 4, label: 'Extremo' }] },
      { id: 'ybocs_4', text: 'Esfuerzo para resistir obsesiones/compulsiones', options: [{ value: 0, label: 'Siempre' }, { value: 1, label: 'La mayoría' }, { value: 2, label: 'A veces' }, { value: 3, label: 'Raramente' }, { value: 4, label: 'Nunca' }] },
      { id: 'ybocs_5', text: 'Capacidad para controlar obsesiones/compulsiones', options: [{ value: 0, label: 'Total' }, { value: 1, label: 'Buen control' }, { value: 2, label: 'Control moderado' }, { value: 3, label: 'Poco control' }, { value: 4, label: 'Ningún control' }] },
      { id: 'ybocs_6', text: 'Evitación de situaciones por obsesiones', options: [{ value: 0, label: 'Ninguna' }, { value: 1, label: 'Leve' }, { value: 2, label: 'Moderada' }, { value: 3, label: 'Severa' }, { value: 4, label: 'Extrema' }] },
      { id: 'ybocs_7', text: 'Evitación de situaciones por obsesiones (2)', options: [{ value: 0, label: 'Ninguna' }, { value: 1, label: 'Leve' }, { value: 2, label: 'Moderada' }, { value: 3, label: 'Severa' }, { value: 4, label: 'Extrema' }] },
      { id: 'ybocs_8', text: 'Placer al realizar compulsiones', options: [{ value: 0, label: 'Mucho' }, { value: 1, label: 'Algo' }, { value: 2, label: 'Neutral' }, { value: 3, label: 'Poco' }, { value: 4, label: 'Ninguno' }] },
      { id: 'ybocs_9', text: 'Ansiedad al no realizar compulsiones', options: [{ value: 0, label: 'Ninguna' }, { value: 1, label: 'Leve' }, { value: 2, label: 'Moderada' }, { value: 3, label: 'Severa' }, { value: 4, label: 'Extrema' }] },
      { id: 'ybocs_10', text: 'Dificultad para dejar de compulsiones', options: [{ value: 0, label: 'Ninguna' }, { value: 1, label: 'Leve' }, { value: 2, label: 'Moderada' }, { value: 3, label: 'Severa' }, { value: 4, label: 'Extrema' }] },
    ],
    interpretation: [
      { max: 7, label: 'Subclínico', color: '#22C55E' },
      { max: 15, label: 'Leve', color: '#84CC16' },
      { max: 23, label: 'Moderado', color: '#F59E0B' },
      { max: 31, label: 'Severo', color: '#F97316' },
      { max: 40, label: 'Extremo', color: '#EF4444' },
    ],
  },

  vas: {
    id: 'vas',
    name: 'VAS',
    fullName: 'Visual Analog Scale',
    description: 'Evaluación de dolor. Escala visual 0-10.',
    condition: 'Dolor, Migraña, Fibromialgia, Tinnitus',
    maxScore: 10,
    timeToComplete: '~10 seg',
    source: 'OMS / IASP',
    items: [
      { id: 'vas_1', text: 'Nivel de dolor actual (0 = sin dolor, 10 = peor dolor imaginable)', options: [{ value: 0, label: '0' }, { value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }, { value: 5, label: '5' }, { value: 6, label: '6' }, { value: 7, label: '7' }, { value: 8, label: '8' }, { value: 9, label: '9' }, { value: 10, label: '10' }] },
    ],
    interpretation: [
      { max: 3, label: 'Dolor leve', color: '#22C55E' },
      { max: 6, label: 'Dolor moderado', color: '#F59E0B' },
      { max: 10, label: 'Dolor severo', color: '#EF4444' },
    ],
  },

  psqi: {
    id: 'psqi',
    name: 'PSQI',
    fullName: 'Pittsburgh Sleep Quality Index',
    description: 'Calidad del sueño. 7 componentes, cada uno 0-3.',
    condition: 'Insomnio',
    maxScore: 21,
    timeToComplete: '~3 min',
    source: 'Buysse et al., 1989',
    items: [
      { id: 'psqi_1', text: 'Calidad del sueño subjetiva', options: [{ value: 0, label: 'Muy buena' }, { value: 1, label: 'Bastante buena' }, { value: 2, label: 'Bastante mala' }, { value: 3, label: 'Muy mala' }] },
      { id: 'psqi_2', text: 'Latencia del sueño (tiempo para dormirse)', options: [{ value: 0, label: '<15 min' }, { value: 1, label: '15-30 min' }, { value: 2, label: '31-60 min' }, { value: 3, label: '>60 min' }] },
      { id: 'psqi_3', text: 'Duración del sueño', options: [{ value: 0, label: '>7h' }, { value: 1, label: '6-7h' }, { value: 2, label: '5-6h' }, { value: 3, label: '<5h' }] },
      { id: 'psqi_4', text: 'Eficiencia del sueño (% tiempo dormido vs cama)', options: [{ value: 0, label: '>85%' }, { value: 1, label: '75-84%' }, { value: 2, label: '65-74%' }, { value: 3, label: '<65%' }] },
      { id: 'psqi_5', text: 'Trastornos del sueño (despertares nocturnos)', options: [{ value: 0, label: 'Ninguno' }, { value: 1, label: 'Leve' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Severo' }] },
      { id: 'psqi_6', text: 'Uso de medicamentos para dormir', options: [{ value: 0, label: 'Ninguno' }, { value: 1, label: '<1 vez/sem' }, { value: 2, label: '1-2 veces/sem' }, { value: 3, label: '≥3 veces/sem' }] },
      { id: 'psqi_7', text: 'Problemas de funcionalidad diurna por sueño', options: [{ value: 0, label: 'Ninguno' }, { value: 1, label: 'Leve' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Severo' }] },
    ],
    interpretation: [
      { max: 5, label: 'Buen sueño', color: '#22C55E' },
      { max: 10, label: 'Alteración leve', color: '#F59E0B' },
      { max: 15, label: 'Alteración moderada', color: '#F97316' },
      { max: 21, label: 'Alteración severa', color: '#EF4444' },
    ],
  },

  ftnd: {
    id: 'ftnd',
    name: 'FTND',
    fullName: 'Fagerström Test for Nicotine Dependence',
    description: 'Dependencia a la nicotina. 6 ítems.',
    condition: 'Tabaquismo',
    maxScore: 10,
    timeToComplete: '~1 min',
    source: 'Fagerström & Schneider, 1989',
    items: [
      { id: 'ftnd_1', text: '¿Cuántos cigarrillos fuma al día?', options: [{ value: 0, label: '≤10' }, { value: 1, label: '11-20' }, { value: 2, label: '21-30' }, { value: 3, label: '>30' }] },
      { id: 'ftnd_2', text: '¿Qué hora es el primer cigarrillo de la mañana?', options: [{ value: 0, label: '>60 min' }, { value: 1, label: '31-60 min' }, { value: 2, label: '6-30 min' }, { value: 3, label: '<5 min' }] },
      { id: 'ftnd_3', text: '¿Le costaría no fumar en lugares prohibidos?', options: [{ value: 0, label: 'No' }, { value: 1, label: 'Sí' }] },
      { id: 'ftnd_4', text: '¿Qué cigarrillo le costaría más abandonar?', options: [{ value: 0, label: 'El primero' }, { value: 1, label: 'Cualquier otro' }] },
      { id: 'ftnd_5', text: '¿Fuma más por la mañana?', options: [{ value: 0, label: 'No' }, { value: 1, label: 'Sí' }] },
      { id: 'ftnd_6', text: '¿Fuma aunque esté enfermo en cama?', options: [{ value: 0, label: 'No' }, { value: 1, label: 'Sí' }] },
    ],
    interpretation: [
      { max: 2, label: 'Baja dependencia', color: '#22C55E' },
      { max: 4, label: 'Dependencia moderada', color: '#F59E0B' },
      { max: 6, label: 'Dependencia alta', color: '#F97316' },
      { max: 10, label: 'Dependencia muy alta', color: '#EF4444' },
    ],
  },

  thi: {
    id: 'thi',
    name: 'THI',
    fullName: 'Tinnitus Handicap Inventory',
    description: 'Impacto del tinnitus. 25 ítems, cada uno 0-4.',
    condition: 'Tinnitus',
    maxScore: 100,
    timeToComplete: '~5 min',
    source: 'Newman et al., 1996',
    items: [
      { id: 'thi_1', text: 'El zumbido dificulta concentrarse', options: [{ value: 0, label: 'Nada' }, { value: 2, label: 'Leve' }, { value: 4, label: 'Moderado' }] },
      { id: 'thi_2', text: 'El zumbido me impide escuchar a otras personas', options: [{ value: 0, label: 'Nada' }, { value: 2, label: 'Leve' }, { value: 4, label: 'Moderado' }] },
      { id: 'thi_3', text: 'El zumbido me causa enojo', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_4', text: 'El zumbido me confunde', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_5', text: 'El zumbido me deprime', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_6', text: 'El zumbido me hace sentir desesperanzado', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_7', text: 'El zumbido me impide dormir', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 8, label: 'Siempre' }] },
      { id: 'thi_8', text: 'El zumbido me impide disfrutar la vida', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_9', text: 'El zumbido me impide社交', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_10', text: 'El zumbido me dificulta trabajar', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_11', text: 'El zumbido me impide relajarme', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 8, label: 'Siempre' }] },
      { id: 'thi_12', text: 'El zumbido me causa estrés', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_13', text: 'El zumbido me hace sentir triste', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_14', text: 'El zumbido me hace sentir ansioso', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_15', text: 'El zumbido me hace sentir irritable', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_16', text: 'El zumbido me impide leer', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_17', text: 'El zumbido me impide ver películas/TV', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_18', text: 'El zumbido me impide salir de noche', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_19', text: 'El zumbido me impide viajar en auto', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_20', text: 'El zumbido me impide hacer ejercicio', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_21', text: 'El zumbido me impide relaciones íntimas', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_22', text: 'El zumbido me dificulta escuchar música', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_23', text: 'El zumbido me impide disfrutar comida', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_24', text: 'El zumbido me hace sentir cansado', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
      { id: 'thi_25', text: 'El zumbido me impide disfrutar la vida social', options: [{ value: 0, label: 'Nada' }, { value: 4, label: 'A veces' }, { value: 6, label: 'Siempre' }] },
    ],
    interpretation: [
      { max: 16, label: 'Leve', color: '#22C55E' },
      { max: 36, label: 'Moderado', color: '#F59E0B' },
      { max: 56, label: 'Severo', color: '#F97316' },
      { max: 100, label: 'Catastrófico', color: '#EF4444' },
    ],
  },

  pcl5: {
    id: 'pcl5',
    name: 'PCL-5',
    fullName: 'PTSD Checklist for DSM-5',
    description: 'Evaluación de TEPT. 20 ítems, cada uno 0-4.',
    condition: 'TEPT',
    maxScore: 80,
    timeToComplete: '~5 min',
    source: 'Weathers et al., 2013',
    items: [
      { id: 'pcl5_1', text: 'Recuerdos repetidos, intrusivos y desagradables del evento', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_2', text: 'Sueños repetidos y desagradables del evento', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_3', text: 'Actuar o sentir como si el evento estuviera ocurriendo', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_4', text: 'Malestar intenso al recordar el evento', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_5', text: 'Reacciones físicas al recordar el evento', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_6', text: 'Evitar recuerdos del evento', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_7', text: 'Evitar pensamientos del evento', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_8', text: 'Evitar situaciones que le recuerden el evento', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_9', text: 'Dificultad para recordar partes del evento', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_10', text: 'Creencias negativas sobre uno mismo u otros', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_11', text: 'Culparse a uno mismo por el evento', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_12', text: 'Emociones negativas intensas (miedo, horror, ira)', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_13', text: 'Pérdida de interés en actividades placenteras', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_14', text: 'Sentirse distanciado de otros', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_15', text: 'Dificultad para experimentar emociones positivas', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_16', text: 'Problemas de sueño', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_17', text: 'Irritabilidad o arrebatos de ira', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_18', text: 'Dificultad para concentrarse', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_19', text: 'Hipervigilancia', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
      { id: 'pcl5_20', text: 'Sobresalto fácil', options: [{ value: 0, label: 'Nada' }, { value: 1, label: 'Un poco' }, { value: 2, label: 'Moderado' }, { value: 3, label: 'Bastante' }, { value: 4, label: 'Extremo' }] },
    ],
    interpretation: [
      { max: 30, label: 'Síntomas leves', color: '#22C55E' },
      { max: 50, label: 'Síntomas moderados', color: '#F59E0B' },
      { max: 65, label: 'Síntomas severos', color: '#F97316' },
      { max: 80, label: 'Síntomas muy severos', color: '#EF4444' },
    ],
  },
};

export function getScaleById(id: string): ScaleDefinition | undefined {
  return CLINICAL_SCALES[id];
}

export function getAllScales(): ScaleDefinition[] {
  return Object.values(CLINICAL_SCALES);
}

export function getScalesForCondition(condition: string): ScaleDefinition[] {
  const conditionLower = condition.toLowerCase();
  return Object.values(CLINICAL_SCALES).filter(s =>
    s.condition.toLowerCase().includes(conditionLower)
  );
}

export function interpretScale(scaleId: string, score: number): { label: string; color: string; severity: number } {
  const scale = CLINICAL_SCALES[scaleId];
  if (!scale) return { label: 'Desconocido', color: '#6B7280', severity: 0 };

  for (const tier of scale.interpretation) {
    if (score <= tier.max) {
      return { label: tier.label, color: tier.color, severity: score / scale.maxScore };
    }
  }

  const last = scale.interpretation[scale.interpretation.length - 1];
  return { label: last.label, color: last.color, severity: 1 };
}

export function getRemissionThreshold(scaleId: string): number | null {
  const thresholds: Record<string, number> = {
    phq9: 4,
    gad7: 4,
    ybocs: 7,
    psqi: 5,
    ftnd: 2,
    pcl5: 30,
  };
  return thresholds[scaleId] ?? null;
}

export function getResponseThreshold(scaleId: string): number | null {
  const thresholds: Record<string, number> = {
    phq9: 0.5,
    gad7: 0.5,
    ybocs: 0.35,
    psqi: 0.3,
  };
  return thresholds[scaleId] ?? null;
}
