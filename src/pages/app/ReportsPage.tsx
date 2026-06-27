import { useState, useEffect } from 'react';
import { FileText, Download } from 'lucide-react';
import { reports, patients, type Patient, type TreatmentSummary } from '../../lib/api';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { SearchInput } from '../../components/ui/Misc';

export default function ReportsPage() {
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [summary, setSummary] = useState<TreatmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const res = await patients.list();
      setPatientList(res.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const loadSummary = async (patientId: number) => {
    try {
      const res = await reports.getTreatmentSummary(patientId);
      setSummary(res.data);
    } catch { /* silent */ }
  };

  const selectPatient = (id: number) => {
    setSelectedPatientId(id);
    setSummary(null);
    loadSummary(id);
  };

  const generateReport = async (format: 'pdf' | 'csv') => {
    if (!selectedPatientId) return;
    setGenerating(true);
    try {
      await reports.generate(selectedPatientId, format);
    } catch { /* silent */ } finally { setGenerating(false); }
  };

  const filtered = patientList.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
          <p className="text-sm text-slate-500">Genera reportes clínicos y exporta datos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <Card>
            <CardHeader><h2 className="font-semibold text-slate-900">Paciente</h2></CardHeader>
            <CardBody>
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar paciente..." />
              <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
                {filtered.map(p => (
                  <button key={p.id} onClick={() => selectPatient(p.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedPatientId === p.id ? 'bg-amber-50 text-amber-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}>
                    {p.name}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedPatientId && summary ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Resumen del Tratamiento</h2>
                <div className="flex items-center space-x-2">
                  <button onClick={() => generateReport('pdf')} disabled={generating}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                    <Download className="w-4 h-4" /><span>PDF</span>
                  </button>
                  <button onClick={() => generateReport('csv')} disabled={generating}
                    className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                    <Download className="w-4 h-4" /><span>CSV</span>
                  </button>
                </div>
              </div>

              <Card>
                <CardHeader><h2 className="font-semibold text-slate-900">{summary.patient.name}</h2></CardHeader>
                <CardBody>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Protocolo</p>
                      <p className="font-medium text-slate-900">{summary.protocol.name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Progreso</p>
                      <p className="font-medium text-slate-900">{summary.progress.completed}/{summary.progress.total} sesiones ({summary.progress.percentage}%)</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${summary.progress.percentage}%` }} />
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader><h2 className="font-semibold text-slate-900">Scores Clínicos</h2></CardHeader>
                <CardBody>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(summary.clinical_scores.baseline || {}).map(([key, val]) => (
                      <div key={key}>
                        <p className="text-xs text-slate-500 uppercase">{key}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm font-medium text-slate-400">{val as number}</span>
                          <span className="text-slate-300">→</span>
                          <span className="text-sm font-bold text-slate-900">{(summary.clinical_scores.latest || {})[key] as number ?? '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </>
          ) : (
            <Card><CardBody><p className="text-center text-slate-400 py-12">Selecciona un paciente para generar reportes</p></CardBody></Card>
          )}
        </div>
      </div>
    </div>
  );
}
