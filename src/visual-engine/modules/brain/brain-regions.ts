import type { BrainRegionId } from '../../core/StateMapper';

export interface BrainRegion {
  id: BrainRegionId;
  label: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  side: 'left' | 'right' | 'mid';
}

export const BRAIN_REGIONS: BrainRegion[] = [
  { id: 'prefrontal_left', label: 'Corteza Prefrontal Izq.', cx: 185, cy: 105, rx: 22, ry: 18, side: 'left' },
  { id: 'prefrontal_right', label: 'Corteza Prefrontal Der.', cx: 315, cy: 105, rx: 22, ry: 18, side: 'right' },
  { id: 'dorsal_acc', label: 'Corteza Cingulada Dorsal', cx: 250, cy: 140, rx: 18, ry: 14, side: 'mid' },
  { id: 'motor_cortex_left', label: 'Corteza Motora Izq.', cx: 175, cy: 170, rx: 20, ry: 16, side: 'left' },
  { id: 'motor_cortex_right', label: 'Corteza Motora Der.', cx: 325, cy: 170, rx: 20, ry: 16, side: 'right' },
  { id: 'broca', label: 'Área de Broca', cx: 155, cy: 210, rx: 16, ry: 14, side: 'left' },
  { id: 'wernicke', label: 'Área de Wernicke', cx: 345, cy: 210, rx: 16, ry: 14, side: 'right' },
  { id: 'insula_left', label: 'Ínsula Izquierda', cx: 205, cy: 185, rx: 14, ry: 12, side: 'left' },
  { id: 'insula_right', label: 'Ínsula Derecha', cx: 295, cy: 185, rx: 14, ry: 12, side: 'right' },
];

export function getRegionById(id: BrainRegionId): BrainRegion | undefined {
  return BRAIN_REGIONS.find(r => r.id === id);
}

export function getRegionsBySide(side: 'left' | 'right' | 'mid'): BrainRegion[] {
  return BRAIN_REGIONS.filter(r => r.side === side);
}
