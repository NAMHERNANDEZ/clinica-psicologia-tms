import { BrainRenderer } from '../render/BrainRenderer';

interface ProtocolConfigPanelProps {
  renderer: BrainRenderer | null;
  presets: { name: string; region: string; frequency: number; intensity: number; duration: number; pulses: number }[];
  selectedPreset: number;
  onPresetChange: (idx: number) => void;
  onStart: () => void;
  onStop: () => void;
  isSimulating: boolean;
  selectedRegion: string | null;
}

const REGION_LABELS: Record<string, string> = {
  dlpfc_l: 'DLPFC', dlpfc_r: 'DLPFC',
  m1_l: 'M1', m1_r: 'M1',
  sma: 'SMA', acc: 'ACC',
  insula_l: 'Ínsula', insula_r: 'Ínsula',
  broca: 'Broca', temporal: 'Temporal',
};

export function ProtocolConfigPanel({
  renderer, presets, selectedPreset, onPresetChange, onStart, onStop, isSimulating, selectedRegion,
}: ProtocolConfigPanelProps) {
  const preset = presets[selectedPreset];
  const regionDefs = renderer?.getBrainScene()?.getRegionDefs() || [];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-3 shadow-lg shadow-black/20">
      <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Protocolo TMS</div>

      <select value={selectedPreset} onChange={e => onPresetChange(Number(e.target.value))}
        className="w-full bg-slate-800 text-white text-xs rounded-lg px-2 py-1.5 border border-slate-700 focus:border-cyan-500/50 outline-none">
        {presets.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
      </select>

      <div className="space-y-2">
        <SliderControl label="Frecuencia" unit="Hz" min={1} max={50} step={1}
          value={preset.frequency} />
        <SliderControl label="Intensidad" unit="% MT" min={50} max={120} step={5}
          value={preset.intensity} />
        <SliderControl label="Duración" unit="s" min={5} max={60} step={1}
          value={preset.duration} />
        <SliderControl label="Pulsos" unit="" min={100} max={5000} step={100}
          value={preset.pulses} />
      </div>

      <div>
        <div className="text-[10px] text-slate-500 mb-1">Región objetivo</div>
        <div className="grid grid-cols-2 gap-1">
          <div className="col-span-2 text-[9px] text-cyan-600 font-mono uppercase tracking-widest px-2 pt-1 pb-0.5 border-b border-slate-800">◄ HEMISFERIO IZQUIERDO</div>
          {regionDefs.filter(r => r.id.endsWith('_l') || r.id === 'broca' || r.id === 'temporal').map(r => (
            <div key={r.id}
              className={`text-[10px] px-2 py-1 rounded border transition-colors cursor-default ${
                r.id === selectedRegion
                  ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-400 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400'
              }`}>
              {REGION_LABELS[r.id] || r.id}
            </div>
          ))}
          <div className="col-span-2 text-[9px] text-orange-600 font-mono uppercase tracking-widest px-2 pt-1.5 pb-0.5 border-b border-slate-800">HEMISFERIO DERECHO ►</div>
          {regionDefs.filter(r => r.id.endsWith('_r')).map(r => (
            <div key={r.id}
              className={`text-[10px] px-2 py-1 rounded border transition-colors cursor-default ${
                r.id === selectedRegion
                  ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-400 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400'
              }`}>
              {REGION_LABELS[r.id] || r.id}
            </div>
          ))}
          <div className="col-span-2 text-[9px] text-purple-600 font-mono uppercase tracking-widest px-2 pt-1.5 pb-0.5 border-b border-slate-800">LINEA MEDIA</div>
          {regionDefs.filter(r => r.id === 'sma' || r.id === 'acc').map(r => (
            <div key={r.id}
              className={`text-[10px] px-2 py-1 rounded border transition-colors cursor-default ${
                r.id === selectedRegion
                  ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-400 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400'
              }`}>
              {REGION_LABELS[r.id] || r.id}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-1 pt-1">
        {!isSimulating ? (
          <button onClick={onStart}
            className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[11px] font-medium py-2 rounded-lg transition-all duration-200 shadow-md shadow-cyan-500/25 hover:shadow-lg hover:shadow-cyan-500/40 active:scale-[0.98]">
            Iniciar Estimulación
          </button>
        ) : (
          <button onClick={onStop}
            className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-[11px] font-medium py-2 rounded-lg transition-all duration-200 shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/40 active:scale-[0.98]">
            Detener
          </button>
        )}
      </div>
    </div>
  );
}

function SliderControl({ label, unit, min, max, step, value }: {
  label: string; unit: string; min: number; max: number; step: number; value: number;
}) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-slate-500">{label}</span>
        <span className="text-white font-mono">{value}{unit && ` ${unit}`}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        disabled />
    </div>
  );
}
