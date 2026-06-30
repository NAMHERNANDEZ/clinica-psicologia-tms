import type { TmsSession, ClinicalResponse } from '../../lib/api';
import { Badge } from '../ui/Badge';

interface ClinicalHistoryProps {
  sessions: TmsSession[];
  responses: ClinicalResponse[];
}

export function ClinicalHistory({ sessions, responses }: ClinicalHistoryProps) {
  const sorted = [...sessions].sort((a, b) => b.session_number - a.session_number);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
      <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">Historia Clínica</div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-4">Sin sesiones registradas</div>
        ) : sorted.map(s => {
          const resp = responses.find(r => r.tms_session_id === s.id);
          return (
            <div key={s.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">Sesión #{s.session_number}</span>
                  <Badge variant={s.status === 'completed' ? 'success' : s.status === 'in_progress' ? 'info' : 'neutral'}>
                    {s.status === 'completed' ? 'Completada' : s.status === 'in_progress' ? 'En curso' : s.status}
                  </Badge>
                </div>
                {s.completed_at && <span className="text-[10px] text-slate-500">{new Date(s.completed_at).toLocaleDateString('es-MX')}</span>}
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div><span className="text-slate-500">Región: </span><span className="text-white">{s.target_area}</span></div>
                <div><span className="text-slate-500">Freq: </span><span className="text-white font-mono">{s.frequency_hz} Hz</span></div>
                <div><span className="text-slate-500">Intensidad: </span><span className="text-white font-mono">{s.intensity_pct_mt}% MT</span></div>
                <div><span className="text-slate-500">Pulsos: </span><span className="text-white font-mono">{s.pulses_delivered}</span></div>
              </div>
              {resp && (
                <div className="mt-1.5 pt-1.5 border-t border-slate-700/50 flex gap-3 text-[10px]">
                  <div><span className="text-slate-500">Ánimo: </span><span className="text-white font-mono">{resp.mood_score}/10</span></div>
                  {resp.overall_response != null && <div><span className="text-slate-500">Global: </span><span className="text-white font-mono">{resp.overall_response}/10</span></div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
