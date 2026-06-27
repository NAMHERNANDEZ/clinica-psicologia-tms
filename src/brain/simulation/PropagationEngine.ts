export interface BrainState {
  regions: string[];
  activity: number[];
  timestamps: number[];
}

export function createInitialState(regionIds: string[]): BrainState {
  return {
    regions: [...regionIds],
    activity: new Array(regionIds.length).fill(0),
    timestamps: new Array(regionIds.length).fill(0),
  };
}

export function propagate(
  state: BrainState,
  connectome: number[][],
  dt: number,
): BrainState {
  const n = state.regions.length;
  const next = {
    regions: [...state.regions],
    activity: [...state.activity],
    timestamps: [...state.timestamps],
  };

  for (let j = 0; j < n; j++) {
    let input = 0;
    for (let i = 0; i < n; i++) {
      if (i === j) continue;
      const w = connectome[i][j];
      const a = state.activity[i];
      const capacity = 1 - state.activity[j];
      input += a * w * capacity;
    }

    const sigmoid = input / (1 + Math.abs(input));
    next.activity[j] = state.activity[j] + (sigmoid - state.activity[j]) * Math.min(dt * 3, 1);
    next.activity[j] = Math.max(0, Math.min(1, next.activity[j]));
  }

  return next;
}

export function applyExternalStimulus(
  state: BrainState,
  regionIdx: number,
  value: number,
): BrainState {
  const next = {
    regions: [...state.regions],
    activity: [...state.activity],
    timestamps: [...state.timestamps],
  };
  next.activity[regionIdx] = Math.max(0, Math.min(1, value));
  return next;
}

export function decayState(state: BrainState, rate: number): BrainState {
  const next = {
    regions: [...state.regions],
    activity: state.activity.map(a => Math.max(0, a * (1 - rate))),
    timestamps: [...state.timestamps],
  };
  return next;
}
