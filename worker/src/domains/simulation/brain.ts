export type BrainRegion = 'dlpfc_left' | 'dlpfc_right' | 'm1' | 'pfc' | 'motor' | 'temporal' | 'parietal' | 'occipital';

export interface BrainState {
  region: BrainRegion;
  state: 'idle' | 'selected' | 'stimulated' | 'completed';
  color: string;
}

const REGION_COLORS: Record<BrainRegion, { idle: string; selected: string; stimulated: string; completed: string }> = {
  dlpfc_left: { idle: '#6b7280', selected: '#3b82f6', stimulated: '#ef4444', completed: '#10b981' },
  dlpfc_right: { idle: '#6b7280', selected: '#3b82f6', stimulated: '#ef4444', completed: '#10b981' },
  m1: { idle: '#6b7280', selected: '#8b5cf6', stimulated: '#f59e0b', completed: '#10b981' },
  pfc: { idle: '#6b7280', selected: '#06b6d4', stimulated: '#f43f5e', completed: '#10b981' },
  motor: { idle: '#6b7280', selected: '#f97316', stimulated: '#e11d48', completed: '#10b981' },
  temporal: { idle: '#6b7280', selected: '#a855f7', stimulated: '#dc2626', completed: '#10b981' },
  parietal: { idle: '#6b7280', selected: '#14b8a6', stimulated: '#d97706', completed: '#10b981' },
  occipital: { idle: '#6b7280', selected: '#e879f9', stimulated: '#7c3aed', completed: '#10b981' },
};

const PROTOCOL_REGION_MAP: Record<string, BrainRegion> = {
  'DLPFC': 'dlpfc_left',
  'left DLPFC': 'dlpfc_left',
  'right DLPFC': 'dlpfc_right',
  'M1': 'm1',
  'motor cortex': 'motor',
  'PFC': 'pfc',
  'prefrontal': 'pfc',
  'temporal': 'temporal',
  'parietal': 'parietal',
  'occipital': 'occipital',
};

export function getBrainState(region: BrainRegion, sessionProgress: number, isActive: boolean): BrainState {
  let state: BrainState['state'];
  if (sessionProgress === 0) {
    state = isActive ? 'selected' : 'idle';
  } else if (sessionProgress >= 1) {
    state = 'completed';
  } else {
    state = isActive ? 'stimulated' : 'selected';
  }
  return { region, state, color: REGION_COLORS[region][state] };
}

export function getTargetRegion(protocol: string): BrainRegion {
  const lower = protocol.toLowerCase();
  for (const [key, region] of Object.entries(PROTOCOL_REGION_MAP)) {
    if (lower.includes(key.toLowerCase())) return region;
  }
  return 'dlpfc_left';
}

export function getBrainRegions(): BrainRegion[] {
  return ['dlpfc_left', 'dlpfc_right', 'm1', 'pfc', 'motor', 'temporal', 'parietal', 'occipital'];
}
