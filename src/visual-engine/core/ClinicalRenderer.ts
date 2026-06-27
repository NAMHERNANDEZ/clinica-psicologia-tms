import type { BrainVisualState, BrainRegionId, BrainActivityLevel, PatientState } from './StateMapper';
import { BRAIN_ACTIVITY_COLORS } from './StateMapper';

const REGION_POSITIONS: Record<BrainRegionId, { x: number; y: number }> = {
  prefrontal_left: { x: 180, y: 100 },
  prefrontal_right: { x: 320, y: 100 },
  dorsal_acc: { x: 250, y: 140 },
  motor_cortex_left: { x: 170, y: 170 },
  motor_cortex_right: { x: 330, y: 170 },
  broca: { x: 150, y: 210 },
  wernicke: { x: 350, y: 210 },
  insula_left: { x: 200, y: 190 },
  insula_right: { x: 300, y: 190 },
};

const STATE_BRAIN_MAP: Record<PatientState, Partial<Record<BrainRegionId, BrainActivityLevel>>> = {
  REGISTERED: {},
  EVALUATED: { prefrontal_left: 'low', prefrontal_right: 'low' },
  MT_MEASURED: { motor_cortex_left: 'active', motor_cortex_right: 'active' },
  PROTOCOL_ASSIGNED: { prefrontal_left: 'active', dorsal_acc: 'low' },
  IN_TREATMENT: {
    prefrontal_left: 'stimulated',
    prefrontal_right: 'stimulated',
    dorsal_acc: 'active',
    motor_cortex_left: 'active',
    motor_cortex_right: 'active',
  },
  UNDER_OBSERVATION: { prefrontal_left: 'active', prefrontal_right: 'active', dorsal_acc: 'low' },
  DISCHARGED: { prefrontal_left: 'low', prefrontal_right: 'low' },
};

export function mapStateToBrain(state: PatientState, protocolTarget?: string): BrainVisualState[] {
  const regionMap = STATE_BRAIN_MAP[state];
  const regions = Object.keys(REGION_POSITIONS) as BrainRegionId[];

  return regions.map(region => {
    let activity: BrainActivityLevel = regionMap[region] || 'idle';
    let intensity = activity === 'idle' ? 0
      : activity === 'low' ? 0.2
      : activity === 'active' ? 0.5
      : activity === 'stimulated' ? 0.8
      : activity === 'high_response' ? 1.0
      : 0.9;

    if (protocolTarget && region.includes(protocolTarget)) {
      activity = 'stimulated';
      intensity = Math.min(intensity + 0.3, 1.0);
    }

    return {
      region,
      activity,
      intensity,
      color: BRAIN_ACTIVITY_COLORS[activity],
      pulseActive: activity === 'stimulated' || activity === 'high_response',
    };
  });
}

export function getBrainRegionPosition(region: BrainRegionId) {
  return REGION_POSITIONS[region];
}

export function getBrainStateColor(level: BrainActivityLevel): string {
  return BRAIN_ACTIVITY_COLORS[level];
}
