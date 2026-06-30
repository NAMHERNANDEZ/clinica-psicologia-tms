import { useState, useEffect } from 'react';
import { LineChart } from 'lucide-react';
import { simulation, patients, tmsProtocols, type Patient, type TmsProtocol } from '../../lib/api';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { SearchInput } from '../../components/ui/Misc';
import { LineChart as LineChartViz, type ChartSeries } from '../../components/ui/Chart';

interface SimResult {
  predicted_curve: Array<{ session: number; overall: number }>;
  recommendation: string;
}

interface CompareResult {
  protocol_a: { name: string; predicted_curve: Array<{ session: number; overall: number }> };
  protocol_b: { name: string; predicted_curve: Array<{ session: number; overall: number }> };
  recommendation: string;
}

export default function SimulatorPage() {
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [protocols, setProtocols] = useState<TmsProtocol[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedProtocolA, setSelectedProtocolA] = useState<number | null>(null);
  const [selectedProtocolB, setSelectedProtocolB] = useState<number | null>(null);
  const [mode, setMode] = useState<'simulate' | 'compare'>('simulate');
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [pRes, prRes] = await Promise.allSettled([patients.list(), tmsProtocols.list()]);
      if (pRes.status === 'fulfilled') setPatientList(pRes.value.data || []);
      if (prRes.status === 'fulfilled') setProtocols(prRes.value.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  const runSimulation = async () => {
    if (!selectedPatientId || !selectedProtocolA) return;
    setRunning(true);
    try {
      const res = await simulation.simulate(selectedPatientId, selectedProtocolA) as { data: SimResult };
      setSimResult(res.data);
    } catch { /* silent */ } finally { setRunning(false); }
  };

  const runComparison = async () => {
    if (!selectedPatientId || !selectedProtocolA || !selectedProtocolB) return;
    setRunning(true);
    try {
      const res = await simulation.compare(selectedPatientId, selectedProtocolA, selectedProtocolB) as { data: CompareResult };
      setCompareResult(res.data);
    } catch { /* silent */ } finally { setRunning(false); }
  };

  const filtered = patientList.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const toSeries = (curves: Array<{ name: string; data: Array<{ session: number; overall: number }>; color: string }>): ChartSeries[] =>
    curves.map(c => ({ name: c.name, data: c.data.map(p => p.overall), color: c.color }));

  const renderCurve = (curves: Array<{ name: string; data: Array<{ session: number; overall: number }>; color: string }>) => (
    <div className="relative h-48">
      <LineChartViz series={toSeries(curves)} />
    </div>
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
          <LineChart className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Simulador TMS</h1>
          <p className="text-sm text-slate-500">Simula y compara protocolos de estimulación</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button onClick={() => setMode('simulate')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'simulate' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          Simular Protocolo
        </button>
        <button onClick={() => setMode('compare')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'compare' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          Comparar Protocolos
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <Card>
            <CardHeader><h2 className="font-semibold text-slate-900">Paciente</h2></CardHeader>
            <CardBody>
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar paciente..." />
              <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                {filtered.map(p => (
                  <button key={p.id} onClick={() => setSelectedPatientId(p.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedPatientId === p.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}>
                    {p.name}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><h2 className="font-semibold text-slate-900">{mode === 'compare' ? 'Protocolo A' : 'Protocolo'}</h2></CardHeader>
            <CardBody>
              <select value={selectedProtocolA || ''} onChange={e => setSelectedProtocolA(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                <option value="">Seleccionar protocolo...</option>
                {protocols.map(p => <option key={p.id} value={p.id}>{p.name} — {p.target_area}</option>)}
              </select>
            </CardBody>
          </Card>

          {mode === 'compare' && (
            <Card>
              <CardHeader><h2 className="font-semibold text-slate-900">Protocolo B</h2></CardHeader>
              <CardBody>
                <select value={selectedProtocolB || ''} onChange={e => setSelectedProtocolB(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                  <option value="">Seleccionar protocolo...</option>
                  {protocols.map(p => <option key={p.id} value={p.id}>{p.name} — {p.target_area}</option>)}
                </select>
              </CardBody>
            </Card>
          )}

          <button onClick={mode === 'simulate' ? runSimulation : runComparison} disabled={running || !selectedPatientId || !selectedProtocolA || (mode === 'compare' && !selectedProtocolB)}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2">
            <LineChart className="w-4 h-4" />
            <span>{running ? 'Simulando...' : mode === 'simulate' ? 'Ejecutar Simulación' : 'Comparar Protocolos'}</span>
          </button>

          {simResult && mode === 'simulate' && (
            <Card>
              <CardHeader><h2 className="font-semibold text-slate-900">Resultado de Simulación</h2></CardHeader>
              <CardBody>
                {renderCurve([{ name: 'Predicción', data: simResult.predicted_curve, color: '#6366f1' }])}
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-700">{simResult.recommendation}</p>
                </div>
              </CardBody>
            </Card>
          )}

          {compareResult && mode === 'compare' && (
            <Card>
              <CardHeader><h2 className="font-semibold text-slate-900">Comparación de Protocolos</h2></CardHeader>
              <CardBody>
                {renderCurve([
                  { name: compareResult.protocol_a.name, data: compareResult.protocol_a.predicted_curve, color: '#6366f1' },
                  { name: compareResult.protocol_b.name, data: compareResult.protocol_b.predicted_curve, color: '#14b8a6' },
                ])}
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-700">{compareResult.recommendation}</p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
