import { useState, useEffect } from 'react';
import { cos } from '../../../lib/api';
import { getStepLabel, getStepIcon, getTimelineProgress } from '../../core/TimelineEngine';
import type { PatientState } from '../../core/StateMapper';
import { STATE_COLORS } from '../../core/StateMapper';

const ALL_STEPS: PatientState[] = [
  'REGISTERED', 'EVALUATED', 'MT_MEASURED', 'PROTOCOL_ASSIGNED',
  'IN_TREATMENT', 'UNDER_OBSERVATION', 'DISCHARGED',
];

interface ClinicalTimelineProps {
  patientId: number;
}

export default function ClinicalTimeline({ patientId }: ClinicalTimelineProps) {
  const [currentState, setCurrentState] = useState<PatientState>('REGISTERED');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [patientId]);

  const load = async () => {
    try {
      const res = await cos.getNextAction(patientId) as { data?: { current_state?: PatientState } };
      setCurrentState(res?.data?.current_state || 'REGISTERED');
    } catch { /* silent */ } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentIdx = ALL_STEPS.indexOf(currentState);
  const progress = getTimelineProgress(currentState);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">Flujo Clínico</h3>
        <span className="text-sm font-medium text-slate-500">{progress}% completado</span>
      </div>

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />
        <div
          className="absolute left-6 top-0 w-0.5 bg-gradient-to-b from-teal-500 to-cyan-500 transition-all duration-700"
          style={{ height: `${progress}%` }}
        />

        <div className="space-y-6">
          {ALL_STEPS.map((step, idx) => {
            const completed = idx < currentIdx;
            const active = idx === currentIdx;
            const color = STATE_COLORS[step];

            return (
              <div key={step} className="relative flex items-start space-x-4" style={{ animationDelay: `${idx * 100}ms` }}>
                <div
                  className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-500 ${
                    completed ? 'bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-lg shadow-teal-500/30' :
                    active ? `text-white shadow-lg` :
                    'bg-slate-100 text-slate-400'
                  }`}
                  style={active ? { backgroundColor: color, boxShadow: `0 0 20px ${color}40` } : undefined}
                >
                  {completed ? '✓' : getStepIcon(step)}
                </div>

                <div className={`flex-1 pb-6 ${idx === ALL_STEPS.length - 1 ? 'pb-0' : ''}`}>
                  <div className="flex items-center space-x-2">
                    <p className={`font-semibold ${active ? 'text-slate-900' : completed ? 'text-teal-700' : 'text-slate-400'}`}>
                      {getStepLabel(step)}
                    </p>
                    {active && (
                      <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded-full animate-pulse">
                        Actual
                      </span>
                    )}
                    {completed && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                        Completado
                      </span>
                    )}
                  </div>
                  {active && (
                    <p className="text-sm text-slate-500 mt-1">
                      {step === 'REGISTERED' && 'Paciente registrado en el sistema'}
                      {step === 'EVALUATED' && 'Evaluación clínica completada'}
                      {step === 'MT_MEASURED' && 'Umbral motor medido'}
                      {step === 'PROTOCOL_ASSIGNED' && 'Protocolo TMS asignado'}
                      {step === 'IN_TREATMENT' && 'En tratamiento activo'}
                      {step === 'UNDER_OBSERVATION' && 'Período de observación'}
                      {step === 'DISCHARGED' && 'Paciente dado de alta'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
