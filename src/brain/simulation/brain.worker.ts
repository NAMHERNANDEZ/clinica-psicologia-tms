import { propagate, createInitialState, applyExternalStimulus, decayState } from './PropagationEngine';
import { applyPlasticity } from './PlasticityEngine';
import {
  createProtocolState,
  startProtocol,
  stepProtocol,
  type ProtocolConfig,
} from './ProtocolStateMachine';

let brainState = createInitialState([]);
let connectome: number[][] = [];
let protocolState = createProtocolState();
let running = false;
let tickInterval: ReturnType<typeof setInterval> | null = null;

type WorkerMessage =
  | { type: 'INIT'; regions: string[]; connectomeData: number[][] }
  | { type: 'START_PROTOCOL'; config: ProtocolConfig }
  | { type: 'STOP_PROTOCOL' }
  | { type: 'STEP'; dt: number }
  | { type: 'SET_ACTIVATION'; regionIdx: number; value: number }
  | { type: 'START_TICK'; intervalMs: number }
  | { type: 'STOP_TICK' }
  | { type: 'DECAY'; rate: number }
  | { type: 'RESET' };

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'INIT':
      brainState = createInitialState(msg.regions);
      connectome = msg.connectomeData.map(row => [...row]);
      protocolState = createProtocolState();
      postState();
      break;

    case 'START_PROTOCOL':
      protocolState = startProtocol(protocolState, msg.config, brainState.regions);
      break;

    case 'STOP_PROTOCOL':
      protocolState = createProtocolState();
      break;

    case 'STEP':
      doStep(msg.dt);
      break;

    case 'SET_ACTIVATION':
      if (msg.regionIdx >= 0 && msg.regionIdx < brainState.activity.length) {
        brainState = applyExternalStimulus(brainState, msg.regionIdx, msg.value);
        postState();
      }
      break;

    case 'START_TICK':
      if (tickInterval) clearInterval(tickInterval);
      running = true;
      tickInterval = setInterval(() => {
        if (running) doStep(msg.intervalMs / 1000);
      }, msg.intervalMs);
      break;

    case 'STOP_TICK':
      running = false;
      if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
      break;

    case 'DECAY':
      brainState = decayState(brainState, msg.rate);
      postState();
      break;

    case 'RESET':
      brainState = createInitialState(brainState.regions);
      connectome = connectome.map(row => row.map(() => 0));
      protocolState = createProtocolState();
      postState();
      break;
  }
};

function doStep(dt: number) {
  const result = stepProtocol(protocolState, brainState, connectome, dt);
  protocolState = result.protocolState;
  brainState = result.brainState;
  connectome = result.connectome;

  if (protocolState.phase !== 'idle' && protocolState.phase !== 'complete') {
    brainState = propagate(brainState, connectome, dt);
  }

  postState();
}

function postState() {
  const activations: Record<string, number> = {};
  for (let i = 0; i < brainState.regions.length; i++) {
    activations[brainState.regions[i]] = brainState.activity[i];
  }

  self.postMessage({
    type: 'STATE_UPDATE',
    activations,
    protocol: {
      phase: protocolState.phase,
      coilIntensity: protocolState.coilIntensity,
      pulseCount: protocolState.pulseCount,
      totalElapsed: protocolState.totalElapsed,
    },
    connectome,
  });
}
