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
    <div className="absolute top-3 left-3 right-3 z-10 pointer-events-none">
      <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 max-w-md">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: PHASE_COLORS[phase] }} />
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider" style={{ color: PHASE_COLORS[phase] }}>
            {PHASE_LABELS[phase]}
          </span>
          {phase !== 'idle' && phase !== 'complete' && (
            <span className="ml-auto text-[10px] text-slate-400 font-mono">{formatTime(elapsed)}</span>
          )}
        </div>

        <div className="flex gap-1 mb-2">
          {PHASE_ORDER.map((p, i) => {
            const isActive = p === phase;
            const isPast = phaseIdx >= 0 && i < phaseIdx;
            return (
              <div key={p} className="flex-1 h-1 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: isActive ? PHASE_COLORS[p] : isPast ? PHASE_COLORS[p] + '80' : '#1e293b',
                  boxShadow: isActive ? `0 0 8px ${PHASE_COLORS[p]}40` : 'none',
                }} />
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
          <div className="text-slate-500">Pulsos</div>
          <div className="text-white font-mono text-right">{pulseCount.toLocaleString()}</div>
          <div className="text-slate-500">Intensidad bobina</div>
          <div className="text-white font-mono text-right">{(coilIntensity * 100).toFixed(1)}%</div>
          <div className="text-slate-500">Progreso</div>
          <div className="text-white font-mono text-right">{progress.toFixed(0)}%</div>
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
