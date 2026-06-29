import { useRef, useState, useEffect } from 'react';
import { BrainCanvas, type BrainCanvasHandle } from '../../brain/render/BrainCanvas';
import { HospitalOverlay } from '../../brain/render/HospitalOverlay';
import type { OverlayState } from '../../brain/render/BrainRenderer';
import type { ProtocolPhase } from '../../brain/simulation/ProtocolStateMachine';

const BUILD_VERSION = 'v2.0-anatomical';
const BUILD_TIME = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

const REGION_LABELS: Record<string, string> = {
  dlpfc_l: 'DLPFC-L', dlpfc_r: 'DLPFC-R', m1_l: 'M1-L', m1_r: 'M1-R',
  sma: 'SMA', acc: 'ACC', insula_l: 'INS-L', insula_r: 'INS-R',
  broca: 'Broca', wernicke: 'Wernicke',
};

const PROTOCOLS = [
  { name: 'DLPFC Estándar', frequency_hz: 10, intensity_pct_mt: 120, duration_sec: 2, total_pulses: 2000 },
  { name: 'Protocolo de Mantenimiento', frequency_hz: 1, intensity_pct_mt: 100, duration_sec: 2, total_pulses: 1200 },
  { name: 'Protocolo Agresivo', frequency_hz: 20, intensity_pct_mt: 120, duration_sec: 4, total_pulses: 3000 },
];

export default function BrainViewerPage() {
  const brainRef = useRef<BrainCanvasHandle>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('dlpfc_l');
  const [selectedProtocol, setSelectedProtocol] = useState(0);
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const [phase, setPhase] = useState<ProtocolPhase>('idle');
  const [mtPct, setMtPct] = useState(80);
  const [debug, setDebug] = useState('waiting...');

  useEffect(() => {
    const timer = setInterval(() => {
      const r = brainRef.current?.getRenderer();
      if (r) {
        const status = r.getLoadStatus();
        const detail = r.getLoadDetail();
        const names = r.getAllMeshNames().slice(0, 15).join(', ');
        setDebug(`STATUS: ${status} | ${detail} | MESHES: ${names}...`);
        if (status !== 'loading') clearInterval(timer);
      }
    }, 300);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (brainRef.current) {
        brainRef.current.onOverlay(setOverlay);
        brainRef.current.onPhaseChange(setPhase);
        brainRef.current.onRegionSelected((id: string) => setSelectedRegion(id));
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const handleRun = () => {
    if (!brainRef.current) return;
    brainRef.current.runProtocol({
      targetRegion: selectedRegion,
      protocol: PROTOCOLS[selectedProtocol],
      mtPct,
    });
  };

  const handleStop = () => brainRef.current?.stopProtocol();

  const handleRegionClick = (id: string) => {
    setSelectedRegion(id);
    brainRef.current?.getRenderer()?.setActivation(id, 0.3);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0E14] overflow-hidden" style={{ top: 0, bottom: 0, left: 0, right: 0 }}>
      <BrainCanvas ref={brainRef} />

      {/* DEBUG PANEL */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/90 border border-yellow-500 rounded-lg p-4 max-w-2xl pointer-events-none">
        <div className="text-yellow-400 text-xs font-mono font-bold mb-1">BRAIN VIEWER {BUILD_VERSION} | {BUILD_TIME}</div>
        <div className="text-green-400 text-[10px] font-mono break-all">{debug}</div>
      </div>

      {/* CONTROLES */}
      <div className="absolute bottom-4 left-4 z-30 pointer-events-auto bg-black/80 border border-[#AAB5C5]/20 rounded-lg p-3 space-y-2 w-64">
        <div className="text-[10px] font-mono text-[#AAB5C5]/50 tracking-widest">REGIÓN</div>
        <select value={selectedRegion} onChange={e => handleRegionClick(e.target.value)}
          className="w-full bg-[#111820] border border-[#AAB5C5]/15 rounded px-2 py-1.5 text-xs text-white focus:outline-none">
          {Object.entries(REGION_LABELS).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>

        <div className="text-[10px] font-mono text-[#AAB5C5]/50 tracking-widest">PROTOCOLO</div>
        <select value={selectedProtocol} onChange={e => setSelectedProtocol(Number(e.target.value))}
          className="w-full bg-[#111820] border border-[#AAB5C5]/15 rounded px-2 py-1.5 text-xs text-white focus:outline-none">
          {PROTOCOLS.map((p, i) => (
            <option key={i} value={i}>{p.name}</option>
          ))}
        </select>

        <div className="text-[10px] font-mono text-[#AAB5C5]/50 tracking-widest">% MT: {mtPct}</div>
        <input type="range" min={10} max={150} value={mtPct} onChange={e => setMtPct(Number(e.target.value))}
          className="w-full accent-[#3B7BB5]" />

        <div className="flex gap-2">
          <button onClick={handleRun}
            className="flex-1 bg-green-900/40 border border-green-500/40 text-green-400 text-[10px] font-mono rounded py-1.5 hover:bg-green-800/40">
            ▶ INICIAR
          </button>
          <button onClick={handleStop}
            className="flex-1 bg-red-900/40 border border-red-500/40 text-red-400 text-[10px] font-mono rounded py-1.5 hover:bg-red-800/40">
            ■ DETENER
          </button>
        </div>
      </div>

      {/* FASE + STATUS */}
      <div className="absolute top-4 right-4 z-30 bg-black/80 border border-[#AAB5C5]/20 rounded-lg p-3 w-48">
        <div className="text-[10px] font-mono text-[#AAB5C5]/50 tracking-widest">FASE</div>
        <div className={`text-sm font-mono font-bold ${phase !== 'idle' && phase !== 'complete' ? 'text-green-400' : 'text-[#AAB5C5]/60'}`}>
          {phase.toUpperCase()}
        </div>
        {overlay && (
          <div className="mt-2 text-[10px] font-mono text-[#AAB5C5]/60 space-y-1">
            <div>Pulso: {overlay.pulseCount}</div>
            <div>Intensidad: {(overlay.coilIntensity * 100).toFixed(1)}%</div>
          </div>
        )}
      </div>

      {overlay && (
        <HospitalOverlay
          phase={overlay.phase}
          regionActivations={overlay.activations}
          coilIntensity={overlay.coilIntensity}
          pulseCount={overlay.pulseCount}
          connectome={overlay.connectome}
        />
      )}
    </div>
  );
}
