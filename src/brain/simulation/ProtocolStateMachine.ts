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

  const newTotalElapsed = state.totalElapsed + dt * 1000;
  const totalDurationMs = cfg.durationSec * 1000;
  const approachMs = 500;
  const rampMs = 1000;
  const cooldownMs = 800;

  let newPhase = state.phase;
  let newCoilIntensity = state.coilIntensity;
  let newPulseCount = state.pulseCount;
  let newNextPulseIn = state.nextPulseIn;

  if (newTotalElapsed < approachMs) {
    newPhase = 'approach';
  } else if (newTotalElapsed < approachMs + rampMs) {
    newPhase = 'ramp';
  } else if (newTotalElapsed < totalDurationMs - cooldownMs) {
    newPhase = newTotalElapsed < totalDurationMs * 0.5 ? 'propagation' : 'peak';
  } else if (newTotalElapsed < totalDurationMs) {
    newPhase = 'cooldown';
  } else {
    newPhase = 'complete';
  }

  const effectiveIntensity = (cfg.mtPct * cfg.intensityPctMt) / 10000;

  switch (newPhase) {
    case 'approach': {
      const progress = newTotalElapsed / approachMs;
      newCoilIntensity = Math.min(0.2, effectiveIntensity * 0.3 * progress);
      newNextPulseIn -= dt * 1000;
      if (newNextPulseIn <= 0 && state.targetIdx >= 0) {
        brainState = applyExternalStimulus(brainState, state.targetIdx, newCoilIntensity * 0.3);
        newPulseCount++;
        newNextPulseIn = 1000 / cfg.frequencyHz;
      }
      break;
    }
    case 'ramp': {
      const progress = (newTotalElapsed - approachMs) / rampMs;
      newCoilIntensity = effectiveIntensity * (0.3 + progress * 0.55);
      newNextPulseIn -= dt * 1000;
      if (newNextPulseIn <= 0 && state.targetIdx >= 0) {
        brainState = applyExternalStimulus(brainState, state.targetIdx, newCoilIntensity);
        newPulseCount++;
        newNextPulseIn = 1000 / cfg.frequencyHz;
      }
      break;
    }
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
    case 'cooldown': {
      const progress = (newTotalElapsed - (totalDurationMs - cooldownMs)) / cooldownMs;
      newCoilIntensity = effectiveIntensity * Math.max(0, 1 - progress);
      brainState = decayState(brainState, 0.02);
      break;
    }
    case 'complete':
      newCoilIntensity = 0;
      break;
  }

  return {
    protocolState: {
      phase: newPhase,
      phaseTime: 0,
      totalElapsed: newTotalElapsed,
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
