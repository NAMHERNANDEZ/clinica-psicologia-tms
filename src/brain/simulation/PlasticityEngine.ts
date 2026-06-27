import type { BrainState } from './PropagationEngine';

export interface PlasticityConfig {
  learningRate: number;
  decayRate: number;
  maxWeight: number;
  minWeight: number;
}

const DEFAULT_CONFIG: PlasticityConfig = {
  learningRate: 0.01,
  decayRate: 0.001,
  maxWeight: 1.0,
  minWeight: 0.0,
};

export function applyPlasticity(
  connectome: number[][],
  state: BrainState,
  config?: Partial<PlasticityConfig>,
): number[][] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const n = state.regions.length;
  const updated = connectome.map(row => [...row]);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;

      const pre = state.activity[i];
      const post = state.activity[j];

      const hebbian = cfg.learningRate * pre * post;
      updated[i][j] = Math.min(cfg.maxWeight, updated[i][j] + hebbian);
      updated[i][j] = Math.max(cfg.minWeight, updated[i][j] * (1 - cfg.decayRate));
    }
  }

  return updated;
}

export function applyTargetedPlasticity(
  connectome: number[][],
  fromIdx: number,
  toIdx: number,
  strength: number,
  config?: Partial<PlasticityConfig>,
): number[][] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const updated = connectome.map(row => [...row]);

  if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
    const delta = cfg.learningRate * strength;
    updated[fromIdx][toIdx] = Math.min(cfg.maxWeight, updated[fromIdx][toIdx] + delta);
    updated[fromIdx][toIdx] = Math.max(cfg.minWeight, updated[fromIdx][toIdx]);
  }

  return updated;
}

export function globalDecay(connectome: number[][], rate: number): number[][] {
  return connectome.map(row => row.map(w => w * (1 - rate)));
}
