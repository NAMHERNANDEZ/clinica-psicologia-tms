import { useState } from 'react';
import { interpretScale } from '../../lib/clinicalScales';

interface VASSliderProps {
  label?: string;
  max?: number;
  onComplete: (score: number, interpretation: string, color: string) => void;
  onCancel: () => void;
}

export function VASSlider({ label = 'Nivel de dolor', max = 10, onComplete, onCancel }: VASSliderProps) {
  const [value, setValue] = useState(5);
  const interpretation = interpretScale('vas', value);

  const handleSubmit = () => {
    onComplete(value, interpretation.label, interpretation.color);
  };

  const gradient = `linear-gradient(to right, #22C55E 0%, #F59E0B 50%, #EF4444 100%)`;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider">VAS</div>
          <div className="text-xs text-slate-400">Visual Analog Scale</div>
        </div>
        <button onClick={onCancel} className="text-slate-500 hover:text-white text-xs">✕</button>
      </div>

      <div className="text-center mb-4">
        <div className="text-4xl font-bold mb-1" style={{ color: interpretation.color }}>{value}</div>
        <div className="text-sm font-medium" style={{ color: interpretation.color }}>{interpretation.label}</div>
        <div className="text-[10px] text-slate-500 mt-1">/{max}</div>
      </div>

      <div className="mb-6">
        <div className="text-xs text-white font-medium mb-3">{label}</div>
        <div className="relative">
          <div className="h-3 rounded-full" style={{ background: gradient }} />
          <input type="range" min={0} max={max} step={1} value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="absolute inset-0 w-full h-3 opacity-0 cursor-pointer"
            style={{ margin: 0 }} />
          <div className="absolute -top-1 w-5 h-5 rounded-full bg-white border-2 border-slate-900 shadow-lg transition-all duration-150"
            style={{ left: `calc(${(value / max) * 100}% - 10px)` }} />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-green-400">0 Sin dolor</span>
          <span className="text-[10px] text-yellow-400">5 Moderado</span>
          <span className="text-[10px] text-red-400">10 Máximo</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2.5 rounded-lg transition-colors">Cancelar</button>
        <button onClick={handleSubmit} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs py-2.5 rounded-lg transition-colors font-medium">Guardar</button>
      </div>

      <div className="mt-3 text-[10px] text-slate-600 text-center">~10 seg · OMS / IASP</div>
    </div>
  );
}
