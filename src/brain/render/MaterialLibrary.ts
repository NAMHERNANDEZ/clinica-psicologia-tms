export const ClinicalColors = {
  background: '#0A0E14',
  brainBase: '#9BA8B5',
  brainInner: '#7A8A9A',
  idle: '#5A6A7A',
  low: '#4A90A4',
  mid: '#3B7BB5',
  high: '#5B6BA8',
  risk: '#B85450',
  connectionIdle: '#2A3A4A',
  connectionActive: '#4A90A4',
};

export function activationColor(level: number): { color: string; emissive: string } {
  if (level < 0.2) return { color: '#6B7B8D', emissive: '#1A202C' };
  if (level < 0.5) return { color: '#4A90A4', emissive: '#1B3A4A' };
  if (level < 0.8) return { color: '#3B7BB5', emissive: '#1E3050' };
  return { color: '#5B6BA8', emissive: '#2A3060' };
}
