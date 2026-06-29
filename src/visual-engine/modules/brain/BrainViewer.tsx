import { useBrainState } from './useBrainState';
import { BRAIN_REGIONS } from './brain-regions';
import { BRAIN_ANIMATIONS } from './brain-animations';
import { BRAIN_ACTIVITY_COLORS, BRAIN_REGION_LABELS, type BrainVisualState, type PatientState } from '../../core/StateMapper';
import { getRegionById } from './brain-regions';
import { mapStateToBrain } from '../../core/ClinicalRenderer';

import { useState, useEffect, useRef } from 'react';

const KEYFRAME_CSS = Object.values(BRAIN_ANIMATIONS).map(a => a.keyframes).join('\n');

function intensityToActivity(i: number): BrainActivityLevel {
  if (i < 0.1) return 'idle';
  if (i < 0.3) return 'low';
  if (i < 0.6) return 'active';
  if (i < 0.85) return 'stimulated';
  return 'high_response';
}

const DEMO_STATES: { label: string; value: PatientState }[] = [
  { label: 'Registrado', value: 'REGISTERED' },
  { label: 'Evaluado', value: 'EVALUATED' },
  { label: 'MT Medido', value: 'MT_MEASURED' },
  { label: 'Protocolo', value: 'PROTOCOL_ASSIGNED' },
  { label: 'En Tratamiento', value: 'IN_TREATMENT' },
  { label: 'Observación', value: 'UNDER_OBSERVATION' },
  { label: 'Alta', value: 'DISCHARGED' },
];

export default function BrainViewer({ patientId }: { patientId: number }) {
  const { brainStates, patientState, patientName, sessionNumber, totalSessions, history, curve, notes, loading, error } = useBrainState(patientId);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [demoState, setDemoState] = useState<PatientState | null>(null);
  const [simulatedLevel, setSimulatedLevel] = useState<number | null>(null);
  const startTimeRef = useRef(Date.now());

  const activeState = demoState || patientState;
  const isSimulating = !!demoState || !!selectedRegion;

  useEffect(() => {
    if (!isSimulating) { setSimulatedLevel(null); return; }
    startTimeRef.current = Date.now();
    const iv = setInterval(() => {
      const t = (Date.now() - startTimeRef.current) / 1000;
      const base = Math.sin(t * 0.8) * 0.3 + 0.5;
      const noise = (Math.random() - 0.5) * 0.08;
      setSimulatedLevel(Math.max(0.05, Math.min(1, base + noise)));
    }, 1500);
    return () => clearInterval(iv);
  }, [isSimulating]);

  const getActiveBrainStates = (): BrainVisualState[] => {
    if (demoState) return mapStateToBrain(demoState);
    return brainStates;
  };

  const activeBrainStates = getActiveBrainStates();

  const getStateMap = () => {
    const map: Record<string, BrainVisualState> = {};
    activeBrainStates.forEach(bs => { map[bs.region] = bs; });
    return map;
  };

  const stateMap = getStateMap();
  const selectedRegionData = selectedRegion ? getRegionById(selectedRegion as never) : null;

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
        <div>
          <h3 className="text-lg font-bold text-white">Brain Viewer</h3>
          {patientName && (
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-cyan-400 font-medium">{patientName}</span>
              {sessionNumber > 0 && (
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  Sesión {sessionNumber}/{totalSessions}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {demoState && (
            <button onClick={() => setDemoState(null)} className="text-[10px] text-amber-400 bg-amber-900/30 px-2 py-1 rounded-full hover:bg-amber-900/50">
              Demo: {demoState.replace(/_/g, ' ')} ✕
            </button>
          )}
          <span className="text-xs font-medium text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
            Estado: {activeState.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {DEMO_STATES.map(s => (
          <button
            key={s.value}
            onClick={() => setDemoState(demoState === s.value ? null : s.value)}
            className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
              demoState === s.value
                ? 'bg-cyan-600 text-white border-cyan-500'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
            }`}
          >
            {s.label}
          </button>
        ))}
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

            {Object.entries(BRAIN_ACTIVITY_COLORS).map(([level, color]) => (
              <radialGradient key={level} id={`grad-${level}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                <stop offset="70%" stopColor={color} stopOpacity="0.5" />
                <stop offset="100%" stopColor={color} stopOpacity="0.1" />
              </radialGradient>
            ))}

            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
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
            const isSelected = selectedRegion === region.id;
            const useSim = isSelected && simulatedLevel !== null;
            const intensity = useSim ? simulatedLevel! : (bs?.intensity || 0);
            const activity = useSim ? intensityToActivity(simulatedLevel!) : (bs?.activity || 'idle');
            const color = useSim ? BRAIN_ACTIVITY_COLORS[activity] : (bs?.color || BRAIN_ACTIVITY_COLORS.idle);
            const pulseActive = useSim ? intensity > 0.6 : (bs?.pulseActive || false);
            const animName = activity === 'stimulated' || activity === 'high_response'
              ? BRAIN_ANIMATIONS[activity]?.name
              : activity === 'risk'
                ? BRAIN_ANIMATIONS.risk.name
                : '';

            return (
              <g key={region.id} onClick={() => setSelectedRegion(region.id)} style={{ cursor: 'pointer' }}>
                {isSelected && (
                  <ellipse
                    cx={region.cx}
                    cy={region.cy}
                    rx={region.rx + 10}
                    ry={region.ry + 10}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2"
                    opacity="0.8"
                  />
                )}
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
                  fill={`url(#grad-${activity})`}
                  opacity={isSelected ? 0.8 : 0.6}
                  filter="url(#glow)"
                  className="cursor-pointer transition-all duration-300"
                  style={animName ? {
                    animation: `${animName} ${BRAIN_ANIMATIONS[activity]?.duration || '2s'} ${BRAIN_ANIMATIONS[activity]?.timing || 'ease-in-out'} infinite`,
                  } : undefined}
                />

                <ellipse
                  cx={region.cx}
                  cy={region.cy}
                  rx={region.rx * 0.5}
                  ry={region.ry * 0.5}
                  fill={isSelected ? '#22d3ee' : color}
                  opacity={isSelected ? 0.9 : 0.5 + intensity * 0.5}
                />

                <text
                  x={region.cx}
                  y={region.cy + region.ry + 14}
                  textAnchor="middle"
                  className={isSelected ? 'fill-cyan-400' : 'fill-slate-400'}
                  style={{ fontSize: '7px', fontFamily: 'system-ui', fontWeight: isSelected ? 'bold' : 'normal' }}
                >
                  {BRAIN_REGION_LABELS[region.id]}
                </text>
              </g>
            );
          })}

          <text x="250" y="335" textAnchor="middle" className="fill-slate-600" style={{ fontSize: '9px' }}>
            Vista Axial — Actividad Cerebral
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

      {selectedRegion && selectedRegionData && (
        <div className="mt-4 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider">Región seleccionada</div>
                <div className="text-sm font-semibold text-white mt-0.5">{selectedRegionData.label}</div>
                <div className="text-[10px] text-slate-500">{BRAIN_REGION_LABELS[selectedRegion] || selectedRegion}</div>
              </div>
              <button onClick={() => setSelectedRegion(null)} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700/50">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4 text-xs max-h-[calc(100vh-16rem)] overflow-y-auto">
            <div>
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1">Función</div>
              <div className="text-slate-300">{selectedRegionData.brainFunction}</div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1.5">Indicaciones TMS</div>
              <div className="flex flex-wrap gap-1">
                {selectedRegionData.indications.map((ind: string) => (
                  <span key={ind} className="bg-medical-900/40 text-medical-300 px-2 py-0.5 rounded-full text-[10px] border border-medical-700/30">{ind}</span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-0.5">Frecuencia</div>
                <div className="text-slate-300 font-medium">{selectedRegionData.tmsFrequency}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-0.5">Lateralidad</div>
                <div className="text-slate-300 font-medium capitalize">{selectedRegionData.side === 'left' ? 'Izquierda' : selectedRegionData.side === 'right' ? 'Derecha' : 'Media'}</div>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-0.5">Nota clínica</div>
              <div className="text-slate-400 italic text-[11px] leading-relaxed border-l-2 border-medical-700/50 pl-3">{selectedRegionData.description}</div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-3 space-y-3">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Estado Actual</div>
              {(() => {
                const panelIntensity = simulatedLevel ?? (stateMap[selectedRegion]?.intensity || 0);
                const panelActivity = simulatedLevel !== null ? intensityToActivity(simulatedLevel) : (stateMap[selectedRegion]?.activity || 'idle');
                const filled = Math.round(panelIntensity * 20);
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-[11px]">Actividad: <span className="capitalize font-medium text-white">{panelActivity}</span></span>
                      <span className="text-slate-300 text-[11px]">Intensidad: <span className="font-mono font-semibold text-cyan-400">{(panelIntensity * 100).toFixed(0)}%</span></span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex gap-0.5 h-2.5">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div key={i} className={`flex-1 rounded-sm transition-all duration-500 ${
                            i < filled
                              ? 'bg-gradient-to-t from-medical-700 to-medical-400'
                              : 'bg-slate-700/50'
                          }`} />
                        ))}
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                        <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {history.length > 0 && (
              <div className="bg-slate-800/50 rounded-xl p-3">
                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">Historial de Sesiones</div>
                <div className="space-y-1.5">
                  {history.slice(-5).reverse().map((h: { session_number: number; mood_score: number; anxiety_score: number }) => (
                    <div key={h.session_number} className="flex items-center justify-between text-[11px] bg-slate-900/50 rounded-lg px-2.5 py-1.5">
                      <span className="text-slate-400 font-mono">#{h.session_number}</span>
                      <div className="flex items-center space-x-3">
                        <span className="text-slate-400">ánimo <span className="text-white font-medium font-mono">{h.mood_score}/10</span></span>
                        {h.anxiety_score > 0 && <span className="text-slate-400">ansiedad <span className="text-white font-medium font-mono">{h.anxiety_score}/10</span></span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {curve.length > 1 && (
              <div className="bg-slate-800/50 rounded-xl p-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Curva de Progreso</div>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ↑ {(curve[curve.length - 1]?.mood_score - curve[0]?.mood_score).toFixed(1)}
                  </span>
                </div>
                <div className="relative h-28">
                  <svg viewBox="0 0 320 100" className="w-full h-full">
                    <defs>
                      <linearGradient id="curveAreaGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {[0.25, 0.5, 0.75].map(ratio => (
                      <line key={ratio} x1="30" x2="305" y1={85 - ratio * 70} y2={85 - ratio * 70} stroke="#1e293b" strokeDasharray="2 4" strokeWidth="0.5" />
                    ))}

                    {[0, 5, 10].map(v => (
                      <g key={v}>
                        <line x1="27" y1={85 - v * 7} x2="30" y2={85 - v * 7} stroke="#475569" strokeWidth="0.5" />
                        <text x="24" y={88 - v * 7} textAnchor="end" className="fill-slate-600" style={{ fontSize: '7px', fontFamily: 'IBM Plex Mono' }}>{v}</text>
                      </g>
                    ))}

                    {curve.slice(-10).map((p, i, arr) => {
                      const x = 35 + (i / Math.max(arr.length - 1, 1)) * 265;
                      const y = 85 - p.mood_score * 7;
                      return i === 0 ? null : (
                        <line key={i} x1={35 + ((i - 1) / Math.max(arr.length - 1, 1)) * 265} y1={85 - arr[i - 1].mood_score * 7} x2={x} y2={y} stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
                      );
                    })}

                    {(() => {
                      const pts = curve.slice(-10).map((p, i, arr) => ({
                        x: 35 + (i / Math.max(arr.length - 1, 1)) * 265,
                        y: 85 - p.mood_score * 7,
                      }));
                      if (pts.length < 2) return null;
                      const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      const areaD = `${pathD} L ${pts[pts.length - 1].x} 85 L ${pts[0].x} 85 Z`;
                      return <path d={areaD} fill="url(#curveAreaGrad)" />;
                    })()}

                    {curve.slice(-10).map((p, i, arr) => {
                      const x = 35 + (i / Math.max(arr.length - 1, 1)) * 265;
                      const y = 85 - p.mood_score * 7;
                      return <circle key={i} cx={x} cy={y} r="3" fill="#06b6d4" stroke="#0c4a6e" strokeWidth="2" />;
                    })}
                  </svg>
                </div>
              </div>
            )}

            {notes.length > 0 && (
              <div className="bg-slate-800/50 rounded-xl p-3">
                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">Notas Clínicas</div>
                <div className="space-y-2">
                  {notes.map(n => (
                    <div key={n.id} className="bg-slate-900/50 rounded-lg p-2.5 border-l-2 border-medical-600/50">
                      <p className="text-slate-300 text-[11px] leading-relaxed">{n.note}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-slate-500">{n.therapist_name || 'Terapeuta'}</span>
                        <span className="text-[10px] text-slate-600 font-mono">{new Date(n.created_at).toLocaleDateString('es-MX')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => setSelectedRegion(null)} className="w-full mt-2 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-[11px] font-medium transition-colors">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
