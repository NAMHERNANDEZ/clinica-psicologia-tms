import { useState, useEffect, useRef, useCallback, Component, type ReactNode } from 'react';
import { BrainCanvas, type BrainCanvasHandle } from '../../brain/render/BrainCanvas';
import { PhaseIndicator } from '../../brain/components/PhaseIndicator';
import { RealTimeMonitor } from '../../components/tms/RealTimeMonitor';
import { PatientSelector } from '../../components/patient/PatientSelector';
import { ClinicalHistory } from '../../components/patient/ClinicalHistory';
import { ProgressCurve } from '../../components/patient/ProgressCurve';
import { patients, tmsProfiles, tmsSessions, clinicalResponse, type Patient, type TmsProfile, type TmsSession, type ClinicalResponse as ClinicalResponseType } from '../../lib/api';
import { type OverlayState } from '../../brain/render/BrainRenderer';
import type { ProtocolPhase } from '../../brain/simulation/ProtocolStateMachine';

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
];

const REGION_LABELS: Record<string, string> = {
  dlpfc_l: 'DLPFC-Izq', dlpfc_r: 'DLPFC-Der', m1_l: 'M1-Izq', m1_r: 'M1-Der',
  sma: 'SMA', acc: 'ACC', insula_l: 'Ínsula-Izq', insula_r: 'Ínsula-Der', broca: 'Broca', wernicke: 'Wernicke',
};

export default function TMSSessionPage() {
  const brainRef = useRef<BrainCanvasHandle>(null);
  const callbacksAttached = useRef(false);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [profiles, setProfiles] = useState<TmsProfile[]>([]);
  const [sessions, setSessions] = useState<TmsSession[]>([]);
  const [responses, setResponses] = useState<ClinicalResponseType[]>([]);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patients.list().then(res => setPatientList(res.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedPatientId) { setProfiles([]); setSessions([]); setResponses([]); return; }
    let cancelled = false;
    const load = async () => {
      try {
        const [prRes, crRes] = await Promise.allSettled([
          tmsProfiles.listByPatient(selectedPatientId),
          clinicalResponse.listByPatient(selectedPatientId),
        ]);
        if (cancelled) return;
        if (prRes.status === 'fulfilled') {
          const p = prRes.value.data || [];
          setProfiles(p);
          const allSessions: TmsSession[] = [];
          for (const profile of p) {
            try {
              const sRes = await tmsSessions.listByProfile(profile.id);
              if (sRes.data) allSessions.push(...sRes.data);
            } catch { /* skip */ }
          }
          if (!cancelled) setSessions(allSessions.sort((a, b) => a.session_number - b.session_number));
        }
        if (crRes.status === 'fulfilled') setResponses(crRes.value.data || []);
      } catch { /* silent */ }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedPatientId]);

  useEffect(() => {
    const iv = setInterval(() => {
      const b = brainRef.current;
      if (!b || callbacksAttached.current) return;
      const renderer = b.getRenderer();
      if (!renderer) return;
      b.onRegionSelected((id) => setSelectedRegion(id));
      b.onOverlay((state) => setOverlay(state));
      b.onPhaseChange((phase: ProtocolPhase) => {
        if (phase === 'idle' || phase === 'complete') {
          setIsSimulating(false);
          if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
        }
      });
      callbacksAttached.current = true;
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
    setElapsed(0);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = setInterval(() => setElapsed(prev => prev + 100), 100);
  }, [selectedPreset, selectedRegion]);

  const stopSimulation = useCallback(() => {
    brainRef.current?.stopProtocol();
    setIsSimulating(false);
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
  }, []);

  const preset = TMS_PRESETS[selectedPreset];

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-[1920px] mx-auto">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white">Sesión TMS</h1>
          <p className="text-xs text-slate-400">Simulación completa con monitoreo en tiempo real</p>
        </div>

        <div className="grid grid-cols-12 gap-3">
          {/* Columna izquierda: Pacientes + Historia */}
          <div className="col-span-3 space-y-3">
            <PatientSelector patients={patientList} selectedId={selectedPatientId} onSelect={setSelectedPatientId} />
            {selectedPatientId && (
              <>
                <ClinicalHistory sessions={sessions} responses={responses} />
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <ProgressCurve responses={responses} />
                </div>
              </>
            )}
          </div>

          {/* Columna central: Visor 3D */}
          <div className="col-span-6">
            <div className="relative rounded-xl overflow-hidden bg-[#080C12] border border-slate-800" style={{ height: '600px' }}>
              <Brain3DErrorBoundary fallback={<div className="flex items-center justify-center h-full text-slate-500 text-xs">Error al cargar visor 3D</div>}>
                <BrainCanvas ref={brainRef} />
              </Brain3DErrorBoundary>
              <PhaseIndicator overlay={overlay} isSimulating={isSimulating} elapsed={elapsed} />
              {selectedRegion && (
                <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-none">
                  <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-lg p-2 inline-block">
                    <span className="text-[10px] text-cyan-400 font-mono">{REGION_LABELS[selectedRegion] || selectedRegion}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Columna derecha: Controles + Monitor */}
          <div className="col-span-3 space-y-3">
            {/* Panel de protocolo */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Protocolo TMS</div>
              <select value={selectedPreset} onChange={e => setSelectedPreset(Number(e.target.value))}
                className="w-full bg-slate-800 text-white text-xs rounded-lg px-2 py-1.5 border border-slate-700">
                {TMS_PRESETS.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
              </select>
              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between"><span className="text-slate-500">Frecuencia</span><span className="text-white font-mono">{preset.frequency} Hz</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Intensidad</span><span className="text-white font-mono">{preset.intensity}% MT</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Duración</span><span className="text-white font-mono">{preset.duration}s</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Pulsos</span><span className="text-white font-mono">{preset.pulses}</span></div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 mb-1">Región objetivo</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(REGION_LABELS).map(([id, label]) => (
                    <span key={id} className={`text-[9px] px-1.5 py-0.5 rounded border ${
                      id === (selectedRegion || preset.region)
                        ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-400'
                        : 'bg-slate-800/50 border-slate-700 text-slate-500'
                    }`}>{label}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1 pt-1">
                {!isSimulating ? (
                  <button onClick={startSimulation}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-medium py-2 rounded-lg transition-colors">
                    Iniciar Sesión
                  </button>
                ) : (
                  <button onClick={stopSimulation}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white text-[11px] font-medium py-2 rounded-lg transition-colors">
                    Detener
                  </button>
                )}
              </div>
            </div>

            {/* Monitor en tiempo real */}
            <RealTimeMonitor
              activations={overlay?.activations ? Object.fromEntries(overlay.activations) : {}}
              elapsed={elapsed}
              pulseCount={overlay?.pulseCount || 0}
              coilIntensity={overlay?.coilIntensity || 0}
              phase={overlay?.phase || 'idle'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
