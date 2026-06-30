import type { Patient } from '../../lib/api';

interface PatientSelectorProps {
  patients: Patient[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function PatientSelector({ patients, selectedId, onSelect }: PatientSelectorProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
      <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">Pacientes</div>
      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {patients.map(p => (
          <button key={p.id} onClick={() => onSelect(p.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
              selectedId === p.id
                ? 'bg-cyan-900/30 border border-cyan-500/50 text-cyan-400'
                : 'bg-slate-800/50 border border-transparent text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}>
            <div className="font-medium">{p.name}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{p.phone}</div>
          </button>
        ))}
        {patients.length === 0 && (
          <div className="text-center text-slate-500 text-xs py-4">Sin pacientes</div>
        )}
      </div>
    </div>
  );
}
