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

      <div className="relative" style={{ height: '380px' }}>
        <svg viewBox="0 0 500 340" className="w-full h-full">
          <defs>
            <radialGradient id="brainBg" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#2a3545" />
              <stop offset="60%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
            <radialGradient id="brainSurface" cx="50%" cy="45%" r="50%">
              <stop offset="0%" stopColor="#3a4a5a" />
              <stop offset="100%" stopColor="#2a3545" />
            </radialGradient>
            <filter id="softGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="innerShadow">
              <feOffset dx="0" dy="1" />
              <feGaussianBlur stdDeviation="1.5" />
              <feComposite operator="out" in="SourceGraphic" />
              <feComponentTransfer><feFuncA type="linear" slope="0.4" /></feComponentTransfer>
              <feBlend in="SourceGraphic" />
            </filter>
            <clipPath id="brainClip">
              <path d="M250,30 C310,30 370,50 400,90 C425,125 435,160 430,195 C425,230 405,260 375,280 C345,298 310,310 275,315 C260,317 250,318 250,318 C250,318 240,317 225,315 C190,310 155,298 125,280 C95,260 75,230 70,195 C65,160 75,125 100,90 C130,50 190,30 250,30 Z" />
            </clipPath>
          </defs>

          <g clipPath="url(#brainClip)">
            <ellipse cx="250" cy="175" rx="195" ry="150" fill="url(#brainBg)" />

            {/* Left hemisphere surface */}
            <path d="M248,35 C200,38 145,60 115,100 C85,140 72,180 75,210 C78,240 95,265 120,285 C148,305 185,315 225,318 C240,319 248,318 248,318 Z" fill="url(#brainSurface)" opacity="0.6" />

            {/* Right hemisphere surface */}
            <path d="M252,35 C300,38 355,60 385,100 C415,140 428,180 425,210 C422,240 405,265 380,285 C352,305 315,315 275,318 C260,319 252,318 252,318 Z" fill="url(#brainSurface)" opacity="0.6" />

            {/* Longitudinal fissure - deep central groove */}
            <path d="M250,32 C249,60 248,100 249,140 C250,180 251,220 250,260 C249,290 250,310 250,318" stroke="#0a0f14" strokeWidth="3" fill="none" />
            <path d="M250,32 C251,60 252,100 251,140 C250,180 249,220 250,260 C251,290 250,310 250,318" stroke="#151d28" strokeWidth="1.5" fill="none" />

            {/* Central sulcus - left hemisphere */}
            <path d="M195,60 C200,80 205,105 210,130 C215,155 218,175 220,195 C222,215 224,240 228,260" stroke="#151d28" strokeWidth="1.5" fill="none" opacity="0.7" />

            {/* Central sulcus - right hemisphere */}
            <path d="M305,60 C300,80 295,105 290,130 C285,155 282,175 280,195 C278,215 276,240 272,260" stroke="#151d28" strokeWidth="1.5" fill="none" opacity="0.7" />

            {/* Lateral sulcus (Sylvian) - left */}
            <path d="M120,155 C140,150 165,148 190,152 C210,156 225,162 238,170" stroke="#151d28" strokeWidth="1.2" fill="none" opacity="0.6" />

            {/* Lateral sulcus (Sylvian) - right */}
            <path d="M380,155 C360,150 335,148 310,152 C290,156 275,162 262,170" stroke="#151d28" strokeWidth="1.2" fill="none" opacity="0.6" />

            {/* Superior frontal sulcus - left */}
            <path d="M175,55 C180,75 183,100 185,125 C187,145 188,160 190,175" stroke="#1a2535" strokeWidth="0.8" fill="none" opacity="0.5" />

            {/* Superior frontal sulcus - right */}
            <path d="M325,55 C320,75 317,100 315,125 C313,145 312,160 310,175" stroke="#1a2535" strokeWidth="0.8" fill="none" opacity="0.5" />

            {/* Inferior frontal sulcus - left */}
            <path d="M140,110 C155,115 170,122 185,130 C200,138 210,145 220,152" stroke="#1a2535" strokeWidth="0.8" fill="none" opacity="0.5" />

            {/* Inferior frontal sulcus - right */}
            <path d="M360,110 C345,115 330,122 315,130 C300,138 290,145 280,152" stroke="#1a2535" strokeWidth="0.8" fill="none" opacity="0.5" />

            {/* Parieto-occipital sulcus - left */}
            <path d="M160,200 C170,215 178,230 185,248 C192,265 198,280 205,295" stroke="#1a2535" strokeWidth="0.8" fill="none" opacity="0.5" />

            {/* Parieto-occipital sulcus - right */}
            <path d="M340,200 C330,215 322,230 315,248 C308,265 302,280 295,295" stroke="#1a2535" strokeWidth="0.8" fill="none" opacity="0.5" />

            {/* Calcarine sulcus - left */}
            <path d="M210,270 C220,265 230,258 238,250 C244,244 247,238 248,230" stroke="#1a2535" strokeWidth="0.7" fill="none" opacity="0.4" />

            {/* Calcarine sulcus - right */}
            <path d="M290,270 C280,265 270,258 262,250 C256,244 253,238 252,230" stroke="#1a2535" strokeWidth="0.7" fill="none" opacity="0.4" />

            {/* Additional gyri details - left hemisphere */}
            <path d="M130,80 C145,85 160,92 172,100" stroke="#1e2a3a" strokeWidth="0.6" fill="none" opacity="0.4" />
            <path d="M110,130 C125,128 142,127 158,130" stroke="#1e2a3a" strokeWidth="0.6" fill="none" opacity="0.4" />
            <path d="M105,175 C120,170 138,167 155,168" stroke="#1e2a3a" strokeWidth="0.6" fill="none" opacity="0.4" />
            <path d="M130,230 C145,225 162,222 178,225" stroke="#1e2a3a" strokeWidth="0.6" fill="none" opacity="0.4" />
            <path d="M160,265 C172,258 185,252 198,250" stroke="#1e2a3a" strokeWidth="0.6" fill="none" opacity="0.4" />

            {/* Additional gyri details - right hemisphere */}
            <path d="M370,80 C355,85 340,92 328,100" stroke="#1e2a3a" strokeWidth="0.6" fill="none" opacity="0.4" />
            <path d="M390,130 C375,128 358,127 342,130" stroke="#1e2a3a" strokeWidth="0.6" fill="none" opacity="0.4" />
            <path d="M395,175 C380,170 362,167 345,168" stroke="#1e2a3a" strokeWidth="0.6" fill="none" opacity="0.4" />
            <path d="M370,230 C355,225 338,222 322,225" stroke="#1e2a3a" strokeWidth="0.6" fill="none" opacity="0.4" />
            <path d="M340,265 C328,258 315,252 302,250" stroke="#1e2a3a" strokeWidth="0.6" fill="none" opacity="0.4" />

            {/* Brain outline stroke */}
            <path d="M250,30 C310,30 370,50 400,90 C425,125 435,160 430,195 C425,230 405,260 375,280 C345,298 310,310 275,315 C260,317 250,318 250,318 C250,318 240,317 225,315 C190,310 155,298 125,280 C95,260 75,230 70,195 C65,160 75,125 100,90 C130,50 190,30 250,30 Z" fill="none" stroke="#3a4a5a" strokeWidth="1.5" />
          </g>

          {/* Brain regions */}
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
                {pulseActive && (
                  <ellipse
                    cx={region.cx}
                    cy={region.cy}
                    rx={region.rx + 6}
                    ry={region.ry + 6}
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
                  rx={region.rx + intensity * 3}
                  ry={region.ry + intensity * 3}
                  fill={color}
                  opacity={0.25 + intensity * 0.6}
                  filter="url(#softGlow)"
                  style={animName ? {
                    animation: `${animName} ${BRAIN_ANIMATIONS[activity]?.duration || '2s'} ${BRAIN_ANIMATIONS[activity]?.timing || 'ease-in-out'} infinite`,
                  } : undefined}
                />

                <ellipse
                  cx={region.cx}
                  cy={region.cy}
                  rx={region.rx * 0.5}
                  ry={region.ry * 0.5}
                  fill={color}
                  opacity={0.4 + intensity * 0.6}
                />

                <text
                  x={region.cx}
                  y={region.cy + region.ry + 14}
                  textAnchor="middle"
                  className="fill-slate-400"
                  style={{ fontSize: '7px', fontFamily: 'system-ui' }}
                >
                  {BRAIN_REGION_LABELS[region.id]}
                </text>
              </g>
            );
          })}

          <text x="250" y="335" textAnchor="middle" className="fill-slate-600" style={{ fontSize: '9px' }}>
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
