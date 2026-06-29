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

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-1">Brain Viewer</h1>
        <p className="text-sm text-slate-400 mb-4">Actividad cerebral simulada en tiempo real</p>

        <div className="mb-4">
          <label className="text-xs text-slate-500 mb-1 block">Paciente</label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(Number(e.target.value))}
            className="bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:border-cyan-500"
            disabled={loadingPatients}
          >
            <option value={0}>Seleccionar paciente...</option>
            {patientList.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <BrainViewer patientId={selectedPatientId} />
      </div>
    </div>
  );
}
