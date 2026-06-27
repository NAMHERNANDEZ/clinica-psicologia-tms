import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { digitalTwin, patients, type Patient, type TwinPrediction } from '../../lib/api';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { SearchInput } from '../../components/ui/Misc';

interface PredictionData {
  predicted_mood: number;
  predicted_anxiety: number;
  predicted_overall: number;
  confidence: number;
  risk_score: number;
  rule_applied: string;
}

export default function DigitalTwinPage() {
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [predictions, setPredictions] = useState<TwinPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { loadPatients(); }, []);

  const loadPatients = async () => {
    try {
      const res = await patients.list();
      setPatientList(res.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const loadPredictions = async (patientId: number) => {
    try {
      const res = await digitalTwin.getPredictions(patientId);
      setPredictions(res.data || []);
    } catch { /* silent */ }
  };

  const runPrediction = async () => {
    if (!selectedPatientId) return;
    setPredicting(true);
    try {
      const res = await digitalTwin.predict({ patient_id: selectedPatientId, session_number: predictions.length + 1 });
      const d = (res as { data?: PredictionData }).data;
      if (d) {
        setPrediction(d);
        loadPredictions(selectedPatientId);
      }
    } catch { /* silent */ } finally { setPredicting(false); }
  };

  const selectPatient = (id: number) => {
    setSelectedPatientId(id);
    setPrediction(null);
    loadPredictions(id);
  };

  const filtered = patientList.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search));

  const confidenceColor = (c: number) => c > 0.7 ? 'text-emerald-600' : c > 0.4 ? 'text-amber-600' : 'text-red-600';
  const riskColor = (r: number) => r > 0.7 ? 'text-red-600' : r > 0.4 ? 'text-amber-600' : 'text-emerald-600';

  const moodTrend = predictions.length >= 2 ? predictions[predictions.length - 1].predicted_mood - predictions[predictions.length - 2].predicted_mood : 0;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Digital Twin</h1>
          <p className="text-sm text-slate-500">Gemelo digital predictivo para seguimiento clínico</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <Card>
            <CardHeader><h2 className="font-semibold text-slate-900">Seleccionar Paciente</h2></CardHeader>
            <CardBody>
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar paciente..." />
              <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
                {filtered.map(p => (
                  <button key={p.id} onClick={() => selectPatient(p.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedPatientId === p.id ? 'bg-cyan-50 text-cyan-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}>
                    {p.name}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedPatientId ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Predicciones</h2>
                <button onClick={runPrediction} disabled={predicting}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50 transition-colors">
                  {predicting ? 'Calculando...' : 'Nueva Predicción'}
                </button>
              </div>

              {prediction && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card><CardBody>
                    <p className="text-xs text-slate-500 mb-1">Ánimo Predicho</p>
                    <p className="text-2xl font-bold text-slate-900">{prediction.predicted_mood}/10</p>
                    <div className="flex items-center mt-1">
                      {moodTrend > 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : moodTrend < 0 ? <TrendingDown className="w-4 h-4 text-red-500" /> : <Minus className="w-4 h-4 text-slate-400" />}
                      <span className={`text-xs ml-1 ${moodTrend > 0 ? 'text-emerald-600' : moodTrend < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {moodTrend > 0 ? '+' : ''}{moodTrend.toFixed(1)}
                      </span>
                    </div>
                  </CardBody></Card>
                  <Card><CardBody>
                    <p className="text-xs text-slate-500 mb-1">Ansiedad Predicha</p>
                    <p className="text-2xl font-bold text-slate-900">{prediction.predicted_anxiety}/10</p>
                  </CardBody></Card>
                  <Card><CardBody>
                    <p className="text-xs text-slate-500 mb-1">Confianza</p>
                    <p className={`text-2xl font-bold ${confidenceColor(prediction.confidence)}`}>{Math.round(prediction.confidence * 100)}%</p>
                  </CardBody></Card>
                  <Card><CardBody>
                    <p className="text-xs text-slate-500 mb-1">Riesgo</p>
                    <p className={`text-2xl font-bold ${riskColor(prediction.risk_score)}`}>{Math.round(prediction.risk_score * 100)}%</p>
                  </CardBody></Card>
                </div>
              )}

              {prediction && (
                <Card>
                  <CardHeader><h2 className="font-semibold text-slate-900">Regla Aplicada</h2></CardHeader>
                  <CardBody>
                    <p className="text-sm text-slate-600">{prediction.rule_applied || 'Sin regla aplicable'}</p>
                    {prediction.risk_score > 0.5 && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">Alerta de Riesgo</p>
                          <p className="text-xs text-amber-600">El nivel de riesgo es elevado. Se recomienda revisión clínica.</p>
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}

              {predictions.length > 0 && (
                <Card>
                  <CardHeader><h2 className="font-semibold text-slate-900">Curva de Predicciones</h2></CardHeader>
                  <CardBody>
                    <div className="relative h-48">
                      <svg viewBox="0 0 600 180" className="w-full h-full">
                        <line x1="40" y1="10" x2="40" y2="160" stroke="#e2e8f0" strokeWidth="1" />
                        <line x1="40" y1="160" x2="580" y2="160" stroke="#e2e8f0" strokeWidth="1" />
                        {[0, 2, 4, 6, 8, 10].map(v => (
                          <g key={v}>
                            <line x1="35" y1={160 - v * 15} x2="40" y2={160 - v * 15} stroke="#cbd5e1" strokeWidth="1" />
                            <text x="30" y={164 - v * 15} textAnchor="end" className="text-[10px] fill-slate-400">{v}</text>
                          </g>
                        ))}
                        {predictions.slice(-10).map((p, i, arr) => {
                          const x = 50 + (i / Math.max(arr.length - 1, 1)) * 520;
                          const y = 160 - p.predicted_mood * 15;
                          return i === 0 ? null : (
                            <line key={p.id} x1={50 + ((i - 1) / Math.max(arr.length - 1, 1)) * 520} y1={160 - arr[i - 1].predicted_mood * 15} x2={x} y2={y} stroke="#06b6d4" strokeWidth="2" />
                          );
                        })}
                        {predictions.slice(-10).map((p, i, arr) => {
                          const x = 50 + (i / Math.max(arr.length - 1, 1)) * 520;
                          const y = 160 - p.predicted_mood * 15;
                          return <circle key={p.id} cx={x} cy={y} r="4" fill="#06b6d4" />;
                        })}
                      </svg>
                    </div>
                  </CardBody>
                </Card>
              )}
            </>
          ) : (
            <Card><CardBody><p className="text-center text-slate-400 py-12">Selecciona un paciente para ver predicciones</p></CardBody></Card>
          )}
        </div>
      </div>
    </div>
  );
}
