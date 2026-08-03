export const ClinicalColors = {
  background: '#0A0E14',
  brainBase: '#7E8C96',
  brainInner: '#6B7A84',
  idle: '#5A6A7A',
  low: '#4A90A4',
  mid: '#3B7BB5',
  high: '#5B6BA8',
  risk: '#B85450',
  connectionIdle: '#2A3A4A',
  connectionActive: '#4A90A4',
};

export function activationColor(level: number): { color: string; emissive: string } {
  if (level < 0.15) return { color: '#5A6A7A', emissive: '#1A202C' };
  if (level < 0.3) return { color: '#FF8800', emissive: '#442200' };
  if (level < 0.5) return { color: '#FF6600', emissive: '#662200' };
  if (level < 0.7) return { color: '#FF4400', emissive: '#882200' };
  return { color: '#FF1100', emissive: '#AA0800' };
}

export function thermalColor(level: number): string {
  if (level < 0.05) return '#7E8C96';
  if (level < 0.15) return '#CC9933';
  if (level < 0.25) return '#DD7711';
  if (level < 0.35) return '#EE6600';
  if (level < 0.45) return '#FF5500';
  if (level < 0.55) return '#FF4400';
  if (level < 0.65) return '#FF3300';
  if (level < 0.75) return '#FF2200';
  if (level < 0.85) return '#FF1100';
  return '#FF0000';
}
