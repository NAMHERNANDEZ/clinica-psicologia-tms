import type { ProtocolPhase } from '../simulation/ProtocolStateMachine';
import type { OverlayState } from '../render/BrainRenderer';

const PHASE_LABELS: Record<ProtocolPhase, string> = {
  idle: 'Inactivo',
  approach: 'Aproximación',
  ramp: 'Ramp-up',
  propagation: 'Propagación',
  peak: 'Pico',
  cooldown: 'Enfriamiento',
  complete: 'Completado',
};

const PHASE_COLORS: Record<ProtocolPhase, string> = {
  idle: '#475569',
  approach: '#38bdf8',
  ramp: '#facc15',
  propagation: '#f97316',
  peak: '#ef4444',
  cooldown: '#34d399',
  complete: '#22d3ee',
};

const PHASE_ORDER: ProtocolPhase[] = ['approach', 'ramp', 'propagation', 'peak', 'cooldown', 'complete'];

interface PhaseIndicatorProps {
  overlay: OverlayState | null;
  isSimulating: boolean;
  elapsed: number;
}

export function PhaseIndicator({ overlay, isSimulating, elapsed }: PhaseIndicatorProps) {
  if (!isSimulating && (!overlay || overlay.phase === 'idle')) return null;

  const phase = overlay?.phase || 'idle';
  const pulseCount = overlay?.pulseCount || 0;
  const coilIntensity = overlay?.coilIntensity || 0;
  const phaseIdx = PHASE_ORDER.indexOf(phase);
  const progress = phaseIdx >= 0 ? ((phaseIdx + 1) / PHASE_ORDER.length) * 100 : phase === 'complete' ? 100 : 0;

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
      <div
        className="bg-[#0d1117]/85 backdrop-blur-xl border border-slate-700/30 rounded-2xl px-5 py-3 shadow-2xl shadow-black/50"
        style={{
          boxShadow: `0 0 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: PHASE_COLORS[phase] }} />
          <span className="text-[9px] font-mono font-medium uppercase tracking-widest" style={{ color: PHASE_COLORS[phase] }}>
            {PHASE_LABELS[phase]}
          </span>
          {phase !== 'idle' && phase !== 'complete' && (
            <span className="ml-auto text-[8px] text-slate-500 font-mono">{formatTime(elapsed)}</span>
          )}
        </div>

        <div className="flex gap-0.5 mb-2">
          {PHASE_ORDER.map((p, i) => {
            const isActive = p === phase;
            const isPast = phaseIdx >= 0 && i < phaseIdx;
            return (
              <div key={p} className="flex-1 h-[2px] rounded-full transition-all duration-300"
                style={{
                  backgroundColor: isActive ? PHASE_COLORS[p] : isPast ? PHASE_COLORS[p] + '80' : '#1e293b',
                  boxShadow: isActive ? `0 0 6px ${PHASE_COLORS[p]}30` : 'none',
                }} />
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-x-6 gap-y-0 text-[8px]">
          <div className="text-slate-500 font-medium">Pulsos</div>
          <div className="text-slate-500 font-medium text-center">Bobina</div>
          <div className="text-slate-500 font-medium text-right">Progreso</div>
          <div className="text-slate-300 font-mono">{pulseCount.toLocaleString()}</div>
          <div className="text-slate-300 font-mono text-center">{(coilIntensity * 100).toFixed(1)}%</div>
          <div className="text-slate-300 font-mono text-right">{progress.toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
