import { useState, useEffect, useRef, useCallback, Component, type ReactNode } from 'react';
import { BrainCanvas, type BrainCanvasHandle } from '../../brain/render/BrainCanvas';
import { PhaseIndicator } from '../../brain/components/PhaseIndicator';
import { ProtocolConfigPanel } from '../../brain/components/ProtocolConfigPanel';
import { BrainRenderer, type OverlayState } from '../../brain/render/BrainRenderer';
import { patients, type Patient } from '../../lib/api';

class Brain3DErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

const TMS_PRESETS = [
  { name: 'Depresión (HF)', region: 'dlpfc_l', frequency: 10, intensity: 80, duration: 30, pulses: 3000 },
  { name: 'Ansiedad (LF)', region: 'dlpfc_r', frequency: 1, intensity: 100, duration: 20, pulses: 1200 },
  { name: 'Dolor (HF)', region: 'm1_l', frequency: 10, intensity: 90, duration: 20, pulses: 2000 },
  { name: 'TOC (HF)', region: 'acc', frequency: 10, intensity: 100, duration: 25, pulses: 2500 },
  { name: 'Afasia', region: 'broca', frequency: 20, intensity: 90, duration: 20, pulses: 2000 },
  { name: 'TEPT', region: 'dlpfc_l', frequency: 1, intensity: 100, duration: 30, pulses: 1800 },
  { name: 'Migraña', region: 'm1_l', frequency: 10, intensity: 80, duration: 15, pulses: 1500 },
  { name: 'Tabaquismo', region: 'dlpfc_l', frequency: 20, intensity: 100, duration: 30, pulses: 3000 },
  { name: 'Tinnitus', region: 'temporal_l', frequency: 1, intensity: 90, duration: 25, pulses: 1500 },
  { name: 'Fibromialgia', region: 'm1_l', frequency: 10, intensity: 80, duration: 25, pulses: 2500 },
  { name: 'Dolor neuropático', region: 'm1_l', frequency: 10, intensity: 100, duration: 20, pulses: 2000 },
  { name: 'Esquizofrenia', region: 'dlpfc_l', frequency: 20, intensity: 90, duration: 20, pulses: 2000 },
  { name: 'Insomnio', region: 'dlpfc_l', frequency: 1, intensity: 80, duration: 20, pulses: 1200 },
];

const REGION_LABELS: Record<string, string> = {
  dlpfc_l: 'DLPFC-Izq', dlpfc_r: 'DLPFC-Der',
  m1_l: 'M1-Izq', m1_r: 'M1-Der',
  sma: 'SMA', acc: 'ACC',
  insula_l: 'Ínsula-Izq', insula_r: 'Ínsula-Der',
  broca: 'Broca', wernicke: 'Wernicke',
  occipital: 'Occipital', temporal_l: 'Temporal-Izq',
};

const REGION_FUNCTIONS: Record<string, string> = {
  dlpfc_l: 'Corteza prefrontal dorsolateral izquierda. Funciones ejecutivas, planificación, memoria de trabajo.',
  dlpfc_r: 'Corteza prefrontal dorsolateral derecha. Atención, regulación emocional.',
  m1_l: 'Corteza motora primaria izquierda. Control motor del lado derecho del cuerpo.',
  m1_r: 'Corteza motora primaria derecha. Control motor del lado izquierdo del cuerpo.',
  sma: 'Área motora suplementaria. Planificación y coordinación de movimientos complejos.',
  acc: 'Corteza cingulada anterior. Regulación emocional, motivación, detección de errores.',
  insula_l: 'Ínsula izquierda. Interocepción, procesamiento del dolor, empatía.',
  insula_r: 'Ínsula derecha. Conciencia corporal, procesamiento emocional.',
  broca: 'Área de Broca. Producción del lenguaje.',
  wernicke: 'Área de Wernicke. Comprensión del lenguaje.',
  occipital: 'Corteza occipital. Procesamiento visual primario (V1), percepción de formas y colores.',
  temporal_l: 'Corteza temporal izquierda. Procesamiento auditivo, memoria semántica, comprensión del lenguaje.',
};

const BRAIN_FALLBACK = (
  <div className="flex items-center justify-center h-full bg-[#080C12] rounded-xl">
    <div className="text-center p-6">
      <div className="text-slate-500 text-xs mb-2">Cargando modelo 3D...</div>
      <div className="text-slate-600 text-[10px]">WebGL no disponible o modelo no cargado</div>
    </div>
  </div>
);

function Brain3DView({ brainRef }: { brainRef: React.RefObject<BrainCanvasHandle | null> }) {
  return (
    <Brain3DErrorBoundary fallback={BRAIN_FALLBACK}>
      <BrainCanvas ref={brainRef} />
    </Brain3DErrorBoundary>
  );
}

export default function BrainViewerPage() {
  const brainRef = useRef<BrainCanvasHandle>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number>(0);
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [rendererRef, setRendererRef] = useState<BrainRenderer | null>(null);
  const callbacksAttached = useRef(false);
  const elapsedRef = useRef(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    patients.list().then(res => setPatientList(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      const b = brainRef.current;
      if (!b) return;
      if (!callbacksAttached.current) {
        const renderer = b.getRenderer();
        if (renderer) {
          b.onRegionSelected((id) => setSelectedRegion(id));
          b.onOverlay((state) => setOverlay(state));
          b.onPhaseChange((phase) => {
            if (phase === 'idle' || phase === 'complete') {
              setIsSimulating(false);
              if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
            }
          });
          setRendererRef(renderer);
          callbacksAttached.current = true;
        }
      }
    }, 500);
    return () => clearInterval(iv);
  }, []);

  const startSimulation = useCallback(() => {
    const b = brainRef.current;
    if (!b) return;
    const preset = TMS_PRESETS[selectedPreset];
    b.runProtocol({
      targetRegion: selectedRegion || preset.region,
      protocol: { frequency_hz: preset.frequency, intensity_pct_mt: preset.intensity, duration_sec: preset.duration, total_pulses: preset.pulses },
      mtPct: preset.intensity,
    });
    setIsSimulating(true);
    elapsedRef.current = 0;
    setElapsed(0);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = setInterval(() => { elapsedRef.current += 100; setElapsed(elapsedRef.current); }, 100);
  }, [selectedPreset, selectedRegion]);

  const stopSimulation = useCallback(() => {
    brainRef.current?.stopProtocol();
    setIsSimulating(false);
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
  }, []);

  const selectedPatient = patientList.find(p => p.id === selectedPatientId);

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-white">Brain TMS Viewer</h1>
            <p className="text-xs text-slate-400">Visualización 3D — Simulación Neural — Protocolo TMS</p>
          </div>
        </div>

        {patientList.length > 0 && !selectedPatientId && (
          <div className="mb-3">
            <p className="text-xs text-slate-400 mb-2">Selecciona un paciente:</p>
            <div className="flex flex-wrap gap-2">
              {patientList.map(p => (
                <button key={p.id} onClick={() => setSelectedPatientId(p.id)}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 rounded-lg px-3 py-2 text-left transition-all hover:shadow-lg hover:shadow-cyan-500/10">
                  <div className="text-xs font-medium text-white">{p.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedPatientId > 0 && selectedPatient && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-cyan-400 text-xs font-medium">{selectedPatient.name}</span>
            <button onClick={() => setSelectedPatientId(0)} className="text-[10px] text-slate-500 hover:text-white">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-3 relative rounded-xl overflow-hidden bg-[#080C12] border border-slate-800 shadow-xl shadow-black/30" style={{ height: '500px' }}>
            <Brain3DView brainRef={brainRef} />
            <div className="absolute inset-0 pointer-events-none rounded-xl" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(8,12,18,0.7) 100%)' }} />
            <PhaseIndicator overlay={overlay} isSimulating={isSimulating} elapsed={elapsed} />
          </div>

          <div className="space-y-3">
            <ProtocolConfigPanel
              renderer={rendererRef}
              presets={TMS_PRESETS}
              selectedPreset={selectedPreset}
              onPresetChange={setSelectedPreset}
              onStart={startSimulation}
              onStop={stopSimulation}
              isSimulating={isSimulating}
              selectedRegion={selectedRegion}
            />

            {selectedRegion && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg shadow-black/20">
                <div className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider mb-1">{REGION_LABELS[selectedRegion] || selectedRegion}</div>
                <p className="text-[11px] text-slate-300 leading-relaxed">{REGION_FUNCTIONS[selectedRegion] || 'Región cerebral'}</p>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg shadow-black/20">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">Indicaciones TMS</div>
              <div className="space-y-1">
                {TMS_PRESETS.map((preset, i) => (
                  <div key={i}
                    className={`flex items-center gap-2 text-[10px] p-1 rounded cursor-pointer transition-colors ${selectedPreset === i ? 'bg-cyan-900/30 text-cyan-400' : 'text-slate-400 hover:bg-slate-800'}`}
                    onClick={() => setSelectedPreset(i)}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: i === selectedPreset ? '#22d3ee' : '#475569' }} />
                    <span className="truncate">{preset.name}</span>
                    <span className="ml-auto font-mono">{preset.frequency}Hz</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
