import { useRef, useState, useEffect } from 'react';
import { BrainCanvas, type BrainCanvasHandle } from '../../brain/render/BrainCanvas';
import { HospitalOverlay } from '../../brain/render/HospitalOverlay';
import type { OverlayState } from '../../brain/render/BrainRenderer';
import type { ProtocolPhase } from '../../brain/simulation/ProtocolStateMachine';

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
  const [loadStatus, setLoadStatus] = useState<string>('waiting');

  useEffect(() => {
    const timer = setInterval(() => {
      const r = brainRef.current?.getRenderer();
      if (r) {
        setLoadStatus(`${r.getLoadStatus()} — ${r.getLoadDetail()}`);
        if (r.getLoadStatus() !== 'loading') clearInterval(timer);
      }
    }, 200);
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
    <div className="fixed inset-0 z-50 bg-[#080C12] overflow-hidden" style={{ top: 0, bottom: 0, left: 0, right: 0 }}>
      <BrainCanvas ref={brainRef} />
      <div className="absolute inset-0 z-20 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 p-4">
          <div className="flex items-center gap-3">
            <div className="text-xs font-mono text-[#AAB5C5]/60 tracking-wider">
              TMS BRAIN VIEWER v1.0
            </div>
            <div className="flex-1" />
            <div className={`text-xs font-mono px-2 py-0.5 rounded border ${
              phase !== 'idle' && phase !== 'complete'
                ? 'text-[#00FF88] border-[#00FF88]/30 bg-[#00FF88]/5'
                : 'text-[#AAB5C5]/40 border-[#AAB5C5]/10'
            }`}>
              {phase.toUpperCase()}
            </div>
            <div className="text-[10px] font-mono text-[#AAB5C5]/40 tracking-wider">
              {loadStatus}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex gap-4">
            <div className="pointer-events-auto bg-[#0A0F16]/90 backdrop-blur-md border border-[#AAB5C5]/10 rounded-lg p-3 space-y-3 max-w-xs">
              <div className="text-[10px] font-mono text-[#AAB5C5]/40 tracking-widest uppercase">Región</div>
              <select
                value={selectedRegion}
                onChange={e => handleRegionClick(e.target.value)}
                className="w-full bg-[#111820] border border-[#AAB5C5]/15 rounded px-2 py-1.5 text-xs text-[#E0E8F0] focus:outline-none focus:border-[#3B7BB5]/50"
              >
                {Object.entries(REGION_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>

              <div className="text-[10px] font-mono text-[#AAB5C5]/40 tracking-widest uppercase">Protocolo</div>
              <select
                value={selectedProtocol}
                onChange={e => setSelectedProtocol(Number(e.target.value))}
                className="w-full bg-[#111820] border border-[#AAB5C5]/15 rounded px-2 py-1.5 text-xs text-[#E0E8F0] focus:outline-none focus:border-[#3B7BB5]/50"
              >
                {PROTOCOLS.map((p, i) => (
                  <option key={i} value={i}>{p.name} ({p.frequency_hz}Hz, {p.intensity_pct_mt}% MT)</option>
                ))}
              </select>

              <div className="text-[10px] font-mono text-[#AAB5C5]/40 tracking-widest uppercase">Intensidad %MT</div>
              <input
                type="range"
                min={10}
                max={150}
                value={mtPct}
                onChange={e => setMtPct(Number(e.target.value))}
                className="w-full accent-[#3B7BB5]"
              />
              <div className="text-[10px] font-mono text-[#E0E8F0] text-center">{mtPct}% MT</div>

              <div className="flex gap-2">
                <button
                  onClick={handleRun}
                  className="flex-1 bg-[#3B7BB5]/20 border border-[#3B7BB5]/40 text-[#8AB5E0] text-[10px] font-mono tracking-wider rounded py-1.5 hover:bg-[#3B7BB5]/30 transition-colors"
                >
                  ▶ INICIAR
                </button>
                <button
                  onClick={handleStop}
                  className="flex-1 bg-[#B53B3B]/20 border border-[#B53B3B]/40 text-[#E08A8A] text-[10px] font-mono tracking-wider rounded py-1.5 hover:bg-[#B53B3B]/30 transition-colors"
                >
                  ■ DETENER
                </button>
              </div>
            </div>

            <div className="flex-1" />

            {overlay && (
              <div className="pointer-events-auto bg-[#0A0F16]/90 backdrop-blur-md border border-[#AAB5C5]/10 rounded-lg p-3 max-w-xs">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[10px] font-mono">
                  <div className="text-[#AAB5C5]/40">Fase</div>
                  <div className="text-[#E0E8F0]">{overlay.phase}</div>
                  <div className="text-[#AAB5C5]/40">Pulso</div>
                  <div className="text-[#E0E8F0]">{overlay.pulseCount}</div>
                  <div className="text-[#AAB5C5]/40">Intensidad</div>
                  <div className="text-[#E0E8F0]">{(overlay.coilIntensity * 100).toFixed(1)}%</div>
                </div>
              </div>
            )}
          </div>
        </div>
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
