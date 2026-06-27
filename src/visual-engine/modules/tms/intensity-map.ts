export const INTENSITY_MAP: Record<number, { color: string; label: string; description: string }> = {
  0: { color: '#e2e8f0', label: 'Sin estimulación', description: 'Máquina inactiva' },
  20: { color: '#93c5fd', label: 'Muy baja', description: 'Umbral subspectral' },
  40: { color: '#60a5fa', label: 'Baja', description: 'Estimulación subumbbral' },
  60: { color: '#3b82f6', label: 'Moderada', description: 'Estimulación cercana al umbral' },
  80: { color: '#2563eb', label: 'Alta', description: 'Estimulación supraliminal' },
  100: { color: '#1d4ed8', label: 'Máxima', description: 'Intensidad terapéutica completa' },
  120: { color: '#7c3aed', label: 'Supraestímulo', description: 'Excede 100% del umbral motor' },
};

export function getIntensityConfig(pct: number): { color: string; label: string; description: string } {
  const keys = Object.keys(INTENSITY_MAP).map(Number).sort((a, b) => a - b);
  let best = keys[0];
  for (const k of keys) {
    if (pct >= k) best = k;
  }
  return INTENSITY_MAP[best || 0];
}

export function getIntensityGradient(pct: number): string {
  const config = getIntensityConfig(pct);
  return `linear-gradient(90deg, ${config.color}88, ${config.color})`;
}
