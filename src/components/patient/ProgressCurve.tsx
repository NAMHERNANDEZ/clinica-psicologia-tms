import type { ClinicalResponse } from '../../lib/api';
import { LineChart } from '../ui/Chart';

interface ProgressCurveProps {
  responses: ClinicalResponse[];
}

export function ProgressCurve({ responses }: ProgressCurveProps) {
  const sorted = [...responses].sort((a, b) => a.id - b.id);

  if (sorted.length < 2) {
    return <div className="text-center text-slate-400 text-xs py-6">Mínimo 2 sesiones para mostrar curva</div>;
  }

  const series = [
    { name: 'Ánimo', data: sorted.map(r => r.mood_score), color: '#0d9488' },
    ...(sorted.some(r => r.overall_response != null)
      ? [{ name: 'Global', data: sorted.map(r => r.overall_response ?? 0), color: '#8b5cf6', dashed: true as const }]
      : []),
  ];

  return (
    <div>
      <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">Evolución Clínica</div>
      <LineChart series={series} />
    </div>
  );
}
