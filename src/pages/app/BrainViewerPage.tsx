import { useState, useEffect } from 'react';
import BrainViewer from '../../visual-engine/modules/brain/BrainViewer';
import { patients, type Patient } from '../../lib/api';

export default function BrainViewerPage() {
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number>(0);
  const [loadingPatients, setLoadingPatients] = useState(true);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const res = await patients.list();
        setPatientList(res.data || []);
      } catch { /* silent */ } finally { setLoadingPatients(false); }
    };
    loadPatients();
  }, []);

  const selectedPatient = patientList.find(p => p.id === selectedPatientId);

  if (selectedPatientId && selectedPatient) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-1">Brain Viewer</h1>
          <p className="text-sm text-slate-400 mb-4">Actividad Cerebral</p>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-cyan-400 font-medium">{selectedPatient.name}</span>
              {selectedPatient.phone && <span className="text-xs text-slate-500">{selectedPatient.phone}</span>}
            </div>
            <button
              onClick={() => setSelectedPatientId(0)}
              className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              ← Cambiar paciente
            </button>
          </div>

          <BrainViewer patientId={selectedPatientId} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-1">Brain Viewer</h1>
        <p className="text-sm text-slate-400 mb-6">Actividad Cerebral</p>

        <p className="text-sm text-slate-400 mb-4">Selecciona un paciente:</p>

        {loadingPatients ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : patientList.length === 0 ? (
          <div className="bg-slate-900 rounded-xl p-8 text-center">
            <p className="text-slate-500">No hay pacientes registrados</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {patientList.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPatientId(p.id)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 rounded-xl p-4 text-left transition-all group"
              >
                <div className="w-10 h-10 bg-slate-800 group-hover:bg-cyan-900/40 rounded-full flex items-center justify-center text-sm font-bold text-slate-400 group-hover:text-cyan-400 mb-2">
                  {p.name.charAt(0)}
                </div>
                <div className="text-sm font-medium text-white group-hover:text-cyan-400">{p.name}</div>
                {p.phone && <div className="text-[11px] text-slate-500 mt-0.5">{p.phone}</div>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
