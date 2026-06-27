import { useState, useEffect } from 'react';
import { digitalTwin } from '../../../lib/api';
import type { TwinPrediction } from '../../../lib/api';

interface CurvePoint {
  session: number;
  value: number;
}

interface DigitalTwinChartProps {
  patientId: number;
}

export default function DigitalTwinChart({ patientId }: DigitalTwinChartProps) {
  const [predictions, setPredictions] = useState<TwinPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [patientId]);

  const load = async () => {
    try {
      const res = await digitalTwin.getPredictions(patientId);
      setPredictions(res.data || []);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-900 rounded-2xl">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const predictedCurve: CurvePoint[] = predictions.map((p, i) => ({
    session: p.session_number || i + 1,
    value: p.predicted_overall || p.predicted_mood,
  }));

  const confidence = predictions.length > 0
    ? predictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / predictions.length
    : 0;

  const riskLevel = predictions.length > 0
    ? predictions.reduce((sum, p) => sum + (p.risk_score || 0), 0) / predictions.length
    : 0;

  const trend = predictedCurve.length >= 2
    ? predictedCurve[predictedCurve.length - 1].value > predictedCurve[0].value
      ? 'improving'
      : predictedCurve[predictedCurve.length - 1].value < predictedCurve[0].value
        ? 'declining'
        : 'stable'
    : 'stable';

  const viewBox = { width: 600, height: 250, padding: { top: 30, right: 30, bottom: 40, left: 50 } };
  const chartW = viewBox.width - viewBox.padding.left - viewBox.padding.right;
  const chartH = viewBox.height - viewBox.padding.top - viewBox.padding.bottom;

  const maxVal = 10;
  const maxSession = Math.max(predictedCurve.length, 1);

  const toX = (session: number) => viewBox.padding.left + ((session - 1) / maxSession) * chartW;
  const toY = (val: number) => viewBox.padding.top + chartH - (val / maxVal) * chartH;

  const pathD = predictedCurve.map((pt, i) =>
    i === 0 ? `M ${toX(pt.session)} ${toY(pt.value)}` : `L ${toX(pt.session)} ${toY(pt.value)}`
  ).join(' ');

  const areaD = pathD + ` L ${toX(predictedCurve[predictedCurve.length - 1]?.session || 1)} ${toY(0)} L ${toX(1)} ${toY(0)} Z`;

  return (
    <div className="bg-slate-900 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Digital Twin — Predicción</h3>
        <div className="flex items-center space-x-3">
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
            trend === 'improving' ? 'bg-emerald-500/20 text-emerald-400' :
            trend === 'declining' ? 'bg-red-500/20 text-red-400' :
            'bg-amber-500/20 text-amber-400'
          }`}>
            {trend === 'improving' ? '↑ Mejorando' : trend === 'declining' ? '↓ Estable' : '→ Estable'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-400">Confianza</p>
          <p className={`text-xl font-bold ${confidence > 0.7 ? 'text-emerald-400' : confidence > 0.4 ? 'text-amber-400' : 'text-red-400'}`}>
            {Math.round(confidence * 100)}%
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-400">Riesgo</p>
          <p className={`text-xl font-bold ${riskLevel > 0.6 ? 'text-red-400' : riskLevel > 0.3 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {Math.round(riskLevel * 100)}%
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-400">Sesiones</p>
          <p className="text-xl font-bold text-purple-400">{predictions.length}</p>
        </div>
      </div>

      <div className="relative bg-slate-800 rounded-xl overflow-hidden" style={{ height: '220px' }}>
        <svg viewBox={`0 0 ${viewBox.width} ${viewBox.height}`} className="w-full h-full">
          <defs>
            <linearGradient id="twinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 2, 4, 6, 8, 10].map(v => (
            <g key={v}>
              <line x1={viewBox.padding.left} y1={toY(v)} x2={viewBox.width - viewBox.padding.right} y2={toY(v)} stroke="#334155" strokeWidth="0.5" />
              <text x={viewBox.padding.left - 8} y={toY(v) + 4} textAnchor="end" className="fill-slate-500" style={{ fontSize: '10px' }}>{v}</text>
            </g>
          ))}

          {predictedCurve.length > 1 && (
            <>
              <path d={areaD} fill="url(#twinGrad)" />
              <path d={pathD} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ strokeDasharray: 1000, strokeDashoffset: 1000, animation: 'drawLine 2s ease forwards' }} />
            </>
          )}

          {predictedCurve.map((pt, i) => (
            <circle key={i} cx={toX(pt.session)} cy={toY(pt.value)} r="4" fill="#8b5cf6" stroke="#1e1b4b" strokeWidth="2">
              <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
            </circle>
          ))}

          <text x={viewBox.width / 2} y={viewBox.height - 5} textAnchor="middle" className="fill-slate-500" style={{ fontSize: '10px' }}>
            Sesión
          </text>
          <text x="12" y={viewBox.height / 2} textAnchor="middle" className="fill-slate-500" style={{ fontSize: '10px' }} transform={`rotate(-90, 12, ${viewBox.height / 2})`}>
            Puntuación
          </text>
        </svg>

        <style>{`@keyframes drawLine { to { stroke-dashoffset: 0; } }`}</style>
      </div>

      {predictions.length > 0 && (
        <div className="mt-4 flex items-center space-x-2 text-xs text-slate-500">
          <span className="w-3 h-0.5 bg-purple-500 rounded" />
          <span>Curva de predicción del gemelo digital</span>
        </div>
      )}
    </div>
  );
}
