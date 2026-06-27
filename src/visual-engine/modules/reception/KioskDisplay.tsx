import { useState, useEffect } from 'react';
import { cos } from '../../../lib/api';

interface WaitingPatient {
  patient_id: number;
  patient_name: string;
  time: string;
  position: number;
}

export default function KioskDisplay() {
  const [waiting, setWaiting] = useState<WaitingPatient[]>([]);
  const [currentPatient, setCurrentPatient] = useState<WaitingPatient | null>(null);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    load();
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const load = async () => {
    try {
      const res = await cos.getToday() as { data?: { waiting?: Array<{ patient_id: number; patient_name: string; time: string }> } };
      const w = (res?.data?.waiting || []).map((a, i) => ({
        patient_id: a.patient_id,
        patient_name: a.patient_name || 'Paciente',
        time: a.time,
        position: i + 1,
      }));
      setWaiting(w.slice(1));
      setCurrentPatient(w[0] || null);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Neurociencia Clínica</h1>
            <p className="text-blue-300 text-sm">Sistema de Gestión de Turnos</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-mono font-bold text-cyan-400">
              {time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-sm text-blue-300">
              {time.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {currentPatient && (
          <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-2xl p-8 mb-8 animate-pulse">
            <p className="text-sm text-cyan-300 mb-2">Turno Actual</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-white">{currentPatient.patient_name}</p>
                <p className="text-lg text-cyan-300 mt-1">Turno #{currentPatient.position}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-300">Hora programada</p>
                <p className="text-2xl font-mono text-white">{currentPatient.time}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
            <span className="w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
            <span>En Espera ({waiting.length})</span>
          </h2>

          {waiting.length === 0 ? (
            <p className="text-blue-300 text-center py-8">No hay pacientes en espera</p>
          ) : (
            <div className="space-y-3">
              {waiting.map((p, i) => (
                <div
                  key={p.patient_id}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all duration-500 ${
                    i === 0 ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-white/5'
                  }`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl font-bold text-cyan-400 w-8">{p.position}</span>
                    <div>
                      <p className="font-medium text-white">{p.patient_name}</p>
                      <p className="text-xs text-blue-300">Turno #{p.position}</p>
                    </div>
                  </div>
                  <p className="text-sm font-mono text-blue-300">{p.time}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-xs text-blue-400/50">
          <p>Xiuhtetelco — 5 de Febrero esq. Benito Juárez, Centro</p>
        </div>
      </div>
    </div>
  );
}
