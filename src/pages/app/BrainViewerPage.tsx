import { useState, useEffect, useRef, useCallback } from 'react';
import { tmsProtocols, motorThresholds, type TmsProtocol, type MotorThreshold } from '../../lib/api';
import { Play, RotateCcw, Radio } from 'lucide-react';
import { BRAIN_REGIONS } from '../../visual-engine/modules/brain/brain-regions';
import { BRAIN_ANIMATIONS } from '../../visual-engine/modules/brain/brain-animations';
import { BRAIN_ACTIVITY_COLORS, BRAIN_REGION_LABELS, type BrainVisualState, type BrainActivityLevel } from '../../visual-engine/core/StateMapper';
import type { ProtocolPhase } from '../../brain/simulation/ProtocolStateMachine';

const KEYFRAME_CSS = Object.values(BRAIN_ANIMATIONS).map(a => a.keyframes).join('\n');

interface RegionInfo {
  id: string;
  name: string;
  desc: string;
  side: 'left' | 'right' | 'mid';
}

const REGION_INFO: Record<string, RegionInfo> = {
  prefrontal_left: { id: 'prefrontal_left', name: 'DLPFC Izq.', desc: 'Control ejecutivo, memoria de trabajo.', side: 'left' },
  prefrontal_right: { id: 'prefrontal_right', name: 'DLPFC Der.', desc: 'Atencion, flexibilidad cognitiva.', side: 'right' },
  motor_cortex_left: { id: 'motor_cortex_left', name: 'M1 Izq.', desc: 'Control motor contralateral.', side: 'left' },
  motor_cortex_right: { id: 'motor_cortex_right', name: 'M1 Der.', desc: 'Control motor contralateral.', side: 'right' },
  dorsal_acc: { id: 'dorsal_acc', name: 'ACC', desc: 'Regulacion emocional.', side: 'mid' },
  insula_left: { id: 'insula_left', name: 'Insula Izq.', desc: 'Conciencia interoceptiva.', side: 'left' },
  insula_right: { id: 'insula_right', name: 'Insula Der.', desc: 'Procesamiento emocional.', side: 'right' },
  broca: { id: 'broca', name: 'Broca', desc: 'Produccion del lenguaje.', side: 'left' },
  wernicke: { id: 'wernicke', name: 'Wernicke', desc: 'Comprension del lenguaje.', side: 'right' },
};

const PHASE_LABELS: Record<ProtocolPhase, string> = {
  idle: 'Sistema listo', approach: 'Acercamiento', ramp: 'Incremento',
  propagation: 'Propagacion', peak: 'Estimulacion', cooldown: 'Enfriamiento', complete: 'Finalizado',
};

function getPhaseProgress(phase: ProtocolPhase): number {
  return { idle: 0, approach: 15, ramp: 35, propagation: 60, peak: 85, cooldown: 95, complete: 100 }[phase];
}

export default function BrainViewerPage() {
  const [protocols, setProtocols] = useState<TmsProtocol[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simPhase, setSimPhase] = useState<ProtocolPhase>('idle');
  const [loading, setLoading] = useState(true);
  const [measurements, setMeasurements] = useState<MotorThreshold[]>([]);
  const [brainStates, setBrainStates] = useState<Map<string, BrainVisualState>>(new Map());

  useEffect(() => {
    Promise.all([
      tmsProtocols.list().catch(() => ({ data: [] as TmsProtocol[] })),
      motorThresholds.list().catch(() => ({ data: [] as MotorThreshold[] })),
    ])
      .then(([protRes, mtRes]) => { setProtocols(protRes.data || []); setMeasurements(mtRes.data || []); })
      .finally(() => setLoading(false));
  }, []);

  const getBrainStates = useCallback((): Map<string, BrainVisualState> => {
    const map = new Map<string, BrainVisualState>();
    BRAIN_REGIONS.forEach(region => {
      map.set(region.id, {
        region: region.id as any,
        activity: 'idle',
        intensity: 0,
        color: BRAIN_ACTIVITY_COLORS.idle,
        pulseActive: false,
      });
    });
    return map;
  }, []);

  useEffect(() => { setBrainStates(getBrainStates()); }, [getBrainStates]);

  const stimulateRegion = useCallback((regionId: string) => {
    if (simulating) return;
    setSimulating(true);
    setSimPhase('approach');

    const newStates = new Map<string, BrainVisualState>();
    BRAIN_REGIONS.forEach(region => {
      const isTarget = region.id === regionId;
      const activity: BrainActivityLevel = isTarget ? 'stimulated' : 'idle';
      newStates.set(region.id, {
        region: region.id as any,
        activity,
        intensity: isTarget ? 0.8 : 0,
        color: BRAIN_ACTIVITY_COLORS[activity],
        pulseActive: isTarget,
      });
    });
    setBrainStates(newStates);

    const phases: ProtocolPhase[] = ['approach', 'ramp', 'propagation', 'peak', 'cooldown', 'complete'];
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i < phases.length) {
        setSimPhase(phases[i]);
        if (phases[i] === 'complete') {
          setSimulating(false);
          setTimeout(() => {
            setBrainStates(getBrainStates());
            setSimPhase('idle');
          }, 1000);
          clearInterval(interval);
        }
      }
    }, 800);
  }, [simulating, getBrainStates]);

  const clearAll = useCallback(() => {
    setSimulating(false);
    setSimPhase('idle');
    setBrainStates(getBrainStates());
  }, [getBrainStates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedInfo = selectedId ? REGION_INFO[selectedId] : null;
  const activeRegionCount = Array.from(brainStates.values()).filter(s => s.activity !== 'idle').length;
  const avgIntensity = brainStates.size > 0
    ? Math.round((Array.from(brainStates.values()).reduce((a, b) => a + b.intensity, 0) / brainStates.size) * 100)
    : 0;

  return (
    <div className="h-screen bg-[#080C12] -m-6 flex flex-col font-mono overflow-hidden">
      <style>{KEYFRAME_CSS}</style>

      <div className="px-4 py-2 flex items-center justify-between border-b border-[#1A202C] shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold text-[#C8D0DA] tracking-wider">NEUROSIM ENGINE</h1>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[9px] tracking-wider ${
            simulating ? 'bg-[#4ECDC4]/10 text-[#4ECDC4] border border-[#4ECDC4]/20' : 'bg-[#0D1117] text-[#4A5A6A] border border-[#1A202C]'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${simulating ? 'bg-[#4ECDC4] animate-pulse' : 'bg-[#3A4A5A]'}`} />
            <Radio className="w-3 h-3" /> {PHASE_LABELS[simPhase]}
          </div>
          {simulating && (
            <div className="w-24 h-1 bg-[#1A202C] rounded-sm overflow-hidden">
              <div className="h-full bg-[#4ECDC4] rounded-sm transition-all" style={{ width: `${getPhaseProgress(simPhase)}%` }} />
            </div>
          )}
        </div>
        <button onClick={clearAll} className="px-2 py-0.5 text-[9px] bg-[#0D1117] text-[#5A6A7A] border border-[#1A202C] rounded-sm hover:bg-[#1A202C] flex items-center gap-1 tracking-wider">
          <RotateCcw className="w-3 h-3" /> RESET
        </button>
      </div>

      <div className="flex-1 relative min-h-0 flex items-center justify-center">
        <div className="w-full max-w-4xl h-full flex items-center justify-center p-4">
          <svg viewBox="0 0 500 300" className="w-full h-full" style={{ maxHeight: '100%' }}>
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
              const bs = brainStates.get(region.id);
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
                <g
                  key={region.id}
                  onClick={() => setSelectedId(region.id)}
                  style={{ cursor: 'pointer' }}
                >
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

        {selectedInfo && (
          <div className="absolute top-3 left-3 pointer-events-auto z-20 bg-[#0D1117]/95 border border-[#4ECDC4]/30 rounded-sm p-3 min-w-[200px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-[#4ECDC4] tracking-wider">{selectedInfo.name}</span>
              <button onClick={() => setSelectedId(null)} className="text-[#5A6A7A] hover:text-[#C8D0DA] text-xs leading-none">&times;</button>
            </div>
            <p className="text-[9px] text-[#6A7A8A] leading-relaxed mb-2">{selectedInfo.desc}</p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] text-[#4A5A6A] tracking-wider">LADO: {selectedInfo.side === 'left' ? 'IZQ' : selectedInfo.side === 'right' ? 'DER' : 'MEDIO'}</span>
              {brainStates.get(selectedId!)?.activity !== 'idle' && (
                <span className="text-[9px] text-[#4ECDC4]">{Math.round((brainStates.get(selectedId!)?.intensity || 0) * 100)}%</span>
              )}
            </div>
            <button onClick={() => stimulateRegion(selectedId!)}
              disabled={simulating}
              className="w-full px-2 py-1.5 text-[10px] font-bold bg-[#4ECDC4]/10 text-[#4ECDC4] border border-[#4ECDC4]/20 rounded-sm hover:bg-[#4ECDC4]/20 transition-colors disabled:opacity-30 flex items-center justify-center gap-1.5 tracking-wider"
            >
              <Play className="w-3 h-3" /> ESTIMULAR
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-[#1A202C] flex items-center gap-4 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-3 text-[9px] text-[#5A6A7A] shrink-0">
          <span>REGIONES <span className="text-[#4ECDC4]">{activeRegionCount}</span>/9</span>
          <span>PROM <span className="text-[#C8D0DA]">{avgIntensity}%</span></span>
        </div>

        <div className="w-px h-4 bg-[#1A202C] shrink-0" />

        <div className="flex items-center gap-2 shrink-0">
          {protocols.map(p => (
            <button key={p.id} onClick={() => stimulateRegion(selectedId || 'prefrontal_left')}
              disabled={simulating}
              className="px-2 py-0.5 text-[9px] text-[#8A96A3] bg-[#0D1117] border border-[#1A202C] rounded-sm hover:border-[#4ECDC4]/30 hover:text-[#4ECDC4] transition-colors disabled:opacity-30 tracking-wider shrink-0"
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center space-x-4 ml-auto text-xs shrink-0">
          {(['idle', 'low', 'active', 'stimulated', 'high_response', 'risk'] as const).map(level => (
            <div key={level} className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: BRAIN_ACTIVITY_COLORS[level] }} />
              <span className="text-slate-400 capitalize">{level.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
