import type { ProtocolPhase } from '../../brain/simulation/ProtocolStateMachine';

const PHASE_LABELS: Record<ProtocolPhase, string> = {
  idle: 'Inactivo', approach: 'Aproximación', ramp: 'Ramp-up',
  propagation: 'Propagación', peak: 'Pico', cooldown: 'Enfriamiento', complete: 'Completado',
};

const REGION_LABELS: Record<string, string> = {
  dlpfc_l: 'DLPFC-L', dlpfc_r: 'DLPFC-R', m1_l: 'M1-L', m1_r: 'M1-R',
  sma: 'SMA', acc: 'ACC', insula_l: 'INS-L', insula_r: 'INS-R',
  broca: 'BRC', wernicke: 'WRN',
};

interface RealTimeMonitorProps {
  activations: Record<string, number>;
  elapsed: number;
  pulseCount: number;
  coilIntensity: number;
  phase: ProtocolPhase;
}

export function RealTimeMonitor({ activations, elapsed, pulseCount, coilIntensity, phase }: RealTimeMonitorProps) {
  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const sorted = Object.entries(activations).sort(([, a], [, b]) => b - a);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Monitor en Vivo</div>
        <span className="text-[10px] text-slate-400 font-mono">{formatTime(elapsed)}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatBox label="Fase" value={PHASE_LABELS[phase]} color="cyan" />
        <StatBox label="Pulsos" value={String(pulseCount)} color="green" />
        <StatBox label="Bobina" value={`${(coilIntensity * 100).toFixed(0)}%`} color="purple" />
      </div>

      <div>
        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">Actividad Regional</div>
        <div className="space-y-1.5">
          {sorted.slice(0, 6).map(([id, val]) => (
            <div key={id}>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span className="text-slate-400">{REGION_LABELS[id] || id}</span>
                <span className="text-cyan-400 font-mono">{(val * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(val * 100, 100)}%`,
                    backgroundColor: val > 0.7 ? '#ef4444' : val > 0.4 ? '#f59e0b' : '#06b6d4',
                  }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {sorted.length > 0 && (
        <div className="text-[10px] text-slate-600">
          {sorted.filter(([, v]) => v > 0.3).length} regiones activas
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    cyan: 'text-cyan-400', green: 'text-green-400', purple: 'text-purple-400',
  };
  return (
    <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-2 text-center">
      <div className="text-[9px] text-slate-500 uppercase">{label}</div>
      <div className={`text-xs font-bold font-mono mt-0.5 ${colors[color] || 'text-white'}`}>{value}</div>
    </div>
  );
}
