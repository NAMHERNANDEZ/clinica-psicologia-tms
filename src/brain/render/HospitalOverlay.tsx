import type { ProtocolPhase } from '../simulation/ProtocolStateMachine';

interface HospitalOverlayProps {
  phase: ProtocolPhase;
  regionActivations: Map<string, number>;
  coilIntensity: number;
  pulseCount: number;
  connectome: number[][];
}

const PHASE_NAMES: Record<ProtocolPhase, string> = {
  idle: 'STANDBY',
  approach: 'COIL APPROACH',
  ramp: 'INTENSITY RAMP',
  propagation: 'CORTICAL PROPAGATION',
  peak: 'PEAK STIMULATION',
  cooldown: 'COOLDOWN',
  complete: 'SESSION COMPLETE',
};

export function HospitalOverlay({ phase, regionActivations, coilIntensity, pulseCount, connectome }: HospitalOverlayProps) {
  const activeCount = Array.from(regionActivations.values()).filter(v => v > 0.05).length;
  const avgActivation = regionActivations.size > 0
    ? Array.from(regionActivations.values()).reduce((a, b) => a + b, 0) / regionActivations.size
    : 0;
  const maxWeight = connectome.length > 0 ? Math.max(...connectome.flat()) : 0;
  const isActive = phase !== 'idle' && phase !== 'complete';

  return (
    <div className="pointer-events-none absolute inset-0 z-10 font-mono">
      <div className="absolute top-3 left-3">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-bold tracking-[0.15em] ${
          isActive
            ? 'bg-[#0D1117]/90 text-[#4ECDC4] border border-[#4ECDC4]/30'
            : 'bg-[#0D1117]/60 text-[#5A6A7A] border border-[#1A202C]'
        }`}>
          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#4ECDC4] animate-pulse" />}
          {PHASE_NAMES[phase]}
        </div>
      </div>

      <div className="absolute top-3 right-3 text-[8px] text-[#3A4A5A] tracking-wider">
        NEUROSIM v3.0 — TMS NAVIGATION
      </div>

      <div className="absolute bottom-3 left-3 flex gap-3">
        {[
          { label: 'COIL OUTPUT', value: `${Math.round(coilIntensity * 100)}`, unit: '%', bar: coilIntensity },
          { label: 'PULSES', value: String(pulseCount), unit: '', bar: 0 },
          { label: 'MEAN ACT', value: `${Math.round(avgActivation * 100)}`, unit: '%', bar: avgActivation },
          { label: 'REGIONS', value: String(activeCount), unit: '/10', bar: activeCount / 10 },
          { label: 'MAX W', value: maxWeight.toFixed(2), unit: '', bar: maxWeight },
        ].map(item => (
          <div key={item.label} className="bg-[#0D1117]/85 border border-[#1A202C] rounded-sm px-2.5 py-1.5 min-w-[60px]">
            <div className="text-[7px] text-[#4A5A6A] tracking-[0.2em] mb-0.5">{item.label}</div>
            <div className="text-sm font-bold text-[#C8D0DA]">
              {item.value}<span className="text-[9px] text-[#5A6A7A] ml-0.5">{item.unit}</span>
            </div>
            {item.bar > 0 && (
              <div className="w-full h-[2px] bg-[#1A202C] mt-1 overflow-hidden">
                <div
                  className="h-full bg-[#4ECDC4]/60 transition-all duration-300"
                  style={{ width: `${Math.min(100, item.bar * 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="absolute bottom-3 right-3">
        <div className="bg-[#0D1117]/85 border border-[#1A202C] rounded-sm px-2.5 py-2">
          <div className="text-[7px] text-[#4A5A6A] tracking-[0.2em] mb-1.5">CORTICAL MAP</div>
          <div className="grid grid-cols-5 gap-[3px]">
            {[
              ['dlpfc_l', 'DLP'], ['dlpfc_r', 'DPR'], ['m1_l', 'M1L'], ['m1_r', 'M1R'], ['sma', 'SMA'],
              ['acc', 'ACC'], ['insula_l', 'InL'], ['insula_r', 'InR'], ['broca', 'BRC'], ['wernicke', 'WRN'],
            ].map(([id, label]) => {
              const val = regionActivations.get(id) || 0;
              return (
                <div key={id} className="flex flex-col items-center">
                  <div
                    className="w-3.5 h-3.5 rounded-[2px] transition-all duration-300 border"
                    style={{
                      backgroundColor: val > 0.5 ? '#2563A8' : val > 0.1 ? '#2E7D8A' : '#0D1117',
                      borderColor: val > 0.1 ? '#4ECDC440' : '#1A202C',
                    }}
                  />
                  <span className="text-[5px] text-[#4A5A6A] mt-[2px]">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isActive && (
        <div className="absolute top-1/2 right-3 -translate-y-1/2">
          <div className="bg-[#0D1117]/80 border border-[#1A202C] rounded-sm px-2 py-2">
            <div className="text-[7px] text-[#4A5A6A] tracking-[0.2em] mb-1">ACTIVE PATHWAYS</div>
            {Array.from(regionActivations.entries())
              .filter(([, v]) => v > 0.05)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([id, val]) => (
                <div key={id} className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-1 h-1 rounded-full bg-[#4ECDC4]" />
                  <span className="text-[8px] text-[#8A96A3]">{id.toUpperCase()}</span>
                  <span className="text-[8px] text-[#4ECDC4]/70 ml-auto">{Math.round(val * 100)}%</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
