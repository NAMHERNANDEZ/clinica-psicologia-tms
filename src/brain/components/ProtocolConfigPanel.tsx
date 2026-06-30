import { useState } from 'react';
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
  dlpfc_l: 'DLPFC-Izq', dlpfc_r: 'DLPFC-Der',
  m1_l: 'M1-Izq', m1_r: 'M1-Der',
  sma: 'SMA', acc: 'ACC',
  insula_l: 'Ínsula-Izq', insula_r: 'Ínsula-Der',
  broca: 'Broca', wernicke: 'Wernicke',
};

export function ProtocolConfigPanel({
  renderer, presets, selectedPreset, onPresetChange, onStart, onStop, isSimulating, selectedRegion,
}: ProtocolConfigPanelProps) {
  const preset = presets[selectedPreset];
  const regionDefs = renderer?.getBrainScene().getRegionDefs() || [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-3">
      <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Protocolo TMS</div>

      <select value={selectedPreset} onChange={e => onPresetChange(Number(e.target.value))}
        className="w-full bg-slate-800 text-white text-xs rounded-lg px-2 py-1.5 border border-slate-700">
        {presets.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
      </select>

      <div className="space-y-2">
        <SliderControl label="Frecuencia" unit="Hz" min={1} max={50} step={1}
          value={preset.frequency} onChange={() => {}} />
        <SliderControl label="Intensidad" unit="% MT" min={50} max={120} step={5}
          value={preset.intensity} onChange={() => {}} />
        <SliderControl label="Duración" unit="s" min={5} max={60} step={1}
          value={preset.duration} onChange={() => {}} />
        <SliderControl label="Pulsos" unit="" min={100} max={5000} step={100}
          value={preset.pulses} onChange={() => {}} />
      </div>

      <div>
        <div className="text-[10px] text-slate-500 mb-1">Región objetivo</div>
        <div className="grid grid-cols-2 gap-1">
          {regionDefs.map(r => (
            <div key={r.id}
              className={`text-[10px] px-2 py-1 rounded border transition-colors cursor-default ${
                r.id === selectedRegion
                  ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-400'
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
            className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-medium py-1.5 rounded-lg transition-colors">
            Iniciar
          </button>
        ) : (
          <button onClick={onStop}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white text-[11px] font-medium py-1.5 rounded-lg transition-colors">
            Detener
          </button>
        )}
      </div>
    </div>
  );
}

function SliderControl({ label, unit, min, max, step, value, onChange }: {
  label: string; unit: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-slate-500">{label}</span>
        <span className="text-white font-mono">{value}{unit && ` ${unit}`}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        disabled />
    </div>
  );
}
