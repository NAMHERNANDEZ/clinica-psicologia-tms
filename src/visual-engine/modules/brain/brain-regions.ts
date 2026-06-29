import type { BrainRegionId } from '../../core/StateMapper';

export interface BrainRegion {
  id: BrainRegionId;
  label: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  side: 'left' | 'right' | 'mid';
  brainFunction: string;
  indications: string[];
  tmsFrequency: string;
  description: string;
}

export const BRAIN_REGIONS: BrainRegion[] = [
  {
    id: 'prefrontal_left', label: 'DLPFC Izquierdo', cx: 185, cy: 105, rx: 22, ry: 18, side: 'left',
    brainFunction: 'Regulación emocional, funciones ejecutivas, memoria de trabajo',
    indications: ['Depresión mayor', 'Ansiedad generalizada', 'TOC', 'TDAH', 'Esquizofrenia'],
    tmsFrequency: 'Alta (10-20 Hz)',
    description: 'Dorsolateral prefrontal — objetivo principal en TMS para depresión. Estimulación del hemisferio izquierdo.',
  },
  {
    id: 'prefrontal_right', label: 'DLPFC Derecho', cx: 315, cy: 105, rx: 22, ry: 18, side: 'right',
    brainFunction: 'Regulación inhibitoria, control de impulsos, atención',
    indications: ['Ansiedad', 'Agitación psicomotora', 'Insomnio', 'Manía'],
    tmsFrequency: 'Baja (1 Hz)',
    description: 'Hemisferio dominante para inhibición. Estimulación de baja frecuencia reduce excitabilidad.',
  },
  {
    id: 'dorsal_acc', label: 'Corteza Cingulada Dorsal', cx: 250, cy: 140, rx: 18, ry: 14, side: 'mid',
    brainFunction: 'Atención, regulación emocional, procesamiento del dolor, toma de decisiones',
    indications: ['Depresión resistente', 'Dolor crónico', 'TOC', 'Adicciones', 'Neuropatía'],
    tmsFrequency: 'Alta (10 Hz)',
    description: 'Nodo central del default mode network. Conecta corteza prefrontal con regiones límbicas.',
  },
  {
    id: 'motor_cortex_left', label: 'Corteza Motora Primaria Izq.', cx: 175, cy: 170, rx: 20, ry: 16, side: 'left',
    brainFunction: 'Control motor contralateral, coordinación fina, lenguaje motor',
    indications: ['Dolor crónico neuropático', 'Rehabilitación motora', 'Migraña', 'Fibromialgia'],
    tmsFrequency: 'Alta (10 Hz) / Baja (1 Hz)',
    description: 'M1 — aquí se mide el umbral motor. Representación somatotópica del cuerpo.',
  },
  {
    id: 'motor_cortex_right', label: 'Corteza Motora Primaria Der.', cx: 325, cy: 170, rx: 20, ry: 16, side: 'right',
    brainFunction: 'Control motor contralateral, espacialidad motora',
    indications: ['Dolor crónico', 'Rehabilitación motora', 'Espasticidad', 'Hemiplejia'],
    tmsFrequency: 'Alta (10 Hz) / Baja (1 Hz)',
    description: 'Hemisferio no dominante — útil en dolor bilateral o rehabilitación de miembro superior.',
  },
  {
    id: 'broca', label: 'Área de Broca', cx: 155, cy: 210, rx: 16, ry: 14, side: 'left',
    brainFunction: 'Producción del lenguaje, procesamiento gramatical, fluidez verbal',
    indications: ['Afasia expresiva', 'Rehabilitación del lenguaje', 'Disartria'],
    tmsFrequency: 'Alta (10 Hz)',
    description: 'Región frontal inferior izquierda — producción del habla. Lesiones causan afasia no fluente.',
  },
  {
    id: 'wernicke', label: 'Área de Wernicke', cx: 345, cy: 210, rx: 16, ry: 14, side: 'right',
    brainFunction: 'Comprensión del lenguaje, procesamiento semántico, semántica auditiva',
    indications: ['Afasia receptiva', 'Rehabilitación del lenguaje', 'Afasia de conducción'],
    tmsFrequency: 'Alta (10 Hz)',
    description: 'Región temporal posterior — comprensión auditiva. Lesiones causan afasia fluente sin sentido.',
  },
  {
    id: 'insula_left', label: 'Ínsula Izquierda', cx: 205, cy: 185, rx: 14, ry: 12, side: 'left',
    brainFunction: 'Interocepción, emoción, procesamiento del dolor, gustos, empatía',
    indications: ['Dolor crónico', 'Adicciones', 'Ansiedad', 'Depresión', 'Trastornos alimentarios'],
    tmsFrequency: 'Alta (10 Hz)',
    description: 'Conciencia corporal y procesamiento afectivo. Integra señales viscerales con emociones.',
  },
  {
    id: 'insula_right', label: 'Ínsula Derecha', cx: 295, cy: 185, rx: 14, ry: 12, side: 'right',
    brainFunction: 'Interocepción, emoción, dolor visceral, conciencia corporal',
    indications: ['Dolor crónico visceral', 'Náusea', 'Adicciones', 'Ansiedad'],
    tmsFrequency: 'Alta (10 Hz)',
    description: 'Hemisferio dominante para interocepción. Procesamiento de señales corporales internas.',
  },
];

export function getRegionById(id: BrainRegionId): BrainRegion | undefined {
  return BRAIN_REGIONS.find(r => r.id === id);
}

export function getRegionsBySide(side: 'left' | 'right' | 'mid'): BrainRegion[] {
  return BRAIN_REGIONS.filter(r => r.side === side);
}
