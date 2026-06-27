import { useBrainState } from './useBrainState';
import { BRAIN_REGIONS } from './brain-regions';
import { BRAIN_ANIMATIONS } from './brain-animations';
import { BRAIN_ACTIVITY_COLORS, BRAIN_REGION_LABELS, type BrainVisualState } from '../../core/StateMapper';

const KEYFRAME_CSS = Object.values(BRAIN_ANIMATIONS).map(a => a.keyframes).join('\n');

export default function BrainViewer({ patientId }: { patientId: number }) {
  const { brainStates, patientState, loading, error } = useBrainState(patientId);

  const getStateMap = () => {
    const map: Record<string, BrainVisualState> = {};
    brainStates.forEach(bs => { map[bs.region] = bs; });
    return map;
  };

  const stateMap = getStateMap();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 bg-slate-900 rounded-2xl">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-80 bg-slate-900 rounded-2xl">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-2xl p-6 relative overflow-hidden">
      <style>{KEYFRAME_CSS}</style>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Brain Viewer</h3>
        <span className="text-xs font-medium text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
          Estado: {patientState.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="relative" style={{ height: '320px' }}>
        <svg viewBox="0 0 500 300" className="w-full h-full">
          <defs>
            <radialGradient id="brainBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
            <filter id="glowFilter">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="softGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <ellipse cx="250" cy="150" rx="180" ry="130" fill="url(#brainBg)" stroke="#334155" strokeWidth="1.5" />
          <line x1="250" y1="20" x2="250" y2="280" stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" />

          {BRAIN_REGIONS.map(region => {
            const bs = stateMap[region.id];
            const activity = bs?.activity || 'idle';
            const intensity = bs?.intensity || 0;
            const color = bs?.color || BRAIN_ACTIVITY_COLORS.idle;
            const pulseActive = bs?.pulseActive || false;
            const animName = activity === 'stimulated' || activity === 'high_response'
              ? BRAIN_ANIMATIONS[activity]?.name
              : activity === 'risk'
                ? BRAIN_ANIMATIONS.risk.name
                : '';

            return (
              <g key={region.id}>
                <ellipse
                  cx={region.cx}
                  cy={region.cy}
                  rx={region.rx + intensity * 4}
                  ry={region.ry + intensity * 4}
                  fill={color}
                  opacity={0.3 + intensity * 0.7}
                  filter="url(#softGlow)"
                  style={animName ? {
                    animation: `${animName} ${BRAIN_ANIMATIONS[activity]?.duration || '2s'} ${BRAIN_ANIMATIONS[activity]?.timing || 'ease-in-out'} infinite`,
                  } : undefined}
                />

                {pulseActive && (
                  <ellipse
                    cx={region.cx}
                    cy={region.cy}
                    rx={region.rx}
                    ry={region.ry}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    opacity="0.5"
                    style={{
                      animation: `${BRAIN_ANIMATIONS.pulse_ring.name} ${BRAIN_ANIMATIONS.pulse_ring.duration} ${BRAIN_ANIMATIONS.pulse_ring.timing} infinite`,
                    }}
                  />
                )}

                <ellipse
                  cx={region.cx}
                  cy={region.cy}
                  rx={region.rx * 0.6}
                  ry={region.ry * 0.6}
                  fill={color}
                  opacity={0.5 + intensity * 0.5}
                />

                <text
                  x={region.cx}
                  y={region.cy + region.ry + 16}
                  textAnchor="middle"
                  className="fill-slate-400"
                  style={{ fontSize: '8px', fontFamily: 'system-ui' }}
                >
                  {BRAIN_REGION_LABELS[region.id]}
                </text>
              </g>
            );
          })}

          <text x="250" y="295" textAnchor="middle" className="fill-slate-600" style={{ fontSize: '10px' }}>
            Vista Axial — Simulación de Actividad Cerebral
          </text>
        </svg>
      </div>

      <div className="flex items-center justify-center space-x-4 mt-4 text-xs">
        {(['idle', 'low', 'active', 'stimulated', 'high_response', 'risk'] as const).map(level => (
          <div key={level} className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: BRAIN_ACTIVITY_COLORS[level] }} />
            <span className="text-slate-400 capitalize">{level.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
