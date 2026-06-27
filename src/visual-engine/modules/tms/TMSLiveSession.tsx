import { useState, useEffect, useRef } from 'react';
import { getIntensityConfig, getIntensityGradient } from './intensity-map';

interface TMSLiveSessionProps {
  sessionData: {
    intensity_pct: number;
    frequency_hz: number;
    pulses_delivered: number;
    pulses_total: number;
    coil_position: string;
    status: string;
    session_number: number;
  };
  isLive?: boolean;
}

export default function TMSLiveSession({ sessionData, isLive = false }: TMSLiveSessionProps) {
  const [pulseCount, setPulseCount] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intensityConfig = getIntensityConfig(sessionData.intensity_pct);

  useEffect(() => {
    if (isLive && sessionData.status === 'in_progress') {
      intervalRef.current = setInterval(() => {
        setIsPulsing(true);
        setPulseCount(prev => Math.min(prev + 1, sessionData.pulses_total));
        setTimeout(() => setIsPulsing(false), 200);
      }, 60000 / sessionData.frequency_hz);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isLive, sessionData.status, sessionData.frequency_hz, sessionData.pulses_total]);

  const progress = sessionData.pulses_total > 0
    ? Math.round((sessionData.pulses_delivered / sessionData.pulses_total) * 100)
    : 0;

  const displayPulses = isLive ? pulseCount : sessionData.pulses_delivered;

  return (
    <div className="bg-slate-900 rounded-2xl p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">Sesión TMS #{sessionData.session_number}</h3>
          <p className="text-sm text-slate-400">{sessionData.coil_position}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          sessionData.status === 'in_progress' ? 'bg-emerald-500/20 text-emerald-400' :
          sessionData.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
          'bg-slate-700 text-slate-400'
        }`}>
          {sessionData.status === 'in_progress' ? '● EN CURSO' :
           sessionData.status === 'completed' ? '✓ COMPLETADA' : '○ PROGRAMADA'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">INTENSIDAD</p>
          <div className="flex items-end space-x-2">
            <span className="text-3xl font-bold" style={{ color: intensityConfig.color }}>
              {sessionData.intensity_pct}
            </span>
            <span className="text-sm text-slate-400 mb-1">% MT</span>
          </div>
          <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(sessionData.intensity_pct, 120)}%`,
                maxWidth: '100%',
                background: getIntensityGradient(sessionData.intensity_pct),
              }}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: intensityConfig.color }}>{intensityConfig.label}</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">FRECUENCIA</p>
          <div className="flex items-end space-x-2">
            <span className="text-3xl font-bold text-cyan-400">{sessionData.frequency_hz}</span>
            <span className="text-sm text-slate-400 mb-1">Hz</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {sessionData.frequency_hz <= 1 ? 'Estímulo único' : `Tren de ${sessionData.frequency_hz} pulsos/seg`}
          </p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-400">PULSE TRAIN</p>
          <p className="text-sm font-mono text-slate-300">
            {displayPulses} / {sessionData.pulses_total}
          </p>
        </div>
        <div className="flex items-center space-x-1 mb-3">
          {Array.from({ length: Math.min(50, sessionData.pulses_total) }).map((_, i) => {
            const filled = i < Math.floor((displayPulses / sessionData.pulses_total) * 50);
            return (
              <div
                key={i}
                className={`w-1.5 h-4 rounded-sm transition-all duration-200 ${
                  filled ? 'bg-cyan-400' : 'bg-slate-700'
                } ${isPulsing && i === Math.floor((displayPulses / sessionData.pulses_total) * 50) ? 'bg-cyan-300 scale-125' : ''}`}
              />
            );
          })}
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {isLive && sessionData.status === 'in_progress' && (
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isPulsing ? 'bg-cyan-400 scale-125' : 'bg-slate-600'} transition-all duration-100`} />
          <div className={`w-3 h-3 rounded-full ${isPulsing ? 'bg-cyan-400 scale-125' : 'bg-slate-600'} transition-all duration-100`} style={{ animationDelay: '0.1s' }} />
          <div className={`w-3 h-3 rounded-full ${isPulsing ? 'bg-cyan-400 scale-125' : 'bg-slate-600'} transition-all duration-100`} style={{ animationDelay: '0.2s' }} />
          <span className="text-xs text-slate-400 ml-2">Simulación de pulso en tiempo real</span>
        </div>
      )}
    </div>
  );
}
