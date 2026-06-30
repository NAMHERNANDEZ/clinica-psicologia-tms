import type { ScaleDefinition } from '../../lib/clinicalScales';
import { interpretScale } from '../../lib/clinicalScales';

interface ScaleInterpreterProps {
  scale: ScaleDefinition;
  score: number;
  showDetails?: boolean;
}

export function ScaleInterpreter({ scale, score, showDetails = true }: ScaleInterpreterProps) {
  const interpretation = interpretScale(scale.id, score);
  const percentage = (score / scale.maxScore) * 100;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider">{scale.name}</div>
          <div className="text-[10px] text-slate-500">{scale.fullName}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold" style={{ color: interpretation.color }}>{score}</div>
          <div className="text-[10px] text-slate-500">/{scale.maxScore}</div>
        </div>
      </div>

      <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: interpretation.color }} />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: interpretation.color }} />
        <span className="text-xs font-medium" style={{ color: interpretation.color }}>{interpretation.label}</span>
      </div>

      {showDetails && (
        <div className="space-y-1">
          {scale.interpretation.map((tier, i) => {
            const prevMax = i > 0 ? scale.interpretation[i - 1].max : -1;
            const isActive = score > prevMax && score <= tier.max;
            return (
              <div key={i} className={`flex items-center justify-between text-[10px] px-2 py-0.5 rounded transition-colors ${isActive ? 'bg-slate-800' : ''}`}>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tier.color, opacity: isActive ? 1 : 0.3 }} />
                  <span className={isActive ? 'text-white font-medium' : 'text-slate-500'}>{tier.label}</span>
                </div>
                <span className="text-slate-400 font-mono">
                  {i === 0 ? `0-${tier.max}` : `${scale.interpretation[i - 1].max + 1}-${tier.max}`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
        <span className="text-[10px] text-slate-600">{scale.condition}</span>
        <span className="text-[10px] text-slate-600">{scale.timeToComplete}</span>
      </div>
    </div>
  );
}
