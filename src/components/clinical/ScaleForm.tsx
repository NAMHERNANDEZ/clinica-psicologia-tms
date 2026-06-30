import { useState } from 'react';
import type { ScaleDefinition } from '../../lib/clinicalScales';
import { interpretScale } from '../../lib/clinicalScales';

interface ScaleFormProps {
  scale: ScaleDefinition;
  onComplete: (score: number, interpretation: string, color: string, answers: Record<string, number>) => void;
  onCancel: () => void;
}

export function ScaleForm({ scale, onComplete, onCancel }: ScaleFormProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const currentIdx = Object.keys(answers).length;
  const totalItems = scale.items.length;
  const progress = (currentIdx / totalItems) * 100;
  const currentItem = scale.items[currentIdx];
  const isComplete = currentIdx >= totalItems;

  const totalScore = Object.values(answers).reduce((sum, v) => sum + v, 0);
  const interpretation = interpretScale(scale.id, totalScore);

  const handleAnswer = (itemId: string, value: number) => {
    const newAnswers = { ...answers, [itemId]: value };
    setAnswers(newAnswers);
    if (Object.keys(newAnswers).length >= totalItems) {
      const finalScore = Object.values(newAnswers).reduce((sum, v) => sum + v, 0);
      const interp = interpretScale(scale.id, finalScore);
      onComplete(finalScore, interp.label, interp.color, newAnswers);
    }
  };

  if (isComplete) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
        <div className="text-center mb-4">
          <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1">Escalas completada</div>
          <div className="text-lg font-bold text-white">{scale.name}</div>
        </div>
        <div className="text-center mb-4">
          <div className="text-3xl font-bold" style={{ color: interpretation.color }}>{totalScore}</div>
          <div className="text-sm font-medium mt-1" style={{ color: interpretation.color }}>{interpretation.label}</div>
          <div className="text-[10px] text-slate-500 mt-1">/{scale.maxScore} puntos</div>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 mb-4">
          <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${(totalScore / scale.maxScore) * 100}%`, backgroundColor: interpretation.color }} />
        </div>
        <div className="space-y-1 mb-4">
          {scale.interpretation.map((tier, i) => (
            <div key={i} className="flex items-center justify-between text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: totalScore <= tier.max ? `${tier.color}15` : 'transparent' }}>
              <span className={totalScore <= tier.max ? 'text-white font-medium' : 'text-slate-500'}>{tier.label}</span>
              <span className="text-slate-400 font-mono">{i === 0 ? `0-${tier.max}` : `${scale.interpretation[i - 1].max + 1}-${tier.max}`}</span>
            </div>
          ))}
        </div>
        <button onClick={onCancel} className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded-lg transition-colors">Cerrar</button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider">{scale.name}</div>
          <div className="text-xs text-slate-400">{scale.fullName}</div>
        </div>
        <button onClick={onCancel} className="text-slate-500 hover:text-white text-xs">✕</button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="text-[10px] text-slate-500 font-mono">{currentIdx + 1}/{totalItems}</div>
        <div className="flex-1 bg-slate-800 rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-cyan-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-[10px] text-slate-500 font-mono">{Math.round(progress)}%</div>
      </div>

      {currentItem && (
        <div>
          <div className="text-sm text-white font-medium mb-3 leading-relaxed">{currentItem.text}</div>
          <div className="space-y-1.5">
            {currentItem.options.map((opt) => (
              <button key={opt.value} onClick={() => handleAnswer(currentItem.id, opt.value)}
                className="w-full text-left px-3 py-2 rounded-lg border transition-all text-xs
                  border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 text-slate-300">
                <span className="font-mono text-[10px] text-slate-500 mr-2">{opt.value}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 text-[10px] text-slate-600 text-center">
        {scale.timeToComplete} · {scale.source}
      </div>
    </div>
  );
}
