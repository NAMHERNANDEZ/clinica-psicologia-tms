import { useState, useEffect, useMemo } from 'react';
import { patients, assessments, type Patient, type ClinicalAssessment } from '../../lib/api';
import { CLINICAL_SCALES, getAllScales, interpretScale, type ScaleDefinition } from '../../lib/clinicalScales';
import { ScaleForm } from '../../components/clinical/ScaleForm';
import { VASSlider } from '../../components/clinical/VASSlider';
import { ScaleInterpreter } from '../../components/clinical/ScaleInterpreter';
import { LineChart } from '../../components/ui/Chart';
import { ClipboardList, Plus, ChevronDown, ChevronUp, Activity, Beaker, Bell, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

const SCALE_FREQUENCY_DAYS: Record<string, number> = {
  phq9: 14,
  gad7: 14,
  ybocs: 21,
  vas: 1,
  psqi: 28,
  ftnd: 999,
  thi: 21,
  pcl5: 14,
};

const SCALE_FREQUENCY_LABELS: Record<string, string> = {
  phq9: 'Cada 2 semanas',
  gad7: 'Cada 2 semanas',
  ybocs: 'Cada 3 semanas',
  vas: 'Cada sesión',
  psqi: 'Cada 4 semanas',
  ftnd: 'Inicio y fin',
  thi: 'Cada 3 semanas',
  pcl5: 'Cada 2 semanas',
};

interface ScaleReminder {
  scale: ScaleDefinition;
  lastDate: string | null;
  daysSince: number;
  daysUntilDue: number;
  status: 'overdue' | 'due' | 'upcoming' | 'never';
}

function calculateReminders(allScales: ScaleDefinition[], assessments: ClinicalAssessment[]): ScaleReminder[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return allScales.map(scale => {
    const scaleAssessments = assessments
      .filter(a => a.assessment_type === scale.id)
      .sort((a, b) => new Date(b.administered_at).getTime() - new Date(a.administered_at).getTime());

    if (scaleAssessments.length === 0) {
      return {
        scale,
        lastDate: null,
        daysSince: -1,
        daysUntilDue: 0,
        status: 'never' as const,
      };
    }

    const lastDate = new Date(scaleAssessments[0].administered_at);
    lastDate.setHours(0, 0, 0, 0);
    const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    const frequency = SCALE_FREQUENCY_DAYS[scale.id] || 14;
    const daysUntilDue = frequency - daysSince;

    let status: 'overdue' | 'due' | 'upcoming' | 'never';
    if (daysUntilDue < 0) status = 'overdue';
    else if (daysUntilDue <= 2) status = 'due';
    else status = 'upcoming';

    return {
      scale,
      lastDate: scaleAssessments[0].administered_at,
      daysSince,
      daysUntilDue,
      status,
    };
  });
}

export default function ClinicalAssessmentsPage() {
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [patientAssessments, setPatientAssessments] = useState<ClinicalAssessment[]>([]);
  const [activeScale, setActiveScale] = useState<ScaleDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAssessment, setExpandedAssessment] = useState<number | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [demoAssessments, setDemoAssessments] = useState<ClinicalAssessment[]>([]);

  const allScales = getAllScales();
  const currentAssessments = demoMode ? demoAssessments : patientAssessments;

  const reminders = useMemo(() => calculateReminders(allScales, currentAssessments), [allScales, currentAssessments]);
  const overdueReminders = reminders.filter(r => r.status === 'overdue' || r.status === 'never');
  const dueReminders = reminders.filter(r => r.status === 'due');

  useEffect(() => {
    patients.list().then(res => setPatientList(res.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (demoMode || !selectedPatientId) { setPatientAssessments([]); return; }
    assessments.listByPatient(selectedPatientId).then(res => setPatientAssessments(res.data || [])).catch(() => {});
  }, [selectedPatientId, demoMode]);

  const handleScaleComplete = async (score: number, interpretation: string, color: string, _answers: Record<string, number>) => {
    if (!activeScale) return;
    if (demoMode) {
      const newAssessment: ClinicalAssessment = {
        id: Date.now(),
        patient_id: 0,
        assessment_type: activeScale.id,
        score,
        max_score: activeScale.maxScore,
        interpretation,
        administered_at: new Date().toISOString(),
      };
      setDemoAssessments(prev => [newAssessment, ...prev]);
      setActiveScale(null);
      return;
    }
    if (!selectedPatientId) return;
    try {
      await assessments.create({
        patient_id: selectedPatientId,
        assessment_type: activeScale.id,
        score,
        max_score: activeScale.maxScore,
        interpretation,
        administered_at: new Date().toISOString(),
      });
      const res = await assessments.listByPatient(selectedPatientId);
      setPatientAssessments(res.data || []);
    } catch (err) {
      console.error('Error saving assessment:', err);
    }
    setActiveScale(null);
  };

  const handleVASComplete = async (score: number, interpretation: string, color: string) => {
    if (demoMode) {
      const newAssessment: ClinicalAssessment = {
        id: Date.now(),
        patient_id: 0,
        assessment_type: 'vas',
        score,
        max_score: 10,
        interpretation,
        administered_at: new Date().toISOString(),
      };
      setDemoAssessments(prev => [newAssessment, ...prev]);
      setActiveScale(null);
      return;
    }
    if (!selectedPatientId) return;
    try {
      await assessments.create({
        patient_id: selectedPatientId,
        assessment_type: 'vas',
        score,
        max_score: 10,
        interpretation,
        administered_at: new Date().toISOString(),
      });
      const res = await assessments.listByPatient(selectedPatientId);
      setPatientAssessments(res.data || []);
    } catch (err) {
      console.error('Error saving assessment:', err);
    }
    setActiveScale(null);
  };

  const selectedPatient = patientList.find(p => p.id === selectedPatientId);
  const groupedAssessments: Record<string, ClinicalAssessment[]> = {};
  for (const a of currentAssessments) {
    if (!groupedAssessments[a.assessment_type]) groupedAssessments[a.assessment_type] = [];
    groupedAssessments[a.assessment_type].push(a);
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <ClipboardList className="w-5 h-5 text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Evaluaciones Clínicas</h1>
            <p className="text-xs text-slate-400">Escalas validadas FDA · Interpretación automática</p>
          </div>
        </div>

        {/* Selector de paciente */}
        <div className="flex items-end gap-3 mb-4">
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1 block">Paciente</label>
            <select value={selectedPatientId || ''} onChange={e => { setSelectedPatientId(Number(e.target.value) || null); setDemoMode(false); }}
              className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2">
              <option value="">Seleccionar paciente...</option>
              {patientList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button onClick={() => { setDemoMode(true); setSelectedPatientId(null); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${demoMode ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
            <Beaker className="w-3.5 h-3.5" />
            Demo
          </button>
        </div>

        {demoMode && (
          <div className="mb-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <Beaker className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] text-cyan-300">Modo demo — las evaluaciones no se guardan en el servidor</span>
          </div>
        )}

        {(selectedPatientId || demoMode) && (overdueReminders.length > 0 || dueReminders.length > 0) && (
          <div className="mb-4 space-y-2">
            {overdueReminders.length > 0 && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[10px] text-red-300 font-medium">Evaluaciones pendientes</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {overdueReminders.map(r => (
                    <button key={r.scale.id} onClick={() => setActiveScale(r.scale)}
                      className="flex items-center gap-1.5 bg-red-900/30 hover:bg-red-900/50 border border-red-500/20 rounded-full px-2.5 py-1 text-[10px] text-red-200 transition-colors">
                      <span className="font-medium">{r.scale.name}</span>
                      <span className="text-red-400">
                        {r.status === 'never' ? 'Nunca aplicada' : `+${Math.abs(r.daysUntilDue)} días`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {dueReminders.length > 0 && (
              <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] text-amber-300 font-medium">Por vencer</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dueReminders.map(r => (
                    <button key={r.scale.id} onClick={() => setActiveScale(r.scale)}
                      className="flex items-center gap-1.5 bg-amber-900/30 hover:bg-amber-900/50 border border-amber-500/20 rounded-full px-2.5 py-1 text-[10px] text-amber-200 transition-colors">
                      <span className="font-medium">{r.scale.name}</span>
                      <span className="text-amber-400">
                        {r.daysUntilDue === 0 ? 'Hoy' : r.daysUntilDue === 1 ? 'Mañana' : `${r.daysUntilDue} días`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {(selectedPatientId || demoMode) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Columna izquierda: Selector de escala */}
            <div className="space-y-2">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">Aplicar escala</div>
              {allScales.map(scale => {
                const latestForScale = patientAssessments.filter(a => a.assessment_type === scale.id).slice(0, 1)[0];
                const reminder = reminders.find(r => r.scale.id === scale.id);
                const isOverdue = reminder?.status === 'overdue' || reminder?.status === 'never';
                const isDue = reminder?.status === 'due';
                return (
                  <button key={scale.id} onClick={() => setActiveScale(scale)}
                    className={`w-full text-left bg-slate-900 border rounded-lg p-3 transition-all ${
                      isOverdue ? 'border-red-500/40 hover:border-red-400' :
                      isDue ? 'border-amber-500/40 hover:border-amber-400' :
                      'border-slate-800 hover:border-cyan-500/50'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <div className="text-xs font-medium text-white">{scale.name}</div>
                          {isOverdue && <AlertTriangle className="w-3 h-3 text-red-400" />}
                          {isDue && !isOverdue && <Clock className="w-3 h-3 text-amber-400" />}
                        </div>
                        <div className="text-[10px] text-slate-500">{scale.condition}</div>
                        <div className="text-[10px] text-slate-600 mt-0.5">{SCALE_FREQUENCY_LABELS[scale.id]}</div>
                      </div>
                      <div className="text-right">
                        {latestForScale ? (
                          <div className="text-xs font-mono" style={{ color: interpretScale(scale.id, latestForScale.score).color }}>
                            {latestForScale.score}/{scale.maxScore}
                          </div>
                        ) : (
                          <Plus className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Columna central: Formulario activo o historial */}
            <div className="lg:col-span-2">
              {activeScale ? (
                activeScale.id === 'vas' ? (
                  <VASSlider onComplete={handleVASComplete} onCancel={() => setActiveScale(null)} />
                ) : (
                  <ScaleForm scale={activeScale} onComplete={handleScaleComplete} onCancel={() => setActiveScale(null)} />
                )
              ) : (
                <div className="space-y-3">
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Historial de evaluaciones</div>
                  {Object.keys(groupedAssessments).length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                      <Activity className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                      <div className="text-xs text-slate-500">Sin evaluaciones registradas</div>
                      <div className="text-[10px] text-slate-600 mt-1">Selecciona una escala para comenzar</div>
                    </div>
                  ) : (
                    Object.entries(groupedAssessments).map(([type, records]) => {
                      const scale = CLINICAL_SCALES[type];
                      if (!scale) return null;
                      const latest = records[0];
                      return (
                        <div key={type} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                          <button onClick={() => setExpandedAssessment(expandedAssessment === type ? null : type)}
                            className="w-full flex items-center justify-between p-3 hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: interpretScale(type, latest.score).color }} />
                              <div className="text-left">
                                <div className="text-xs font-medium text-white">{scale.name}</div>
                                <div className="text-[10px] text-slate-500">{records.length} evaluación{records.length > 1 ? 'es' : ''}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-bold" style={{ color: interpretScale(type, latest.score).color }}>{latest.score}</div>
                              {expandedAssessment === type ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                            </div>
                          </button>
                          {expandedAssessment === type && (
                            <div className="border-t border-slate-800 p-3">
                              <ScaleInterpreter scale={scale} score={latest.score} />
                              {records.length >= 2 && (
                                <div className="mt-3">
                                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">Tendencia</div>
                                  <div className="bg-slate-800/50 rounded-lg p-2">
                                    <LineChart
                                      series={[{
                                        name: scale.name,
                                        data: [...records].reverse().map(r => r.score),
                                        color: interpretScale(type, latest.score).color,
                                      }]}
                                      maxVal={scale.maxScore}
                                      yLabels={scale.id === 'vas' ? [0, 5, 10] : [0, Math.round(scale.maxScore / 2), scale.maxScore]}
                                    />
                                    <div className="flex justify-between mt-1 px-1">
                                      {[...records].reverse().slice(0, 6).map((r, i) => (
                                        <span key={i} className="text-[8px] text-slate-600 font-mono">
                                          {new Date(r.administered_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {records.length > 1 && (
                                <div className="mt-3 space-y-1">
                                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Historial</div>
                                  {records.slice(1, 6).map((r, i) => {
                                    const interp = interpretScale(type, r.score);
                                    return (
                                      <div key={i} className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-slate-800/50">
                                        <span className="text-slate-400">{new Date(r.administered_at).toLocaleDateString('es-ES')}</span>
                                        <span className="font-mono" style={{ color: interp.color }}>{r.score}/{scale.maxScore} · {interp.label}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!selectedPatientId && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center mt-4">
            <ClipboardList className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <div className="text-sm text-slate-400">Selecciona un paciente para comenzar</div>
            <div className="text-[10px] text-slate-600 mt-1">PHQ-9 · GAD-7 · Y-BOCS · VAS · PSQI · FTND · THI · PCL-5</div>
          </div>
        )}
      </div>
    </div>
  );
}
