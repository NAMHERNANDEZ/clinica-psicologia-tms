import { useState, useEffect, useRef, useCallback } from 'react';
import { tmsProtocols, motorThresholds, type TmsProtocol, type MotorThreshold } from '../../lib/api';
import { Play, RotateCcw, Radio, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { BrainCanvas, type BrainCanvasHandle } from '../../brain/render/BrainCanvas';
import { HospitalOverlay } from '../../brain/render/HospitalOverlay';
import type { OverlayState } from '../../brain/render/BrainRenderer';
import type { ProtocolPhase } from '../../brain/simulation/ProtocolStateMachine';

interface RegionInfo {
  id: string;
  name: string;
  desc: string;
  side: 'left' | 'right' | 'mid';
}

const REGION_INFO: Record<string, RegionInfo> = {
  dlpfc_l: { id: 'dlpfc_l', name: 'DLPFC Izq.', desc: 'Control ejecutivo, memoria de trabajo.', side: 'left' },
  dlpfc_r: { id: 'dlpfc_r', name: 'DLPFC Der.', desc: 'Atencion, flexibilidad cognitiva.', side: 'right' },
  m1_l: { id: 'm1_l', name: 'M1 Izq.', desc: 'Control motor contralateral.', side: 'left' },
  m1_r: { id: 'm1_r', name: 'M1 Der.', desc: 'Control motor contralateral.', side: 'right' },
  sma: { id: 'sma', name: 'SMA', desc: 'Planificacion de movimientos.', side: 'mid' },
  acc: { id: 'acc', name: 'ACC', desc: 'Regulacion emocional.', side: 'mid' },
  insula_l: { id: 'insula_l', name: 'Insula Izq.', desc: 'Conciencia interoceptiva.', side: 'left' },
  insula_r: { id: 'insula_r', name: 'Insula Der.', desc: 'Procesamiento emocional.', side: 'right' },
  broca: { id: 'broca', name: 'Broca', desc: 'Produccion del lenguaje.', side: 'left' },
  wernicke: { id: 'wernicke', name: 'Wernicke', desc: 'Comprension del lenguaje.', side: 'right' },
};

const REGION_IDS = Object.keys(REGION_INFO);

const PHASE_LABELS: Record<ProtocolPhase, string> = {
  idle: 'Sistema listo', approach: 'Acercamiento', ramp: 'Incremento',
  propagation: 'Propagacion', peak: 'Estimulacion', cooldown: 'Enfriamiento', complete: 'Finalizado',
};

function getPhaseProgress(phase: ProtocolPhase): number {
  return { idle: 0, approach: 15, ramp: 35, propagation: 60, peak: 85, cooldown: 95, complete: 100 }[phase];
}

export default function BrainViewerPage() {
  const [protocols, setProtocols] = useState<TmsProtocol[]>([]);
  const [active, setActive] = useState<Map<string, number>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simPhase, setSimPhase] = useState<ProtocolPhase>('idle');
  const [loading, setLoading] = useState(true);
  const [measurements, setMeasurements] = useState<MotorThreshold[]>([]);
  const [connectomeMatrix, setConnectomeMatrix] = useState<number[][]>([]);
  const [pulseCount, setPulseCount] = useState(0);
  const [coilIntensity, setCoilIntensity] = useState(0);
  const brainRef = useRef<BrainCanvasHandle>(null);
  const [brainStatus, setBrainStatus] = useState<string>('loading');
  const [brainDetail, setBrainDetail] = useState<string>('');

  useEffect(() => {
    const check = () => {
      const r = brainRef.current?.getRenderer();
      if (r) {
        setBrainStatus(r.getLoadStatus());
        setBrainDetail(r.getLoadDetail());
        return true;
      }
      return false;
    };
    const interval = setInterval(() => { if (check()) clearInterval(interval); }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Promise.all([
      tmsProtocols.list().catch(() => ({ data: [] as TmsProtocol[] })),
      motorThresholds.list().catch(() => ({ data: [] as MotorThreshold[] })),
    ])
      .then(([protRes, mtRes]) => { setProtocols(protRes.data || []); setMeasurements(mtRes.data || []); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { brainRef.current?.onRegionSelected((id) => setSelectedId(id)); }, []);
  useEffect(() => {
    brainRef.current?.onOverlay((state: OverlayState) => {
      setActive(new Map(state.activations));
      setSimPhase(state.phase);
      setConnectomeMatrix(state.connectome);
      setPulseCount(state.pulseCount);
      setCoilIntensity(state.coilIntensity);
      if (state.phase === 'complete' || state.phase === 'idle') setSimulating(false);
    });
  }, []);

  const clearAll = useCallback(() => {
    brainRef.current?.stopProtocol();
    setActive(new Map());
    setSimPhase('idle');
    setSimulating(false);
    setPulseCount(0);
    setCoilIntensity(0);
  }, []);

  const stimulateRegion = useCallback((regionId: string) => {
    const p = protocols[0];
    if (!p || simulating) return;
    clearAll();
    setSimulating(true);
    setPulseCount(0);
    const latestMt = measurements[0]?.mt_pct || 50;
    brainRef.current?.runProtocol({
      targetRegion: regionId,
      protocol: { frequency_hz: p.frequency_hz, intensity_pct_mt: p.intensity_pct_mt, duration_sec: 2, total_pulses: 30 },
      mtPct: latestMt,
    });
  }, [protocols, measurements, simulating, clearAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-[#4ECDC4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedInfo = selectedId ? REGION_INFO[selectedId] : null;
  const activeRegionCount = Array.from(active.values()).filter(v => v > 0).length;
  const avgActivation = active.size > 0 ? Math.round((Array.from(active.values()).reduce((a, b) => a + b, 0) / active.size) * 100) : 0;

  return (
    <div className="h-screen bg-[#080C12] -m-6 flex flex-col font-mono overflow-hidden">
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

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[9px] tracking-wider font-mono ${
            brainStatus === 'glb_ok'
              ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30'
              : brainStatus === 'glb_fallback'
              ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30'
              : 'bg-[#6b7280]/10 text-[#6b7280] border border-[#6b7280]/30'
          }`}>
            {brainStatus === 'glb_ok' && <CheckCircle className="w-3 h-3" />}
            {brainStatus === 'glb_fallback' && <AlertTriangle className="w-3 h-3" />}
            {brainStatus === 'loading' && <span className="w-3 h-3 inline-block border border-current border-t-transparent rounded-full animate-spin" />}
            <span>{brainStatus === 'glb_ok' ? 'MODELO ANATÓMICO' : brainStatus === 'glb_fallback' ? 'ERROR' : 'CARGANDO...'}</span>
          </div>
          {brainDetail && <span className="text-[8px] text-[#5A6A7A]">{brainDetail}</span>}

          <button onClick={clearAll} className="px-2 py-0.5 text-[9px] bg-[#0D1117] text-[#5A6A7A] border border-[#1A202C] rounded-sm hover:bg-[#1A202C] flex items-center gap-1 tracking-wider">
            <RotateCcw className="w-3 h-3" /> RESET
          </button>
        </div>
      </div>

      <div className="flex-1 relative min-h-0">
        <BrainCanvas ref={brainRef} />
        <HospitalOverlay
          phase={simPhase}
          regionActivations={active}
          coilIntensity={coilIntensity}
          pulseCount={pulseCount}
          connectome={connectomeMatrix}
        />

        {selectedInfo && (
          <div className="absolute top-3 left-3 pointer-events-auto z-20 bg-[#0D1117]/95 border border-[#4ECDC4]/30 rounded-sm p-3 min-w-[200px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-[#4ECDC4] tracking-wider">{selectedInfo.name}</span>
              <button onClick={() => setSelectedId(null)} className="text-[#5A6A7A] hover:text-[#C8D0DA] text-xs leading-none">&times;</button>
            </div>
            <p className="text-[9px] text-[#6A7A8A] leading-relaxed mb-2">{selectedInfo.desc}</p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] text-[#4A5A6A] tracking-wider">LADO: {selectedInfo.side === 'left' ? 'IZQ' : selectedInfo.side === 'right' ? 'DER' : 'MEDIO'}</span>
              {active.get(selectedId!)! > 0 && (
                <span className="text-[9px] text-[#4ECDC4]">{Math.round(active.get(selectedId!)! * 100)}%</span>
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
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-[#4ECDC4]" /> <span className="text-[#4ECDC4]">{activeRegionCount}</span>/10</span>
          <span>PROM <span className="text-[#C8D0DA]">{avgActivation}%</span></span>
          <span>PULSOS <span className="text-[#D4A843]">{pulseCount}</span></span>
          <span>BOBINA <span className="text-[#8A6CB0]">{Math.round(coilIntensity * 100)}%</span></span>
        </div>

        <div className="w-px h-4 bg-[#1A202C] shrink-0" />

        <div className="flex items-center gap-2 shrink-0">
          {protocols.map(p => (
            <button key={p.id} onClick={() => {
              clearAll(); setSimulating(true); setPulseCount(0);
              const latestMt = measurements[0]?.mt_pct || 50;
              brainRef.current?.runProtocol({
                targetRegion: selectedId || 'dlpfc_l',
                protocol: { frequency_hz: p.frequency_hz, intensity_pct_mt: p.intensity_pct_mt, duration_sec: 2, total_pulses: 30 },
                mtPct: latestMt,
              });
            }} disabled={simulating}
              className="px-2 py-0.5 text-[9px] text-[#8A96A3] bg-[#0D1117] border border-[#1A202C] rounded-sm hover:border-[#4ECDC4]/30 hover:text-[#4ECDC4] transition-colors disabled:opacity-30 tracking-wider shrink-0"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
