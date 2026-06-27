import type { BrainState } from './PropagationEngine';
import { applyExternalStimulus, decayState } from './PropagationEngine';
import { applyPlasticity } from './PlasticityEngine';

export interface ProtocolConfig {
  targetRegion: string;
  frequencyHz: number;
  intensityPctMt: number;
  durationSec: number;
  totalPulses: number;
  mtPct: number;
}

export type ProtocolPhase = 'idle' | 'approach' | 'ramp' | 'propagation' | 'peak' | 'cooldown' | 'complete';

export interface ProtocolState {
  phase: ProtocolPhase;
  phaseTime: number;
  totalElapsed: number;
  pulseCount: number;
  nextPulseIn: number;
  coilIntensity: number;
  targetIdx: number;
  config: ProtocolConfig | null;
}

const PHASE_DURATIONS: Record<ProtocolPhase, number> = {
  idle: 0,
  approach: 500,
  ramp: 800,
  propagation: 1000,
  peak: 1200,
  cooldown: 600,
  complete: 0,
};

const PHASE_ORDER: ProtocolPhase[] = ['approach', 'ramp', 'propagation', 'peak', 'cooldown', 'complete'];

export function createProtocolState(): ProtocolState {
  return {
    phase: 'idle',
    phaseTime: 0,
    totalElapsed: 0,
    pulseCount: 0,
    nextPulseIn: 0,
    coilIntensity: 0,
    targetIdx: -1,
    config: null,
  };
}

export function startProtocol(
  state: ProtocolState,
  config: ProtocolConfig,
  regions: string[],
): ProtocolState {
  const targetIdx = regions.indexOf(config.targetRegion);
  return {
    ...state,
    phase: 'approach',
    phaseTime: 0,
    totalElapsed: 0,
    pulseCount: 0,
    nextPulseIn: 0,
    coilIntensity: 0,
    targetIdx,
    config,
  };
}

export function stepProtocol(
  state: ProtocolState,
  brainState: BrainState,
  connectome: number[][],
  dt: number,
): { protocolState: ProtocolState; brainState: BrainState; connectome: number[][] } {
  if (state.phase === 'idle' || state.phase === 'complete') {
    return { protocolState: state, brainState, connectome };
  }

  const cfg = state.config;
  if (!cfg) return { protocolState: { ...state, phase: 'complete' }, brainState, connectome };

  const newPhaseTime = state.phaseTime + dt * 1000;
  const phaseDuration = PHASE_DURATIONS[state.phase];

  let newPhase = state.phase;
  let newCoilIntensity = state.coilIntensity;
  let newPulseCount = state.pulseCount;
  let newNextPulseIn = state.nextPulseIn;

  if (newPhaseTime >= phaseDuration) {
    const currentIdx = PHASE_ORDER.indexOf(state.phase);
    if (currentIdx < PHASE_ORDER.length - 1) {
      newPhase = PHASE_ORDER[currentIdx + 1];
    }
  }

  const effectiveIntensity = (cfg.mtPct * cfg.intensityPctMt) / 10000;

  switch (newPhase) {
    case 'approach':
      newCoilIntensity = Math.min(0.2, effectiveIntensity * 0.3);
      break;
    case 'ramp':
      newCoilIntensity = effectiveIntensity * 0.6;
      newNextPulseIn -= dt * 1000;
      if (newNextPulseIn <= 0 && state.targetIdx >= 0) {
        brainState = applyExternalStimulus(brainState, state.targetIdx, newCoilIntensity);
        newPulseCount++;
        newNextPulseIn = 1000 / cfg.frequencyHz;
      }
      break;
    case 'propagation':
      newCoilIntensity = effectiveIntensity * 0.85;
      newNextPulseIn -= dt * 1000;
      if (newNextPulseIn <= 0 && state.targetIdx >= 0) {
        brainState = applyExternalStimulus(brainState, state.targetIdx, newCoilIntensity);
        newPulseCount++;
        newNextPulseIn = 1000 / cfg.frequencyHz;
      }
      connectome = applyPlasticity(connectome, brainState, { learningRate: 0.005 });
      break;
    case 'peak':
      newCoilIntensity = effectiveIntensity;
      newNextPulseIn -= dt * 1000;
      if (newNextPulseIn <= 0 && state.targetIdx >= 0) {
        brainState = applyExternalStimulus(brainState, state.targetIdx, newCoilIntensity);
        newPulseCount++;
        newNextPulseIn = 1000 / cfg.frequencyHz;
      }
      connectome = applyPlasticity(connectome, brainState, { learningRate: 0.01 });
      break;
    case 'cooldown':
      newCoilIntensity *= 0.95;
      brainState = decayState(brainState, 0.02);
      break;
    case 'complete':
      newCoilIntensity = 0;
      break;
  }

  return {
    protocolState: {
      phase: newPhase,
      phaseTime: newPhase === state.phase ? newPhaseTime : newPhaseTime - phaseDuration,
      totalElapsed: state.totalElapsed + dt * 1000,
      pulseCount: newPulseCount,
      nextPulseIn: newNextPulseIn,
      coilIntensity: newCoilIntensity,
      targetIdx: state.targetIdx,
      config: state.config,
    },
    brainState,
    connectome,
  };
}
