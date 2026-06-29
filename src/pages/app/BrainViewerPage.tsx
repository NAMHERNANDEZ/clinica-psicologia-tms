import { useState, useEffect } from 'react';
import BrainViewer from '../../visual-engine/modules/brain/BrainViewer';
import { patients, type Patient } from '../../lib/api';

export default function BrainViewerPage() {
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number>(0);
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const res = await patients.list();
        setPatientList(res.data || []);
      } catch { /* silent - public route */ }
    };
    loadPatients();
  }, []);

  const selectedPatient = patientList.find(p => p.id === selectedPatientId);

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-1">Brain Viewer</h1>
        <p className="text-sm text-slate-400 mb-4">Actividad Cerebral</p>

        {selectedPatientId > 0 && selectedPatient && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-cyan-400 font-medium">{selectedPatient.name}</span>
              {selectedPatient.phone && <span className="text-xs text-slate-500">{selectedPatient.phone}</span>}
            </div>
            <button
              onClick={() => { setSelectedPatientId(0); setShowGrid(true); }}
              className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              ← Cambiar paciente
            </button>
          </div>
        )}

        {showGrid && patientList.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-slate-400 mb-3">Selecciona un paciente:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {patientList.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPatientId(p.id); setShowGrid(false); }}
                  className={`bg-slate-900 hover:bg-slate-800 border rounded-xl p-4 text-left transition-all group ${
                    selectedPatientId === p.id ? 'border-cyan-500' : 'border-slate-700 hover:border-cyan-500/50'
                  }`}
                >
                  <div className="w-10 h-10 bg-slate-800 group-hover:bg-cyan-900/40 rounded-full flex items-center justify-center text-sm font-bold text-slate-400 group-hover:text-cyan-400 mb-2">
                    {p.name.charAt(0)}
                  </div>
                  <div className="text-sm font-medium text-white group-hover:text-cyan-400">{p.name}</div>
                  {p.phone && <div className="text-[11px] text-slate-500 mt-0.5">{p.phone}</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {!showGrid && selectedPatientId === 0 && patientList.length > 0 && (
          <button
            onClick={() => setShowGrid(true)}
            className="mb-4 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            ← Seleccionar paciente
          </button>
        )}

        <BrainViewer patientId={selectedPatientId} />
      </div>
    </div>
  );
}
