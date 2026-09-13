// ============================================
// WELLBEING QUESTIONS — contenido estático de los instrumentos wellbeing
// ============================================
// Solo render en la pantalla de respuestas. El SCORING ocurre EN EL BACKEND
// (/api/assessments/wellbeing/preview y /api/assessments/wellbeing).
// Los valores enviados al backend coinciden con el valor de la opción (value).
// Los item_id DEBEN ser consistentes con los que el backend acepta (cualquier
// string; el backend suma el value por ítem).

export interface WellbeingOption {
  value: number;
  label: string;
}

export interface WellbeingQuestion {
  id: string;
  item_number: number;
  text: string;
  hint?: string;
  options: WellbeingOption[];
}

/** Rango además de max_score del backend para referencia de la UI. */
export const WELLBEING_QUESTION_MAX: Record<string, number> = {
  'stress-pss4': 4,
  'sleep-sq5': 3,
  'wellbeing-who5': 5,
  'activation-gad2': 3,
  'energy-vas3': 10,
  'focus-cfq3': 4,
};

const FREQ_LAST_MONTH_0_4 = [
  { value: 0, label: 'Nunca' },
  { value: 1, label: 'Casi nunca' },
  { value: 2, label: 'A veces' },
  { value: 3, label: 'A menudo' },
  { value: 4, label: 'Muy a menudo' },
];

const SLEEP_0_3 = [
  { value: 0, label: 'Casi siempre' },
  { value: 1, label: 'A menudo' },
  { value: 2, label: 'A veces' },
  { value: 3, label: 'Nunca o casi nunca' },
];

const WHO5_0_5 = [
  { value: 0, label: 'Todo el tiempo' },
  { value: 1, label: 'La mayor parte del tiempo' },
  { value: 2, label: 'Algo más de la mitad del tiempo' },
  { value: 3, label: 'Algo menos de la mitad del tiempo' },
  { value: 4, label: 'Algunas veces' },
  { value: 5, label: 'En ningún momento' },
];

const GAD2_0_3 = [
  { value: 0, label: 'Nada' },
  { value: 1, label: 'Varios días' },
  { value: 2, label: 'Más de la mitad de los días' },
  { value: 3, label: 'Casi todos los días' },
];

const FREQ_0_10 = [
  { value: 0, label: 'Nada' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
  { value: 7, label: '7' },
  { value: 8, label: '8' },
  { value: 9, label: '9' },
  { value: 10, label: 'Siempre / Muy alto' },
];

const FOCUS_0_4 = [
  { value: 0, label: 'Casi nunca' },
  { value: 1, label: 'A veces' },
  { value: 2, label: 'A menudo' },
  { value: 3, label: 'Casi siempre' },
  { value: 4, label: 'Siempre' },
];

export const WELLBEING_QUESTIONS: Record<string, WellbeingQuestion[]> = {
  'stress-pss4': [
    { id: 's1', item_number: 1, text: 'En el último mes, ¿con qué frecuencia te has sentido incapaz de controlar las cosas importantes de tu vida?', options: FREQ_LAST_MONTH_0_4 },
    { id: 's2', item_number: 2, text: 'En el último mes, ¿con qué frecuencia te has sentido seguro/a sobre tu capacidad para manejar tus problemas personales?', options: FREQ_LAST_MONTH_0_4 },
    { id: 's3', item_number: 3, text: 'En el último mes, ¿con qué frecuencia te has sentido que las cosas te salen a tu manera?', options: FREQ_LAST_MONTH_0_4 },
    { id: 's4', item_number: 4, text: 'En el último mes, ¿con qué frecuencia has sentido que las dificultades se acumulan tanto que no puedes superarlas?', options: FREQ_LAST_MONTH_0_4 },
  ],
  'sleep-sq5': [
    { id: 'q1', item_number: 1, text: '¿En general, sientes que duermes lo suficiente para sentirte descansado/a?', options: SLEEP_0_3 },
    { id: 'q2', item_number: 2, text: '¿Te cuesta conciliar el sueño al acostarte?', options: SLEEP_0_3 },
    { id: 'q3', item_number: 3, text: '¿Te despiertas varias veces durante la noche?', options: SLEEP_0_3 },
    { id: 'q4', item_number: 4, text: '¿Te levantas con sensación de sueño reparador?', options: SLEEP_0_3 },
    { id: 'q5', item_number: 5, text: '¿Sientes somnolencia durante el día?', options: SLEEP_0_3 },
  ],
  'wellbeing-who5': [
    { id: 'w1', item_number: 1, text: 'En las últimas 2 semanas... me he sentido alegre y de buen humor.', options: WHO5_0_5 },
    { id: 'w2', item_number: 2, text: 'En las últimas 2 semanas... me he sentido tranquilo y relajado.', options: WHO5_0_5 },
    { id: 'w3', item_number: 3, text: 'En las últimas 2 semanas... me he sentido activo y enérgico.', options: WHO5_0_5 },
    { id: 'w4', item_number: 4, text: 'En las últimas 2 semanas... me he despertado sintiéndome fresco y descansado.', options: WHO5_0_5 },
    { id: 'w5', item_number: 5, text: 'En las últimas 2 semanas... mi vida cotidiana ha estado llena de cosas que me interesan.', options: WHO5_0_5 },
  ],
  'activation-gad2': [
    { id: 'g1', item_number: 1, text: 'En las últimas 2 semanas, ¿con qué frecuencia te has sentido nervioso/a, ansioso/a o con los nervios de punta?', options: GAD2_0_3 },
    { id: 'g2', item_number: 2, text: 'En las últimas 2 semanas, ¿con qué frecuencia no has podido dejar de preocuparte?', options: GAD2_0_3 },
  ],
  'energy-vas3': [
    { id: 'e1', item_number: 1, text: '¿Cómo calificas tu nivel de energía en este momento?', hint: '0 = nada de energía, 10 = mucha energía', options: FREQ_0_10 },
    { id: 'e2', item_number: 2, text: '¿Cómo calificas tu vitalidad general hoy?', hint: '0 = muy baja, 10 = muy alta', options: FREQ_0_10 },
    { id: 'e3', item_number: 3, text: '¿Sientes que tienes fuerzas para tus actividades cotidianas?', hint: '0 = ninguna, 10 = completamente', options: FREQ_0_10 },
  ],
  'focus-cfq3': [
    { id: 'f1', item_number: 1, text: 'En la última semana, ¿te ha costado mantener la concentración en una sola tarea?', options: FOCUS_0_4 },
    { id: 'f2', item_number: 2, text: 'En la última semana, ¿te has distraído con facilidad por estímulos o pensamientos?', options: FOCUS_0_4 },
    { id: 'f3', item_number: 3, text: 'En la última semana, ¿has terminado tus tareas sin dejarlas a la mitad?', options: FOCUS_0_4 },
  ],
};

export function getWellbeingQuestions(scaleId: string): WellbeingQuestion[] {
  return WELLBEING_QUESTIONS[scaleId] || [];
}

export interface WellbeingAnswers {
  [itemId: string]: number | undefined;
}

export function buildResponses(
  scaleId: string,
  answers: WellbeingAnswers
): Array<{ item_id: string; value: number }> {
  const questions = getWellbeingQuestions(scaleId);
  const out: Array<{ item_id: string; value: number }> = [];
  for (const q of questions) {
    const v = answers[q.id];
    if (v !== undefined && Number.isFinite(v)) {
      out.push({ item_id: q.id, value: v });
    }
  }
  return out;
}

export function isWellbeingComplete(scaleId: string, answers: WellbeingAnswers): boolean {
  const questions = getWellbeingQuestions(scaleId);
  return questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);
}